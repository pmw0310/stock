import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TelegramStateService } from '@/telegram/telegram-state.service';
import { Ka10080Service } from './ka10080.service';
import { Kt00004Service } from './kt00004.service';
import { KiwoomChartQueueService } from './kiwoom-chart-queue.service';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf, Context } from 'telegraf';
import { MarketService } from '@/kiwoom/market.service';

/**
 * 데드크로스 실시간 감시 및 자동 매도 스케줄러 서비스입니다.
 */
@Injectable()
export class DdcrsService {
  private readonly logger = new Logger(DdcrsService.name);

  // 진행 중인 감시 여부를 추적하여 겹침 방지 (중복 실행 방지 락)
  private isProcessing = false;

  // 종목코드별 마지막으로 자동매도를 트리거한 분봉의 체결시간(cntrTm) 저장
  private readonly lastTriggeredMap = new Map<string, string>();

  constructor(
    private readonly telegramStateService: TelegramStateService,
    private readonly ka10080Service: Ka10080Service,
    private readonly kt00004Service: Kt00004Service,
    private readonly kiwoomChartQueueService: KiwoomChartQueueService,
    private readonly configService: ConfigService,
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly marketService: MarketService,
  ) {}

  /**
   * 매 1분마다 실행되는 스케줄러.
   * 장 시간 내에 데드크로스 감시가 활성화되어 있으면, 보유 종목들의 분봉을 조회하고 조건 충족 시 전량 매도합니다.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async monitorDdcrs(): Promise<void> {
    // 1. DdcrsRunning 상태 확인
    if (!this.telegramStateService.getIsDdcrsRunning()) {
      return;
    }

    // 2. 장 시간 확인
    if (!this.isMarketOpen()) {
      return;
    }

    // 3. 중복 실행 방지 락
    if (this.isProcessing) {
      this.logger.warn(
        '이전 데드크로스 감시가 아직 진행 중입니다. 이번 턴 스킵.',
      );
      return;
    }

    this.isProcessing = true;

    try {
      const token = this.telegramStateService.getAccessToken();
      const useReal = this.telegramStateService.getIsRealTrading();

      if (!token) {
        this.logger.warn('토큰이 없어 데드크로스 감시를 진행할 수 없습니다.');
        return;
      }

      // 보유 종목 목록 가져오기 (kt00004)
      const accountStatus = await this.kt00004Service.getAccountStatus(
        token,
        {
          qryTp: '0',
          dmstStexTp: 'KRX',
        },
        useReal,
      );

      if (accountStatus.returnCode !== 0) {
        this.logger.error(`계좌평가현황 조회 실패: ${accountStatus.returnMsg}`);
        return;
      }

      const holdings = accountStatus.stkAcntEvltPrst || [];
      if (holdings.length === 0) {
        // 보유 종목이 없으면 조용히 종료
        return;
      }

      const shortPeriod = this.telegramStateService.getGdcrsShort();
      const longPeriod = this.telegramStateService.getGdcrsLong();
      const requiredCandles = Math.max(shortPeriod, longPeriod) + 1;

      for (const stock of holdings) {
        const qtyNum = parseInt(stock.rmndQty, 10);
        if (isNaN(qtyNum) || qtyNum <= 0) {
          continue; // 수량이 없는 경우 무시
        }

        try {
          let stkCd = stock.stkCd;
          // 종목코드 앞의 'A' 제거 (7자리인 경우)
          if (
            stkCd.length === 7 &&
            (stkCd.startsWith('A') || stkCd.startsWith('a'))
          ) {
            stkCd = stkCd.substring(1);
          }

          const response = await this.kiwoomChartQueueService.enqueueChart(
            stkCd,
            token,
            useReal,
          );

          if (response.returnCode !== 0 || !response.stkMinPoleChartQry) {
            this.logger.error(
              `[데드크로스] ${stkCd} 분봉 조회 실패: ${response.returnMsg}`,
            );
            continue;
          }

          const candles = response.stkMinPoleChartQry;
          if (candles.length < requiredCandles) {
            this.logger.warn(
              `[데드크로스] ${stkCd} 데이터 부족 (요구:${requiredCandles}, 수신:${candles.length})`,
            );
            continue;
          }

          // 이동평균 계산 (최근 N개 종가의 평균)
          let currentShortSum = 0;
          let currentLongSum = 0;
          let prevShortSum = 0;
          let prevLongSum = 0;

          // 현재 MA (0 ~ N-1)
          for (let i = 0; i < shortPeriod; i++) {
            currentShortSum += Math.abs(Number(candles[i].curPrc));
          }
          for (let i = 0; i < longPeriod; i++) {
            currentLongSum += Math.abs(Number(candles[i].curPrc));
          }

          // 직전 MA (1 ~ N)
          for (let i = 1; i <= shortPeriod; i++) {
            prevShortSum += Math.abs(Number(candles[i].curPrc));
          }
          for (let i = 1; i <= longPeriod; i++) {
            prevLongSum += Math.abs(Number(candles[i].curPrc));
          }

          const currentShortMA = currentShortSum / shortPeriod;
          const currentLongMA = currentLongSum / longPeriod;
          const prevShortMA = prevShortSum / shortPeriod;
          const prevLongMA = prevLongSum / longPeriod;

          this.logger.debug(
            `[데드크로스] ${stkCd} 단기(${shortPeriod}): ${currentShortMA.toFixed(2)}, 장기(${longPeriod}): ${currentLongMA.toFixed(2)}`,
          );

          // 데드크로스 판정: 직전 단기 > 직전 장기 AND 현재 단기 < 현재 장기
          if (prevShortMA > prevLongMA && currentShortMA < currentLongMA) {
            // 동일 분봉에서의 중복 트리거 방지 (주로 모의투자의 정적 mock 데이터 무한루프 방지)
            const latestTm = candles[0].cntrTm || '';
            if (this.lastTriggeredMap.get(stkCd) === latestTm) {
              this.logger.debug(
                `[데드크로스] ${stkCd} 이미 해당 분봉(${latestTm})에서 매도 트리거가 발생하여 건너뜁니다.`,
              );
              continue;
            }

            this.lastTriggeredMap.set(stkCd, latestTm);

            this.logger.log(
              `[데드크로스 발생] ${stkCd} - 단기MA가 장기MA를 하향 돌파했습니다!`,
            );

            // 텔레그램 메시지 발송
            const chatId = this.configService.get<string>('TELEGRAM_CHAT_ID');
            if (chatId) {
              const nameStr = stock.stkNm ? `${stock.stkNm}(${stkCd})` : stkCd;
              this.bot.telegram
                .sendMessage(
                  chatId,
                  `🚨 <b>[데드크로스 감시 트리거]</b>\n\n종목: <b>${nameStr}</b>\n조건: ${shortPeriod}분선 하향돌파 (${longPeriod}분선)\n\n보유 수량 <b>${qtyNum}주</b>를 시장가로 전량 매도합니다.`,
                  { parse_mode: 'HTML' },
                )
                .catch((err) =>
                  this.logger.error(`텔레그램 메시지 전송 오류: ${err}`),
                );
            }

            // 자동 매도 실행 (예약 실행 안내 메시지가 뜨지 않도록 isSilent = true 적용)
            await this.telegramStateService.executeCommand(
              `sell ${stkCd} ${qtyNum}`,
              true,
            );
          }
        } catch (err: unknown) {
          this.logger.error(
            `[데드크로스] ${stock.stkCd} 처리 중 오류: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    } catch (err: unknown) {
      this.logger.error(
        `데드크로스 스케줄러 실행 오류: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 현재 시각이 장 운영 시간 내인지 확인합니다.
   * @returns 장 운영 시간 여부
   */
  private readonly isMarketOpen = (): boolean => {
    return this.marketService.isMarketOpen();
  };
}
