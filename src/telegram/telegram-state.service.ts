import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf, Context } from 'telegraf';
import { Au10001Service } from '@/kiwoom/au10001.service';

/**
 * 텔레그램 상태 및 토큰 자동 갱신 일정을 관리하는 서비스 클래스입니다.
 */
@Injectable()
export class TelegramStateService
  implements OnModuleDestroy, OnApplicationBootstrap
{
  private readonly logger = new Logger(TelegramStateService.name);

  // 접근 토큰과 실투자 여부를 저장하는 상태
  private accessToken: string | null = null;
  private isRealTrading = false;

  // 토큰 자동 갱신 일정 설정을 위한 상태 (기본값 08:55)
  private renewalHour = 8;
  private renewalMinute = 55;
  private renewalTimeout: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly au10001Service: Au10001Service,
    @InjectBot() private readonly bot: Telegraf<Context>,
  ) {}

  /**
   * 모듈 소멸 시 등록된 타이머를 해제합니다.
   */
  onModuleDestroy = (): void => {
    if (this.renewalTimeout) {
      clearTimeout(this.renewalTimeout);
      this.renewalTimeout = null;
    }
  };

  /**
   * 애플리케이션 시작 시 호출되어 시작 알림을 전송하고 모의투자 로그인을 자동으로 수행합니다.
   * 단, 핫 리로드(코드 변경으로 인한 재시작) 시에는 자동 로그인을 건너뜁니다.
   */
  onApplicationBootstrap = async (): Promise<void> => {
    const chatId = this.configService.get<string>('TELEGRAM_CHAT_ID');
    if (!chatId) {
      this.logger.warn(
        'TELEGRAM_CHAT_ID 설정이 없어 프로그램 시작 알림 및 자동 로그인을 건너뜁니다.',
      );
      return;
    }

    // 핫 리로드(코드 변경으로 인한 재시작) 방지 처리
    const tempFilePath = path.join(os.tmpdir(), 'stock-app-parent-pid.txt');
    const currentPpid = process.ppid.toString();
    let isHotReload = false;

    try {
      if (fs.existsSync(tempFilePath)) {
        const savedPpid = fs.readFileSync(tempFilePath, 'utf8').trim();
        if (savedPpid === currentPpid) {
          isHotReload = true;
        }
      }
    } catch (err) {
      this.logger.warn(
        `핫 리로드 감지 파일을 읽는 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (isHotReload) {
      this.logger.log(
        '핫 리로드로 인한 재시작이 감지되어 자동 로그인을 건너뜁니다.',
      );
      return;
    }

    try {
      fs.writeFileSync(tempFilePath, currentPpid, 'utf8');
    } catch (err) {
      this.logger.warn(
        `핫 리로드 감지 파일에 PPID를 기록하는 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    try {
      this.logger.log(
        '프로그램이 시작되었습니다. 모의투자 자동 로그인을 시도합니다...',
      );
      await this.bot.telegram.sendMessage(
        chatId,
        '🤖 프로그램이 시작되었습니다. 모의투자 자동 로그인을 시도합니다...',
      );

      const response = await this.au10001Service.issueAccessToken(false);

      if (response.token) {
        this.setLoginInfo(response.token, false);
        this.logger.log('[성공] 모의투자 자동 로그인 완료.');
        await this.bot.telegram.sendMessage(
          chatId,
          '✅ 모의투자 자동 로그인 성공!',
        );

        // 로그인 성공 시 자동 갱신 일정 예약
        this.scheduleNextRenewal();
      } else {
        this.logger.warn('[실패] 모의투자 자동 로그인 실패. 토큰이 없습니다.');
        await this.bot.telegram.sendMessage(
          chatId,
          '❌ 모의투자 자동 로그인 실패: 토큰이 발급되지 않았습니다.',
        );
      }
    } catch (error: unknown) {
      const errorMsg = `❌ 모의투자 자동 로그인 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMsg, error instanceof Error ? error.stack : error);
      await this.bot.telegram.sendMessage(chatId, errorMsg);
    }
  };

  /**
   * 로그인 정보(토큰 및 투자 유형)를 저장합니다.
   * @param token - 새로 발급받은 접근 토큰
   * @param isReal - 실전투자 여부
   */
  readonly setLoginInfo = (token: string, isReal: boolean): void => {
    this.accessToken = token;
    this.isRealTrading = isReal;
  };

  /**
   * 자동 갱신 시간을 설정합니다.
   * @param hour - 시간 (24시간제)
   * @param minute - 분
   */
  readonly setRenewalTime = (hour: number, minute: number): void => {
    this.renewalHour = hour;
    this.renewalMinute = minute;
  };

  /**
   * 현재 저장된 접근 토큰을 반환합니다.
   * @returns 접근 토큰 또는 null
   */
  readonly getAccessToken = (): string | null => {
    return this.accessToken;
  };

  /**
   * 현재 설정된 투자 유형(실투자 여부)을 반환합니다.
   * @returns 실투자 여부
   */
  readonly getIsRealTrading = (): boolean => {
    return this.isRealTrading;
  };

  /**
   * 다음 갱신 시간까지 대기해야 하는 밀리초(ms)를 계산합니다.
   * @param hour - 24시간제 시
   * @param minute - 분
   * @returns 밀리초
   */
  private readonly getMsUntilTime = (hour: number, minute: number): number => {
    const now = new Date();
    const target = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute,
      0,
      0,
    );

    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }

    return target.getTime() - now.getTime();
  };

  /**
   * 다음 토큰 갱신 작업을 예약합니다.
   */
  readonly scheduleNextRenewal = (): void => {
    if (!this.accessToken) {
      return;
    }

    if (this.renewalTimeout) {
      clearTimeout(this.renewalTimeout);
      this.renewalTimeout = null;
    }

    const ms = this.getMsUntilTime(this.renewalHour, this.renewalMinute);
    const targetTime = new Date(Date.now() + ms);
    const targetTimeString = targetTime.toLocaleString('ko-KR', {
      hour12: false,
    });

    this.logger.log(`다음 토큰 자동 갱신 예정 시각: ${targetTimeString}`);

    this.renewalTimeout = setTimeout(() => {
      void this.renewToken();
    }, ms);
  };

  /**
   * 토큰 자동 갱신 작업을 수행합니다.
   */
  private readonly renewToken = async (): Promise<void> => {
    const tradingType = this.isRealTrading ? '실전투자' : '모의투자';
    const chatId = this.configService.get<string>('TELEGRAM_CHAT_ID');

    try {
      this.logger.log(
        `[갱신 시작] ${tradingType} 토큰 자동 갱신을 진행합니다...`,
      );
      if (chatId) {
        await this.bot.telegram.sendMessage(
          chatId,
          `[갱신 시작] ${tradingType} 토큰 자동 갱신을 진행합니다...`,
        );
      }

      const response = await this.au10001Service.issueAccessToken(
        this.isRealTrading,
      );

      if (response.token) {
        this.accessToken = response.token;
        const successMsg = `[성공] ${tradingType} 토큰 자동 갱신 완료.`;
        this.logger.log(`${successMsg} 토큰: ${response.token}`);
        if (chatId) {
          await this.bot.telegram.sendMessage(chatId, successMsg);
        }
      } else {
        const failMsg = `[실패] ${tradingType} 토큰 자동 갱신 실패. 토큰을 받지 못했습니다.`;
        this.logger.warn(failMsg);
        if (chatId) {
          await this.bot.telegram.sendMessage(chatId, failMsg);
        }
      }
    } catch (error: unknown) {
      const errorMsg = `[실패] ${tradingType} 토큰 자동 갱신 중 오류가 발생하였습니다: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMsg, error instanceof Error ? error.stack : error);
      if (chatId) {
        await this.bot.telegram.sendMessage(chatId, errorMsg);
      }
    } finally {
      // 다음 갱신 일정을 재예약합니다.
      this.scheduleNextRenewal();
    }
  };
}
