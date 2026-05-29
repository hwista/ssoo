import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { CommonNotificationModule } from '../../common/notification/notification.module.js';
import { UserModule } from '../../common/user/user.module.js';
import { AccessModule } from '../access/access.module.js';
import { CommentsController } from './comments.controller.js';
import { CommentsService } from './comments.service.js';

@Module({
  imports: [DatabaseModule, UserModule, CommonNotificationModule, AccessModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
