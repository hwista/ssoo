import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';

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
    const menus = await this.db.menu.findMany({
      where: { isActive: true },
      orderBy: [{ menuLevel: 'asc' }, { sortOrder: 'asc' }],
    });

    const roleMenus = await this.db.client.roleMenu.findMany({
      where: { roleCode, isActive: true },
    });

    const permMap = new Map(
      roleMenus.map((rm) => [rm.menuId.toString(), rm.accessType]),
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
      accessType: permMap.get(m.id.toString()) || 'none',
    }));
  }

  /**
   * 역할별 메뉴 권한 일괄 수정
   */
  async updateRoleMenuPermissions(
    roleCode: string,
    permissions: { menuId: string; accessType: string }[],
  ) {
    await this.db.client.$transaction(async (tx) => {
      for (const perm of permissions) {
        const menuId = BigInt(perm.menuId);

        if (perm.accessType === 'none') {
          await tx.roleMenu.updateMany({
            where: { roleCode, menuId },
            data: { isActive: false },
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
              data: { accessType: perm.accessType, isActive: true },
            });
          } else {
            await tx.roleMenu.create({
              data: {
                roleCode,
                menuId,
                accessType: perm.accessType,
                isActive: true,
                lastSource: 'ADMIN',
              },
            });
          }
        }
      }
    });
  }
}
