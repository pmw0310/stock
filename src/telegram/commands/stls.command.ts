import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { TelegramCommand } from '@/telegram/commands/command.interface';
import { StopLossService } from '@/kiwoom/stop-loss.service';

/**
 * 스탑로스 엔진을 시작하거나 중지하는 명령어('start stls', 'stop stls')를 처리하는 핸들러 클래스입니다.
 */
@Injectable()
export class StlsCommand implements TelegramCommand {
  private readonly logger = new Logger(StlsCommand.name);

  constructor(private readonly stopLossService: StopLossService) {}

  /**
   * 해당 명령어가 스탑로스 엔진 제어 명령어인지 여부를 판단합니다.
   * @param command - 소문자 및 앞뒤 공백 제거된 명령어
   * @returns 처리 가능 여부
   */
  readonly canHandle = (command: string): boolean => {
    return command === 'start stls' || command === 'stop stls';
  };

  /**
   * 스탑로스 엔진을 시작하거나 중지합니다.
   * @param ctx - 텔레그램 컨텍스트
   * @param command - 입력된 명령어
   */
  readonly handle = async (ctx: Context, command: string): Promise<void> => {
    try {
      if (command === 'start stls') {
        await ctx.reply(
          '스탑로스 엔진을 시작합니다... 잔고 조회 및 웹소켓 연결 중...',
        );
        await this.stopLossService.start();
        await ctx.reply('✅ 스탑로스 엔진이 가동되었습니다. (실시간 감시 중)');
      } else if (command === 'stop stls') {
        await ctx.reply('스탑로스 엔진을 중지합니다...');
        this.stopLossService.stop();
        await ctx.reply('🛑 스탑로스 엔진이 중지되었습니다.');
      }
    } catch (error: unknown) {
      const errorMsg = `스탑로스 명령 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMsg);
      await ctx.reply(`❌ ${errorMsg}`);
    }
  };
}
