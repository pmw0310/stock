import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { GetTokenRequestDto } from '@/kiwoom/dto/get-token-request.dto';
import { GetTokenResponseDto } from '@/kiwoom/dto/get-token-response.dto';

/**
 * 키움증권 REST API 통신 및 데이터 관리를 담당하는 서비스 클래스입니다.
 */
@Injectable()
export class KiwoomService implements OnApplicationBootstrap {
  private readonly logger = new Logger(KiwoomService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

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
        `[모의투자 토큰 발급 성공] 만료 일시: ${paperToken.expires_dt}`,
      );
      this.logger.log(`[모의투자 토큰]: ${paperToken.token}`);
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
      grant_type: 'client_credentials',
      appkey: appKey,
      secretkey: appSecret,
    };

    this.logger.log(`키움 API 토큰 요청 중... Target: ${url}`);

    const response$: Observable<AxiosResponse<GetTokenResponseDto>> =
      this.httpService.post<GetTokenResponseDto>(url, requestBody, { headers });
    const response = await firstValueFrom(response$);

    return response.data;
  };
}
