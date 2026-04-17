import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { DeliverableController } from './deliverable.controller.js';
import { DeliverableService } from './deliverable.service.js';
import { CloseConditionController } from './close-condition.controller.js';
import { CloseConditionService } from './close-condition.service.js';
import { ProjectModule } from '../project/project.module.js';

@Module({
  imports: [DatabaseModule, ProjectModule],
  controllers: [DeliverableController, CloseConditionController],
  providers: [DeliverableService, CloseConditionService],
  exports: [DeliverableService, CloseConditionService],
})
export class DeliverableModule {}
