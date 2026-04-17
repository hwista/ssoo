import { Module } from '@nestjs/common';
import { TaskController } from './task.controller.js';
import { TaskService } from './task.service.js';
import { MilestoneController } from './milestone.controller.js';
import { MilestoneService } from './milestone.service.js';
import { ObjectiveController } from './objective.controller.js';
import { ObjectiveService } from './objective.service.js';
import { WbsController } from './wbs.controller.js';
import { WbsService } from './wbs.service.js';
import { DatabaseModule } from '../../../database/database.module.js';
import { ProjectModule } from '../project/project.module.js';

@Module({
  imports: [DatabaseModule, ProjectModule],
  controllers: [TaskController, MilestoneController, ObjectiveController, WbsController],
  providers: [TaskService, MilestoneService, ObjectiveService, WbsService],
  exports: [TaskService, MilestoneService, ObjectiveService, WbsService],
})
export class TaskModule {}
