import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { Au10001RequestDto } from '@/kiwoom/dto/au10001-request.dto';
import { Au10001ResponseDto } from '@/kiwoom/dto/au10001-response.dto';

/**
 * [au10001] 접근토큰발급을 담당하는 서비스입니다.
 */
@Injectable()
export class Au10001Service {
  private readonly logger = new Logger(Au10001Service.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 설정에 맞는 환경 변수를 기반으로 키움증권 Access Token을 요청하여 가져옵니다.
   * @param useReal - true인 경우 실전투자, false인 경우 모의투자 API를 호출
   * @returns 토큰 정보 DTO
   */
  issueAccessToken = async (useReal: boolean): Promise<Au10001ResponseDto> => {
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

    const requestBody: Au10001RequestDto = {
      grantType: 'client_credentials',
      appkey: appKey,
      secretkey: appSecret,
    };

    this.logger.log(`키움 API 토큰 요청 중... Target: ${url}`);

    const response$: Observable<AxiosResponse<Au10001ResponseDto>> =
      this.httpService.post<Au10001ResponseDto>(url, requestBody, { headers });
    const response = await firstValueFrom(response$);

    return response.data;
  };
}
