import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { TelegramCommand } from '@/telegram/commands/command.interface';
import { TelegramStateService } from '@/telegram/telegram-state.service';
import { Kt10001Service } from '@/kiwoom/kt10001.service';
import { Kt00004Service } from '@/kiwoom/kt00004.service';
import { Kt10001RequestDto } from '@/kiwoom/dto/kt10001.dto';

/**
 * 주식 매도주문 명령어('sell {보유종목} {수량}')를 처리하는 핸들러 클래스입니다.
 */
@Injectable()
export class SellCommand implements TelegramCommand {
  private readonly logger = new Logger(SellCommand.name);

  constructor(
    private readonly kt10001Service: Kt10001Service,
    private readonly kt00004Service: Kt00004Service,
    private readonly stateService: TelegramStateService,
  ) {}

  /**
   * 해당 명령어가 매도 명령어인지 여부를 판단합니다.
   * @param command - 소문자 및 앞뒤 공백 제거된 명령어
   * @returns 처리 가능 여부
   */
  readonly canHandle = (command: string): boolean => {
    return command === 'sell' || command.startsWith('sell ');
  };

  /**
   * 매도 명령어를 실행하여 주식 매도주문을 전송합니다.
   * @param ctx - 텔레그램 컨텍스트
   * @param command - 입력된 명령어
   */
  readonly handle = async (ctx: Context, command: string): Promise<void> => {
    // 공백을 기준으로 명령어를 분리합니다.
    const parts = command.split(/\s+/);

    // 최소 'sell {보유종목} {수량}' 형식이 필요하므로 요소 개수는 최소 3개 이상이어야 합니다.
    if (parts.length < 3) {
      await ctx.reply(
        '사용법:\n시장가 매도: sell {보유종목(종목코드 또는 종목명)} {수량}',
      );
      return;
    }

    const rawStockInput = parts[1].trim();
    const qtyStr = parts[2].trim();

    // 로그인 토큰 획득
    const token = this.stateService.getAccessToken();
    if (!token) {
      await ctx.reply(
        '로그인이 필요합니다. (명령어: login paper 또는 login real)',
      );
      return;
    }

    const useReal = this.stateService.getIsRealTrading();

    // 수량 유효성 검사
    const ordQtyNum = Number(qtyStr);
    if (isNaN(ordQtyNum) || ordQtyNum <= 0 || !Number.isInteger(ordQtyNum)) {
      await ctx.reply('수량은 1 이상의 정수로 입력해주세요.');
      return;
    }

    let stkCd = rawStockInput.toUpperCase();

    // 종목코드 앞의 'A' 제거 (7자리인 경우)
    if (stkCd.length === 7 && stkCd.startsWith('A')) {
      stkCd = stkCd.substring(1);
    }

    // 종목코드 유효성 검사 (6자리 영숫자)
    const stkCdRegex = /^[0-9A-Z]{6}$/;
    if (!stkCdRegex.test(stkCd)) {
      // 6자리 영숫자가 아니면 종목명으로 판단하고 보유종목 리스트에서 찾습니다.
      try {
        await ctx.reply(
          `보유종목에서 '${rawStockInput}' 종목을 검색하는 중입니다...`,
        );
        const accountStatus = await this.kt00004Service.getAccountStatus(
          token,
          {
            qryTp: '0',
            dmstStexTp: 'KRX',
          },
          useReal,
        );

        if (accountStatus.returnCode !== 0) {
          await ctx.reply(`❌ 보유종목 조회 실패: ${accountStatus.returnMsg}`);
          return;
        }

        const matchedItem = accountStatus.stkAcntEvltPrst?.find(
          (item) => item.stkNm === rawStockInput,
        );

        if (!matchedItem) {
          await ctx.reply(
            `❌ 보유 중인 종목 중 '${rawStockInput}'에 해당하는 종목을 찾을 수 없습니다. 종목명 또는 종목코드를 확인해 주세요.`,
          );
          return;
        }

        stkCd = matchedItem.stkCd;

        // 보유종목에서 반환된 코드 앞의 'A' 또는 'a' 제거
        if (
          stkCd.length === 7 &&
          (stkCd.startsWith('a') || stkCd.startsWith('A'))
        ) {
          stkCd = stkCd.substring(1);
        }
      } catch (error: unknown) {
        this.logger.error(
          `보유종목 조회 중 오류 발생`,
          error instanceof Error ? error.stack : error,
        );
        await ctx.reply('보유종목을 조회하는 중 오류가 발생했습니다.');
        return;
      }
    }

    try {
      await ctx.reply(
        `[${stkCd}] 종목을 ${ordQtyNum}주 시장가로 매도 주문 중입니다...`,
      );

      const requestDto: Kt10001RequestDto = {
        dmstStexTp: 'KRX', // KRX 기본
        stkCd,
        ordQty: String(ordQtyNum),
        ordUv: '',
        trdeTp: '3', // 시장가 ('3')
      };

      const response = await this.kt10001Service.sellStock(
        token,
        requestDto,
        useReal,
      );

      if (response.returnCode !== 0) {
        await ctx.reply(`❌ 매도 주문 실패: ${response.returnMsg}`);
        return;
      }

      const msg = `
✅ <b>주식 매도 주문 완료</b>
━━━━━━━━━━━━━━━━
📌 <b>종목코드</b>: ${stkCd}
📦 <b>주문수량</b>: ${ordQtyNum.toLocaleString()}주
💰 <b>주문구분</b>: 시장가
🔢 <b>주문번호</b>: ${response.ordNo || 'N/A'}
━━━━━━━━━━━━━━━━
접수가 완료되었습니다.
      `.trim();

      await ctx.reply(msg, { parse_mode: 'HTML' });
      this.logger.log(
        `[성공] 매도 주문 완료. 종목: ${stkCd}, 수량: ${ordQtyNum}, 구분: 시장가`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `[실패] 주식 매도 주문 중 오류 발생`,
        error instanceof Error ? error.stack : error,
      );
      await ctx.reply(
        `매도 주문 중 오류가 발생하였습니다: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };
}
