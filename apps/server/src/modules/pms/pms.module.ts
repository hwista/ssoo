import { Module } from '@nestjs/common';
import { CodeModule } from './code/code.module.js';
import { CustomerModule } from './customer/customer.module.js';
import { DeliverableModule } from './deliverable/deliverable.module.js';
import { IssueModule } from './issue/issue.module.js';
import { MemberModule } from './member/member.module.js';
import { MenuModule } from './menu/menu.module.js';
import { ProjectModule } from './project/project.module.js';
import { SiteModule } from './site/site.module.js';
import { SystemCatalogModule } from './system-catalog/system-catalog.module.js';
import { SystemInstanceModule } from './system-instance/system-instance.module.js';
import { TaskModule } from './task/task.module.js';

@Module({
  imports: [CodeModule, CustomerModule, DeliverableModule, IssueModule, MemberModule, MenuModule, ProjectModule, SiteModule, SystemCatalogModule, SystemInstanceModule, TaskModule],
  exports: [CodeModule, CustomerModule, DeliverableModule, IssueModule, MemberModule, MenuModule, ProjectModule, SiteModule, SystemCatalogModule, SystemInstanceModule, TaskModule],
})
export class PmsModule {}
