import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TelegramStateService } from '@/telegram/telegram-state.service';
import { Ka10080Service } from './ka10080.service';
import { KiwoomChartQueueService } from './kiwoom-chart-queue.service';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf, Context } from 'telegraf';

/**
 * 골든크로스 실시간 감시 스케줄러 서비스입니다.
 */
@Injectable()
export class GdcrsService {
  private readonly logger = new Logger(GdcrsService.name);

  // 진행 중인 감시 여부를 추적하여 겹침 방지 (중복 실행 방지 락)
  private isProcessing = false;

  // 종목코드별 마지막으로 자동매수를 트리거한 분봉의 체결시간(cntrTm) 저장
  private readonly lastTriggeredMap = new Map<string, string>();

  constructor(
    @Inject(forwardRef(() => TelegramStateService))
    private readonly telegramStateService: TelegramStateService,
    private readonly ka10080Service: Ka10080Service,
    private readonly kiwoomChartQueueService: KiwoomChartQueueService,
    private readonly configService: ConfigService,
    @InjectBot() private readonly bot: Telegraf<Context>,
  ) {}

  /**
   * 매 1분마다 실행되는 스케줄러.
   * 장 시간 내에 골든크로스 감시가 활성화되어 있으면, 종목들의 분봉을 조회하고 조건 충족 시 매수합니다.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async monitorGdcrs(): Promise<void> {
    // 1. GdcrsRunning 상태 확인
    if (!this.telegramStateService.getIsGdcrsRunning()) {
      return;
    }

    // 2. 장 시간 확인
    if (!this.isMarketOpen()) {
      // 장이 아니면 조용히 종료 (다음날 장이 열리면 다시 조건을 만족하여 실행됨)
      return;
    }

    // 3. 중복 실행 방지 락
    if (this.isProcessing) {
      this.logger.warn(
        '이전 골든크로스 감시가 아직 진행 중입니다. 이번 턴 스킵.',
      );
      return;
    }

    this.isProcessing = true;

    try {
      const stocks = this.telegramStateService.getGdcrsStocks();
      if (stocks.length === 0) {
        return;
      }

      const token = this.telegramStateService.getAccessToken();
      const useReal = this.telegramStateService.getIsRealTrading();

      if (!token) {
        this.logger.warn('토큰이 없어 골든크로스 감시를 진행할 수 없습니다.');
        return;
      }

      const shortPeriod = this.telegramStateService.getGdcrsShort();
      const longPeriod = this.telegramStateService.getGdcrsLong();
      const requiredCandles = Math.max(shortPeriod, longPeriod) + 1;

      for (const stock of stocks) {
        try {
          const response = await this.kiwoomChartQueueService.enqueueChart(
            stock.code,
            token,
            useReal,
          );

          if (response.returnCode !== 0 || !response.stkMinPoleChartQry) {
            this.logger.error(
              `[골든크로스] ${stock.code} 분봉 조회 실패: ${response.returnMsg}`,
            );
            continue;
          }

          const candles = response.stkMinPoleChartQry;
          if (candles.length < requiredCandles) {
            this.logger.warn(
              `[골든크로스] ${stock.code} 데이터 부족 (요구:${requiredCandles}, 수신:${candles.length})`,
            );
            continue;
          }

          // 이동평균 계산 (최근 N개 종가의 평균)
          // index 0: 현재 진행 중인/방금 마감된 최신 1분봉
          // index 1: 직전 1분봉
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
            `[골든크로스] ${stock.code} 단기(${shortPeriod}): ${currentShortMA.toFixed(2)}, 장기(${longPeriod}): ${currentLongMA.toFixed(2)}`,
          );

          // 골든크로스 판정: 직전 단기 < 직전 장기 AND 현재 단기 > 현재 장기
          if (prevShortMA < prevLongMA && currentShortMA > currentLongMA) {
            // 동일 분봉에서의 중복 트리거 방지 (주로 모의투자의 정적 mock 데이터 무한루프 방지)
            const latestTm = candles[0].cntrTm || '';
            if (this.lastTriggeredMap.get(stock.code) === latestTm) {
              this.logger.debug(
                `[골든크로스] ${stock.code} 이미 해당 분봉(${latestTm})에서 매수 트리거가 발생하여 건너뜁니다.`,
              );
              continue;
            }

            this.lastTriggeredMap.set(stock.code, latestTm);

            this.logger.log(
              `[골든크로스 발생] ${stock.code} - 단기MA가 장기MA를 상향 돌파했습니다!`,
            );

            // 텔레그램 메시지 발송
            const chatId = this.configService.get<string>('TELEGRAM_CHAT_ID');
            if (chatId) {
              const nameStr = stock.name
                ? `${stock.name}(${stock.code})`
                : stock.code;
              this.bot.telegram
                .sendMessage(
                  chatId,
                  `🚨 <b>[골든크로스 감시 트리거]</b>\n\n종목: <b>${nameStr}</b>\n조건: ${shortPeriod}분선 상향돌파 (${longPeriod}분선)\n\n설정된 감시금액 <b>${stock.price.toLocaleString()}원</b>으로 최대 금액 매수를 진행합니다.`,
                  { parse_mode: 'HTML' },
                )
                .catch((err) =>
                  this.logger.error(`텔레그램 메시지 전송 오류: ${err}`),
                );
            }

            // 자동 매수 실행 (예약 실행 안내 메시지가 뜨지 않도록 isSilent = true 적용)
            await this.telegramStateService.executeCommand(
              `buy ${stock.code} max ${stock.price}`,
              true,
            );
          }
        } catch (err: unknown) {
          this.logger.error(
            `[골든크로스] ${stock.code} 처리 중 오류: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    } catch (err: unknown) {
      this.logger.error(
        `골든크로스 스케줄러 실행 오류: ${err instanceof Error ? err.message : String(err)}`,
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
    const now = new Date();

    // 주말 체크
    const day = now.getDay();
    if (day === 0 || day === 6) return false;

    const startStr = this.telegramStateService.getMarketStartTime(); // e.g. "09:00"
    const endStr = this.telegramStateService.getMarketEndTime(); // e.g. "15:30"

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMinute] = startStr.split(':').map(Number);
    const [endHour, endMinute] = endStr.split(':').map(Number);

    const startMins = startHour * 60 + startMinute;
    const endMins = endHour * 60 + endMinute;

    return currentMinutes >= startMins && currentMinutes <= endMins;
  };
}
