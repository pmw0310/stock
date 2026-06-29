import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { KiwoomModule } from '@/kiwoom/kiwoom.module';

/**
 * 애플리케이션의 루트 모듈입니다.
 * 환경 변수 및 외부 API 통신을 위한 모듈을 포함합니다.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HttpModule,
    KiwoomModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
