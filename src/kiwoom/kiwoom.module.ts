import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KiwoomService } from '@/kiwoom/kiwoom.service';
import { Au10001Service } from '@/kiwoom/au10001.service';
import { Ka10032Service } from '@/kiwoom/ka10032.service';
import { Ka10001Service } from '@/kiwoom/ka10001.service';
import { Kt10000Service } from '@/kiwoom/kt10000.service';

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
  ],
  exports: [
    KiwoomService,
    Au10001Service,
    Ka10032Service,
    Ka10001Service,
    Kt10000Service,
  ],
})
export class KiwoomModule {}
