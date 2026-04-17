import { Module } from '@nestjs/common';
import { IssueController } from './issue.controller.js';
import { IssueService } from './issue.service.js';
import { DatabaseModule } from '../../../database/database.module.js';
import { ProjectModule } from '../project/project.module.js';

@Module({
  imports: [DatabaseModule, ProjectModule],
  controllers: [IssueController],
  providers: [IssueService],
  exports: [IssueService],
})
export class IssueModule {}
