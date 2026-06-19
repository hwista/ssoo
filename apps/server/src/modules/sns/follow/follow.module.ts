import { Module } from '@nestjs/common';
import { FollowController } from './follow.controller.js';
import { FollowService } from './follow.service.js';
import { AccessModule } from '../access/access.module.js';
import { DatabaseModule } from '../../../database/database.module.js';
import { CommonNotificationModule } from '../../common/notification/notification.module.js';

@Module({
  imports: [DatabaseModule, AccessModule, CommonNotificationModule],
  controllers: [FollowController],
  providers: [FollowService],
  exports: [FollowService],
})
export class FollowModule {}
