import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import {
  Ka00198RequestDto,
  Ka00198ResponseDto,
} from '@/kiwoom/dto/ka00198.dto';

/**
 * [ka00198] 국내주식 실시간종목조회순위요청을 담당하는 서비스입니다.
 */
@Injectable()
export class Ka00198Service {
  private readonly logger = new Logger(Ka00198Service.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 국내주식 순위정보 (인기검색 상위)를 가져옵니다.
   * @param token - 접근 토큰
   * @param data - 요청 파라미터 DTO
   * @param useReal - 실전투자 여부 (true: 실전, false: 모의)
   * @param contYn - 연속조회 여부 (기본값: 'N')
   * @param nextKey - 연속조회 키 (기본값: '')
   * @returns 인기검색 상위 응답 정보
   */
  readonly getStockRank = async (
    token: string,
    data: Ka00198RequestDto,
    useReal: boolean,
    contYn: string = 'N',
    nextKey: string = '',
  ): Promise<Ka00198ResponseDto> => {
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
      'api-id': 'ka00198',
    };

    this.logger.log(`실시간 인기검색 종목 순위 조회 요청 중... Target: ${url}`);

    const response$: Observable<AxiosResponse<Ka00198ResponseDto>> =
      this.httpService.post<Ka00198ResponseDto>(url, data, { headers });
    const response = await firstValueFrom(response$);

    return response.data;
  };
}
