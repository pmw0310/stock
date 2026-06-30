import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import {
  Kt00004RequestDto,
  Kt00004ResponseDto,
} from '@/kiwoom/dto/kt00004.dto';

/**
 * [kt00004] 계좌평가현황조회를 담당하는 서비스 클래스입니다.
 */
@Injectable()
export class Kt00004Service {
  private readonly logger = new Logger(Kt00004Service.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 계좌평가현황(예수금 및 보유종목 현황) 정보를 키움증권 서버로부터 조회합니다.
   * @param token - 접근 토큰
   * @param data - 계좌평가현황요청 DTO
   * @param useReal - 실전투자 여부 (true: 실전, false: 모의)
   * @returns 계좌평가현황 응답 DTO
   */
  getAccountStatus = async (
    token: string,
    data: Kt00004RequestDto,
    useReal: boolean,
  ): Promise<Kt00004ResponseDto> => {
    const host = this.configService.get<string>(
      useReal ? 'REAL_HOST_URL' : 'PAPER_HOST_URL',
    );

    if (!host) {
      throw new Error(
        '키움증권 API 설정 정보(URL)가 존재하지 않습니다. .env를 확인해 주세요.',
      );
    }

    const url = `${host}/api/dostk/acnt`;
    const headers = {
      'Content-Type': 'application/json;charset=UTF-8',
      authorization: `Bearer ${token}`,
      'api-id': 'kt00004',
    };

    this.logger.log(
      `계좌평가현황 조회 요청 중... Target: ${url}, QryTp: ${data.qryTp}, Exchange: ${data.dmstStexTp}`,
    );

    const response$: Observable<AxiosResponse<Kt00004ResponseDto>> =
      this.httpService.post<Kt00004ResponseDto>(url, data, { headers });
    const response = await firstValueFrom(response$);

    this.logger.log(`[응답 헤더] code : ${response.status}`);

    return response.data;
  };
}
