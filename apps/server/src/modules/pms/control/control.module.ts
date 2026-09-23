import { PmsSettingsModule } from '../settings/settings.module.js';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { CommonNotificationModule } from '../../common/notification/notification.module.js';
import { ProjectModule } from '../project/project.module.js';
import { ControlController } from './control.controller.js';
import { ControlService } from './control.service.js';
import { PmrPrrWorkflowRolloverSchedulerService } from './pmr-prr-workflow-rollover.scheduler.js';

@Module({
  imports: [PmsSettingsModule, DatabaseModule, ProjectModule, CommonNotificationModule],
  controllers: [ControlController],
  providers: [ControlService, PmrPrrWorkflowRolloverSchedulerService],
  exports: [ControlService],
})
export class ControlModule {}
