import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { TelegramCommand } from '@/telegram/commands/command.interface';
import { TelegramStateService } from '@/telegram/telegram-state.service';
import { Kt00004Service } from '@/kiwoom/kt00004.service';
import { Kt00004RequestDto } from '@/kiwoom/dto/kt00004.dto';

/**
 * 자금현황 및 보유종목 보고 명령어('report' 또는 'r')를 처리하는 핸들러 클래스입니다.
 */
@Injectable()
export class ReportCommand implements TelegramCommand {
  private readonly logger = new Logger(ReportCommand.name);

  constructor(
    private readonly kt00004Service: Kt00004Service,
    private readonly stateService: TelegramStateService,
  ) {}

  /**
   * 해당 명령어가 보고 명령어인지 여부를 판단합니다.
   * @param command - 소문자 및 앞뒤 공백 제거된 명령어
   * @returns 처리 가능 여부
   */
  readonly canHandle = (command: string): boolean => {
    return (
      command === 'report' ||
      command === 'r' ||
      command.startsWith('report ') ||
      command.startsWith('r ')
    );
  };

  /**
   * 자금현황과 보유종목 조회를 수행하여 텔레그램 응답을 보냅니다.
   * @param ctx - 텔레그램 컨텍스트
   * @param command - 입력된 명령어
   */
  readonly handle = async (ctx: Context): Promise<void> => {
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
      await ctx.reply('📊 자금현황 및 보유종목을 조회 중입니다...');

      const requestDto: Kt00004RequestDto = {
        qryTp: '0', // 전체 조회
        dmstStexTp: 'KRX', // 기본 한국거래소
      };

      const response = await this.kt00004Service.getAccountStatus(
        token,
        requestDto,
        useReal,
      );

      if (response.returnCode !== 0) {
        await ctx.reply(`❌ 계좌 조회 실패: ${response.returnMsg}`);
        return;
      }

      // 문자열 금액 포맷 변환 헬퍼 함수
      const formatAmount = (val?: string): string => {
        if (!val) return '0원';
        const num = Number(val);
        return `${num.toLocaleString()}원`;
      };

      // 문자열 손익율 포맷 변환 헬퍼 함수
      const formatRatio = (val?: string): string => {
        if (!val) return '0.00%';
        const num = Number(val);
        const sign = num > 0 ? '+' : '';
        return `${sign}${num.toFixed(2)}%`;
      };

      // 손익에 따른 이모지 헬퍼 함수
      const getProfitEmoji = (val?: string): string => {
        if (!val) return '⚪';
        const num = Number(val);
        if (num > 0) return '🔴';
        if (num < 0) return '🔵';
        return '⚪';
      };

      // 1. 자금 현황 가공
      const acntNm = response.acntNm || 'N/A';
      const entr = formatAmount(response.entr);
      const d2Entra = formatAmount(response.d2Entra);
      const asetEvltAmt = formatAmount(response.asetEvltAmt);
      const totPurAmt = formatAmount(response.totPurAmt);
      const lspft = formatAmount(response.lspft);
      const lspftRt = formatRatio(response.lspftRt);
      const lspftEmoji = getProfitEmoji(response.lspft);

      // 투자 타입 설명
      const investType = useReal ? '🔥 실전투자' : '🌱 모의투자';

      let msg = `
<b>📊 [${investType}] 자금현황 보고</b>
━━━━━━━━━━━━━━━━
👤 <b>계좌주명</b>: ${acntNm}
💰 <b>예수금 (현금)</b>: ${entr}
⏳ <b>D+2 추정예수금</b>: ${d2Entra}
💵 <b>예탁자산평가액</b>: ${asetEvltAmt}
📦 <b>총 매입금액</b>: ${totPurAmt}
⚖️ <b>누적투자손익</b>: ${lspftEmoji} ${lspft} (${lspftRt})
━━━━━━━━━━━━━━━━
\n`;

      // 2. 보유 종목 가공
      const holdings = response.stkAcntEvltPrst || [];
      const activeHoldings = holdings.filter(
        (item) => Number(item.rmndQty) > 0,
      );

      if (activeHoldings.length === 0) {
        msg += '📭 <b>현재 보유 중인 종목이 없습니다.</b>';
      } else {
        msg += `<b>📋 보유 종목 (${activeHoldings.length}개)</b>\n`;
        activeHoldings.forEach((item, index) => {
          const qty = Number(item.rmndQty).toLocaleString();
          const avg = Number(item.avgPrc).toLocaleString();
          const cur = Number(item.curPrc).toLocaleString();
          const evlt = formatAmount(item.evltAmt);
          const pl = formatAmount(item.plAmt);
          const plRt = formatRatio(item.plRt);
          const emoji = getProfitEmoji(item.plAmt);
          // 종목코드는 'A005930' 과 같이 접두어가 붙어 있으므로, 출력 시 접두어 제거
          let cleanCd = item.stkCd;
          if (cleanCd.length === 7 && /^[A-Z]/i.test(cleanCd)) {
            cleanCd = cleanCd.substring(1);
          }

          msg += `
${index + 1}. <b>${item.stkNm}</b> (${cleanCd})
   • 보유수량: ${qty}주
   • 평균단가: ${avg}원 | 현재가: ${cur}원
   • 평가금액: ${evlt}
   • 평가손익: ${emoji} ${pl} (${plRt})
`;
        });
      }

      await ctx.reply(msg.trim(), { parse_mode: 'HTML' });
      this.logger.log(`[성공] 자금현황 및 보유종목 보고 완료.`);
    } catch (error: unknown) {
      this.logger.error(
        `[실패] 계좌 평가 현황 조회 중 오류 발생`,
        error instanceof Error ? error.stack : error,
      );
      await ctx.reply(
        `계좌 조회 중 오류가 발생하였습니다: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };
}
