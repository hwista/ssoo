// ============================================
// Sidebar Types
// 사이드바 관련 타입 정의
// ============================================

/**
 * 사이드바 섹션 타입
 */
export type SidebarSection = 'search' | 'favorites' | 'openTabs' | 'menuTree' | 'admin';

/**
 * 사이드바 상태
 */
export interface SidebarState {
  isCollapsed: boolean; // 접힘 여부
  activeFloatSection: SidebarSection | null; // 현재 플로팅 중인 섹션
  expandedSections: SidebarSection[]; // 펼쳐진 섹션들
  searchQuery: string; // 메뉴 검색어
  expandedMenuIds: Set<string>; // 펼쳐진 메뉴 폴더 ID들
}

/**
 * 사이드바 액션
 */
export interface SidebarActions {
  toggleCollapse: () => void;
  setCollapsed: (collapsed: boolean) => void;
  
  // 플로팅 패널
  openFloatSection: (section: SidebarSection) => void;
  closeFloatSection: () => void;
  
  // 섹션 접기/펼치기
  toggleSection: (section: SidebarSection) => void;
  setExpandedSections: (sections: SidebarSection[]) => void;
  
  // 검색
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  
  // 메뉴 트리 펼치기
  toggleMenuExpand: (menuId: string) => void;
  expandMenu: (menuId: string) => void;
  collapseMenu: (menuId: string) => void;
  collapseAllMenus: () => void;
}

/**
 * 사이드바 섹션 아이콘 매핑
 */
export const SIDEBAR_SECTION_ICONS: Record<SidebarSection, string> = {
  search: 'Search',
  favorites: 'Star',
  openTabs: 'Layers', // 또는 'LayoutList'
  menuTree: 'FolderTree',
  admin: 'Settings',
};

/**
 * 사이드바 섹션 라벨
 */
export const SIDEBAR_SECTION_LABELS: Record<SidebarSection, string> = {
  search: '메뉴 검색',
  favorites: '즐겨찾기',
  openTabs: '현재 열린 페이지',
  menuTree: '전체 메뉴',
  admin: '관리자 페이지',
};

/**
 * 플로팅 패널 설정
 */
export const FLOAT_PANEL_CONFIG = {
  closeDelay: 300, // ms - 마우스 벗어난 후 닫히기까지 딜레이
  openDelay: 100, // ms - 마우스 진입 후 열리기까지 딜레이
};
