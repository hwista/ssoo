import { Module } from '@nestjs/common';
import { AccessFoundationModule } from '../../common/access/access-foundation.module.js';
import { MenuController } from './menu.controller.js';
import { MenuAdminController } from './menu-admin.controller.js';
import { RolePermissionController } from './role-permission.controller.js';
import { MenuService } from './menu.service.js';
import { MenuAdminService } from './menu-admin.service.js';
import { RolePermissionService } from './role-permission.service.js';
import { DatabaseModule } from '../../../database/database.module.js';

@Module({
  imports: [AccessFoundationModule, DatabaseModule],
  controllers: [MenuController, MenuAdminController, RolePermissionController],
  providers: [MenuService, MenuAdminService, RolePermissionService],
  exports: [MenuService],
})
export class MenuModule {}
