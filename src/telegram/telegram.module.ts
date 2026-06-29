import { Module } from '@nestjs/common';
import { TelegramUpdate } from '@/telegram/telegram.update';

/**
 * 텔레그램 봇 관련 기능을 제공하는 모듈입니다.
 */
@Module({
  providers: [TelegramUpdate],
})
export class TelegramModule {}
