import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { CommonNotificationController } from './notification.controller.js';
import { CommonNotificationService } from './notification.service.js';
import { NotificationObjectPolicyService } from './notification-object-policy.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [CommonNotificationController],
  providers: [CommonNotificationService, NotificationObjectPolicyService],
  exports: [CommonNotificationService, NotificationObjectPolicyService],
})
export class CommonNotificationModule {}
