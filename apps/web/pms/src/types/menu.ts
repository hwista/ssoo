// ============================================
// Menu Types
// 메뉴 관련 타입 정의
// ============================================

/**
 * 메뉴 타입
 * - group: 폴더(하위 메뉴를 가진 그룹)
 * - menu: 실제 페이지 메뉴
 * - action: 권한 체크용 액션 (UI 표시 안함)
 */
export type MenuType = 'group' | 'menu' | 'action';

/**
 * 메뉴 오픈 타입
 * - tab: MDI 탭으로 열기
 * - modal: 모달로 열기
 * - external: 새 창으로 열기 (관리자 페이지 등)
 */
export type MenuOpenType = 'tab' | 'modal' | 'external';

/**
 * 메뉴 접근 권한 타입
 * - full: 전체 접근 (CRUD)
 * - read: 읽기 전용
 * - none: 접근 불가
 */
export type AccessType = 'full' | 'read' | 'none';

/**
 * DB에서 조회한 메뉴 원본 데이터
 */
export interface MenuDTO {
  menuId: string; // BigInt -> string (직렬화)
  menuCode: string;
  menuName: string;
  menuNameEn?: string | null;
  menuType: MenuType;
  parentMenuId?: string | null;
  menuPath?: string | null;
  icon?: string | null;
  sortOrder: number;
  menuLevel: number;
  isVisible: boolean;
  isEnabled: boolean;
  openType: MenuOpenType;
  description?: string | null;
}

/**
 * 클라이언트용 메뉴 아이템 (트리 구조)
 */
export interface MenuItem {
  menuId: string;
  menuCode: string;
  menuName: string;
  menuNameEn?: string;
  menuType: MenuType;
  menuPath?: string;
  icon?: string;
  sortOrder: number;
  menuLevel: number;
  isVisible: boolean;
  isEnabled?: boolean;
  isAdminMenu: boolean; // 관리자 전용 메뉴 여부
  openType?: MenuOpenType;
  accessType: AccessType; // 해당 사용자의 권한
  children: MenuItem[];
  parentMenuId?: string;
}

/**
 * 즐겨찾기 메뉴 아이템
 */
export interface FavoriteMenuItem {
  id: string;
  menuId: string;
  menuCode: string;
  menuName: string;
  menuPath?: string;
  icon?: string;
  sortOrder: number;
}

/**
 * 메뉴 권한 정보
 */
export interface MenuPermission {
  menuId: string;
  menuCode: string;
  accessType: AccessType;
}
