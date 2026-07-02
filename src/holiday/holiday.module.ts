import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HolidayService } from './holiday.service';

/**
 * 공휴일 정보를 제공하는 모듈입니다.
 */
@Module({
  imports: [HttpModule],
  providers: [HolidayService],
  exports: [HolidayService],
})
export class HolidayModule {}
