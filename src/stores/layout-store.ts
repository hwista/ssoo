/**
 * DMS Layout Store
 * 레이아웃 상태 관리
 */
import { create } from 'zustand';
import type { DeviceType, DocumentType, SidebarSection, AISearchType } from '@/types/layout';
import { BREAKPOINTS } from '@/types/layout';

interface LayoutStoreState {
  deviceType: DeviceType;
  documentType: DocumentType;
  expandedSections: SidebarSection[];
  searchQuery: string;
  aiSearchType: AISearchType;
}

interface LayoutStoreActions {
  setDeviceType: (type: DeviceType) => void;
  setDocumentType: (type: DocumentType) => void;
  toggleSection: (section: SidebarSection) => void;
  setExpandedSections: (sections: SidebarSection[]) => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  setAISearchType: (type: AISearchType) => void;
  initializeDeviceType: () => void;
}

interface LayoutStore extends LayoutStoreState, LayoutStoreActions {}

// 기본 펼쳐진 섹션
const DEFAULT_EXPANDED_SECTIONS: SidebarSection[] = ['bookmarks', 'openTabs', 'fileTree'];

export const useLayoutStore = create<LayoutStore>()((set, get) => ({
  // Initial State
  deviceType: 'desktop',
  documentType: 'wiki',
  expandedSections: DEFAULT_EXPANDED_SECTIONS,
  searchQuery: '',
  aiSearchType: 'rag',

  // Actions
  setDeviceType: (type: DeviceType) => {
    set({ deviceType: type });
  },

  setDocumentType: (type: DocumentType) => {
    set({ documentType: type });
  },

  toggleSection: (section: SidebarSection) => {
    set((state) => {
      const isExpanded = state.expandedSections.includes(section);
      return {
        expandedSections: isExpanded
          ? state.expandedSections.filter((s) => s !== section)
          : [...state.expandedSections, section],
      };
    });
  },

  setExpandedSections: (sections: SidebarSection[]) => {
    set({ expandedSections: sections });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  clearSearch: () => {
    set({ searchQuery: '' });
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
