import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { TelegramCommand } from '@/telegram/commands/command.interface';
import { TelegramStateService } from '@/telegram/telegram-state.service';

/**
 * 익절 기준 설정 명령어('tpr {익절기준}')를 처리하는 핸들러 클래스입니다.
 */
@Injectable()
export class TprCommand implements TelegramCommand {
  private readonly logger = new Logger(TprCommand.name);

  constructor(private readonly stateService: TelegramStateService) {}

  /**
   * 해당 명령어가 익절 기준 설정 명령어(tpr)인지 여부를 판단합니다.
   * @param command - 소문자 및 앞뒤 공백 제거된 명령어
   * @returns 처리 가능 여부
   */
  readonly canHandle = (command: string): boolean => {
    return command === 'tpr' || command.startsWith('tpr ');
  };

  /**
   * 익절 기준을 파싱하여 변경하거나 현재 설정된 값을 조회하여 출력합니다.
   * 입력된 값의 부호와 무관하게 양수로 전환하여 저장합니다.
   * @param ctx - 텔레그램 컨텍스트
   * @param command - 입력된 명령어
   */
  readonly handle = async (ctx: Context, command: string): Promise<void> => {
    try {
      const argsStr = command.substring(3).trim();

      if (!argsStr) {
        // 인자가 없는 경우 현재 설정된 익절 기준을 보여줍니다.
        const tpr = this.stateService.getTpr();
        await ctx.reply(
          `현재 설정된 익절 기준: ${tpr !== null ? `${tpr}%` : '설정 안 됨'}\n\n[설정 방법]\ntpr {익절 기준 퍼센티지}\n예: tpr 5 (5% 도달시 익절)`,
        );
        return;
      }

      const value = parseFloat(argsStr);
      if (isNaN(value)) {
        await ctx.reply(
          `올바른 숫자를 입력해주세요.\n사용법: tpr {익절 기준 퍼센티지}\n예: tpr 5`,
        );
        return;
      }

      this.stateService.setTpr(value);
      const updatedTpr = this.stateService.getTpr();

      const msgText = `익절 기준이 ${updatedTpr}%로 설정되었습니다.`;
      await ctx.reply(msgText);
      this.logger.log(msgText);
    } catch (error: unknown) {
      const errorMsg = `익절 기준을 처리하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMsg);
      await ctx.reply(errorMsg);
    }
  };
}
