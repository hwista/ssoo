// ============================================
// Layout Types
// 레이아웃 관련 타입 정의
// ============================================

/**
 * 디바이스 타입 (반응형)
 */
export type DeviceType = 'desktop' | 'mobile';

/**
 * 브레이크포인트 (px)
 */
export const BREAKPOINTS = {
  mobile: 768, // 768px 미만 = 모바일
  desktop: 768, // 768px 이상 = 데스크톱
} as const;

/**
 * 레이아웃 사이즈 설정
 */
export const LAYOUT_SIZES = {
  sidebar: {
    expandedWidth: 340, // 펼친 사이드바 너비 (그룹웨어 기준)
    collapsedWidth: 56, // 접힌 사이드바 너비 (아이콘만)
  },
  header: {
    height: 60, // 헤더 높이 (그룹웨어 기준)
  },
  tabBar: {
    height: 36, // 탭바 높이 (control-h 기준)
    containerHeight: 53, // 탭바 컨테이너 높이 (패딩 포함)
    tabMinWidth: 120, // 탭 최소 너비
    tabMaxWidth: 200, // 탭 최대 너비
  },
} as const;

/**
 * 앱 레이아웃 상태
 */
export interface LayoutState {
  deviceType: DeviceType;
  isMobileMenuOpen: boolean; // 모바일에서 메뉴 열림 여부
}

/**
 * 앱 레이아웃 액션
 */
export interface LayoutActions {
  setDeviceType: (type: DeviceType) => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
}
