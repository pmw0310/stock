import { Controller, Get } from '@nestjs/common';
import { AppService } from '@/app.service';

/**
 * 기본 경로('/')의 요청을 처리하는 컨트롤러입니다.
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Hello 메시지를 반환합니다.
   * @returns {string} 인사말 문자열
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
