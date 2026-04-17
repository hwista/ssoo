import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { ProjectModule } from '../project/project.module.js';
import { ControlController } from './control.controller.js';
import { ControlService } from './control.service.js';

@Module({
  imports: [DatabaseModule, ProjectModule],
  controllers: [ControlController],
  providers: [ControlService],
  exports: [ControlService],
})
export class ControlModule {}
