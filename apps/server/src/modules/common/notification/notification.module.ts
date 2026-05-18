import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { CommonNotificationController } from './notification.controller.js';
import { CommonNotificationService } from './notification.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [CommonNotificationController],
  providers: [CommonNotificationService],
  exports: [CommonNotificationService],
})
export class CommonNotificationModule {}
