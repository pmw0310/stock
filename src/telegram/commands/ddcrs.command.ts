import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { TelegramCommand } from '@/telegram/commands/command.interface';
import { TelegramStateService } from '@/telegram/telegram-state.service';
import { Kt00004Service } from '@/kiwoom/kt00004.service';

/**
 * 텔레그램 봇의 데드크로스 감시 명령어('ddcrs')를 처리하는 핸들러 클래스입니다.
 */
@Injectable()
export class DdcrsCommand implements TelegramCommand {
  private readonly logger = new Logger(DdcrsCommand.name);

  constructor(
    private readonly stateService: TelegramStateService,
    private readonly kt00004Service: Kt00004Service,
  ) {}

  /**
   * 해당 명령어가 데드크로스 명령어인지 여부를 판단합니다.
   * @param command - 소문자 및 앞뒤 공백 제거된 명령어
   * @returns 처리 가능 여부
   */
  readonly canHandle = (command: string): boolean => {
    return (
      command === 'ddcrs' ||
      command === 'start ddcrs' ||
      command === 'stop ddcrs'
    );
  };

  /**
   * 데드크로스 명령어를 실행하여 데드크로스 감시 상태를 조작하거나 상태를 출력합니다.
   * @param ctx - 텔레그램 컨텍스트
   * @param command - 입력된 명령어
   */
  readonly handle = async (ctx: Context, command: string): Promise<void> => {
    try {
      if (command === 'start ddcrs') {
        this.stateService.setIsDdcrsRunning(true);
        await ctx.reply(
          `✅ 데드크로스 감시 및 자동 매도 스케줄러가 활성화되었습니다.`,
        );
        this.logger.log(`데드크로스 감시 시작 명령 수신`);
        return;
      }

      if (command === 'stop ddcrs') {
        this.stateService.setIsDdcrsRunning(false);
        await ctx.reply(`⏸️ 데드크로스 감시 스케줄러가 중지되었습니다.`);
        this.logger.log(`데드크로스 감시 중지 명령 수신`);
        return;
      }

      if (command === 'ddcrs') {
        await this.showStatus(ctx);
        return;
      }
    } catch (error: unknown) {
      this.logger.error(
        `데드크로스 명령어 처리 중 오류 발생`,
        error instanceof Error ? error.stack : error,
      );
      await ctx.reply('데드크로스 명령어 처리 중 오류가 발생했습니다.');
    }
  };

  /**
   * 데드크로스 감시 상태를 텔레그램으로 전송합니다.
   * @param ctx - 텔레그램 컨텍스트
   */
  private readonly showStatus = async (ctx: Context): Promise<void> => {
    const isRunning = this.stateService.getIsDdcrsRunning();

    let stocksCount = 0;
    const token = this.stateService.getAccessToken();
    if (token) {
      try {
        const useReal = this.stateService.getIsRealTrading();
        const accountStatus = await this.kt00004Service.getAccountStatus(
          token,
          {
            qryTp: '0',
            dmstStexTp: 'KRX',
          },
          useReal,
        );
        if (accountStatus.returnCode === 0 && accountStatus.stkAcntEvltPrst) {
          stocksCount = accountStatus.stkAcntEvltPrst.filter(
            (s) => parseInt(s.rmndQty, 10) > 0,
          ).length;
        }
      } catch (err) {
        this.logger.error(`데드크로스 감시 종목 수 조회 실패`, err);
      }
    }

    const statusMsg = [
      `📉 <b>[데드크로스 감시 상태]</b>`,
      `• 상태: ${isRunning ? '✅ 활성화됨' : '⏸️ 중지됨'}`,
      `• 감시 중인 종목 수: ${stocksCount}개`,
      ``,
      `<b>[명령어 사용법]</b>`,
      `• <code>start ddcrs</code> - 데드크로스 감시 시작`,
      `• <code>stop ddcrs</code> - 데드크로스 감시 중단`,
    ].join('\n');

    await ctx.reply(statusMsg, { parse_mode: 'HTML' });
  };
}
