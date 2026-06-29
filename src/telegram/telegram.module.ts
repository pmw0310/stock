import { Module } from '@nestjs/common';
import { TelegramUpdate } from '@/telegram/telegram.update';
import { KiwoomModule } from '@/kiwoom/kiwoom.module';
import { TelegramStateService } from '@/telegram/telegram-state.service';
import { LoginCommand } from '@/telegram/commands/login.command';
import { LoginRenewalCommand } from '@/telegram/commands/login-renewal.command';
import { PowerOffCommand } from '@/telegram/commands/power-off.command';

/**
 * 텔레그램 봇 관련 기능을 제공하는 모듈입니다.
 */
@Module({
  imports: [KiwoomModule],
  providers: [
    TelegramUpdate,
    TelegramStateService,
    LoginCommand,
    LoginRenewalCommand,
    PowerOffCommand,
  ],
})
export class TelegramModule {}
