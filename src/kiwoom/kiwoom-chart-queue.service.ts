import { Injectable, Logger } from '@nestjs/common';
import { Ka10080Service } from './ka10080.service';
import { Ka10080ResponseDto } from '@/kiwoom/dto/ka10080.dto';

interface ChartTask {
  stkCd: string;
  token: string;
  useReal: boolean;
  resolve: (value: Ka10080ResponseDto) => void;
  reject: (reason?: unknown) => void;
}

/**
 * 키움증권 API 호출의 Rate Limit 방지를 위해
 * 차트/데이터 조회 요청을 대기열에 담아 순차적으로 실행해주는 서비스입니다.
 */
@Injectable()
export class KiwoomChartQueueService {
  private readonly logger = new Logger(KiwoomChartQueueService.name);
  private queue: ChartTask[] = [];
  private isProcessing = false;

  // 캐시 저장소 (키: "real/paper_stkCd", 값: { timestamp, data })
  private readonly cache = new Map<
    string,
    { timestamp: number; data: Ka10080ResponseDto }
  >();
  private readonly CACHE_TTL_MS = 40000; // 캐시 유효 시간: 40초

  // 현재 대기 중이거나 진행 중인 작업의 Promise Map (키: "real/paper_stkCd", 값: Promise)
  private readonly pendingPromises = new Map<
    string,
    Promise<Ka10080ResponseDto>
  >();

  constructor(private readonly ka10080Service: Ka10080Service) {}

  /**
   * 종목코드를 받아 대기열에 추가하거나 캐시/진행 중인 작업을 반환합니다.
   * @param stkCd - 종목코드
   * @param token - 접근 토큰
   * @param useReal - 실전투자 여부
   * @returns 차트 조회 API 호출 결과 Promise
   */
  readonly enqueueChart = (
    stkCd: string,
    token: string,
    useReal: boolean,
  ): Promise<Ka10080ResponseDto> => {
    const cacheKey = `${useReal ? 'real' : 'paper'}_${stkCd}`;

    // 1. 캐시 확인
    const cached = this.cache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < this.CACHE_TTL_MS) {
      this.logger.debug(
        `[큐 캐시 히트] ${stkCd} 분봉 차트 캐시 데이터를 즉시 반환합니다.`,
      );
      return Promise.resolve(cached.data);
    }

    // 2. 이미 대기 중이거나 진행 중인 동일한 요청이 있는지 확인 (Deduplication)
    const pending = this.pendingPromises.get(cacheKey);
    if (pending) {
      this.logger.debug(
        `[큐 중복 등록 방지] ${stkCd} 진행 중인 요청의 Promise를 공유합니다.`,
      );
      return pending;
    }

    // 3. 신규 요청 생성 및 큐 등록
    const promise = new Promise<Ka10080ResponseDto>((resolve, reject) => {
      this.queue.push({
        stkCd,
        token,
        useReal,
        resolve: (result) => {
          // 성공한 결과만 캐시에 저장
          if (result.returnCode === 0) {
            this.cache.set(cacheKey, {
              timestamp: Date.now(),
              data: result,
            });
          }
          this.pendingPromises.delete(cacheKey);
          resolve(result);
        },
        reject: (err) => {
          this.pendingPromises.delete(cacheKey);
          reject(err instanceof Error ? err : new Error(String(err)));
        },
      });
      void this.processQueue();
    });

    this.pendingPromises.set(cacheKey, promise);
    return promise;
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
          const result = await this.ka10080Service.getMinPoleChart(
            task.token,
            {
              stkCd: task.stkCd,
              ticScope: '1', // 1분봉 기준
              updStkpcTp: '1', // 수정주가 적용
            },
            task.useReal,
          );
          task.resolve(result);
        } catch (err: unknown) {
          task.reject(err);
        }

        // 연속 차트 요청 처리 시 500ms 딜레이를 주어 429 방지
        if (this.queue.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    } catch (err: unknown) {
      this.logger.error(
        `차트 큐 처리 중 예상치 못한 오류 발생: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.isProcessing = false;
    }
  };
}
