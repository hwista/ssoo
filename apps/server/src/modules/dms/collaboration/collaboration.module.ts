import { Module } from '@nestjs/common';
import { CommonNotificationModule } from '../../common/notification/notification.module.js';
import { UserModule } from '../../common/user/user.module.js';
import { AccessModule } from '../access/access.module.js';
import { EventsModule } from '../events/events.module.js';
import { CollaborationController } from './collaboration.controller.js';
import { CollaborationService } from './collaboration.service.js';

@Module({
  imports: [AccessModule, CommonNotificationModule, UserModule, EventsModule],
  controllers: [CollaborationController],
  providers: [CollaborationService],
  exports: [CollaborationService],
})
export class CollaborationModule {}
