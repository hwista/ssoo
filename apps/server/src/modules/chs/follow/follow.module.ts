import { Module } from '@nestjs/common';
import { FollowController } from './follow.controller.js';
import { FollowService } from './follow.service.js';
import { DatabaseModule } from '../../../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [FollowController],
  providers: [FollowService],
  exports: [FollowService],
})
export class FollowModule {}
