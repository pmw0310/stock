import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocket } from 'ws';
import { Subject } from 'rxjs';

/**
 * 키움증권 웹소켓 실시간 데이터 항목 인터페이스입니다.
 */
export interface KiwoomWebsocketData {
  type?: string;
  name?: string;
  item?: string;
  values?: Record<string, string | undefined>;
}

/**
 * 키움증권 웹소켓 수신 메시지 구조 인터페이스입니다.
 */
export interface KiwoomWebsocketMessage {
  trnm?: string;
  code?: string;
  message?: string;
  return_code?: number | string;
  return_msg?: string;
  sor_yn?: string;
  data?: KiwoomWebsocketData | KiwoomWebsocketData[];
}

@Injectable()
export class KiwoomWebsocketService {
  private readonly logger = new Logger(KiwoomWebsocketService.name);
  private ws: WebSocket | null = null;
  private token: string | null = null;

  // 웹소켓을 통해 수신된 실시간 데이터를 전달하는 Subject
  public readonly onMessage$ = new Subject<KiwoomWebsocketMessage>();

  constructor(private readonly configService: ConfigService) {}

  /**
   * 웹소켓 서버에 연결합니다.
   * @param useReal - 실전투자 여부
   * @param token - 접근 토큰
   */
  readonly connect = (useReal: boolean, token: string): void => {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      this.logger.log('웹소켓이 이미 연결되어 있거나 연결 중입니다.');
      return;
    }

    this.token = token;
    const host = this.configService.get<string>(
      useReal ? 'REAL_SOCKET_URL' : 'PAPER_SOCKET_URL',
    );

    if (!host) {
      throw new Error('웹소켓 URL이 설정되지 않았습니다.');
    }

    const url = `${host}/api/dostk/websocket`;
    this.logger.log(`웹소켓 연결 시도: ${url}`);

    this.ws = new WebSocket(url, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    this.ws.on('open', () => {
      this.logger.log('웹소켓 연결 성공');
      // 로그인(접속허용요청) 패킷 송신
      const loginPayload = {
        trnm: 'LOGIN',
        token: token,
      };
      try {
        this.ws?.send(JSON.stringify(loginPayload));
        this.logger.log('웹소켓 로그인 패킷 송신 완료');
      } catch (err) {
        this.logger.error(
          `웹소켓 로그인 패킷 송신 중 오류: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

    this.ws.on('message', (data: Buffer) => {
      const message = data.toString('utf8');
      try {
        const parsed = JSON.parse(message) as KiwoomWebsocketMessage;

        // PING-PONG 하트비트 처리
        if (parsed && parsed.trnm === 'PING') {
          const pongPayload = { trnm: 'PONG' };
          this.ws?.send(JSON.stringify(pongPayload));
          return;
        }

        this.onMessage$.next(parsed);
      } catch (err) {
        this.logger.warn(
          `웹소켓 메시지 파싱 오류: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

    this.ws.on('close', (code: number, reason: Buffer) => {
      const reasonStr = reason.toString('utf8');
      this.logger.log(
        `웹소켓 연결 종료 - Code: ${code}, Reason: ${reasonStr || '없음'}`,
      );
      this.ws = null;
    });

    this.ws.on('error', (err) => {
      this.logger.error(`웹소켓 오류: ${err.message}`);
    });
  };

  /**
   * 웹소켓 연결을 해제합니다.
   */
  readonly disconnect = (): void => {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.logger.log('웹소켓 연결 해제 호출');
    }
  };

  /**
   * 실시간 항목 등록(REG) 또는 해제(REMOVE) 패킷을 전송합니다.
   * @param items - 종목코드 또는 계좌번호 배열
   * @param type - 실시간 항목 (0B: 주식체결, 05: 주문체결)
   * @param trnm - 서비스명 ('REG' 또는 'REMOVE')
   */
  readonly sendReg = (
    items: string[],
    type: string,
    trnm: string = 'REG',
  ): void => {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.logger.warn(
        `웹소켓이 연결되어 있지 않아 ${trnm} 패킷을 보낼 수 없습니다.`,
      );
      return;
    }

    const payload = {
      trnm,
      grp_no: '0001',
      refresh: trnm === 'REG' ? '1' : undefined,
      data: [
        {
          item: items,
          type: [type],
        },
      ],
    };

    try {
      const jsonStr = JSON.stringify(payload);
      this.ws.send(jsonStr);
      this.logger.log(
        `웹소켓 ${trnm} 패킷 송신 완료 (type: ${type}, items: ${items.length}건)`,
      );
      this.logger.debug(`웹소켓 ${trnm} 패킷 송신 완료 Payload: ${jsonStr}`);
    } catch (err) {
      this.logger.error(
        `웹소켓 ${trnm} 패킷 송신 중 오류: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };
}
