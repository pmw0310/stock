import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { TelegramCommand } from '@/telegram/commands/command.interface';
import { TelegramStateService } from '@/telegram/telegram-state.service';

/**
 * 텔레그램 명령어 예약('rsv ...')을 처리하는 핸들러 클래스입니다.
 */
@Injectable()
export class RsvCommand implements TelegramCommand {
  private readonly logger = new Logger(RsvCommand.name);

  constructor(private readonly stateService: TelegramStateService) {}

  /**
   * 입력된 명령어가 예약 명령어(rsv)인지 여부를 판단합니다.
   * @param command - 소문자 및 앞뒤 공백 제거된 명령어
   * @returns 처리 가능 여부
   */
  readonly canHandle = (command: string): boolean => {
    return command === 'rsv' || command.startsWith('rsv ');
  };

  /**
   * 예약 명령어를 처리합니다. (추가/삭제/목록조회)
   * @param ctx - 텔레그램 컨텍스트
   * @param command - 입력된 명령어 원본
   */
  readonly handle = async (ctx: Context, command: string): Promise<void> => {
    const parts = command.trim().split(/\s+/);

    if (parts.length < 2) {
      await ctx.reply(
        '사용법:\n' +
          '1. 예약 추가 (평일 매일): rsv {시간(HH:mm)} {명령어}\n' +
          '   예: rsv 10:00 buy 005930 5\n' +
          '2. 1회성 예약 추가: rsv once {시간(HH:mm)} {명령어}\n' +
          '   예: rsv once 10:00 buy 005930 5\n' +
          '3. 예약 목록: rsv list\n' +
          '4. 예약 삭제: rsv remove {일련번호}\n' +
          '5. 모든 예약 삭제: rsv remove all',
      );
      return;
    }

    const subCommand = parts[1].toLowerCase();

    // 1. 예약 목록 조회
    if (subCommand === 'list') {
      const reservations = this.stateService.getReservations();
      if (reservations.length === 0) {
        await ctx.reply('예약된 명령이 없습니다.');
        return;
      }

      const listMsg = reservations
        .map((r) => {
          const typeStr = r.isOnce ? '1회성' : '평일 매일';
          return `${r.id}. [${r.time} (${typeStr})] ${r.command}`;
        })
        .join('\n');

      await ctx.reply(`📅 <b>예약 목록</b>\n━━━━━━━━━━━━━━━━\n${listMsg}`, {
        parse_mode: 'HTML',
      });
      return;
    }

    // 2. 예약 삭제
    if (subCommand === 'remove') {
      if (parts.length < 3) {
        await ctx.reply('사용법: rsv remove {일련번호} 또는 rsv remove all');
        return;
      }

      const removeTarget = parts[2].toLowerCase();

      // 모든 예약 삭제
      if (removeTarget === 'all') {
        const count = this.stateService.removeAllReservations();
        await ctx.reply(`✅ 모든 예약(${count}개)이 삭제되었습니다.`);
        return;
      }

      // 특정 예약 삭제
      const id = parseInt(removeTarget, 10);
      if (isNaN(id)) {
        await ctx.reply('올바른 일련번호(숫자) 또는 all을 입력해주세요.');
        return;
      }

      const isRemoved = this.stateService.removeReservation(id);
      if (isRemoved) {
        await ctx.reply(`✅ 일련번호 ${id}번 예약이 삭제되었습니다.`);
      } else {
        await ctx.reply(
          `❌ 일련번호 ${id}번에 해당하는 예약을 찾을 수 없습니다.`,
        );
      }
      return;
    }

    // 3. 예약 추가 (rsv {시간} {명령어} 또는 rsv once {시간} {명령어})
    let timePart = '';
    let targetCommand = '';
    let isOnce = false;

    if (subCommand === 'once') {
      if (parts.length < 4) {
        await ctx.reply(
          '사용법: rsv once {시간(HH:mm)} {명령어}\n예: rsv once 10:00 buy 005930 5',
        );
        return;
      }
      timePart = parts[2];
      isOnce = true;

      // 예약할 명령어 추출 (rsv once {시간} 뒤의 나머지 텍스트 전체)
      const cmdStartIndex = command.indexOf(parts[2]) + parts[2].length;
      targetCommand = command.substring(cmdStartIndex).trim();
    } else {
      timePart = parts[1];
      isOnce = false;

      // 예약할 명령어 추출 (rsv {시간} 뒤의 나머지 텍스트 전체)
      const cmdStartIndex = command.indexOf(parts[1]) + parts[1].length;
      targetCommand = command.substring(cmdStartIndex).trim();
    }

    // 시간 정규화 및 검증
    if (/^\d:\d{2}$/.test(timePart)) {
      timePart = '0' + timePart;
    }

    const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timePart)) {
      await ctx.reply(
        '시간 형식이 올바르지 않습니다. 24시간제(HH:mm) 형식으로 입력해주세요. (예: 09:30 또는 15:00)',
      );
      return;
    }

    if (!targetCommand) {
      await ctx.reply(
        isOnce
          ? '예약할 명령어를 입력해주세요. (예: rsv once 10:00 buy 005930 5)'
          : '예약할 명령어를 입력해주세요. (예: rsv 10:00 buy 005930 5)',
      );
      return;
    }

    const reservation = this.stateService.addReservation(
      timePart,
      targetCommand,
      isOnce,
    );

    const typeDesc = isOnce ? '딱 한 번만 실행' : '주말 제외 평일 매일';

    await ctx.reply(
      `✅ <b>명령 예약 완료</b>\n━━━━━━━━━━━━━━━━\n` +
        `📌 <b>일련번호</b>: ${reservation.id}\n` +
        `⏰ <b>예약시간</b>: ${reservation.time} (${typeDesc})\n` +
        `💬 <b>명령어</b>: ${reservation.command}`,
      { parse_mode: 'HTML' },
    );
  };
}
