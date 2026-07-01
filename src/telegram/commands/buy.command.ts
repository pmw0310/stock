import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { TelegramCommand } from '@/telegram/commands/command.interface';
import { TelegramStateService } from '@/telegram/telegram-state.service';
import { Kt10000Service } from '@/kiwoom/kt10000.service';
import { Kt10000RequestDto } from '@/kiwoom/dto/kt10000.dto';

/**
 * 주식 매수주문 명령어('buy {종목코드} {수량} [지정가]')를 처리하는 핸들러 클래스입니다.
 */
@Injectable()
export class BuyCommand implements TelegramCommand {
  private readonly logger = new Logger(BuyCommand.name);

  constructor(
    private readonly kt10000Service: Kt10000Service,
    private readonly stateService: TelegramStateService,
  ) {}

  /**
   * 해당 명령어가 매수 명령어인지 여부를 판단합니다.
   * @param command - 소문자 및 앞뒤 공백 제거된 명령어
   * @returns 처리 가능 여부
   */
  readonly canHandle = (command: string): boolean => {
    return command === 'buy' || command.startsWith('buy ');
  };

  /**
   * 매수 명령어를 실행하여 주식 매수주문을 전송합니다.
   * @param ctx - 텔레그램 컨텍스트
   * @param command - 입력된 명령어
   */
  readonly handle = async (ctx: Context, command: string): Promise<void> => {
    // 공백을 기준으로 명령어를 분리합니다.
    const parts = command.split(/\s+/);

    // 최소 'buy {종목코드} {수량}' 형식이 필요하므로 요소 개수는 최소 3개 이상이어야 합니다.
    if (parts.length < 3) {
      await ctx.reply(
        '사용법:\n시장가 매수: buy {종목코드} {수량}\n지정가 매수: buy {종목코드} {수량} {지정가}',
      );
      return;
    }

    let stkCd = parts[1].trim().toUpperCase();
    const qtyStr = parts[2].trim();
    const prcStr = parts[3]?.trim();

    // 종목코드 앞의 'A' 제거 (7자리인 경우)
    if (stkCd.length === 7 && stkCd.startsWith('A')) {
      stkCd = stkCd.substring(1);
    }

    // 종목코드 유효성 검사 (6자리 영숫자)
    const stkCdRegex = /^[0-9A-Z]{6}$/;
    if (!stkCdRegex.test(stkCd)) {
      await ctx.reply(
        '종목코드는 6자리 영숫자여야 합니다. (예: 005930, 0001A0)',
      );
      return;
    }

    // 수량 유효성 검사
    const ordQtyNum = Number(qtyStr);
    if (isNaN(ordQtyNum) || ordQtyNum <= 0 || !Number.isInteger(ordQtyNum)) {
      await ctx.reply('수량은 1 이상의 정수로 입력해주세요.');
      return;
    }

    // 가격 유효성 검사 및 매매구분 설정
    let ordUvStr = '';
    let trdeTp: Kt10000RequestDto['trdeTp'] = '3'; // 기본값: 시장가 ('3')
    let typeName = '시장가';

    if (prcStr) {
      const priceVal = Number(prcStr);
      if (isNaN(priceVal) || priceVal <= 0 || !Number.isInteger(priceVal)) {
        await ctx.reply('지정가는 1 이상의 정수로 입력해주세요.');
        return;
      }
      ordUvStr = String(priceVal);
      trdeTp = '0'; // 지정가 ('0')
      typeName = '지정가';
    }

    // 로그인 토큰 획득
    const token = this.stateService.getAccessToken();
    if (!token) {
      await ctx.reply(
        '로그인이 필요합니다. (명령어: login paper 또는 login real)',
      );
      return;
    }

    const useReal = this.stateService.getIsRealTrading();

    try {
      const orderTypeDesc = prcStr
        ? `${Number(prcStr).toLocaleString()}원 지정가`
        : '시장가';
      await ctx.reply(
        `[${stkCd}] 종목을 ${ordQtyNum}주 ${orderTypeDesc}로 매수 주문 중입니다...`,
      );

      const requestDto: Kt10000RequestDto = {
        dmstStexTp: 'KRX', // KRX 기본
        stkCd,
        ordQty: String(ordQtyNum),
        ordUv: ordUvStr,
        trdeTp,
      };

      const response = await this.kt10000Service.buyStock(
        token,
        requestDto,
        useReal,
      );

      if (response.returnCode !== 0) {
        await ctx.reply(`❌ 매수 주문 실패: ${response.returnMsg}`);
        return;
      }

      const msg = `
✅ <b>주식 매수 주문 완료</b>
━━━━━━━━━━━━━━━━
📌 <b>종목코드</b>: ${stkCd}
📦 <b>주문수량</b>: ${ordQtyNum.toLocaleString()}주
💰 <b>주문구분</b>: ${typeName} ${prcStr ? `(${Number(prcStr).toLocaleString()}원)` : ''}
🔢 <b>주문번호</b>: ${response.ordNo || 'N/A'}
━━━━━━━━━━━━━━━━
접수가 완료되었습니다.
      `.trim();

      await ctx.reply(msg, { parse_mode: 'HTML' });
      this.logger.log(
        `[성공] 매수 주문 완료. 종목: ${stkCd}, 수량: ${ordQtyNum}, 구분: ${typeName}`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `[실패] 주식 매수 주문 중 오류 발생`,
        error instanceof Error ? error.stack : error,
      );
      await ctx.reply(
        `매수 주문 중 오류가 발생하였습니다: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };
}
