// ============================================
// Layout Types
// 레이아웃 관련 타입 정의
// ============================================

/**
 * 디바이스 타입 (반응형)
 */
export type DeviceType = 'desktop' | 'mobile';

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
