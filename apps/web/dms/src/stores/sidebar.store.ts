import { create } from 'zustand';
import type { SidebarState, SidebarActions, SidebarSection } from '@/types';

interface SidebarStore extends SidebarState, SidebarActions {}

// 기본 펼쳐진 섹션 (PMS 패턴: openTabs는 닫힌 채로 시작)
const DEFAULT_EXPANDED_SECTIONS: SidebarSection[] = ['bookmarks', 'fileTree'];

export const useSidebarStore = create<SidebarStore>()((set, get) => ({
  // Initial State
  expandedSections: DEFAULT_EXPANDED_SECTIONS,
  searchQuery: '',
  expandedFolders: new Set<string>(),
  isCompactMode: false,
  sidebarOpen: false,

  // 섹션 접기/펼치기
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

  // 검색
  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  clearSearch: () => {
    set({ searchQuery: '' });
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

  // 컴팩트 모드 액션
  setCompactMode: (isCompact: boolean) => {
    set({
      isCompactMode: isCompact,
      sidebarOpen: isCompact ? false : get().sidebarOpen,
    });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open });
  },
}));
