import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from './database/database.module.js';
import { CommonModule } from './modules/common/common.module.js';
import { PmsModule } from './modules/pms/pms.module.js';
import { CmsModule } from './modules/cms/cms.module.js';
import { DmsModule } from './modules/dms/dms.module.js';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor.js';
import { configValidationSchema } from './config/config.validation.js';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from './modules/common/auth/guards/jwt-auth.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: configValidationSchema,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    DatabaseModule,
    CommonModule,
    PmsModule,
    CmsModule,
    DmsModule,
  ],
  controllers: [],
  providers: [
    // 전역 인터셉터: 요청 컨텍스트 설정 (히스토리 관리용)
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalHttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // 전역 인증 가드: 모든 엔드포인트에 JWT 인증 적용 (@Public()으로 예외 처리)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
