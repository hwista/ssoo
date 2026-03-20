import { Module } from '@nestjs/common';
import { DeliverableModule } from './deliverable/deliverable.module.js';
import { IssueModule } from './issue/issue.module.js';
import { MemberModule } from './member/member.module.js';
import { MenuModule } from './menu/menu.module.js';
import { ProjectModule } from './project/project.module.js';
import { TaskModule } from './task/task.module.js';

@Module({
  imports: [DeliverableModule, IssueModule, MemberModule, MenuModule, ProjectModule, TaskModule],
  exports: [DeliverableModule, IssueModule, MemberModule, MenuModule, ProjectModule, TaskModule],
})
export class PmsModule {}
