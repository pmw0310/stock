import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { toSnakeCase, toCamelCase } from '@/common/utils/case-converter.util';
import { GetTokenRequestDto } from '@/kiwoom/dto/get-token-request.dto';
import { GetTokenResponseDto } from '@/kiwoom/dto/get-token-response.dto';
import { GetStockRankRequestDto } from '@/kiwoom/dto/get-stock-rank-request.dto';
import { GetStockRankResponseDto } from '@/kiwoom/dto/get-stock-rank-response.dto';

/**
 * 키움증권 REST API 통신 및 데이터 관리를 담당하는 서비스 클래스입니다.
 */
@Injectable()
export class KiwoomService implements OnApplicationBootstrap, OnModuleInit {
  private readonly logger = new Logger(KiwoomService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * NestJS 생명주기 훅: 모듈 초기화 시 Axios 글로벌 인터셉터를 설정합니다.
   */
  onModuleInit = (): void => {
    this.httpService.axiosRef.interceptors.request.use((config) => {
      if (config.data) {
        config.data = toSnakeCase(config.data);
      }
      if (config.params) {
        config.params = toSnakeCase(config.params);
      }
      return config;
    });

    this.httpService.axiosRef.interceptors.response.use((response) => {
      if (response.data) {
        response.data = toCamelCase(response.data);
      }
      return response;
    });
  };

  /**
   * NestJS 생명주기 훅: 애플리케이션 시작 시 토큰 발급 테스트를 수행합니다.
   * @returns {Promise<void>} 반환값 없음
   */
  onApplicationBootstrap = async (): Promise<void> => {
    this.logger.log(
      '애플리케이션 구동 감지: 키움증권 토큰 발급 테스트를 수행합니다.',
    );

    // 모의투자 토큰 발급 테스트
    try {
      this.logger.log('[테스트] 모의투자 토큰 발급 시도...');
      const paperToken = await this.issueAccessToken(false);
      this.logger.log(
        `[모의투자 토큰 발급 성공] 만료 일시: ${paperToken.expiresDt}`,
      );
      this.logger.log(`[모의투자 토큰]: ${paperToken.token}`);

      this.logger.log('[테스트] 모의투자 거래대금 상위 요청 시도...');
      const rankData = await this.getStockRank(
        paperToken.token,
        {
          mrktTp: '001', // 코스피
          mangStkIncls: '1', // 관리종목 포함
          stexTp: '3', // 통합
        },
        false,
      );
      this.logger.log(
        `[모의투자 거래대금 상위 결과]: \n${JSON.stringify(rankData, null, 2)}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`[모의투자] 토큰 발급 실패: ${errorMessage}`);
    }
  };

  /**
   * 설정에 맞는 환경 변수를 기반으로 키움증권 Access Token을 요청하여 가져옵니다.
   * @param {boolean} useReal - true인 경우 실전투자, false인 경우 모의투자 API를 호출
   * @returns {Promise<GetTokenResponseDto>} 토큰 정보 DTO
   */
  issueAccessToken = async (useReal: boolean): Promise<GetTokenResponseDto> => {
    const host = this.configService.get<string>(
      useReal ? 'REAL_HOST_URL' : 'PAPER_HOST_URL',
    );

    const appKey = this.configService.get<string>(
      useReal ? 'REAL_APP_KEY' : 'PAPER_APP_KEY',
    );

    const appSecret = this.configService.get<string>(
      useReal ? 'REAL_APP_SECRET' : 'PAPER_APP_SECRET',
    );

    if (!host || !appKey || !appSecret) {
      throw new Error(
        '키움증권 API 설정 정보(URL, KEY, SECRET)가 존재하지 않습니다. .env를 확인해 주세요.',
      );
    }

    const url = `${host}/oauth2/token`;
    const headers = {
      'Content-Type': 'application/json; charset=UTF-8',
    };

    const requestBody: GetTokenRequestDto = {
      grantType: 'client_credentials',
      appkey: appKey,
      secretkey: appSecret,
    };

    this.logger.log(`키움 API 토큰 요청 중... Target: ${url}`);

    const response$: Observable<AxiosResponse<GetTokenResponseDto>> =
      this.httpService.post<GetTokenResponseDto>(url, requestBody, { headers });
    const response = await firstValueFrom(response$);

    return response.data;
  };

  /**
   * 국내주식 순위정보 (거래대금 상위)를 가져옵니다.
   * @param token - 접근 토큰
   * @param data - 요청 파라미터 DTO
   * @param useReal - 실전투자 여부 (true: 실전, false: 모의)
   * @param contYn - 연속조회 여부 (기본값: 'N')
   * @param nextKey - 연속조회 키 (기본값: '')
   * @returns 거래대금 상위 응답 정보
   */
  getStockRank = async (
    token: string,
    data: GetStockRankRequestDto,
    useReal: boolean,
    contYn: string = 'N',
    nextKey: string = '',
  ): Promise<GetStockRankResponseDto> => {
    const host = this.configService.get<string>(
      useReal ? 'REAL_HOST_URL' : 'PAPER_HOST_URL',
    );

    if (!host) {
      throw new Error(
        '키움증권 API 설정 정보(URL)가 존재하지 않습니다. .env를 확인해 주세요.',
      );
    }

    const url = `${host}/api/dostk/rkinfo`;
    const headers = {
      'Content-Type': 'application/json;charset=UTF-8',
      authorization: `Bearer ${token}`,
      'cont-yn': contYn,
      'next-key': nextKey,
      'api-id': 'ka10032',
    };

    this.logger.log(`거래대금 상위 조회 요청 중... Target: ${url}`);

    const response$: Observable<AxiosResponse<GetStockRankResponseDto>> =
      this.httpService.post<GetStockRankResponseDto>(url, data, { headers });
    const response = await firstValueFrom(response$);

    // 응답 헤더 출력
    const responseHeaders: {
      'next-key': string;
      'cont-yn': string;
      'api-id': string;
    } = {
      'next-key':
        (response.headers['next-key'] as string) ||
        (response.headers['Next-Key'] as string) ||
        '',
      'cont-yn':
        (response.headers['cont-yn'] as string) ||
        (response.headers['Cont-Yn'] as string) ||
        '',
      'api-id':
        (response.headers['api-id'] as string) ||
        (response.headers['Api-Id'] as string) ||
        '',
    };

    this.logger.log(`[응답 헤더] code : ${response.status}`);
    this.logger.log(
      `[응답 헤더] next-key : ${responseHeaders['next-key']}, cont-yn : ${responseHeaders['cont-yn']}, api-id : ${responseHeaders['api-id']}`,
    );

    return response.data;
  };
}
