import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import {
  Ka10080RequestDto,
  Ka10080ResponseDto,
} from '@/kiwoom/dto/ka10080.dto';

/**
 * [ka10080] 주식분봉차트조회요청을 담당하는 서비스입니다.
 */
@Injectable()
export class Ka10080Service {
  private readonly logger = new Logger(Ka10080Service.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 주어진 종목 코드에 대한 주식 분봉 차트 정보를 가져옵니다.
   * @param token - 접근 토큰
   * @param data - 요청 파라미터 DTO (종목코드, 틱범위 등)
   * @param useReal - 실전투자 여부 (true: 실전, false: 모의)
   * @param contYn - 연속조회 여부 (기본값: 'N')
   * @param nextKey - 연속조회 키 (기본값: '')
   * @returns 주식분봉차트조회요청 응답 데이터
   */
  getMinPoleChart = async (
    token: string,
    data: Ka10080RequestDto,
    useReal: boolean,
    contYn: string = 'N',
    nextKey: string = '',
  ): Promise<Ka10080ResponseDto> => {
    const host = this.configService.get<string>(
      useReal ? 'REAL_HOST_URL' : 'PAPER_HOST_URL',
    );

    if (!host) {
      throw new Error(
        '키움증권 API 설정 정보(URL)가 존재하지 않습니다. .env를 확인해 주세요.',
      );
    }

    const url = `${host}/api/dostk/chart`;
    const headers = {
      'Content-Type': 'application/json;charset=UTF-8',
      authorization: `Bearer ${token}`,
      'cont-yn': contYn,
      'next-key': nextKey,
      'api-id': 'ka10080',
    };

    this.logger.log(
      `주식분봉차트조회 요청 중... Target: ${url}, Code: ${data.stkCd}`,
    );

    const response$: Observable<AxiosResponse<Ka10080ResponseDto>> =
      this.httpService.post<Ka10080ResponseDto>(url, data, { headers });
    const response = await firstValueFrom(response$);

    this.logger.log(`[응답 헤더] code : ${response.status}`);

    return response.data;
  };
}
