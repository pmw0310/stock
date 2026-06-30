import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import {
  Ka10032RequestDto,
  Ka10032ResponseDto,
} from '@/kiwoom/dto/ka10032.dto';

/**
 * [ka10032] 국내주식 거래대금 상위 요청을 담당하는 서비스입니다.
 */
@Injectable()
export class Ka10032Service {
  private readonly logger = new Logger(Ka10032Service.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

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
    data: Ka10032RequestDto,
    useReal: boolean,
    contYn: string = 'N',
    nextKey: string = '',
  ): Promise<Ka10032ResponseDto> => {
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

    const response$: Observable<AxiosResponse<Ka10032ResponseDto>> =
      this.httpService.post<Ka10032ResponseDto>(url, data, { headers });
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
