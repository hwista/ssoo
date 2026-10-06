import { Module } from '@nestjs/common';
import { AccessFoundationModule } from '../../common/access/access-foundation.module.js';
import { DatabaseModule } from '../../../database/database.module.js';
import { SnsAccessController } from './access.controller.js';
import { AccessService } from './access.service.js';
import { SnsFeatureGuard } from './sns-feature.guard.js';
import { CommonNotificationModule } from '../../common/notification/notification.module.js';
import { PostNotificationPolicyService } from './post-notification-policy.service.js';

@Module({
  imports: [DatabaseModule, AccessFoundationModule, CommonNotificationModule],
  controllers: [SnsAccessController],
  providers: [AccessService, SnsFeatureGuard, PostNotificationPolicyService],
  exports: [AccessService, SnsFeatureGuard],
})
export class AccessModule {}
