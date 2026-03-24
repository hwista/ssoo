import { Module } from '@nestjs/common';
import { FollowController } from './follow.controller.js';
import { FollowService } from './follow.service.js';
import { DatabaseModule } from '../../../database/database.module.js';
import { NotificationModule } from '../notification/notification.module.js';

@Module({
  imports: [DatabaseModule, NotificationModule],
  controllers: [FollowController],
  providers: [FollowService],
  exports: [FollowService],
})
export class FollowModule {}
