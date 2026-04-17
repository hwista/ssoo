import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { resolvePmsMenuAccess } from './menu-access-baseline.js';

const SYSTEM_OVERRIDE_PERMISSION_CODE = 'system.override';

@Injectable()
export class RolePermissionService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * 역할 목록 조회 (cm_code_m에서 codeGroup='USER_ROLE')
   */
  async getRoles() {
    const roles = await this.db.client.cmCode.findMany({
      where: { codeGroup: 'USER_ROLE', isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return roles.map((r) => serializeBigInt(r));
  }

  /**
   * 역할별 메뉴 권한 조회
   * 전체 메뉴 목록 + 해당 역할의 권한 매핑
   */
  async getRoleMenuPermissions(roleCode: string) {
    const [menus, roleMenus, hasSystemOverride] = await Promise.all([
      this.db.menu.findMany({
        where: { isActive: true },
        orderBy: [{ menuLevel: 'asc' }, { sortOrder: 'asc' }],
      }),
      this.db.client.roleMenu.findMany({
        where: { roleCode, isActive: true },
        select: {
          menuId: true,
          accessType: true,
        },
      }),
      this.hasRolePermission(roleCode, SYSTEM_OVERRIDE_PERMISSION_CODE),
    ]);

    const roleMenuOverrideMap = new Map(
      roleMenus.map((relation) => [relation.menuId.toString(), relation.accessType]),
    );

    return menus.map((m) => ({
      menuId: m.id.toString(),
      menuCode: m.menuCode,
      menuName: m.menuName,
      menuPath: m.menuPath,
      parentMenuId: m.parentMenuId?.toString() || null,
      menuLevel: m.menuLevel,
      isAdminMenu: m.isAdminMenu,
      sortOrder: m.sortOrder,
        ...resolvePmsMenuAccess({
          roleCode,
          menuCode: m.menuCode,
          isAdminMenu: m.isAdminMenu,
          hasSystemOverride,
          roleOverrideAccessType: roleMenuOverrideMap.get(m.id.toString()),
        }),
      }));
  }

  /**
   * 역할별 메뉴 권한 일괄 수정
   */
  async updateRoleMenuPermissions(
    roleCode: string,
    permissions: { menuId: string; accessType: string }[],
  ) {
    const menuIds = permissions.map((permission) => BigInt(permission.menuId));
    const [menus, hasSystemOverride] = await Promise.all([
      this.db.menu.findMany({
        where: {
          id: { in: menuIds },
          isActive: true,
        },
        select: {
          id: true,
          menuCode: true,
          isAdminMenu: true,
        },
      }),
      this.hasRolePermission(roleCode, SYSTEM_OVERRIDE_PERMISSION_CODE),
    ]);

    const menuMap = new Map(
      menus.map((menu) => [menu.id.toString(), menu]),
    );

    for (const permission of permissions) {
      if (!menuMap.has(permission.menuId)) {
        throw new NotFoundException(`Menu ${permission.menuId} not found`);
      }
    }

    await this.db.client.$transaction(async (tx) => {
      for (const perm of permissions) {
        const menuId = BigInt(perm.menuId);
        const menu = menuMap.get(perm.menuId);

        if (!menu) {
          throw new NotFoundException(`Menu ${perm.menuId} not found`);
        }

        if (menu.isAdminMenu) {
          throw new BadRequestException(
            `Menu '${menu.menuCode}' is derived from system.override and cannot be edited here`,
          );
        }

        const { baselineAccessType } = resolvePmsMenuAccess({
          roleCode,
          menuCode: menu.menuCode,
          isAdminMenu: false,
          hasSystemOverride,
        });

        if (perm.accessType === baselineAccessType) {
          await tx.roleMenu.updateMany({
            where: { roleCode, menuId },
            data: {
              isActive: false,
              lastSource: 'ROLE_MENU_OVERRIDE',
              lastActivity: 'pms.menu.role-override.reset',
            },
          });
        } else {
          const existing = await tx.roleMenu.findUnique({
            where: {
              ux_cm_role_menu_r_role_menu: { roleCode, menuId },
            },
          });

          if (existing) {
            await tx.roleMenu.update({
              where: { id: existing.id },
                data: {
                  accessType: perm.accessType,
                  isActive: true,
                  memo: 'PMS role-menu override relative to the code baseline',
                  lastSource: 'ROLE_MENU_OVERRIDE',
                  lastActivity: 'pms.menu.role-override.update',
                },
            });
          } else {
            await tx.roleMenu.create({
                data: {
                  roleCode,
                  menuId,
                  accessType: perm.accessType,
                  isActive: true,
                  memo: 'PMS role-menu override relative to the code baseline',
                  lastSource: 'ROLE_MENU_OVERRIDE',
                  lastActivity: 'pms.menu.role-override.create',
                },
            });
          }
        }
      }
    });
  }

  private async hasRolePermission(roleCode: string, permissionCode: string): Promise<boolean> {
    const relation = await this.db.client.rolePermission.findFirst({
      where: {
        isActive: true,
        role: {
          roleCode,
          isActive: true,
        },
        permission: {
          permissionCode,
          isActive: true,
        },
      },
      select: {
        rolePermissionId: true,
      },
    });

    return !!relation;
  }
}
