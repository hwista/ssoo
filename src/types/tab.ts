// ============================================
// Tab Types
// MDI 탭 관련 타입 정의 (PMS 컨벤션)
// ============================================

/**
 * 탭 아이템 (문서 탭)
 * 
 * PMS와의 차이점:
 * - menuCode, menuId 없음 (DMS는 메뉴 기반이 아님)
 * - status, params, data 없음 (단순화)
 * - path 필수 (DMS는 파일 경로 기반)
 */
export interface TabItem {
  id: string;
  title: string;
  path: string;
  icon?: string;
  closable: boolean;
  openedAt: Date;
  lastActiveAt: Date;
}

/**
 * 탭 열기 옵션
 */
export interface OpenTabOptions {
  id?: string;
  title: string;
  path: string;
  icon?: string;
  closable?: boolean;
  activate?: boolean;
}

/**
 * 탭 스토어 상태
 */
export interface TabStoreState {
  tabs: TabItem[];
  activeTabId: string | null;
  maxTabs: number;
}

/**
 * 탭 스토어 액션
 */
export interface TabStoreActions {
  openTab: (options: OpenTabOptions) => string;
  closeTab: (tabId: string) => void;
  activateTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  closeAllTabs: () => void;
  updateTabTitle: (tabId: string, title: string) => void;
  getActiveTab: () => TabItem | undefined;
}
