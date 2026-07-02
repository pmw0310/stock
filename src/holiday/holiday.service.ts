import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Cron } from '@nestjs/schedule';
import { lastValueFrom } from 'rxjs';
import { HolidayResponseDto } from './dto/holiday.dto';
import { ensureArray } from '@/common/utils/array.util';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 로컬 파일에 캐싱되는 공휴일 데이터 구조
 */
interface HolidayCacheData {
  year: string;
  dates: string[];
  updatedAt: string;
}

/**
 * 공휴일 데이터를 가져오고 캐싱하는 서비스
 */
@Injectable()
export class HolidayService implements OnModuleInit {
  private readonly logger = new Logger(HolidayService.name);
  private readonly cacheFilePath = path.join(process.cwd(), 'holidays.json');

  // YYYYMMDD 형태의 공휴일 목록을 캐싱하는 Set
  private holidayCache = new Set<string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * 모듈 초기화 시 로컬 캐시를 읽거나 API를 통해 이번 년도의 공휴일을 로드합니다.
   */
  async onModuleInit() {
    await this.loadHolidays();
  }

  /**
   * 매월 1일 자정에 공휴일 데이터를 동기화합니다. (임시 공휴일 등 반영)
   */
  @Cron('0 0 1 * *')
  async handleMonthlySync() {
    this.logger.log('[동기화] 매월 1일 공휴일 데이터 갱신을 시작합니다.');
    await this.syncHolidays();
  }

  /**
   * 주어진 날짜가 공휴일인지 확인합니다.
   * @param date - YYYYMMDD 형태의 날짜 문자열
   * @returns 공휴일 여부 (주말은 제외, 순수 법정/임시 공휴일만 판단)
   */
  public isHoliday = (date: string): boolean => {
    return this.holidayCache.has(date);
  };

  /**
   * 캐시 파일 혹은 API를 통해 데이터를 로드합니다.
   */
  private loadHolidays = async () => {
    const currentYear = new Date().getFullYear().toString();

    // 로컬 파일 캐시 확인
    if (fs.existsSync(this.cacheFilePath)) {
      try {
        const fileContent = fs.readFileSync(this.cacheFilePath, 'utf8');
        const cacheData = JSON.parse(fileContent) as HolidayCacheData;

        // 캐시된 연도가 현재 연도와 동일한 경우 파일 데이터를 사용
        if (cacheData.year === currentYear && Array.isArray(cacheData.dates)) {
          this.holidayCache = new Set(cacheData.dates);
          this.logger.log(
            `[공휴일 로드] 로컬 파일 캐시(${this.cacheFilePath})로부터 ${currentYear}년도 휴일 데이터 ${this.holidayCache.size}건을 로드했습니다. (API 호출 건너뜀)`,
          );
          return;
        }
      } catch (error) {
        this.logger.warn(
          `공휴일 로컬 캐시 파일을 읽는 중 오류가 발생하여 API 조회를 진행합니다: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // 파일 캐시가 없거나 연도가 다르면 API 호출로 갱신
    await this.syncHolidays();
  };

  /**
   * 당해 연도의 전체 공휴일 데이터를 다시 불러와 로컬 파일과 메모리 캐시를 갱신합니다.
   */
  private syncHolidays = async () => {
    const serviceKey = this.configService.get<string>('DATA_GO_KEY');
    if (!serviceKey) {
      this.logger.warn(
        'DATA_GO_KEY 환경 변수가 설정되어 있지 않습니다. 공휴일 데이터를 불러오지 않습니다.',
      );
      return;
    }

    const currentYear = new Date().getFullYear().toString();
    const url =
      'http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo';

    try {
      const response = await lastValueFrom(
        this.httpService.get<HolidayResponseDto>(url, {
          params: {
            serviceKey: decodeURIComponent(serviceKey), // axios params 객체는 자체 인코딩을 수행하므로 디코딩된 키 전달
            solYear: currentYear,
            _type: 'json',
            numOfRows: 100, // 1년에 공휴일이 100개를 넘지 않으므로 충분
          },
        }),
      );

      const data = response.data;
      if (data.response?.header?.resultCode !== '00') {
        this.logger.error(
          `공공데이터포털 API 에러: ${data.response?.header?.resultMsg}`,
        );
        return;
      }

      const items = data.response.body?.items?.item;
      const holidayItems = ensureArray(items);

      this.holidayCache.clear();

      holidayItems.forEach((item) => {
        if (item.isHoliday === 'Y') {
          // locdate는 20260715 같은 number 또는 string으로 올 수 있으므로 문자열로 캐스팅
          this.holidayCache.add(String(item.locdate));
        }
      });

      // 로컬 파일로 캐시 저장
      try {
        const cacheData = {
          year: currentYear,
          dates: Array.from(this.holidayCache),
          updatedAt: new Date().toISOString(),
        };
        fs.writeFileSync(
          this.cacheFilePath,
          JSON.stringify(cacheData, null, 2),
          'utf8',
        );
        this.logger.log(
          `[공휴일 갱신 및 파일 저장 완료] ${currentYear}년도 휴일 데이터 ${this.holidayCache.size}건을 캐싱하고 ${this.cacheFilePath}에 저장했습니다.`,
        );
      } catch (writeError) {
        this.logger.error(
          `공휴일 캐시 파일 저장 중 오류 발생: ${writeError instanceof Error ? writeError.message : String(writeError)}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `공휴일 데이터 동기화 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };
}
