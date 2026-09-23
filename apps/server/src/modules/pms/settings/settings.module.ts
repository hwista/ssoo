import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { CommonNotificationModule } from '../../common/notification/notification.module.js';
import { AccessFoundationModule } from '../../common/access/access-foundation.module.js';
import { ProjectModule } from '../project/project.module.js';
import { PmsSettingsController } from './settings.controller.js';
import { PmsSettingsService } from './settings.service.js';
import { PmsWorkNotificationService } from './work-notification.service.js';

@Module({
  imports: [DatabaseModule, CommonNotificationModule, AccessFoundationModule, ProjectModule],
  controllers: [PmsSettingsController],
  providers: [PmsSettingsService, PmsWorkNotificationService],
  exports: [PmsSettingsService, PmsWorkNotificationService],
})
export class PmsSettingsModule {}
