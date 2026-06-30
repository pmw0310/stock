import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { TelegramCommand } from '@/telegram/commands/command.interface';
import { TelegramStateService } from '@/telegram/telegram-state.service';

/**
 * 텔레그램 봇을 통해 현재 설정된 상태 값들 중 보안 정보를 제외한 값들을 출력하는 명령어('stts')를 처리하는 핸들러 클래스입니다.
 */
@Injectable()
export class SttsCommand implements TelegramCommand {
  private readonly logger = new Logger(SttsCommand.name);

  constructor(private readonly stateService: TelegramStateService) {}

  /**
   * 해당 명령어가 설정 조회 명령어(stts)인지 여부를 판단합니다.
   * @param command - 소문자 및 앞뒤 공백 제거된 명령어
   * @returns 처리 가능 여부
   */
  readonly canHandle = (command: string): boolean => {
    return command === 'stts';
  };

  /**
   * 보안에 민감한 토큰 정보를 제외한 모든 설정 값을 포맷팅하여 사용자에게 반환합니다.
   * @param ctx - 텔레그램 컨텍스트
   * @param command - 입력된 명령어
   */
  readonly handle = async (ctx: Context): Promise<void> => {
    try {
      const safeState = this.stateService.getSafeState();

      const formattedRenewalTime = `${String(safeState.renewalHour).padStart(2, '0')}:${String(safeState.renewalMinute).padStart(2, '0')}`;
      const tradingType = safeState.isRealTrading ? '실전투자' : '모의투자';

      const message = [
        '⚙️ **현재 설정 정보 (stts)**',
        '',
        `• 투자 유형: ${tradingType}`,
        `• 토큰 자동 갱신 시간: ${formattedRenewalTime}`,
        `• 장 시작 시간: ${safeState.marketStartTime}`,
        `• 장 종료 시간: ${safeState.marketEndTime}`,
      ].join('\n');

      await ctx.reply(message);
      this.logger.log('현재 설정 상태 정보를 텔레그램으로 출력했습니다.');
    } catch (error: unknown) {
      const errorMsg = `설정 정보를 조회하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMsg);
      await ctx.reply(errorMsg);
    }
  };
}
