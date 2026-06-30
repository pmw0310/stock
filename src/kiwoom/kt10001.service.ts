import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import {
  Kt10001RequestDto,
  Kt10001ResponseDto,
} from '@/kiwoom/dto/kt10001.dto';

/**
 * [kt10001] 주식 매도주문을 담당하는 서비스 클래스입니다.
 */
@Injectable()
export class Kt10001Service {
  private readonly logger = new Logger(Kt10001Service.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 주식 신규 매도주문을 키움증권 서버로 전송합니다.
   * @param token - 접근 토큰
   * @param data - 매도주문 요청 DTO
   * @param useReal - 실전투자 여부 (true: 실전, false: 모의)
   * @returns 매도주문 결과 응답 DTO
   */
  sellStock = async (
    token: string,
    data: Kt10001RequestDto,
    useReal: boolean,
  ): Promise<Kt10001ResponseDto> => {
    const host = this.configService.get<string>(
      useReal ? 'REAL_HOST_URL' : 'PAPER_HOST_URL',
    );

    if (!host) {
      throw new Error(
        '키움증권 API 설정 정보(URL)가 존재하지 않습니다. .env를 확인해 주세요.',
      );
    }

    const url = `${host}/api/dostk/ordr`;
    const headers = {
      'Content-Type': 'application/json;charset=UTF-8',
      authorization: `Bearer ${token}`,
      'api-id': 'kt10001',
    };

    this.logger.log(
      `주식 매도주문 요청 중... Target: ${url}, Code: ${data.stkCd}, Qty: ${data.ordQty}, Price: ${data.ordUv || '시장가'}, Type: ${data.trdeTp}`,
    );

    const response$: Observable<AxiosResponse<Kt10001ResponseDto>> =
      this.httpService.post<Kt10001ResponseDto>(url, data, { headers });
    const response = await firstValueFrom(response$);

    this.logger.log(`[응답 헤더] code : ${response.status}`);

    return response.data;
  };
}
