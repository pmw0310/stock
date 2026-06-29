import { Injectable } from '@nestjs/common';

/**
 * 애플리케이션의 기본 서비스 로직을 제공합니다.
 */
@Injectable()
export class AppService {
  /**
   * Hello World 문자열을 반환합니다.
   * @returns {string} Hello World 문자열
   */
  getHello(): string {
    return 'Hello World!';
  }
}
