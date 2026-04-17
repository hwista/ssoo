export type PmsAccessType = 'full' | 'read' | 'none' | string;

export interface PmsAccessMenuItem {
  menuId: string;
  menuCode: string;
  menuName: string;
  menuNameEn?: string | null;
  menuType: string;
  menuPath?: string | null;
  icon?: string | null;
  sortOrder: number;
  menuLevel: number;
  parentMenuId?: string | null;
  isVisible: boolean;
  isAdminMenu: boolean;
  description?: string | null;
  accessType: PmsAccessType;
  children: PmsAccessMenuItem[];
}

export interface PmsFavoriteMenuItem {
  id: string;
  menuId: string;
  menuCode: string;
  menuName: string;
  menuPath?: string | null;
  icon?: string | null;
  sortOrder: number;
}

/**
 * PMS navigation-centric access snapshot.
 *
 * Returned by `GET /api/menus/my` and used to hydrate the main menu, favorites,
 * and other navigation state for the PMS shell.
 *
 * This snapshot does not include a shared `policy` trace. PMS object-level
 * policy is resolved separately through `GET /api/projects/:id/access`, which
 * returns `PmsProjectAccessSnapshot`.
 */
export interface PmsAccessSnapshot {
  generalMenus: PmsAccessMenuItem[];
  adminMenus: PmsAccessMenuItem[];
  favorites: PmsFavoriteMenuItem[];
}
