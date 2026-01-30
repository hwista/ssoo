import { create } from 'zustand';
import type { DeviceType, DocumentType, AISearchType } from '@/types/layout';
import { BREAKPOINTS } from '@/types/layout';

interface LayoutStoreState {
  deviceType: DeviceType;
  documentType: DocumentType;
  aiSearchType: AISearchType;
}

interface LayoutStoreActions {
  setDeviceType: (type: DeviceType) => void;
  setDocumentType: (type: DocumentType) => void;
  setAISearchType: (type: AISearchType) => void;
  initializeDeviceType: () => void;
}

interface LayoutStore extends LayoutStoreState, LayoutStoreActions {}

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

  initializeDeviceType: () => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < BREAKPOINTS.mobile;
      set({ deviceType: isMobile ? 'mobile' : 'desktop' });
    }
  },
}));
