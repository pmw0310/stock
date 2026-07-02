import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { TelegramCommand } from '@/telegram/commands/command.interface';
import { TelegramStateService } from '@/telegram/telegram-state.service';

/**
 * 골든크로스 및 데드크로스를 위한 단기/장기 분봉 값을 지정하는 명령어('gdcrs')를 처리하는 핸들러 클래스입니다.
 */
@Injectable()
export class GdcrsCommand implements TelegramCommand {
  private readonly logger = new Logger(GdcrsCommand.name);

  constructor(private readonly stateService: TelegramStateService) {}

  /**
   * 해당 명령어가 골든크로스/데드크로스 분봉 설정 명령어(gdcrs)인지 여부를 판단합니다.
   * @param command - 소문자 및 앞뒤 공백 제거된 명령어
   * @returns 처리 가능 여부
   */
  readonly canHandle = (command: string): boolean => {
    return command === 'gdcrs' || command.startsWith('gdcrs ');
  };

  /**
   * 단기 및 장기 분봉 값을 파싱하여 설정하거나 현재 저장된 값을 출력합니다.
   * @param ctx - 텔레그램 컨텍스트
   * @param command - 입력된 명령어
   */
  readonly handle = async (ctx: Context, command: string): Promise<void> => {
    try {
      const argsStr = command.substring(5).trim();

      if (!argsStr) {
        // 인자가 없는 경우 현재 설정 상태 출력
        const shortVal = this.stateService.getGdcrsShort();
        const longVal = this.stateService.getGdcrsLong();
        await ctx.reply(
          `현재 설정된 골든크로스/데드크로스 분봉 값:\n• 단기: ${shortVal}\n• 장기: ${longVal}\n\n[설정 방법]\ngdcrs intv {단기} {장기}\n예: gdcrs intv 5 20 (각각 5와 20으로 저장)`,
        );
        return;
      }

      // 'intv {단기} {장기}' 또는 '{단기} {장기}' 형태 파싱
      const match = argsStr.match(/^(?:intv\s+)?(\d+)\s+(\d+)$/);
      if (!match) {
        await ctx.reply(
          `❌ 올바른 명령어 형식이 아닙니다.\n사용법: gdcrs intv {단기} {장기}\n예: gdcrs intv 5 20`,
        );
        return;
      }

      const shortVal = parseInt(match[1], 10);
      const longVal = parseInt(match[2], 10);

      // 범위 유효성 검사 (1~60)
      if (
        isNaN(shortVal) ||
        isNaN(longVal) ||
        shortVal < 1 ||
        shortVal > 60 ||
        longVal < 1 ||
        longVal > 60
      ) {
        await ctx.reply(
          `❌ 단기와 장기 분봉 값은 1에서 60 사이의 정수여야 합니다.`,
        );
        return;
      }

      // 논리적 대소 비교 검사 (단기 < 장기)
      if (shortVal >= longVal) {
        await ctx.reply(
          `⚠️ 단기 값(${shortVal})은 장기 값(${longVal})보다 작아야 합니다. 다시 설정해주세요.`,
        );
        return;
      }

      this.stateService.setGdcrsIntervals(shortVal, longVal);
      const updatedShort = this.stateService.getGdcrsShort();
      const updatedLong = this.stateService.getGdcrsLong();

      const msgText = `골든크로스/데드크로스 분봉 값이 단기 ${updatedShort}, 장기 ${updatedLong}으로 설정되었습니다.`;
      await ctx.reply(msgText);
      this.logger.log(msgText);
    } catch (error: unknown) {
      const errorMsg = `골든크로스/데드크로스 분봉 설정을 처리하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMsg);
      await ctx.reply(errorMsg);
    }
  };
}
