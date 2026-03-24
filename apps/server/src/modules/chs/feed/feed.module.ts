import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller.js';
import { FeedService } from './feed.service.js';
import { DatabaseModule } from '../../../database/database.module.js';
import { NotificationModule } from '../notification/notification.module.js';

@Module({
  imports: [DatabaseModule, NotificationModule],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService],
})
export class FeedModule {}
