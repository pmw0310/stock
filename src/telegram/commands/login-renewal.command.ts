import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { TelegramCommand } from '@/telegram/commands/command.interface';
import { TelegramStateService } from '@/telegram/telegram-state.service';

/**
 * 토큰 자동 갱신 시간 설정 명령어('login renewal {시간}')를 처리하는 핸들러 클래스입니다.
 */
@Injectable()
export class LoginRenewalCommand implements TelegramCommand {
  private readonly logger = new Logger(LoginRenewalCommand.name);

  constructor(private readonly stateService: TelegramStateService) {}

  /**
   * 해당 명령어가 자동 갱신 시간 변경 명령어인지 여부를 판단합니다.
   * @param command - 소문자 및 앞뒤 공백 제거된 명령어
   * @returns 처리 가능 여부
   */
  readonly canHandle = (command: string): boolean => {
    return command.startsWith('login renewal ');
  };

  /**
   * 자동 갱신 시간을 파싱하여 변경하고 일정을 재조정합니다.
   * @param ctx - 텔레그램 컨텍스트
   * @param command - 입력된 명령어
   */
  readonly handle = async (ctx: Context, command: string): Promise<void> => {
    const timeStr = command.replace('login renewal ', '').trim();
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    const match = timeStr.match(timeRegex);

    if (!match) {
      await ctx.reply(
        '올바른 시간 형식이 아닙니다. 예: login renewal 8:50 (24시간제 HH:mm)',
      );
      return;
    }

    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);

    this.stateService.setRenewalTime(hour, minute);

    const formattedHour = String(hour).padStart(2, '0');
    const formattedMinute = String(minute).padStart(2, '0');
    const msgText = `토큰 자동 갱신 시간이 ${formattedHour}:${formattedMinute}으로 변경되었습니다.`;

    await ctx.reply(msgText);
    this.logger.log(msgText);

    // 이미 로그인된 상태라면 새로운 시간에 맞춰 일정을 다시 조정합니다.
    if (this.stateService.getAccessToken()) {
      this.stateService.scheduleNextRenewal();
    }
  };
}
