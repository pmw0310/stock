import { Context } from 'telegraf';

/**
 * 텔레그램 봇 명령어를 처리하는 핸들러의 인터페이스입니다.
 */
export interface TelegramCommand {
  /**
   * 입력된 명령어가 해당 핸들러에서 처리 가능한지 판단합니다.
   * @param command - 앞뒤 공백이 제거되고 소문자로 변환된 명령어
   * @returns 처리 가능 여부
   */
  readonly canHandle: (command: string) => boolean;

  /**
   * 명령어를 실행합니다.
   * @param ctx - 텔레그램 컨텍스트
   * @param command - 입력된 명령어 원본 또는 변환된 문자열
   */
  readonly handle: (ctx: Context, command: string) => Promise<void>;
}
