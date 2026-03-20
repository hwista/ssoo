import { Module } from '@nestjs/common';
import { TaskController } from './task.controller.js';
import { TaskService } from './task.service.js';
import { MilestoneController } from './milestone.controller.js';
import { MilestoneService } from './milestone.service.js';
import { DatabaseModule } from '../../../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [TaskController, MilestoneController],
  providers: [TaskService, MilestoneService],
  exports: [TaskService, MilestoneService],
})
export class TaskModule {}
