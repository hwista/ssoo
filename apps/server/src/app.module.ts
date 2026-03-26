import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from './database/database.module.js';
import { CommonModule } from './modules/common/common.module.js';
import { PmsModule } from './modules/pms/pms.module.js';
import { ChsModule } from './modules/chs/chs.module.js';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor.js';
import { configValidationSchema } from './config/config.validation.js';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

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
    ChsModule,
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
  ],
})
export class AppModule {}
