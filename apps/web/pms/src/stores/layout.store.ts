import { create } from 'zustand';
import type { DeviceType, LayoutState, LayoutActions } from '@/types';
import { BREAKPOINTS } from '@/types';

interface LayoutStore extends LayoutState, LayoutActions {}

// 현재 디바이스 타입 감지
const detectDeviceType = (): DeviceType => {
  if (typeof window === 'undefined') return 'desktop';
  return window.innerWidth < BREAKPOINTS.mobile ? 'mobile' : 'desktop';
};

export const useLayoutStore = create<LayoutStore>()((set) => ({
  // Initial State
  deviceType: 'desktop',
  isMobileMenuOpen: false,

  // Actions
  setDeviceType: (type: DeviceType) => {
    set({ deviceType: type });
  },

  toggleMobileMenu: () => {
    set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen }));
  },

  closeMobileMenu: () => {
    set({ isMobileMenuOpen: false });
  },
}));

// 윈도우 리사이즈 리스너 (클라이언트 사이드에서만)
if (typeof window !== 'undefined') {
  // 초기 디바이스 타입 설정
  useLayoutStore.setState({ deviceType: detectDeviceType() });

  // 리사이즈 이벤트
  let resizeTimer: ReturnType<typeof setTimeout>;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const newType = detectDeviceType();
      const currentType = useLayoutStore.getState().deviceType;
      if (newType !== currentType) {
        useLayoutStore.setState({ deviceType: newType });
      }
    }, 100); // 디바운스
  });
}
