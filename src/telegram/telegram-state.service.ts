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
import { SchedulerRegistry } from '@nestjs/schedule';
import { Au10001Service } from '@/kiwoom/au10001.service';

/**
 * 파일에 저장되는 상태 데이터 구조 정의 인터페이스입니다.
 */
interface StateData {
  accessToken: string | null;
  isRealTrading: boolean;
  renewalHour: number;
  renewalMinute: number;
  expiresDt: string | null;
}

/**
 * 텔레그램 상태 및 토큰 자동 갱신 일정을 관리하는 서비스 클래스입니다.
 */
@Injectable()
export class TelegramStateService
  implements OnModuleDestroy, OnApplicationBootstrap
{
  private readonly logger = new Logger(TelegramStateService.name);

  // 상태 데이터를 보존할 파일 경로 설정
  private readonly stateFilePath = path.join(process.cwd(), 'state.json');

  // 접근 토큰과 실투자 여부를 저장하는 상태
  private accessToken: string | null = null;
  private isRealTrading = false;
  private expiresDt: string | null = null;

  // 토큰 자동 갱신 일정 설정을 위한 상태 (기본값 09:55)
  private renewalHour = 8;
  private renewalMinute = 55;
  private readonly RENEWAL_TIMEOUT_NAME = 'token-renewal-timeout';

  constructor(
    private readonly configService: ConfigService,
    private readonly au10001Service: Au10001Service,
    private readonly schedulerRegistry: SchedulerRegistry,
    @InjectBot() private readonly bot: Telegraf<Context>,
  ) {
    this.loadState();
  }

  /**
   * 현재 상태를 JSON 파일에 영속화합니다.
   */
  private readonly saveState = (): void => {
    try {
      const data: StateData = {
        accessToken: this.accessToken,
        isRealTrading: this.isRealTrading,
        renewalHour: this.renewalHour,
        renewalMinute: this.renewalMinute,
        expiresDt: this.expiresDt,
      };
      fs.writeFileSync(
        this.stateFilePath,
        JSON.stringify(data, null, 2),
        'utf8',
      );
      this.logger.log('현재 상태가 state.json 파일에 저장되었습니다.');
    } catch (error: unknown) {
      this.logger.error(
        `상태를 파일에 저장하는 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  /**
   * JSON 파일 또는 환경 변수로부터 상태 데이터를 복원합니다.
   */
  private readonly loadState = (): void => {
    let fileData: Partial<StateData> = {};

    // 1. state.json 로드 시도
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const fileContent = fs.readFileSync(this.stateFilePath, 'utf8');
        fileData = JSON.parse(fileContent) as Partial<StateData>;
        this.logger.log('이전 상태를 state.json 파일로부터 읽어왔습니다.');
      }
    } catch (error: unknown) {
      this.logger.warn(
        `상태 파일을 읽는 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // 2. 값 복원 및 폴백 체인 처리 (state.json -> .env -> 하드코딩 백업값)
    // 2.1 접근 토큰 및 실투자 플래그, 만료 시간 복원
    this.accessToken = fileData.accessToken ?? null;
    this.isRealTrading = fileData.isRealTrading ?? false;
    this.expiresDt = fileData.expiresDt ?? null;

    // 2.2 갱신 시간 (Hour) 복원
    if (fileData.renewalHour !== undefined && fileData.renewalHour !== null) {
      this.renewalHour = fileData.renewalHour;
    } else {
      const envHour = this.configService.get<string>('TOKEN_RENEWAL_HOUR');
      this.renewalHour = envHour !== undefined ? parseInt(envHour, 10) : 8;
      if (isNaN(this.renewalHour)) {
        this.renewalHour = 8;
      }
    }

    // 2.3 갱신 분 (Minute) 복원
    if (
      fileData.renewalMinute !== undefined &&
      fileData.renewalMinute !== null
    ) {
      this.renewalMinute = fileData.renewalMinute;
    } else {
      const envMinute = this.configService.get<string>('TOKEN_RENEWAL_MINUTE');
      this.renewalMinute =
        envMinute !== undefined ? parseInt(envMinute, 10) : 55;
      if (isNaN(this.renewalMinute)) {
        this.renewalMinute = 55;
      }
    }

    // 3. 로드된 최신 상태를 state.json에 즉시 다시 써서 일치시킴
    this.saveState();
  };

  /**
   * 모듈 소멸 시 등록된 타이머를 해제합니다.
   */
  onModuleDestroy = (): void => {
    this.clearRenewalTimeout();
  };

  /**
   * 등록되어 있는 토큰 갱신 타이머를 제거합니다.
   */
  private readonly clearRenewalTimeout = (): void => {
    try {
      const timeouts = this.schedulerRegistry.getTimeouts();
      if (timeouts.includes(this.RENEWAL_TIMEOUT_NAME)) {
        this.schedulerRegistry.deleteTimeout(this.RENEWAL_TIMEOUT_NAME);
        this.logger.log('기존 토큰 갱신 타이머가 삭제되었습니다.');
      }
    } catch (error: unknown) {
      this.logger.warn(
        `타이머 제거 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`,
      );
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

    if (!isHotReload) {
      try {
        fs.writeFileSync(tempFilePath, currentPpid, 'utf8');
      } catch (err) {
        this.logger.warn(
          `핫 리로드 감지 파일에 PPID를 기록하는 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // 핫 리로드가 아닐 때에만 프로그램 시작 메시지 전송
      await this.bot.telegram.sendMessage(
        chatId,
        '🤖 프로그램이 시작되었습니다.',
      );
    }

    const tradingType = this.isRealTrading ? '실전투자' : '모의투자';

    // 토큰 유효성 검사
    if (this.isTokenValid()) {
      this.logger.log(
        `저장된 ${tradingType} 로그인 정보가 유효하여 자동 로그인을 생략하고 세션을 복원합니다.`,
      );
      if (!isHotReload) {
        await this.bot.telegram.sendMessage(
          chatId,
          `✅ 기존 ${tradingType} 로그인 정보를 파일에서 복원하고 토큰 갱신 일정을 예약합니다.`,
        );
      }
      this.scheduleNextRenewal();
    } else {
      // 토큰이 없거나 만료된 경우 신규 로그인 시도 (마지막 투자 모드 기준으로 로그인)
      this.logger.log(
        `토큰이 만료되었거나 존재하지 않아 ${tradingType} 자동 로그인을 시도합니다...`,
      );
      if (!isHotReload) {
        await this.bot.telegram.sendMessage(
          chatId,
          `🔑 토큰이 만료되었거나 존재하지 않아 ${tradingType} 자동 로그인을 시도합니다...`,
        );
      }

      try {
        const response = await this.au10001Service.issueAccessToken(
          this.isRealTrading,
        );

        if (response.token) {
          this.setLoginInfo(
            response.token,
            this.isRealTrading,
            response.expiresDt,
          );
          this.logger.log(`[성공] ${tradingType} 자동 로그인 완료.`);
          if (!isHotReload) {
            await this.bot.telegram.sendMessage(
              chatId,
              `✅ ${tradingType} 자동 로그인 성공!`,
            );
          }

          // 로그인 성공 시 자동 갱신 일정 예약
          this.scheduleNextRenewal();
        } else {
          this.logger.warn(
            `[실패] ${tradingType} 자동 로그인 실패. 토큰이 없습니다.`,
          );
          if (!isHotReload) {
            await this.bot.telegram.sendMessage(
              chatId,
              `❌ ${tradingType} 자동 로그인 실패: 토큰이 발급되지 않았습니다.`,
            );
          }
        }
      } catch (error: unknown) {
        const errorMsg = `❌ ${tradingType} 자동 로그인 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`;
        this.logger.error(
          errorMsg,
          error instanceof Error ? error.stack : error,
        );
        if (!isHotReload) {
          await this.bot.telegram.sendMessage(chatId, errorMsg);
        }
      }
    }
  };

  /**
   * 로그인 정보(토큰 및 투자 유형, 만료 일시)를 저장합니다.
   * @param token - 새로 발급받은 접근 토큰
   * @param isReal - 실전투자 여부
   * @param expiresDt - 토큰 만료 일시
   */
  readonly setLoginInfo = (
    token: string,
    isReal: boolean,
    expiresDt: string,
  ): void => {
    this.accessToken = token;
    this.isRealTrading = isReal;
    this.expiresDt = expiresDt;
    this.saveState();
  };

  /**
   * 저장된 토큰이 존재하고 만료되지 않았는지 여부를 검증합니다.
   * @returns 토큰의 유효 여부
   */
  private readonly isTokenValid = (): boolean => {
    if (!this.accessToken || !this.expiresDt) {
      return false;
    }
    const now = new Date();
    const expiresTime = new Date(this.expiresDt);

    if (isNaN(expiresTime.getTime())) {
      return false;
    }

    return expiresTime.getTime() > now.getTime();
  };

  /**
   * 자동 갱신 시간을 설정합니다.
   * @param hour - 시간 (24시간제)
   * @param minute - 분
   */
  readonly setRenewalTime = (hour: number, minute: number): void => {
    this.renewalHour = hour;
    this.renewalMinute = minute;
    this.saveState();
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

    this.clearRenewalTimeout();

    const ms = this.getMsUntilTime(this.renewalHour, this.renewalMinute);
    const targetTime = new Date(Date.now() + ms);
    const targetTimeString = targetTime.toLocaleString('ko-KR', {
      hour12: false,
    });

    this.logger.log(`다음 토큰 자동 갱신 예정 시각: ${targetTimeString}`);

    const timeout = setTimeout(() => {
      void this.renewToken();
    }, ms);

    this.schedulerRegistry.addTimeout(this.RENEWAL_TIMEOUT_NAME, timeout);
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
        this.setLoginInfo(
          response.token,
          this.isRealTrading,
          response.expiresDt,
        );
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
