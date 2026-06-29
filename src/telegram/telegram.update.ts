import { Update, Ctx, Start, Command, On, Message } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

/**
 * 텔레그램 봇의 메시지 및 명령어를 처리하는 업데이트 클래스입니다.
 */
@Update()
@Injectable()
export class TelegramUpdate {
  constructor(private readonly configService: ConfigService) {}

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
   * '/start' 명령어 입력 시 환영 메시지를 반환합니다.
   * @param ctx - 텔레그램 컨텍스트
   */
  @Start()
  async onStart(@Ctx() ctx: Context): Promise<void> {
    if (!this.isAuthorized(ctx)) return;
    await ctx.reply(
      '안녕하세요! 주식 트레이딩 봇입니다. 명령어를 입력해주세요. (예: /ping)',
    );
  }

  /**
   * '/ping' 명령어 입력 시 'pong!'을 반환합니다.
   * @param ctx - 텔레그램 컨텍스트
   */
  @Command('ping')
  async onPing(@Ctx() ctx: Context): Promise<void> {
    if (!this.isAuthorized(ctx)) return;
    await ctx.reply('pong!');
  }

  /**
   * 일반 텍스트 메시지를 수신하면 에코(echo) 형태로 반환합니다.
   * @param msg - 수신된 텍스트 메시지
   * @param ctx - 텔레그램 컨텍스트
   */
  @On('text')
  async onMessage(
    @Message('text') msg: string,
    @Ctx() ctx: Context,
  ): Promise<void> {
    if (!this.isAuthorized(ctx)) return;
    await ctx.reply(`입력하신 메시지: ${msg}`);
  }
}
