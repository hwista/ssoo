import { Module } from '@nestjs/common';
import { CodeModule } from './code/code.module.js';
import { ControlModule } from './control/control.module.js';
import { CustomerModule } from './customer/customer.module.js';
import { DeliverableModule } from './deliverable/deliverable.module.js';
import { IssueModule } from './issue/issue.module.js';
import { MemberModule } from './member/member.module.js';
import { MenuModule } from './menu/menu.module.js';
import { ProjectModule } from './project/project.module.js';
import { TaskModule } from './task/task.module.js';

@Module({
  imports: [CodeModule, ControlModule, CustomerModule, DeliverableModule, IssueModule, MemberModule, MenuModule, ProjectModule, TaskModule],
  exports: [CodeModule, ControlModule, CustomerModule, DeliverableModule, IssueModule, MemberModule, MenuModule, ProjectModule, TaskModule],
})
export class PmsModule {}
