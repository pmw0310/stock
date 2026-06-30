import { Update, Ctx, On, Message } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { TelegramStateService } from '@/telegram/telegram-state.service';
import { LoginCommand } from '@/telegram/commands/login.command';
import { LoginRenewalCommand } from '@/telegram/commands/login-renewal.command';
import { PowerOffCommand } from '@/telegram/commands/power-off.command';
import { SearchCommand } from '@/telegram/commands/search.command';
import { BuyCommand } from '@/telegram/commands/buy.command';
import { ReportCommand } from '@/telegram/commands/report.command';
import { TelegramCommand } from '@/telegram/commands/command.interface';

/**
 * 텔레그램 봇의 메시지를 수신하여 권한을 확인한 뒤 각 명령어 처리기로 위임하는 업데이트 클래스입니다.
 */
@Update()
@Injectable()
export class TelegramUpdate {
  private readonly handlers: TelegramCommand[];

  constructor(
    private readonly configService: ConfigService,
    private readonly stateService: TelegramStateService,
    private readonly loginCommand: LoginCommand,
    private readonly loginRenewalCommand: LoginRenewalCommand,
    private readonly powerOffCommand: PowerOffCommand,
    private readonly searchCommand: SearchCommand,
    private readonly buyCommand: BuyCommand,
    private readonly reportCommand: ReportCommand,
  ) {
    this.handlers = [
      loginCommand,
      loginRenewalCommand,
      powerOffCommand,
      searchCommand,
      buyCommand,
      reportCommand,
    ];
  }

  /**
   * 허용된 사용자(TELEGRAM_CHAT_ID)인지 확인합니다.
   * @param ctx - 텔레그램 컨텍스트
   * @returns 허용 여부
   */
  private readonly isAuthorized = (ctx: Context): boolean => {
    const allowedChatId = this.configService.get<string>('TELEGRAM_CHAT_ID');
    return ctx.chat?.id.toString() === allowedChatId;
  };

  /**
   * 일반 텍스트 메시지를 수신하여 명령어 핸들러들에게 위임하여 처리합니다.
   * @param msg - 수신된 텍스트 메시지
   * @param ctx - 텔레그램 컨텍스트
   */
  @On('text')
  async onMessage(
    @Message('text') msg: string,
    @Ctx() ctx: Context,
  ): Promise<void> {
    if (!this.isAuthorized(ctx)) return;

    const command = msg.trim().toLowerCase();

    for (const handler of this.handlers) {
      if (handler.canHandle(command)) {
        await handler.handle(ctx, command);
        return;
      }
    }
  }

  /**
   * 현재 저장된 접근 토큰을 반환합니다.
   * @returns 접근 토큰 또는 null
   */
  getAccessToken = (): string | null => {
    return this.stateService.getAccessToken();
  };

  /**
   * 현재 설정된 투자 유형(실투자 여부)을 반환합니다.
   * @returns 실투자 여부
   */
  getIsRealTrading = (): boolean => {
    return this.stateService.getIsRealTrading();
  };
}
