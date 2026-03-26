// ============================================
// Tab Types
// MDI 탭 관련 타입 정의
// ============================================

/**
 * MDI 탭 아이템
 */
export interface TabItem {
  id: string; // 탭 고유 ID (menuCode + params로 생성)
  menuCode: string; // 메뉴 코드
  menuId: string; // 메뉴 ID
  title: string; // 탭 제목
  icon?: string; // 아이콘
  path?: string; // 원본 경로
  closable: boolean; // 닫기 가능 여부 (대시보드는 false)
  params?: Record<string, string>; // 동적 파라미터 (예: projectId)
  openedAt: Date; // 열린 시각
  lastActiveAt: Date; // 마지막 활성화 시각
}

/**
 * 탭 열기 옵션
 */
export interface OpenTabOptions {
  menuCode: string;
  menuId: string;
  title: string;
  icon?: string;
  path?: string;
  params?: Record<string, string>;
  closable?: boolean; // 기본값: true
  activate?: boolean; // 열면서 활성화 여부, 기본값: true
  replaceExisting?: boolean; // 같은 menuCode 탭이 있으면 교체
}

/**
 * 탭 스토어 상태
 */
export interface TabStoreState {
  tabs: TabItem[];
  activeTabId: string | null;
  maxTabs: number; // 최대 탭 수 (기본 16, 홈 탭 포함)
}

/**
 * 탭 스토어 액션
 */
export interface TabStoreActions {
  openTab: (options: OpenTabOptions) => string; // 탭 열기, 탭 ID 반환
  closeTab: (tabId: string) => void; // 탭 닫기
  closeAllTabs: () => void; // 모든 탭 닫기 (closable=false 제외)
  closeOtherTabs: (tabId: string) => void; // 다른 탭 닫기
  closeOldestTab: () => void; // 가장 오래된 탭 닫기 (탭 초과 시 사용)
  activateTab: (tabId: string) => void; // 탭 활성화
  updateTabTitle: (tabId: string, title: string) => void; // 탭 제목 변경
  reorderTabs: (fromIndex: number, toIndex: number) => void; // 탭 순서 변경
  getTabByMenuCode: (menuCode: string, params?: Record<string, string>) => TabItem | undefined;
}
