import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import {
  Ka10001RequestDto,
  Ka10001ResponseDto,
} from '@/kiwoom/dto/ka10001.dto';

/**
 * [ka10001] 주식기본정보요청을 담당하는 서비스입니다.
 */
@Injectable()
export class Ka10001Service {
  private readonly logger = new Logger(Ka10001Service.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 주어진 종목 코드에 대한 주식 기본 정보를 가져옵니다.
   * @param token - 접근 토큰
   * @param data - 요청 파라미터 DTO (종목코드 포함)
   * @param useReal - 실전투자 여부 (true: 실전, false: 모의)
   * @param contYn - 연속조회 여부 (기본값: 'N')
   * @param nextKey - 연속조회 키 (기본값: '')
   * @returns 주식 기본 정보 응답 데이터
   */
  getStockInfo = async (
    token: string,
    data: Ka10001RequestDto,
    useReal: boolean,
    contYn: string = 'N',
    nextKey: string = '',
  ): Promise<Ka10001ResponseDto> => {
    const host = this.configService.get<string>(
      useReal ? 'REAL_HOST_URL' : 'PAPER_HOST_URL',
    );

    if (!host) {
      throw new Error(
        '키움증권 API 설정 정보(URL)가 존재하지 않습니다. .env를 확인해 주세요.',
      );
    }

    const url = `${host}/api/dostk/stkinfo`;
    const headers = {
      'Content-Type': 'application/json;charset=UTF-8',
      authorization: `Bearer ${token}`,
      'cont-yn': contYn,
      'next-key': nextKey,
      'api-id': 'ka10001',
    };

    this.logger.log(
      `주식기본정보 조회 요청 중... Target: ${url}, Code: ${data.stkCd}`,
    );

    const response$: Observable<AxiosResponse<Ka10001ResponseDto>> =
      this.httpService.post<Ka10001ResponseDto>(url, data, { headers });
    const response = await firstValueFrom(response$);

    this.logger.log(`[응답 헤더] code : ${response.status}`);

    return response.data;
  };
}
