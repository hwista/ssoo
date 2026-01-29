/**
 * DMS Layout Store
 * 레이아웃 상태 관리 + 사이드바 폴더 확장 상태
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
  // 파일 트리 폴더 확장 상태
  expandedFolders: Set<string>;
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
  // 폴더 확장 관련
  toggleFolder: (path: string) => void;
  expandFolder: (path: string) => void;
  collapseFolder: (path: string) => void;
  collapseAllFolders: () => void;
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
  expandedFolders: new Set<string>(),

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

  // 폴더 확장 액션
  toggleFolder: (path: string) => {
    set((state) => {
      const newExpanded = new Set(state.expandedFolders);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      return { expandedFolders: newExpanded };
    });
  },

  expandFolder: (path: string) => {
    set((state) => {
      if (state.expandedFolders.has(path)) return state;
      const newExpanded = new Set(state.expandedFolders);
      newExpanded.add(path);
      return { expandedFolders: newExpanded };
    });
  },

  collapseFolder: (path: string) => {
    set((state) => {
      if (!state.expandedFolders.has(path)) return state;
      const newExpanded = new Set(state.expandedFolders);
      newExpanded.delete(path);
      return { expandedFolders: newExpanded };
    });
  },

  collapseAllFolders: () => {
    set({ expandedFolders: new Set() });
  },
}));
