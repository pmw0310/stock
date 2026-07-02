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
   * 해당 명령어가 설정 조회 명령어(stts) 또는 디폴트 초기화 명령어(stts default)인지 여부를 판단합니다.
   * @param command - 소문자 및 앞뒤 공백 제거된 명령어
   * @returns 처리 가능 여부
   */
  readonly canHandle = (command: string): boolean => {
    return command === 'stts' || command === 'stts default';
  };

  /**
   * 보안에 민감한 토큰 정보를 제외한 모든 설정 값을 포맷팅하여 사용자에게 반환하며,
   * 'stts default' 입력 시 설정 값을 기본값으로 되돌린 후 반환합니다.
   * @param ctx - 텔레그램 컨텍스트
   * @param command - 입력된 명령어
   */
  readonly handle = async (ctx: Context, command: string): Promise<void> => {
    try {
      let resetMsg = '';
      if (command === 'stts default') {
        this.stateService.resetToDefault();
        resetMsg = '⚙️ **모든 설정값이 기본값으로 초기화되었습니다.**\n\n';
      }

      const safeState = this.stateService.getSafeState();

      const formattedRenewalTime = `${String(safeState.renewalHour).padStart(2, '0')}:${String(safeState.renewalMinute).padStart(2, '0')}`;
      const tradingType = safeState.isRealTrading ? '실전투자' : '모의투자';
      const formattedTpr =
        safeState.tpr !== null && safeState.tpr !== undefined
          ? `${safeState.tpr}%`
          : '설정 안 됨';
      const formattedSlr =
        safeState.slr !== null && safeState.slr !== undefined
          ? `${safeState.slr}%`
          : '설정 안 됨';

      const message = [
        resetMsg + '⚙️ **현재 설정 정보 (stts)**',
        '',
        `• 투자 유형: ${tradingType}`,
        `• 토큰 자동 갱신 시간: ${formattedRenewalTime}`,
        `• 장 시작 시간: ${safeState.marketStartTime}`,
        `• 장 종료 시간: ${safeState.marketEndTime}`,
        `• 익절 기준: ${formattedTpr}`,
        `• 손절 기준: ${formattedSlr}`,
        `• 골든/데드 분봉: 단기 ${safeState.gdcrsShort ?? 5} / 장기 ${safeState.gdcrsLong ?? 20}`,
      ].join('\n');

      await ctx.reply(message);
      if (command === 'stts default') {
        this.logger.log(
          '설정 정보를 기본값으로 초기화하고 텔레그램으로 출력했습니다.',
        );
      } else {
        this.logger.log('현재 설정 상태 정보를 텔레그램으로 출력했습니다.');
      }
    } catch (error: unknown) {
      const errorMsg = `설정 정보를 처리하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMsg);
      await ctx.reply(errorMsg);
    }
  };
}
