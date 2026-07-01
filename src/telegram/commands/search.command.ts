import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { TelegramCommand } from '@/telegram/commands/command.interface';
import { TelegramStateService } from '@/telegram/telegram-state.service';
import { Ka10001Service } from '@/kiwoom/ka10001.service';

/**
 * 주식 종목 검색 명령어('srch {종목코드}')를 처리하는 핸들러 클래스입니다.
 */
@Injectable()
export class SearchCommand implements TelegramCommand {
  private readonly logger = new Logger(SearchCommand.name);

  constructor(
    private readonly ka10001Service: Ka10001Service,
    private readonly stateService: TelegramStateService,
  ) {}

  /**
   * 해당 명령어가 검색 명령어인지 여부를 판단합니다.
   * @param command - 소문자 및 앞뒤 공백 제거된 명령어
   * @returns 처리 가능 여부
   */
  readonly canHandle = (command: string): boolean => {
    return command.startsWith('srch ');
  };

  /**
   * 검색 명령어를 실행하고 해당 종목의 정보를 응답합니다.
   * @param ctx - 텔레그램 컨텍스트
   * @param command - 입력된 명령어
   */
  readonly handle = async (ctx: Context, command: string): Promise<void> => {
    const parts = command.split(' ');
    if (parts.length < 2) {
      await ctx.reply('사용법: srch {종목코드}');
      return;
    }

    let stkCd = parts[1].trim().toUpperCase();
    if (!stkCd) {
      await ctx.reply('종목코드를 입력해주세요. (예: srch 005930)');
      return;
    }

    // 종목코드 앞의 'A' 제거 (7자리인 경우)
    if (stkCd.length === 7 && stkCd.startsWith('A')) {
      stkCd = stkCd.substring(1);
    }

    const token = this.stateService.getAccessToken();
    if (!token) {
      await ctx.reply(
        '로그인이 필요합니다. (명령어: login paper 또는 login real)',
      );
      return;
    }

    const useReal = this.stateService.getIsRealTrading();

    try {
      await ctx.reply(`[${stkCd}] 종목 정보를 조회중입니다...`);

      const response = await this.ka10001Service.getStockInfo(
        token,
        { stkCd },
        useReal,
      );

      if (response.returnCode !== 0) {
        await ctx.reply(`조회 실패: ${response.returnMsg}`);
        return;
      }

      // 종목 정보 포맷팅
      const msg = `
📊 <b>${response.stkNm} (${response.stkCd})</b>
  
💰 현재가: ${Number(response.curPrc).toLocaleString()}원
📈 등락율: ${response.fluRt}%
🔄 전일대비: ${Number(response.predPre).toLocaleString()}원
💵 시가총액: ${Number(response.mac).toLocaleString()}억원
📊 거래량: ${Number(response.trdeQty).toLocaleString()}주
📉 시가: ${Number(response.openPric).toLocaleString()}원
🔺 고가: ${Number(response.highPric).toLocaleString()}원
🔻 저가: ${Number(response.lowPric).toLocaleString()}원
      `.trim();

      await ctx.reply(msg, { parse_mode: 'HTML' });
      this.logger.log(`[성공] 종목조회 완료: ${stkCd}`);
    } catch (error: unknown) {
      this.logger.error(
        `[실패] 종목 정보 조회 중 오류 발생`,
        error instanceof Error ? error.stack : error,
      );
      await ctx.reply(
        `조회 중 오류가 발생하였습니다: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };
}
