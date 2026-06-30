import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { TelegramCommand } from '@/telegram/commands/command.interface';
import { TelegramStateService } from '@/telegram/telegram-state.service';

/**
 * 장 시간 설정 및 조회 명령어('mkhr', 'mkhr {시작시간} {종료시간}')를 처리하는 핸들러 클래스입니다.
 */
@Injectable()
export class MkhrCommand implements TelegramCommand {
  private readonly logger = new Logger(MkhrCommand.name);

  constructor(private readonly stateService: TelegramStateService) {}

  /**
   * 해당 명령어가 장 시간 관련 명령어인지 여부를 판단합니다.
   * @param command - 소문자 및 앞뒤 공백 제거된 명령어
   * @returns 처리 가능 여부
   */
  readonly canHandle = (command: string): boolean => {
    return command === 'mkhr' || command.startsWith('mkhr ');
  };

  /**
   * 장 시간을 파싱하여 변경하거나 현재 설정된 값을 조회하여 출력합니다.
   * @param ctx - 텔레그램 컨텍스트
   * @param command - 입력된 명령어
   */
  readonly handle = async (ctx: Context, command: string): Promise<void> => {
    const argsStr = command.substring(4).trim();

    if (!argsStr) {
      // 인자가 없는 경우 현재 설정된 장 시간을 보여줍니다.
      const startTime = this.stateService.getMarketStartTime();
      const endTime = this.stateService.getMarketEndTime();
      await ctx.reply(
        `현재 설정된 장 시간: ${startTime} ~ ${endTime}\n\n[설정 방법]\nmkhr {시작시간} {종료시간}\n예: mkhr 9:30 15:00 (24시간제)`,
      );
      return;
    }

    const parts = argsStr.split(/\s+/);
    if (parts.length !== 2) {
      await ctx.reply(
        `올바른 명령 형식이 아닙니다.\n사용법: mkhr {시작시간} {종료시간}\n예: mkhr 9:30 15:00`,
      );
      return;
    }

    const [startStr, endStr] = parts;
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    const startMatch = startStr.match(timeRegex);
    const endMatch = endStr.match(timeRegex);

    if (!startMatch || !endMatch) {
      await ctx.reply(
        `시간 형식이 올바르지 않습니다. HH:mm 형식(24시간제)으로 입력해주세요.\n예: mkhr 9:30 15:00`,
      );
      return;
    }

    const startHour = parseInt(startMatch[1], 10);
    const startMinute = parseInt(startMatch[2], 10);
    const endHour = parseInt(endMatch[1], 10);
    const endMinute = parseInt(endMatch[2], 10);

    const formattedStartTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
    const formattedEndTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (startMinutes >= endMinutes) {
      await ctx.reply(
        `오류: 시작 시간(${formattedStartTime})이 종료 시간(${formattedEndTime})보다 늦거나 같을 수 없습니다.`,
      );
      return;
    }

    this.stateService.setMarketHours(formattedStartTime, formattedEndTime);

    const msgText = `장 시간이 ${formattedStartTime} ~ ${formattedEndTime}로 설정되었습니다.`;
    await ctx.reply(msgText);
    this.logger.log(msgText);
  };
}
