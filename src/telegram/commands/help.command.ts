import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { TelegramCommand } from '@/telegram/commands/command.interface';

/**
 * 텔레그램 봇에서 지원하는 모든 명령어 정보와 사용법을 보여주는 도움말 명령어('help')를 처리하는 핸들러 클래스입니다.
 */
@Injectable()
export class HelpCommand implements TelegramCommand {
  private readonly logger = new Logger(HelpCommand.name);

  /**
   * 해당 명령어가 도움말 명령어(help)인지 여부를 판단합니다.
   * @param command - 소문자 및 앞뒤 공백 제거된 명령어
   * @returns 처리 가능 여부
   */
  readonly canHandle = (command: string): boolean => {
    return command === 'help' || command === '/help';
  };

  /**
   * 사용 가능한 모든 명령어 목록과 예시를 포맷팅하여 텔레그램으로 출력합니다.
   * @param ctx - 텔레그램 컨텍스트
   */
  readonly handle = async (ctx: Context): Promise<void> => {
    try {
      const message = [
        'ℹ️ <b>사용 가능한 명령어 목록 (Help)</b>',
        '',
        '🔑 <b>1. 로그인 및 세션 관리</b>',
        '• <code>login paper</code> - 모의투자 계정 로그인 및 토큰 발급',
        '• <code>login real</code> - 실전투자 계정 로그인 및 토큰 발급',
        '• <code>login renewal {HH:mm}</code> - 토큰 자동 갱신 시간 설정',
        '  (예: <code>login renewal 08:50</code>)',
        '',
        '📊 <b>2. 조회 및 보고</b>',
        '• <code>report</code> 또는 <code>r</code> - 자금 현황 및 보유 종목 리포트 조회',
        '• <code>srch {종목코드}</code> - 주식 종목 현재가 및 정보 검색',
        '  (예: <code>srch 005930</code>)',
        '• <code>stts</code> - 현재 프로그램 동적 설정 상태 조회',
        '• <code>stts default</code> - 설정을 기본값으로 초기화',
        '',
        '💸 <b>3. 매수 및 매도 주문</b>',
        '• <code>buy {종목코드} {수량} [지정가]</code> - 주식 매수 주문 (지정가 생략 시 시장가)',
        '  (예: <code>buy 005930 5</code> 또는 <code>buy 005930 5 60000</code>)',
        '• <code>sell {종목코드} {수량}</code> - 보유한 주식 매도 주문',
        '  (예: <code>sell 005930 3</code>)',
        '',
        '⚙️ <b>4. 환경 설정 및 예약</b>',
        '• <code>mkhr</code> - 현재 설정된 장 거래 시간 조회',
        '• <code>mkhr {시작시간} {종료시간}</code> - 장 거래 시간 설정',
        '  (예: <code>mkhr 09:00 15:30</code>)',
        '• <code>tpr {익절기준}</code> - 익절 기준 퍼센티지 설정 (양수/음수 입력 시 항상 양수로 저장)',
        '  (예: <code>tpr 5</code>)',
        '• <code>slr {손절기준}</code> - 손절 기준 퍼센티지 설정 (양수/음수 입력 시 항상 음수로 저장)',
        '  (예: <code>slr 10</code> 또는 <code>slr -10</code>)',
        '• <code>rsv {시간} {명령어}</code> - 평일 매일 해당 시간에 명령어 예약 실행',
        '  (예: <code>rsv 09:00 report</code>)',
        '• <code>rsv once {시간} {명령어}</code> - 1회성 명령어 예약 실행',
        '  (예: <code>rsv once 10:00 buy 005930 1</code>)',
        '• <code>rsv list</code> - 현재 등록된 예약 스케줄 목록 조회',
        '• <code>rsv remove {번호}</code> - 특정 예약 스케줄 삭제 (예: <code>rsv remove 1</code>)',
        '• <code>rsv remove all</code> - 등록된 모든 예약 스케줄 일괄 삭제',
        '',
        '🔌 <b>5. 기타 명령어</b>',
        '• <code>help</code> - 사용 가능한 모든 명령어 도움말 출력',
        '• <code>power off</code> - 프로그램 종료 (부모 프로세스 포함)',
      ].join('\n');

      await ctx.reply(message, { parse_mode: 'HTML' });
      this.logger.log('도움말 정보를 텔레그램으로 출력했습니다.');
    } catch (error: unknown) {
      const errorMsg = `도움말 정보를 처리하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMsg);
      await ctx.reply(errorMsg);
    }
  };
}
