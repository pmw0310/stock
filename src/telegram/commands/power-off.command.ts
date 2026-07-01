import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { TelegramCommand } from '@/telegram/commands/command.interface';
import { StopLossService } from '@/kiwoom/stop-loss.service';

/**
 * 프로그램 종료 명령어('power off')를 처리하는 핸들러 클래스입니다.
 */
@Injectable()
export class PowerOffCommand implements TelegramCommand {
  private readonly logger = new Logger(PowerOffCommand.name);

  constructor(private readonly stopLossService: StopLossService) {}

  /**
   * 해당 명령어가 종료 명령어인지 여부를 판단합니다.
   * @param command - 소문자 및 앞뒤 공백 제거된 명령어
   * @returns 처리 가능 여부
   */
  readonly canHandle = (command: string): boolean => {
    return command === 'power off';
  };

  /**
   * 종료 명령어를 실행하고 봇에 응답을 전송한 후 부모 프로세스 및 현재 프로세스를 종료합니다.
   * @param ctx - 텔레그램 컨텍스트
   * @param command - 입력된 명령어
   */
  readonly handle = async (ctx: Context): Promise<void> => {
    const msgText = '프로그램을 종료합니다.';
    await ctx.reply(msgText);
    this.logger.log(msgText);

    // 스탑로스 엔진을 종료하여 웹소켓 연결 해제 및 상태(false) 저장
    this.stopLossService.stop();

    // 텔레그램 메시지가 전송될 수 있도록 약간의 지연 시간을 둔 후 종료합니다.
    // watch 모드(nest start --watch) 시 부모 프로세스(watcher)도 함께 종료합니다.
    setTimeout(() => {
      try {
        process.kill(process.ppid, 'SIGTERM');
      } catch (error) {
        this.logger.error(
          '부모 프로세스 종료 중 오류',
          error instanceof Error ? error.message : String(error),
        );
      }
      process.exit(0);
    }, 500);
  };
}
