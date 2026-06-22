import { Module } from '@nestjs/common';
import { AccessFoundationModule } from './access/access-foundation.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UserModule } from './user/user.module.js';
import { HealthController } from './health/health.controller.js';
import { CommonNotificationModule } from './notification/notification.module.js';
import { CommonSearchModule } from './search/search.module.js';

@Module({
  imports: [AccessFoundationModule, AuthModule, UserModule, CommonNotificationModule, CommonSearchModule],
  controllers: [HealthController],
  exports: [AccessFoundationModule, AuthModule, UserModule, CommonNotificationModule, CommonSearchModule],
})
export class CommonModule {}
