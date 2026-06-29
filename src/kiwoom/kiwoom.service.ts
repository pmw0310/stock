import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { toSnakeCase, toCamelCase } from '@/common/utils/case-converter.util';

/**
 * 키움증권 REST API 통신 공통 설정(인터셉터 등)을 담당하는 서비스 클래스입니다.
 */
@Injectable()
export class KiwoomService implements OnModuleInit {
  private readonly logger = new Logger(KiwoomService.name);

  constructor(private readonly httpService: HttpService) {}

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

    this.logger.log('Kiwoom HTTP 인터셉터 설정 완료');
  };
}
