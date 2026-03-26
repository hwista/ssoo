import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { Roles } from '../../common/auth/decorators/roles.decorator.js';
import { RolePermissionService } from './role-permission.service.js';
import { success } from '../../../common/index.js';
import type { UpdateRolePermissionsDto } from './dto/role-permission.dto.js';

@ApiTags('Role Permissions')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class RolePermissionController {
  constructor(
    private readonly rolePermissionService: RolePermissionService,
  ) {}

  @Get()
  @ApiOperation({ summary: '역할 목록 조회' })
  async getRoles() {
    const data = await this.rolePermissionService.getRoles();
    return success(data);
  }

  @Get(':roleCode/menus')
  @ApiOperation({ summary: '역할별 메뉴 권한 조회' })
  async getRoleMenuPermissions(@Param('roleCode') roleCode: string) {
    const data =
      await this.rolePermissionService.getRoleMenuPermissions(roleCode);
    return success(data);
  }

  @Put(':roleCode/menus')
  @ApiOperation({ summary: '역할별 메뉴 권한 일괄 수정' })
  async updateRoleMenuPermissions(
    @Param('roleCode') roleCode: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    await this.rolePermissionService.updateRoleMenuPermissions(
      roleCode,
      dto.permissions,
    );
    return success({ updated: true });
  }
}
