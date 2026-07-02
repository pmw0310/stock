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
        '• <code>rank</code> - 순위 조회 메뉴 확인',
        '• <code>rank {번호}</code> - 번호에 해당하는 기준의 상위 20개 종목 조회',
        '  (1: 거래대금, 2: 상승률, 3: 거래량, 4: 인기검색)',
        '  (예: <code>rank 2</code>)',
        '• <code>rank {번호} cmd {개수} {명령}</code> - 순위 결과 종목으로 명령어 일괄 실행',
        '  (예: <code>rank 4 cmd 15 gdcrs add () 100000</code> - 괄호 부분에 종목코드 치환)',
        '',
        '💸 <b>3. 매수 및 매도 주문</b>',
        '• <code>buy {종목코드} {수량} [지정가]</code> - 주식 매수 주문 (지정가 생략 시 시장가)',
        '  (예: <code>buy 005930 5</code> 또는 <code>buy 005930 5 60000</code>)',
        '• <code>buy {종목코드} max {금액}</code> - 지정한 최대 금액 내에서 시장가 매수',
        '  (예: <code>buy 005930 max 500000</code>)',
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
        '📈 <b>5. 골든/데드크로스 감시 엔진 (MA Cross)</b>',
        '• <code>gdcrs</code> - 골든크로스 감시 엔진 현재 설정 및 상태 조회',
        '• <code>start gdcrs</code> - 골든크로스 감시 및 자동 매수 엔진 시작',
        '• <code>stop gdcrs</code> - 골든크로스 감시 및 자동 매수 엔진 중지',
        '• <code>gdcrs add {종목코드} {금액}</code> - 골든크로스 감시 목록에 종목 추가',
        '  (예: <code>gdcrs add 005930 60000</code>)',
        '• <code>gdcrs list</code> - 골든크로스 감시 목록 번호와 함께 조회',
        '• <code>gdcrs remove all</code> - 골든크로스 감시 목록의 모든 항목 일괄 삭제',
        '• <code>gdcrs remove {번호}</code> - 골든크로스 감시 목록에서 해당 번호 삭제 (예: <code>gdcrs remove 1</code>)',
        '• <code>gdcrs intv {단기} {장기}</code> - 골든크로스/데드크로스 단기/장기 분봉 값 설정 (1~60 사이 정수)',
        '  (예: <code>gdcrs intv 5 20</code>)',
        '• <code>start ddcrs</code> - 보유 종목 데드크로스 감시 및 자동 매도 엔진 시작',
        '• <code>stop ddcrs</code> - 데드크로스 감시 및 자동 매도 엔진 중지',
        '• <code>ddcrs</code> - 데드크로스 감시 엔진 현재 설정 및 상태 조회',
        '',
        '🛑 <b>6. 실시간 스탑로스 엔진 (Stop-Loss)</b>',
        '• <code>start stls</code> - 실시간 스탑로스 감시 및 자동 매도 엔진 시작',
        '• <code>stop stls</code> - 실시간 스탑로스 엔진 중지 및 웹소켓 연결 해제',
        '',
        '🔌 <b>7. 기타 명령어</b>',
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
