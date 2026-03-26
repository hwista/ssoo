import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { UserModule } from './user/user.module.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [AuthModule, UserModule],
  controllers: [HealthController],
  exports: [AuthModule, UserModule],
})
export class CommonModule {}
