import { Module } from '@nestjs/common';
import { AccessFoundationModule } from './access/access-foundation.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UserModule } from './user/user.module.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [AccessFoundationModule, AuthModule, UserModule],
  controllers: [HealthController],
  exports: [AccessFoundationModule, AuthModule, UserModule],
})
export class CommonModule {}
