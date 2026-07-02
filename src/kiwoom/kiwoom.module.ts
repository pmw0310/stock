import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KiwoomService } from '@/kiwoom/kiwoom.service';
import { Au10001Service } from '@/kiwoom/au10001.service';
import { Ka10032Service } from '@/kiwoom/ka10032.service';
import { Ka10001Service } from '@/kiwoom/ka10001.service';
import { Kt10000Service } from '@/kiwoom/kt10000.service';
import { Kt10001Service } from '@/kiwoom/kt10001.service';
import { Kt00004Service } from '@/kiwoom/kt00004.service';
import { KiwoomWebsocketService } from '@/kiwoom/kiwoom-websocket.service';
import { Ka00001Service } from '@/kiwoom/ka00001.service';
import { Ka10027Service } from '@/kiwoom/ka10027.service';
import { Ka10030Service } from '@/kiwoom/ka10030.service';
import { Ka00198Service } from '@/kiwoom/ka00198.service';
import { KiwoomOrderQueueService } from '@/kiwoom/kiwoom-order-queue.service';

/**
 * 키움증권 Open API 모듈입니다.
 * 외부 통신을 위한 HttpModule과 각 TR(Transaction) 별 비즈니스 로직 서비스를 포함합니다.
 */
@Module({
  imports: [HttpModule],
  providers: [
    KiwoomService,
    Au10001Service,
    Ka10032Service,
    Ka10001Service,
    Kt10000Service,
    Kt10001Service,
    Kt00004Service,
    KiwoomWebsocketService,
    Ka00001Service,
    Ka10027Service,
    Ka10030Service,
    Ka00198Service,
    KiwoomOrderQueueService,
  ],
  exports: [
    KiwoomService,
    Au10001Service,
    Ka10032Service,
    Ka10001Service,
    Kt10000Service,
    Kt10001Service,
    Kt00004Service,
    KiwoomWebsocketService,
    Ka00001Service,
    Ka10027Service,
    Ka10030Service,
    Ka00198Service,
    KiwoomOrderQueueService,
  ],
})
export class KiwoomModule {}
