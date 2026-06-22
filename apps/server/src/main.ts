import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // CORS 설정 (개발 환경)
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // API 전역 프리픽스
  app.setGlobalPrefix('api');

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SSOO API')
    .setDescription('SSOO API Reference')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  const httpAdapter = app.getHttpAdapter().getInstance();
  httpAdapter.get('/api/openapi.json', (_req: Request, res: Response) => {
    res.json(swaggerDocument);
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`Server is running on http://localhost:${port}`);
}

bootstrap();
