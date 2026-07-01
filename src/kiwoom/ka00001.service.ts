import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { Ka00001ResponseDto } from '@/kiwoom/dto/ka00001.dto';

/**
 * [ka00001] 계좌번호조회를 담당하는 서비스 클래스입니다.
 */
@Injectable()
export class Ka00001Service {
  private readonly logger = new Logger(Ka00001Service.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 사용자의 토큰을 기반으로 계좌번호 정보를 조회합니다.
   * @param token - 접근 토큰
   * @param useReal - 실전투자 여부 (true: 실전, false: 모의)
   * @returns 계좌번호 조회 응답 DTO
   */
  readonly getAccountNumber = async (
    token: string,
    useReal: boolean,
  ): Promise<Ka00001ResponseDto> => {
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
      'api-id': 'ka00001',
    };

    this.logger.log(`계좌번호 조회 요청 중... Target: ${url}`);

    const response$: Observable<AxiosResponse<Ka00001ResponseDto>> =
      this.httpService.post<Ka00001ResponseDto>(url, {}, { headers });
    const response = await firstValueFrom(response$);

    this.logger.log(`[응답 헤더] code : ${response.status}`);

    return response.data;
  };
}
