import { create } from 'zustand';
import type { DeviceType, DocumentType, LayoutState, LayoutActions } from '@/types';

interface LayoutStore extends LayoutState, LayoutActions {}

export const useLayoutStore = create<LayoutStore>()((set) => ({
  // Initial State
  deviceType: 'desktop',
  documentType: 'wiki',

  // Actions
  setDeviceType: (type: DeviceType) => {
    set({ deviceType: type });
  },

  setDocumentType: (type: DocumentType) => {
    set({ documentType: type });
  },
}));
