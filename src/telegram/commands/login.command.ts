import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { TelegramCommand } from '@/telegram/commands/command.interface';
import { TelegramStateService } from '@/telegram/telegram-state.service';
import { Au10001Service } from '@/kiwoom/au10001.service';

/**
 * 로그인 명령어('login paper', 'login real')를 처리하는 핸들러 클래스입니다.
 */
@Injectable()
export class LoginCommand implements TelegramCommand {
  private readonly logger = new Logger(LoginCommand.name);

  constructor(
    private readonly au10001Service: Au10001Service,
    private readonly stateService: TelegramStateService,
  ) {}

  /**
   * 해당 명령어가 로그인 명령어인지 여부를 판단합니다.
   * @param command - 소문자 및 앞뒤 공백 제거된 명령어
   * @returns 처리 가능 여부
   */
  readonly canHandle = (command: string): boolean => {
    return command === 'login paper' || command === 'login real';
  };

  /**
   * 로그인 명령어를 실행하고 토큰을 발급받아 상태에 저장합니다.
   * @param ctx - 텔레그램 컨텍스트
   * @param command - 입력된 명령어
   */
  readonly handle = async (ctx: Context, command: string): Promise<void> => {
    const useReal = command === 'login real';
    const tradingType = useReal ? '실전투자' : '모의투자';

    try {
      await ctx.reply(`${tradingType} 로그인을 시도합니다...`);
      const response = await this.au10001Service.issueAccessToken(useReal);

      if (response.token) {
        this.stateService.setLoginInfo(
          response.token,
          useReal,
          response.expiresDt,
        );

        await ctx.reply(`${tradingType} 로그인 성공!`);
        this.logger.log(
          `[성공] ${tradingType} 토큰 발급 완료. 토큰: ${response.token}`,
        );

        // 로그인 성공 시 자동 갱신 일정 예약
        this.stateService.scheduleNextRenewal();
      } else {
        await ctx.reply(`${tradingType} 로그인 실패. 토큰을 받지 못했습니다.`);
        this.logger.warn(
          `[실패] ${tradingType} 토큰 발급 응답에 token 필드가 없습니다.`,
        );
      }
    } catch (error: unknown) {
      this.logger.error(
        `[실패] ${tradingType} 로그인 중 오류 발생`,
        error instanceof Error ? error.stack : error,
      );
      await ctx.reply(
        `${tradingType} 로그인 중 오류가 발생하였습니다: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };
}
