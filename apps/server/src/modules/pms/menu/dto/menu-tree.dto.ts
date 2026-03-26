export class MenuTreeItemDto {
  menuId!: string;
  menuCode!: string;
  menuName!: string;
  menuNameEn!: string | null;
  menuType!: string;
  menuPath!: string | null;
  icon!: string | null;
  sortOrder!: number;
  menuLevel!: number;
  parentMenuId!: string | null;
  isVisible!: boolean;
  isAdminMenu!: boolean;
  description!: string | null;
  accessType!: string;
  children!: MenuTreeItemDto[];
}

export class FavoriteMenuDto {
  id!: string;
  menuId!: string;
  menuCode!: string;
  menuName!: string;
  menuPath!: string | null;
  icon!: string | null;
  sortOrder!: number;
}

export class MenuResponseDto {
  generalMenus!: MenuTreeItemDto[];
  adminMenus!: MenuTreeItemDto[];
  favorites!: FavoriteMenuDto[];
}
