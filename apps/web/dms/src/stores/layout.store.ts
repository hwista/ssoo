import { create } from 'zustand';
import type { DeviceType, LayoutState, LayoutActions } from '@/types';

interface LayoutStore extends LayoutState, LayoutActions {}

export const useLayoutStore = create<LayoutStore>()((set) => ({
  // Initial State
  deviceType: 'desktop',

  // Actions
  setDeviceType: (type: DeviceType) => {
    set({ deviceType: type });
  },
}));
