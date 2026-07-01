import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { TelegramCommand } from '@/telegram/commands/command.interface';
import { TelegramStateService } from '@/telegram/telegram-state.service';
import { Ka10032Service } from '@/kiwoom/ka10032.service';
import { Ka10027Service } from '@/kiwoom/ka10027.service';
import { Ka10030Service } from '@/kiwoom/ka10030.service';
import { Ka00198Service } from '@/kiwoom/ka00198.service';

/**
 * 텔레그램 봇에서 특정 기준별 상위 20개 종목 순위를 조회하는 명령어('rank')를 처리하는 핸들러 클래스입니다.
 */
@Injectable()
export class RankCommand implements TelegramCommand {
  private readonly logger = new Logger(RankCommand.name);

  constructor(
    private readonly stateService: TelegramStateService,
    private readonly ka10032Service: Ka10032Service,
    private readonly ka10027Service: Ka10027Service,
    private readonly ka10030Service: Ka10030Service,
    private readonly ka00198Service: Ka00198Service,
  ) {}

  /**
   * 전일대비 기호를 이모지로 반환합니다.
   * @param sig - 전일대비기호 (1: 상한가, 2:상승, 3:보합, 4:하한가, 5:하락)
   * @returns 이모지
   */
  private readonly getTrendEmoji = (sig: string): string => {
    switch (sig) {
      case '1':
        return '🔥'; // 상한가
      case '2':
        return '🔴'; // 상승
      case '3':
        return '⚪'; // 보합
      case '4':
        return '❄️'; // 하한가
      case '5':
        return '🔵'; // 하락
      default:
        return '⚪';
    }
  };

  /**
   * 인기검색 순위 변동을 텍스트로 반환합니다.
   * @param sign - 순위 등락 부호 (+, -, N 등)
   * @param chg - 순위 등락 값
   * @returns 포맷팅된 순위 변동 텍스트
   */
  private readonly getRankChangeText = (sign: string, chg: string): string => {
    const val = Math.abs(parseInt(chg, 10));
    if (sign === 'N' || isNaN(val) || val === 0) return '보합(⚪)';
    if (sign === '+') return `상승(🔺${val})`;
    if (sign === '-') return `하락(🔻${val})`;
    return '-';
  };

  /**
   * 해당 명령어가 rank 명령어인지 여부를 판단합니다.
   * @param command - 소문자 및 앞뒤 공백 제거된 명령어
   * @returns 처리 가능 여부
   */
  readonly canHandle = (command: string): boolean => {
    return command === 'rank' || command.startsWith('rank ');
  };

  /**
   * rank 명령어 로직을 처리합니다.
   * @param ctx - 텔레그램 컨텍스트
   * @param command - 실행된 명령어 문자열
   */
  readonly handle = async (ctx: Context, command: string): Promise<void> => {
    try {
      const parts = command.split(' ');

      if (parts.length === 1) {
        // 메뉴 출력
        const menuMsg = [
          '🏆 <b>순위 조회 메뉴</b>',
          '원하시는 기준의 번호를 입력하세요. (예: <code>rank 1</code>)',
          '',
          '1️⃣ <b>거래대금 상위 종목</b>',
          '2️⃣ <b>상승률 상위 종목</b>',
          '3️⃣ <b>거래량 상위 종목</b>',
          '4️⃣ <b>인기검색 상위 종목</b>',
        ].join('\n');
        await ctx.reply(menuMsg, { parse_mode: 'HTML' });
        return;
      }

      const token = this.stateService.getAccessToken();
      if (!token) {
        await ctx.reply('로그인이 필요합니다. 먼저 로그인해주세요.');
        return;
      }

      const useReal = this.stateService.getIsRealTrading();
      const option = parts[1];

      await ctx.reply('⏳ 순위 데이터를 조회 중입니다...');

      if (option === '1') {
        const response = await this.ka10032Service.getStockRank(
          token,
          { mrktTp: '000', mangStkIncls: '1', stexTp: '3' },
          useReal,
        );
        const list = response.trdePricaUpper?.slice(0, 20) || [];
        if (list.length === 0) {
          await ctx.reply('조회된 데이터가 없습니다.');
          return;
        }
        const lines = list.map((item, idx) => {
          const rank = String(idx + 1).padStart(2, '0');
          const curPrc = parseInt(
            item.curPrc.replace(/^[+-]/, ''),
            10,
          ).toLocaleString();
          const trdePrica = parseInt(item.trdePrica, 10).toLocaleString();
          const emoji = this.getTrendEmoji(item.predPreSig);
          return `${emoji} <b>[${rank}]</b> <b>${item.stkNm}</b> (<code>${item.stkCd}</code>) | <b>${curPrc}원</b> (<code>${item.fluRt}%</code>) | 대금: <code>${trdePrica}백만</code>`;
        });
        await ctx.reply(
          `🏆 <b>거래대금 상위 Top 20</b>\n\n${lines.join('\n')}`,
          { parse_mode: 'HTML' },
        );
      } else if (option === '2') {
        const response = await this.ka10027Service.getStockRank(
          token,
          {
            mrktTp: '000',
            sortTp: '1',
            trdeQtyCnd: '0000',
            stkCnd: '0',
            crdCnd: '0',
            updownIncls: '1',
            pricCnd: '0',
            trdePricaCnd: '0',
            stexTp: '3',
          },
          useReal,
        );
        const list = response.predPreFluRtUpper?.slice(0, 20) || [];
        if (list.length === 0) {
          await ctx.reply('조회된 데이터가 없습니다.');
          return;
        }
        const lines = list.map((item, idx) => {
          const rank = String(idx + 1).padStart(2, '0');
          const curPrc = parseInt(
            item.curPrc.replace(/^[+-]/, ''),
            10,
          ).toLocaleString();
          const nowTrdeQty = parseInt(item.nowTrdeQty, 10).toLocaleString();
          const emoji = this.getTrendEmoji(item.predPreSig);
          return `${emoji} <b>[${rank}]</b> <b>${item.stkNm}</b> (<code>${item.stkCd}</code>) | <b>${curPrc}원</b> (<code>${item.fluRt}%</code>) | 거래량: <code>${nowTrdeQty}주</code>`;
        });
        await ctx.reply(`🏆 <b>상승률 상위 Top 20</b>\n\n${lines.join('\n')}`, {
          parse_mode: 'HTML',
        });
      } else if (option === '3') {
        const response = await this.ka10030Service.getStockRank(
          token,
          {
            mrktTp: '000',
            sortTp: '1',
            mangStkIncls: '0',
            crdTp: '0',
            trdeQtyTp: '0',
            pricTp: '0',
            trdePricaTp: '0',
            mrktOpenTp: '0',
            stexTp: '3',
          },
          useReal,
        );
        const list = response.tdyTrdeQtyUpper?.slice(0, 20) || [];
        if (list.length === 0) {
          await ctx.reply('조회된 데이터가 없습니다.');
          return;
        }
        const lines = list.map((item, idx) => {
          const rank = String(idx + 1).padStart(2, '0');
          const curPrc = parseInt(
            item.curPrc.replace(/^[+-]/, ''),
            10,
          ).toLocaleString();
          const trdeQty = parseInt(item.trdeQty, 10).toLocaleString();
          const emoji = this.getTrendEmoji(item.predPreSig);
          return `${emoji} <b>[${rank}]</b> <b>${item.stkNm}</b> (<code>${item.stkCd}</code>) | <b>${curPrc}원</b> (<code>${item.fluRt}%</code>) | 거래량: <code>${trdeQty}주</code>`;
        });
        await ctx.reply(`🏆 <b>거래량 상위 Top 20</b>\n\n${lines.join('\n')}`, {
          parse_mode: 'HTML',
        });
      } else if (option === '4') {
        const response = await this.ka00198Service.getStockRank(
          token,
          { qryTp: '1' },
          useReal,
        );
        const list = response.itemInqRank?.slice(0, 20) || [];
        if (list.length === 0) {
          await ctx.reply('조회된 데이터가 없습니다.');
          return;
        }
        const lines = list.map((item, idx) => {
          const rank = String(idx + 1).padStart(2, '0');
          const emoji = this.getTrendEmoji(item.baseCompSign);
          const rankChgText = this.getRankChangeText(
            item.rankChgSign,
            item.rankChg,
          );
          return `${emoji} <b>[${rank}]</b> <b>${item.stkNm}</b> (<code>${item.stkCd}</code>) | <code>${item.baseCompChgr}%</code> | 순위: <b>${rankChgText}</b>`;
        });
        await ctx.reply(
          `🏆 <b>인기검색 상위 Top 20 (1분 기준)</b>\n\n${lines.join('\n')}`,
          { parse_mode: 'HTML' },
        );
      } else {
        await ctx.reply(
          '❌ 잘못된 메뉴 번호입니다. 1~4 사이의 번호를 입력해주세요.',
        );
      }
    } catch (error: unknown) {
      const errorMsg = `순위 정보를 조회하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMsg);
      await ctx.reply(errorMsg);
    }
  };
}
