import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { KiwoomModule } from '@/kiwoom/kiwoom.module';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramModule } from '@/telegram/telegram.module';
import * as https from 'https';

/**
 * 애플리케이션의 루트 모듈입니다.
 * 환경 변수 및 외부 API 통신을 위한 모듈을 포함합니다.
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>('TELEGRAM_TOKEN') || '',
        options: {
          telegram: {
            agent: new https.Agent({ family: 4 }), // IPv6 타임아웃 에러 방지를 위해 강제로 IPv4 사용
          },
        },
        launchOptions: {
          dropPendingUpdates: true,
        },
      }),
      inject: [ConfigService],
    }),
    HttpModule,
    KiwoomModule,
    TelegramModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
