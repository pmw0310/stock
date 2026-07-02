import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { TelegramCommand } from '@/telegram/commands/command.interface';
import { TelegramStateService } from '@/telegram/telegram-state.service';
import { Ka10001Service } from '@/kiwoom/ka10001.service';

/**
 * 골든크로스 및 데드크로스 감시 설정 및 종목을 관리하는 명령어('gdcrs')를 처리하는 핸들러 클래스입니다.
 */
@Injectable()
export class GdcrsCommand implements TelegramCommand {
  private readonly logger = new Logger(GdcrsCommand.name);

  constructor(
    private readonly stateService: TelegramStateService,
    private readonly ka10001Service: Ka10001Service,
  ) {}

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

      // 1. 인자가 없는 경우 도움말 및 현재 상태 출력
      if (!argsStr) {
        await this.showHelp(ctx);
        return;
      }

      // 2. 'add {종목코드} {금액}' 파싱
      const addMatch = argsStr.match(/^add\s+(\S+)\s+(\d+)$/i);
      if (addMatch) {
        let code = addMatch[1].trim().toUpperCase();
        if (code.length === 7 && code.startsWith('A')) {
          code = code.substring(1);
        }

        if (!/^[A-Z0-9]{6}$/.test(code)) {
          await ctx.reply(
            `❌ 올바르지 않은 종목코드 형식입니다. 6자리 영숫자 형식이어야 합니다. (예: 005930, 0001A0)`,
          );
          return;
        }

        const price = parseInt(addMatch[2], 10);
        if (isNaN(price) || price <= 0) {
          await ctx.reply(`❌ 금액은 0보다 큰 양의 정수여야 합니다.`);
          return;
        }

        // 실시간 종목 정보 조회 시도
        const token = this.stateService.getAccessToken();
        const useReal = this.stateService.getIsRealTrading();
        let name: string | undefined;

        if (token) {
          try {
            const response = await this.ka10001Service.getStockInfo(
              token,
              { stkCd: code },
              useReal,
            );
            if (response && response.returnCode === 0) {
              name = response.stkNm;
            }
          } catch (err: unknown) {
            this.logger.warn(
              `종목 정보 실시간 조회 중 오류 발생: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }

        this.stateService.addGdcrsStock(code, price, name);

        if (name) {
          await ctx.reply(
            `✅ 골든크로스 감시 목록에 추가되었습니다.\n• 종목명: <b>${name} (${code})</b>\n• 감시금액: ${price.toLocaleString()}원`,
            { parse_mode: 'HTML' },
          );
        } else {
          await ctx.reply(
            `⚠️ 종목 정보를 조회하지 못했으나(또는 미로그인), 종목코드(<b>${code}</b>)로 목록에 강제 추가했습니다.\n• 감시금액: ${price.toLocaleString()}원`,
            { parse_mode: 'HTML' },
          );
        }
        return;
      }

      // 3. 'list' 파싱
      if (argsStr.toLowerCase() === 'list') {
        const stocks = this.stateService.getGdcrsStocks();
        if (stocks.length === 0) {
          await ctx.reply(`📋 골든크로스 감시 목록이 비어 있습니다.`);
          return;
        }

        const items = stocks.map((stock, i) => {
          const nameStr = stock.name ? `${stock.name} ` : '';
          return `${i + 1}. ${nameStr}(${stock.code}) - ${stock.price.toLocaleString()}원`;
        });

        const message = `📋 <b>골든크로스 감시 목록 (총 ${stocks.length}개)</b>\n\n${items.join('\n')}`;
        await ctx.reply(message, { parse_mode: 'HTML' });
        return;
      }

      // 4. 'remove {번호}' 파싱
      const removeMatch = argsStr.match(/^remove\s+(\d+)$/i);
      if (removeMatch) {
        const index = parseInt(removeMatch[1], 10);
        if (isNaN(index) || index <= 0) {
          await ctx.reply(
            `❌ 올바른 번호를 입력해 주세요. 번호는 1부터 시작합니다.`,
          );
          return;
        }

        const success = this.stateService.removeGdcrsStockByIndex(index - 1);
        if (success) {
          await ctx.reply(
            `✅ 골든크로스 감시 목록에서 ${index}번 항목을 삭제했습니다.`,
          );
        } else {
          await ctx.reply(
            `❌ 유효하지 않은 번호입니다. gdcrs list 명령어로 번호를 확인해 주세요.`,
          );
        }
        return;
      }

      // 5. 'intv {단기} {장기}' 또는 '{단기} {장기}' 형태 파싱 (기존 기능)
      const intvMatch = argsStr.match(/^(?:intv\s+)?(\d+)\s+(\d+)$/);
      if (intvMatch) {
        const shortVal = parseInt(intvMatch[1], 10);
        const longVal = parseInt(intvMatch[2], 10);

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

        if (shortVal >= longVal) {
          await ctx.reply(
            `⚠️ 단기 값(${shortVal})은 장기 값(${longVal})보다 작아야 합니다.`,
          );
          return;
        }

        this.stateService.setGdcrsIntervals(shortVal, longVal);
        const updatedShort = this.stateService.getGdcrsShort();
        const updatedLong = this.stateService.getGdcrsLong();

        const msgText = `골든크로스/데드크로스 분봉 값이 단기 ${updatedShort}, 장기 ${updatedLong}으로 설정되었습니다.`;
        await ctx.reply(msgText);
        this.logger.log(msgText);
        return;
      }

      // 6. 매칭되는 명령어가 없는 경우 오류 메시지 및 도움말 출력
      await ctx.reply(`❌ 올바른 gdcrs 명령어가 아닙니다.`);
      await this.showHelp(ctx);
    } catch (error: unknown) {
      const errorMsg = `골든크로스 설정을 처리하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMsg);
      await ctx.reply(errorMsg);
    }
  };

  /**
   * 골든크로스 설정 및 감시 목록 명령어 사용법 도움말을 출력합니다.
   * @param ctx - 텔레그램 컨텍스트
   */
  private readonly showHelp = async (ctx: Context): Promise<void> => {
    const shortVal = this.stateService.getGdcrsShort();
    const longVal = this.stateService.getGdcrsLong();
    const stocksCount = this.stateService.getGdcrsStocks().length;

    const message = [
      `📈 <b>골든크로스 설정 및 감시 목록</b>`,
      ``,
      `• 설정된 분봉 값: 단기 ${shortVal} / 장기 ${longVal}`,
      `• 감시 중인 종목 수: ${stocksCount}개`,
      ``,
      `<b>[명령어 사용법]</b>`,
      `• <code>gdcrs add {종목코드} {금액}</code> - 골든크로스 목록에 종목 추가`,
      `• <code>gdcrs list</code> - 번호와 함께 목록 조회`,
      `• <code>gdcrs remove {번호}</code> - 해당 번호의 항목 삭제`,
      `• <code>gdcrs intv {단기} {장기}</code> - 단기/장기 분봉 값 설정 (1~60)`,
      ``,
      `예시:`,
      `• <code>gdcrs add 005930 60000</code>`,
      `• <code>gdcrs intv 5 20</code>`,
    ].join('\n');

    await ctx.reply(message, { parse_mode: 'HTML' });
  };
}
