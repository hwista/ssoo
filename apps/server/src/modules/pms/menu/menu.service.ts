import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { AccessFoundationService } from '../../common/access/access-foundation.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import {
  normalizeMenuAccessType,
  type MenuAccessType,
  resolvePmsMenuAccess,
} from './menu-access-baseline.js';

interface MenuTreeItem {
  menuId: string;
  menuCode: string;
  menuName: string;
  menuNameEn: string | null;
  menuType: string;
  menuPath: string | null;
  icon: string | null;
  sortOrder: number;
  menuLevel: number;
  parentMenuId: string | null;
  isVisible: boolean;
  isAdminMenu: boolean;
  description: string | null;
  accessType: string;
  children: MenuTreeItem[];
}

interface UserMenuResponse {
  generalMenus: MenuTreeItem[];  // is_admin_menu = false
  adminMenus: MenuTreeItem[];    // is_admin_menu = true (system.override 보유 사용자만)
}

interface FlatMenuRecord {
  menu_id: bigint;
  menu_code: string;
  menu_name: string;
  menu_name_en: string | null;
  menu_type: string;
  menu_path: string | null;
  icon: string | null;
  sort_order: number;
  menu_level: number;
  parent_menu_id: bigint | null;
  is_visible: boolean;
  is_admin_menu: boolean;
  description: string | null;
  access_type: MenuAccessType;
}

@Injectable()
export class MenuService {
  constructor(
    private readonly db: DatabaseService,
    private readonly accessFoundationService: AccessFoundationService,
  ) {}

  /**
   * 사용자별 메뉴 트리 조회 (역할 기반 + 관리자 메뉴 분리)
   * - 역할(role_code)에 따른 메뉴 권한 조회
   * - system.override permission 이 있으면 관리자 메뉴도 포함
   * - 일반 메뉴와 관리자 메뉴를 분리하여 반환
   */
  async getMenuTreeByUserId(userId: bigint): Promise<UserMenuResponse> {
    const now = new Date();
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        roleCode: true,
        authAccount: {
          select: {
            loginId: true,
          },
        },
      },
    });

    if (!user) {
      return { generalMenus: [], adminMenus: [] };
    }

    const [menus, roleMenuOverrides, userMenuOverrides, actionContext] = await Promise.all([
      this.db.menu.findMany({
        where: { isActive: true },
        orderBy: [{ menuLevel: 'asc' }, { sortOrder: 'asc' }],
      }),
      user.roleCode
        ? this.db.client.roleMenu.findMany({
          where: {
            roleCode: user.roleCode,
            isActive: true,
            menu: {
              isActive: true,
              isAdminMenu: false,
            },
          },
          select: {
            menuId: true,
            accessType: true,
          },
        })
        : Promise.resolve([]),
      this.db.client.userMenu.findMany({
        where: {
          userId,
          isActive: true,
          menu: {
            isActive: true,
            isAdminMenu: false,
          },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: {
          menuId: true,
          accessType: true,
          overrideType: true,
        },
      }),
      this.accessFoundationService.resolveActionPermissionContext({
        userId: userId.toString(),
        loginId: user.authAccount?.loginId ?? userId.toString(),
      } satisfies TokenPayload),
    ]);

    const roleMenuOverrideMap = new Map(
      roleMenuOverrides.map((override) => [override.menuId.toString(), override.accessType]),
    );
    const userMenuOverrideMap = new Map(
      userMenuOverrides.map((override) => [override.menuId.toString(), override]),
    );

    const generalMenus = this.buildAccessibleMenuTree(
      menus
        .filter((menu) => !menu.isAdminMenu)
        .map((menu) => {
          const resolvedAccess = resolvePmsMenuAccess({
            roleCode: user.roleCode,
            menuCode: menu.menuCode,
            isAdminMenu: false,
            hasSystemOverride: actionContext.policy.hasSystemOverride,
            roleOverrideAccessType: roleMenuOverrideMap.get(menu.id.toString()),
          });

          const userOverride = userMenuOverrideMap.get(menu.id.toString());
          const accessType = userOverride
            ? userOverride.overrideType === 'revoke'
              ? 'none'
              : normalizeMenuAccessType(userOverride.accessType)
            : resolvedAccess.accessType;

          return this.toFlatMenuRecord(menu, accessType);
        }),
    );

    let adminMenus: MenuTreeItem[] = [];
    if (actionContext.policy.hasSystemOverride) {
      adminMenus = this.buildMenuTree(
        menus
          .filter((menu) => menu.isAdminMenu)
          .map((menu) => this.toFlatMenuRecord(menu, 'full')),
      );
    }

    return { generalMenus, adminMenus };
  }

  private toFlatMenuRecord(
    menu: {
      id: bigint;
      menuCode: string;
      menuName: string;
      menuNameEn: string | null;
      menuType: string;
      menuPath: string | null;
      icon: string | null;
      sortOrder: number;
      menuLevel: number;
      parentMenuId: bigint | null;
      isVisible: boolean;
      isAdminMenu: boolean;
      description: string | null;
    },
    accessType: MenuAccessType,
  ): FlatMenuRecord {
    return {
      menu_id: menu.id,
      menu_code: menu.menuCode,
      menu_name: menu.menuName,
      menu_name_en: menu.menuNameEn,
      menu_type: menu.menuType,
      menu_path: menu.menuPath,
      icon: menu.icon,
      sort_order: menu.sortOrder,
      menu_level: menu.menuLevel,
      parent_menu_id: menu.parentMenuId,
      is_visible: menu.isVisible,
      is_admin_menu: menu.isAdminMenu,
      description: menu.description,
      access_type: accessType,
    };
  }

  private buildAccessibleMenuTree(menus: FlatMenuRecord[]): MenuTreeItem[] {
    const menuMap = new Map(menus.map((menu) => [menu.menu_id.toString(), menu]));
    const includedMenuIds = new Set<string>();

    const includeWithAncestors = (menuId: string) => {
      if (includedMenuIds.has(menuId)) {
        return;
      }

      const menu = menuMap.get(menuId);
      if (!menu) {
        return;
      }

      includedMenuIds.add(menuId);

      if (menu.parent_menu_id) {
        includeWithAncestors(menu.parent_menu_id.toString());
      }
    };

    for (const menu of menus) {
      if (menu.access_type !== 'none') {
        includeWithAncestors(menu.menu_id.toString());
      }
    }

    return this.buildMenuTree(
      menus.filter((menu) => includedMenuIds.has(menu.menu_id.toString())),
    );
  }

  /**
   * 플랫 메뉴 리스트를 트리 구조로 변환
   */
  private buildMenuTree(menus: FlatMenuRecord[]): MenuTreeItem[] {
    const menuMap = new Map<string, MenuTreeItem>();
    const rootMenus: MenuTreeItem[] = [];

    // 먼저 모든 메뉴를 맵에 저장
    for (const menu of menus) {
      const menuItem: MenuTreeItem = {
        menuId: menu.menu_id.toString(),
        menuCode: menu.menu_code,
        menuName: menu.menu_name,
        menuNameEn: menu.menu_name_en,
        menuType: menu.menu_type,
        menuPath: menu.menu_path,
        icon: menu.icon,
        sortOrder: menu.sort_order,
        menuLevel: menu.menu_level,
        parentMenuId: menu.parent_menu_id?.toString() || null,
        isVisible: menu.is_visible,
        isAdminMenu: menu.is_admin_menu,
        description: menu.description,
        accessType: menu.access_type,
        children: [],
      };
      menuMap.set(menuItem.menuId, menuItem);
    }

    // 부모-자식 관계 구성
    for (const menu of menuMap.values()) {
      if (menu.parentMenuId && menuMap.has(menu.parentMenuId)) {
        const parent = menuMap.get(menu.parentMenuId);
        parent?.children.push(menu);
      } else if (!menu.parentMenuId) {
        rootMenus.push(menu);
      }
    }

    // 각 레벨에서 sortOrder로 정렬
    const sortChildren = (items: MenuTreeItem[]): MenuTreeItem[] => {
      items.sort((a, b) => a.sortOrder - b.sortOrder);
      for (const item of items) {
        if (item.children.length > 0) {
          sortChildren(item.children);
        }
      }
      return items;
    };

    return sortChildren(rootMenus);
  }

  /**
   * 사용자 즐겨찾기 메뉴 조회
   */
  async getFavoritesByUserId(userId: bigint) {
    const favorites = await this.db.$queryRaw<
      Array<{
        favorite_id: bigint;
        menu_id: bigint;
        menu_code: string;
        menu_name: string;
        menu_path: string | null;
        icon: string | null;
        sort_order: number;
      }>
    >`
      SELECT 
        f.user_favorite_id as favorite_id,
        m.menu_id,
        m.menu_code,
        m.menu_name,
        m.menu_path,
        m.icon,
        f.sort_order
      FROM pms.cm_user_favorite_r f
      INNER JOIN pms.cm_menu_m m ON f.menu_id = m.menu_id
      WHERE f.user_id = ${userId}
        AND f.is_active = true
        AND m.is_active = true
      ORDER BY f.sort_order
    `;

    return favorites.map(
      (f: {
        favorite_id: bigint;
        menu_id: bigint;
        menu_code: string;
        menu_name: string;
        menu_path: string | null;
        icon: string | null;
        sort_order: number;
      }) => ({
        id: f.favorite_id.toString(),
        menuId: f.menu_id.toString(),
        menuCode: f.menu_code,
        menuName: f.menu_name,
        menuPath: f.menu_path,
        icon: f.icon,
        sortOrder: f.sort_order,
      })
    );
  }

  /**
   * 즐겨찾기 추가
   * - 기존 레코드가 있으면 is_active=true로 UPDATE (재등록)
   * - 없으면 새로 INSERT
   */
  async addFavorite(userId: bigint, menuId: bigint) {
    // 기존 레코드 확인 (is_active 상관없이)
    const existing = await this.db.userFavorite.findFirst({
      where: {
        userId: userId,
        menuId: menuId,
      },
    });

    // 현재 최대 sortOrder 조회
    const maxSortOrder = await this.db.userFavorite.aggregate({
      where: {
        userId: userId,
        isActive: true,
      },
      _max: {
        sortOrder: true,
      },
    });
    const newSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

    let favorite: { id: bigint; sortOrder: number };

    if (existing) {
      if (existing.isActive) {
        // 이미 활성 상태면 기존 데이터 그대로 반환
        favorite = existing;
      } else {
        // 비활성 상태면 다시 활성화 (재등록)
        const updated = await this.db.userFavorite.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            sortOrder: newSortOrder,
          },
        });
        favorite = updated;
      }
    } else {
      // 새 즐겨찾기 생성
      const created = await this.db.userFavorite.create({
        data: {
          userId: userId,
          menuId: menuId,
          sortOrder: newSortOrder,
          isActive: true,
        },
      });
      favorite = created;
    }

    // 메뉴 정보 조회
    const menu = await this.db.menu.findUnique({
      where: { id: menuId },
    });

    return {
      id: favorite.id.toString(),
      menuId: menuId.toString(),
      menuCode: menu?.menuCode || '',
      menuName: menu?.menuName || '',
      menuPath: menu?.menuPath,
      icon: menu?.icon,
      sortOrder: favorite.sortOrder,
    };
  }

  /**
   * 즐겨찾기 삭제
   */
  async removeFavorite(userId: bigint, menuId: bigint) {
    await this.db.userFavorite.updateMany({
      where: {
        userId: userId,
        menuId: menuId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
  }
}
