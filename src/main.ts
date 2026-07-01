import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from '@/app.module';
import { SnakeToCamelInterceptor } from '@/common/interceptors/snake-to-camel.interceptor';

/**
 * NestJS 애플리케이션을 부트스트랩하여 실행합니다.
 * @returns {Promise<void>} 프로미스 반환
 */
const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule);

  // 보안을 위해 helmet 설정
  app.use(helmet());

  // DTO 검증 및 자동 형변환을 위한 ValidationPipe 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성은 자동 제거
      forbidNonWhitelisted: true, // DTO에 정의되지 않은 속성이 들어오면 요청 자체를 막음
      transform: true, // 데이터를 DTO 타입에 맞춰 자동으로 변환 (예: 문자열 "1" -> 숫자 1)
    }),
  );

  // 전역 인터셉터 등록 (스네이크 케이스 <-> 카멜 케이스 변환)
  app.useGlobalInterceptors(new SnakeToCamelInterceptor());

  // 프로세스 종료 시 온모듈디스트로이 훅 실행을 위한 셧다운 훅 활성화
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3000);
};

void bootstrap();
