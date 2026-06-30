import { Module } from '@nestjs/common';
import { TelegramUpdate } from '@/telegram/telegram.update';
import { KiwoomModule } from '@/kiwoom/kiwoom.module';
import { TelegramStateService } from '@/telegram/telegram-state.service';
import { LoginCommand } from '@/telegram/commands/login.command';
import { LoginRenewalCommand } from '@/telegram/commands/login-renewal.command';
import { PowerOffCommand } from '@/telegram/commands/power-off.command';
import { SearchCommand } from '@/telegram/commands/search.command';
import { BuyCommand } from '@/telegram/commands/buy.command';
import { SellCommand } from '@/telegram/commands/sell.command';
import { ReportCommand } from '@/telegram/commands/report.command';
import { MkhrCommand } from '@/telegram/commands/mkhr.command';
import { SttsCommand } from '@/telegram/commands/stts.command';
import { RsvCommand } from '@/telegram/commands/rsv.command';
import { HelpCommand } from '@/telegram/commands/help.command';

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
    SearchCommand,
    BuyCommand,
    SellCommand,
    ReportCommand,
    MkhrCommand,
    SttsCommand,
    RsvCommand,
    HelpCommand,
  ],
})
export class TelegramModule {}
