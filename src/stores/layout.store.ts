import { create } from 'zustand';
import type { DeviceType, DocumentType, AISearchType, LayoutState, LayoutActions } from '@/types';
import { BREAKPOINTS } from '@/types';

interface LayoutStore extends LayoutState, LayoutActions {}

// 현재 디바이스 타입 감지 (PMS 패턴)
const detectDeviceType = (): DeviceType => {
  if (typeof window === 'undefined') return 'desktop';
  return window.innerWidth < BREAKPOINTS.mobile ? 'mobile' : 'desktop';
};

export const useLayoutStore = create<LayoutStore>()((set) => ({
  // Initial State
  deviceType: 'desktop',
  documentType: 'wiki',
  aiSearchType: 'rag',

  // Actions
  setDeviceType: (type: DeviceType) => {
    set({ deviceType: type });
  },

  setDocumentType: (type: DocumentType) => {
    set({ documentType: type });
  },

  setAISearchType: (type: AISearchType) => {
    set({ aiSearchType: type });
  },
}));

// 윈도우 리사이즈 리스너 (클라이언트 사이드에서만) - PMS 패턴
if (typeof window !== 'undefined') {
  // 초기 디바이스 타입 설정
  useLayoutStore.setState({ deviceType: detectDeviceType() });

  // 리사이즈 이벤트 (디바운스)
  let resizeTimer: ReturnType<typeof setTimeout>;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const newType = detectDeviceType();
      const currentType = useLayoutStore.getState().deviceType;
      if (newType !== currentType) {
        useLayoutStore.setState({ deviceType: newType });
      }
    }, 100);
  });
}
