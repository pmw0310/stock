import { Update, Ctx, On, Message, InjectBot } from 'nestjs-telegraf';
import { Telegraf, Context } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
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
import { TelegramCommand } from '@/telegram/commands/command.interface';
import { ExtraReplyMessage } from 'node_modules/telegraf/typings/telegram-types';

/**
 * 텔레그램 봇의 메시지를 수신하여 권한을 확인한 뒤 각 명령어 처리기로 위임하는 업데이트 클래스입니다.
 */
@Update()
@Injectable()
export class TelegramUpdate implements OnApplicationBootstrap {
  private readonly handlers: TelegramCommand[];

  constructor(
    private readonly configService: ConfigService,
    private readonly stateService: TelegramStateService,
    private readonly loginCommand: LoginCommand,
    private readonly loginRenewalCommand: LoginRenewalCommand,
    private readonly powerOffCommand: PowerOffCommand,
    private readonly searchCommand: SearchCommand,
    private readonly buyCommand: BuyCommand,
    private readonly sellCommand: SellCommand,
    private readonly reportCommand: ReportCommand,
    private readonly mkhrCommand: MkhrCommand,
    private readonly sttsCommand: SttsCommand,
    private readonly rsvCommand: RsvCommand,
    private readonly helpCommand: HelpCommand,
    @InjectBot() private readonly bot: Telegraf<Context>,
  ) {
    this.handlers = [
      loginCommand,
      loginRenewalCommand,
      powerOffCommand,
      searchCommand,
      buyCommand,
      sellCommand,
      reportCommand,
      mkhrCommand,
      sttsCommand,
      rsvCommand,
      helpCommand,
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

  /**
   * 애플리케이션 시작 시 예약 실행 콜백을 등록합니다.
   */
  onApplicationBootstrap = (): void => {
    this.stateService.registerExecuteCallback(
      this.executeCommandFromReservation,
    );
  };

  /**
   * 예약에 의해 명령어를 실행합니다.
   * @param command - 실행할 명령어 문자열
   */
  private readonly executeCommandFromReservation = async (
    command: string,
  ): Promise<void> => {
    const chatId = this.configService.get<string>('TELEGRAM_CHAT_ID');
    if (!chatId) return;

    // 1. 예약에 의해 실행됨을 톡으로 전송
    await this.bot.telegram.sendMessage(
      chatId,
      `⏰ <b>[예약 실행]</b>\n이 명령어는 예약 스케줄러에 의해 자동으로 실행됩니다.\n💬 <b>명령어</b>: <code>${command}</code>`,
      { parse_mode: 'HTML' },
    );

    // 2. 모의 컨텍스트(Mock Context) 생성
    const mockCtx = {
      chat: { id: parseInt(chatId, 10), type: 'private' },
      reply: async (text: string, extra?: ExtraReplyMessage) => {
        return this.bot.telegram.sendMessage(chatId, text, extra);
      },
    } as unknown as Context;

    // 3. 명령어 매칭 및 실행
    const formattedCommand = command.trim().toLowerCase();
    for (const handler of this.handlers) {
      if (handler.canHandle(formattedCommand)) {
        await handler.handle(mockCtx, formattedCommand);
        return;
      }
    }

    // 매칭되는 핸들러가 없는 경우 오류 메시지
    await this.bot.telegram.sendMessage(
      chatId,
      `❌ 예약된 명령어를 처리할 수 있는 핸들러를 찾을 수 없습니다: ${command}`,
    );
  };
}
