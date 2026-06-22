import { Module } from '@nestjs/common';
import { CommentController } from './comment.controller.js';
import { CommentService } from './comment.service.js';
import { AccessModule } from '../access/access.module.js';
import { DatabaseModule } from '../../../database/database.module.js';
import { CommonNotificationModule } from '../../common/notification/notification.module.js';

@Module({
  imports: [DatabaseModule, AccessModule, CommonNotificationModule],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
