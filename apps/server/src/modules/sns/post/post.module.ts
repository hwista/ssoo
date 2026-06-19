import { Module } from '@nestjs/common';
import { PostController } from './post.controller.js';
import { PostService } from './post.service.js';
import { AccessModule } from '../access/access.module.js';
import { DatabaseModule } from '../../../database/database.module.js';
import { CommonNotificationModule } from '../../common/notification/notification.module.js';

@Module({
  imports: [DatabaseModule, AccessModule, CommonNotificationModule],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
