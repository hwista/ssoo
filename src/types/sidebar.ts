// ============================================
// Sidebar Types
// 사이드바 관련 타입 정의
// ============================================

/**
 * 사이드바 섹션 타입
 * - 파일 시스템 기반: bookmarks, openTabs, fileTree
 * - PMS의 search는 플로팅 패널용, DMS는 고정 UI로 섹션 불필요
 */
export type SidebarSection = 'bookmarks' | 'openTabs' | 'fileTree';

/**
 * 사이드바 상태
 */
export interface SidebarState {
  expandedSections: SidebarSection[]; // 펼쳐진 섹션들
  searchQuery: string; // 파일 검색어
  expandedFolders: Set<string>; // 펼쳐진 폴더 경로들
  isCompactMode: boolean; // 컴팩트 모드 여부
  sidebarOpen: boolean; // 컴팩트 모드에서 사이드바 열림 상태
}

/**
 * 사이드바 액션
 */
export interface SidebarActions {
  // 섹션 접기/펼치기
  toggleSection: (section: SidebarSection) => void;
  setExpandedSections: (sections: SidebarSection[]) => void;
  
  // 검색
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  
  // 폴더 확장
  toggleFolder: (path: string) => void;
  expandFolder: (path: string) => void;
  collapseFolder: (path: string) => void;
  collapseAllFolders: () => void;
  
  // 컴팩트 모드
  setCompactMode: (isCompact: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

/**
 * 사이드바 섹션 아이콘 매핑
 */
export const SIDEBAR_SECTION_ICONS: Record<SidebarSection, string> = {
  bookmarks: 'Star',
  openTabs: 'Layers',
  fileTree: 'FolderTree',
};

/**
 * 사이드바 섹션 라벨
 */
export const SIDEBAR_SECTION_LABELS: Record<SidebarSection, string> = {
  bookmarks: '즐겨찾기',
  openTabs: '열린 문서',
  fileTree: '문서 탐색',
};
