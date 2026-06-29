import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from '@/app.module';

/**
 * NestJS 애플리케이션을 부트스트랩하여 실행합니다.
 * @returns {Promise<void>} 프로미스 반환
 */
const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule);

  // 보안을 위해 helmet 설정
  app.use(helmet());

  await app.listen(process.env.PORT ?? 3000);
};

bootstrap();
