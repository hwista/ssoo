import { Module } from '@nestjs/common';
import { CommentController } from './comment.controller.js';
import { CommentService } from './comment.service.js';
import { DatabaseModule } from '../../../database/database.module.js';
import { NotificationModule } from '../notification/notification.module.js';

@Module({
  imports: [DatabaseModule, NotificationModule],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
