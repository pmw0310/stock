import {
  Injectable,
  Logger,
  OnModuleDestroy,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Subscription } from 'rxjs';
import {
  KiwoomWebsocketService,
  KiwoomWebsocketMessage,
  KiwoomWebsocketData,
} from './kiwoom-websocket.service';
import { Kt00004Service } from './kt00004.service';
import { Kt10001Service } from './kt10001.service';
import { Kt10001RequestDto } from './dto/kt10001.dto';
import { Kt00004RequestDto } from './dto/kt00004.dto';
import { TelegramStateService } from '@/telegram/telegram-state.service';
import { InjectBot } from 'nestjs-telegraf';
import { KiwoomOrderQueueService } from './kiwoom-order-queue.service';
import { Telegraf, Context } from 'telegraf';

interface BalanceItem {
  buyPrice: number;
  quantity: number;
  isOrdering: boolean;
}

/**
 * 실시간 스탑로스 로직을 처리하는 서비스입니다.
 */
@Injectable()
export class StopLossService implements OnModuleDestroy {
  private readonly logger = new Logger(StopLossService.name);
  private readonly balanceMap = new Map<string, BalanceItem>();
  private wsSubscription?: Subscription;
  private syncTimeout?: NodeJS.Timeout;
  constructor(
    private readonly kiwoomWebsocketService: KiwoomWebsocketService,
    private readonly kt00004Service: Kt00004Service,
    private readonly kt10001Service: Kt10001Service,
    @Inject(forwardRef(() => TelegramStateService))
    private readonly telegramStateService: TelegramStateService,
    private readonly configService: ConfigService,
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly kiwoomOrderQueueService: KiwoomOrderQueueService,
  ) {}

  onModuleDestroy() {
    this.cleanup();
  }

  /**
   * 스탑로스 엔진을 시작합니다.
   */
  readonly start = async (): Promise<void> => {
    if (this.telegramStateService.getIsStopLossRunning()) {
      this.logger.log('스탑로스 엔진이 이미 실행 중입니다.');
      return;
    }

    const token = this.telegramStateService.getAccessToken();
    const useReal = this.telegramStateService.getIsRealTrading();

    if (!token) {
      throw new Error('접근 토큰이 없어 스탑로스 엔진을 시작할 수 없습니다.');
    }

    this.telegramStateService.setStopLossRunning(true);
    this.balanceMap.clear();

    // 1. 잔고 초기 로드 (API 동기화)
    try {
      await this.syncBalanceWithApi(true);
      this.logger.log(`초기 잔고 로드 완료: ${this.balanceMap.size}종목`);
    } catch (err) {
      this.telegramStateService.setStopLossRunning(false);
      this.logger.error(
        `잔고 로드 실패: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }

    // 2. 웹소켓 연결
    this.kiwoomWebsocketService.connect(useReal, token);

    // 3. 메시지 핸들러 구독
    if (!this.wsSubscription) {
      this.wsSubscription = this.kiwoomWebsocketService.onMessage$.subscribe({
        next: this.handleMessage,
        error: (err) => this.logger.error(`웹소켓 구독 오류: ${err}`),
      });
    }

    // 4. 실시간 스트림 등록 (00 등록 및 0B 등록)
    setTimeout(() => {
      // 00 등록 (실시간 주문체결은 종목코드 없이 빈 문자열 전달)
      this.kiwoomWebsocketService.sendReg([''], '00');

      // 0B 등록 (기존 종목 감시 등록)
      const codes = Array.from(this.balanceMap.keys());
      if (codes.length > 0) {
        this.kiwoomWebsocketService.sendReg(codes, '0B');
      }
    }, 1000); // 웹소켓 연결 시간을 위해 약간 지연
  };

  /**
   * 스탑로스 엔진을 중지하고 상태를 저장합니다.
   */
  readonly stop = (): void => {
    if (!this.telegramStateService.getIsStopLossRunning()) {
      return;
    }

    this.cleanup();
    this.telegramStateService.setStopLossRunning(false);
    this.logger.log('스탑로스 엔진이 중지되었습니다.');
  };

  /**
   * 웹소켓 연결 해제 및 리소스 정리를 수행하되, 파일 상태값(isStopLossRunning)은 수정하지 않습니다.
   */
  readonly cleanup = (): void => {
    // 1. 등록 해제 (REMOVE)
    this.kiwoomWebsocketService.sendReg([''], '00', 'REMOVE');

    const codes = Array.from(this.balanceMap.keys());
    if (codes.length > 0) {
      this.kiwoomWebsocketService.sendReg(codes, '0B', 'REMOVE');
    }

    // 2. 구독 해제 및 초기화
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
      this.wsSubscription = undefined;
    }

    // 3. 디바운스 타이머 리소스 정리
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = undefined;
    }

    this.kiwoomWebsocketService.disconnect();
    this.balanceMap.clear();
    this.logger.log('스탑로스 엔진 리소스 정리 완료 (연결 종료)');
  };

  /**
   * API를 통해 잔고 정보를 실시간으로 조회하여 인메모리 맵(balanceMap)과 0B 감시 종목을 동기화합니다.
   * @param isInitial - 초기화 시점의 로드 여부 (초기 로드 시에는 웹소켓 sendReg를 직접 호출하지 않음)
   */
  private readonly syncBalanceWithApi = async (
    isInitial: boolean = false,
  ): Promise<void> => {
    try {
      const token = this.telegramStateService.getAccessToken();
      if (!token) return;
      const useReal = this.telegramStateService.getIsRealTrading();

      const data: Kt00004RequestDto = { qryTp: '0', dmstStexTp: 'KRX' };
      const response = await this.kt00004Service.getAccountStatus(
        token,
        data,
        useReal,
      );

      if (response.returnCode === 0 && response.stkAcntEvltPrst) {
        const currentCodes = new Set<string>();

        response.stkAcntEvltPrst.forEach((item) => {
          const code = item.stkCd.replace(/^[A-Za-z]+/, '');
          const quantity = parseInt(item.rmndQty, 10);
          const buyPrice = parseInt(item.avgPrc, 10);

          if (quantity > 0) {
            currentCodes.add(code);
            const existing = this.balanceMap.get(code);
            if (existing) {
              existing.buyPrice = buyPrice;
              // 실제 잔고 수량이 변경되었을 때만 주문 락 해제 및 수량 갱신
              if (existing.quantity !== quantity) {
                existing.quantity = quantity;
                existing.isOrdering = false;
              }
            } else {
              this.balanceMap.set(code, {
                buyPrice,
                quantity,
                isOrdering: false,
              });
              // 신규 종목 0B 등록 (초기 로드 시가 아니고 웹소켓이 기동되었을 때)
              if (!isInitial) {
                this.kiwoomWebsocketService.sendReg([code], '0B');
              }
              this.logger.log(
                `[동기화] 신규 매수 감시 등록: ${code}, 단가: ${buyPrice}, 수량: ${quantity}`,
              );
            }
          }
        });

        // 전량 매도로 제거된 종목 처리
        for (const code of this.balanceMap.keys()) {
          if (!currentCodes.has(code)) {
            this.balanceMap.delete(code);
            // 0B 등록 해제 (초기 로드 시가 아니고 웹소켓이 기동되었을 때)
            if (!isInitial) {
              this.kiwoomWebsocketService.sendReg([code], '0B', 'REMOVE');
            }
            this.logger.log(`[동기화] 전량 매도 감시 제거: ${code}`);
          }
        }
      }
    } catch (err) {
      this.logger.error(
        `잔고 동기화 중 오류 발생: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  /**
   * 잔고 동기화 요청을 디바운싱 처리합니다.
   * 체결이 단시간에 집중될 경우 불필요한 API 호출 폭주를 방지합니다.
   */
  private readonly syncBalanceWithApiDebounced = (delay = 1000): void => {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    this.syncTimeout = setTimeout(() => {
      void this.syncBalanceWithApi();
    }, delay);
  };

  /**
   * 웹소켓 메시지 처리
   */
  private readonly handleMessage = (message: KiwoomWebsocketMessage): void => {
    if (!message || !message.data) return;

    // data가 배열인지 객체인지 확인
    const items = Array.isArray(message.data) ? message.data : [message.data];

    for (const item of items) {
      if (!item.type || !item.item || !item.values) continue;

      if (item.type === '00') {
        try {
          this.handleOrderExecution(item);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.error(`주문체결 처리 실패: ${errMsg}`);
        }
      } else if (item.type === '0B') {
        this.handleStockExecution(item);
      }
    }
  };

  /**
   * 00 주문체결 데이터 처리 (잔고 동기화)
   */
  private readonly handleOrderExecution = (item: KiwoomWebsocketData): void => {
    const fid913 = item.values ? item.values['913'] : undefined;
    if (fid913 !== '체결') return; // 체결이 아니면 스킵

    const codeRaw =
      item.item || (item.values ? item.values['9001'] : undefined);
    const code = codeRaw ? codeRaw.replace(/^[A-Za-z]+/, '').trim() : '';
    if (!code) return;
    const orderType = item.values ? item.values['907'] : undefined; // 1: 매도, 2: 매수
    const quantityStr = item.values ? item.values['911'] : undefined; // 체결량
    const priceStr = item.values ? item.values['910'] : undefined; // 체결가

    this.logger.log(
      `[체결 수신] 종목: ${code}, 구분: ${orderType === '2' ? '매수' : '매도'}, 체결량: ${quantityStr}, 체결가: ${priceStr}`,
    );

    // API 기반 잔고/감시종목 디바운싱 동기화
    this.syncBalanceWithApiDebounced();
  };

  /**
   * 0B 주식체결 데이터 처리 (손익률 연산 및 매도)
   */
  private readonly handleStockExecution = (item: KiwoomWebsocketData): void => {
    const code = item.item ? item.item.replace(/^[A-Za-z]+/, '') : '';
    const currentPriceStr = item.values ? item.values['10'] : undefined;
    if (!currentPriceStr) return;

    // 부호 파싱
    const currentPrice = parseInt(currentPriceStr.replace(/^[+-]/, ''), 10);

    const balance = this.balanceMap.get(code);
    // 인메모리에 없거나 이미 주문 중이면 스킵 (레이스 컨디션 방지 락)
    if (!balance || balance.isOrdering) return;

    const tpr = this.telegramStateService.getTpr();
    const slr = this.telegramStateService.getSlr();

    if (tpr === null || slr === null) return;

    const profitRate =
      ((currentPrice - balance.buyPrice) / balance.buyPrice) * 100;

    if (profitRate >= tpr || profitRate <= slr) {
      this.logger.log(
        `조건 도달: ${code}, 현재가: ${currentPrice}, 매입단가: ${balance.buyPrice}, 수익률: ${profitRate.toFixed(2)}%, 설정(익/손): ${tpr}/${slr}`,
      );
      balance.isOrdering = true; // 주문 락 세팅

      // 텔레그램 알림 전송 (비동기로 실행하여 주문 지연 방지)
      const chatId = this.configService.get<string>('TELEGRAM_CHAT_ID');
      if (chatId) {
        this.bot.telegram
          .sendMessage(
            chatId,
            `🚨 [스탑로스 조건 도달]\n종목: ${code}\n현재가: ${currentPrice}원\n매입가: ${balance.buyPrice}원\n수익률: ${profitRate.toFixed(2)}% (설정: ${tpr}% / ${slr}%)\n시장가 매도 주문을 요청합니다.`,
          )
          .catch((err) => this.logger.error(`텔레그램 알림 전송 실패: ${err}`));
      }

      void this.kiwoomOrderQueueService.enqueueOrder(
        () => this.executeSell(code, balance.quantity.toString()),
        (err) => {
          this.logger.error(
            `[스탑로스 큐 매도 실패] 종목: ${code}, 사유: ${err instanceof Error ? err.message : String(err)}`,
          );
          const currentBalance = this.balanceMap.get(code);
          if (currentBalance) {
            currentBalance.isOrdering = false; // 에러 시 즉시 락 해제
          }
        },
      );
    }
  };

  /**
   * 매도 주문 실행 (kt10001)
   */
  private readonly executeSell = async (
    code: string,
    quantity: string,
  ): Promise<void> => {
    const token = this.telegramStateService.getAccessToken();
    const useReal = this.telegramStateService.getIsRealTrading();
    const chatId = this.configService.get<string>('TELEGRAM_CHAT_ID');

    if (!token) {
      this.logger.error(`매도 주문 실패: 토큰 없음 (${code})`);
      if (chatId) {
        this.bot.telegram
          .sendMessage(
            chatId,
            `❌ [스탑로스 매도 실패] 로그인 토큰이 존재하지 않아 매도를 요청할 수 없습니다. (${code})`,
          )
          .catch((err) => this.logger.error(`텔레그램 알림 전송 실패: ${err}`));
      }
      const balance = this.balanceMap.get(code);
      if (balance) balance.isOrdering = false;
      return;
    }

    const data: Kt10001RequestDto = {
      dmstStexTp: 'KRX',
      stkCd: code,
      ordQty: quantity,
      ordUv: '',
      trdeTp: '3', // 시장가
    };

    try {
      const res = await this.kt10001Service.sellStock(token, data, useReal);
      if (res.returnCode === 0) {
        this.logger.log(`매도 주문 전송 성공: ${code}, 수량: ${quantity}`);
        if (chatId) {
          this.bot.telegram
            .sendMessage(
              chatId,
              `✅ [스탑로스 매도 성공]\n종목: ${code}\n수량: ${quantity}주 (시장가 매도 접수 완료)`,
            )
            .catch((err) =>
              this.logger.error(`텔레그램 알림 전송 실패: ${err}`),
            );
        }
      } else {
        this.logger.error(`매도 주문 전송 실패: ${code}, ${res.returnMsg}`);
        if (chatId) {
          this.bot.telegram
            .sendMessage(
              chatId,
              `❌ [스탑로스 매도 실패]\n종목: ${code}\n수량: ${quantity}주\n사유: ${res.returnMsg}\n(안전을 위해 감시를 잠금합니다. 재부팅 시 해제)`,
            )
            .catch((err) =>
              this.logger.error(`텔레그램 알림 전송 실패: ${err}`),
            );
        }
        // 비즈니스 로직 실패(예: 잔고부족, 미개장 등)는 재시도해도 동일하므로,
        // 무한 호출(429)을 막기 위해 락(isOrdering = true)을 그대로 유지하여 추가 주문을 차단합니다.
      }
    } catch (err) {
      this.logger.error(
        `매도 주문 호출 에러: ${err instanceof Error ? err.message : String(err)}`,
      );
      if (chatId) {
        this.bot.telegram
          .sendMessage(
            chatId,
            `❌ [스탑로스 에러]\n종목: ${code}\n수량: ${quantity}주\n오류: ${err instanceof Error ? err.message : String(err)}\n(다음 체결 시 재시도)`,
          )
          .catch((err) => this.logger.error(`텔레그램 알림 전송 실패: ${err}`));
      }
      // 에러가 발생한 경우는 axios-retry를 거쳐 최종 실패한 상황입니다.
      // 재시도 기간 동안 충분히 지연되었으므로 즉시 락을 해제하여 다음 체결 시 다시 주문하도록 합니다.
      const balance = this.balanceMap.get(code);
      if (balance) {
        balance.isOrdering = false;
      }
    }
  };
}
