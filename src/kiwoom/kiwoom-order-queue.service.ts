import { Injectable, Logger } from '@nestjs/common';

/**
 * 큐 대기열에 들어갈 작업 정보 인터페이스입니다.
 */
interface QueueTask<T = unknown> {
  orderFn: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

/**
 * 키움증권 API 호출의 Rate Limit(429 Too Many Requests) 방지를 위해
 * 매수/매도 주문 요청을 대기열에 담아 순차적으로 실행해주는 서비스입니다.
 */
@Injectable()
export class KiwoomOrderQueueService {
  private readonly logger = new Logger(KiwoomOrderQueueService.name);
  private queue: QueueTask[] = [];
  private isProcessing = false;

  /**
   * 주문 작업을 대기열(Queue)에 추가하고, 작업 실행 결과인 Promise를 반환합니다.
   * @param orderFn - 주문 API를 호출하는 비동기 함수
   * @param onFailure - 주문 실행 실패 시 호출할 콜백 함수 (선택 사항)
   * @returns 주문 API 호출 결과
   */
  readonly enqueueOrder = <T>(
    orderFn: () => Promise<T>,
    onFailure?: (error: unknown) => void,
  ): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        orderFn,
        resolve,
        reject: (err) => {
          if (onFailure) {
            try {
              onFailure(err);
            } catch (cbErr: unknown) {
              this.logger.error(
                `onFailure 콜백 실행 중 오류: ${cbErr instanceof Error ? cbErr.message : String(cbErr)}`,
              );
            }
          }
          reject(err instanceof Error ? err : new Error(String(err)));
        },
      });
      void this.processQueue();
    });
  };

  /**
   * 대기열에 쌓인 작업을 순차적으로 실행합니다.
   * 각 작업 사이에는 500ms의 딜레이를 보장하여 API 초과 요청을 차단합니다.
   */
  private readonly processQueue = async (): Promise<void> => {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const task = this.queue.shift();
        if (!task) continue;

        try {
          const result = await task.orderFn();
          task.resolve(result);
        } catch (err: unknown) {
          task.reject(err);
        }

        // 연속 주문 처리 시 500ms 딜레이를 주어 429 방지
        if (this.queue.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    } catch (err: unknown) {
      this.logger.error(
        `주문 큐 처리 중 예상치 못한 오류 발생: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.isProcessing = false;
    }
  };
}
