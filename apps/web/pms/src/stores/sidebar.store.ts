import { create } from 'zustand';
import type {
  SidebarState,
  SidebarActions,
  SidebarSection,
} from '@/types';

interface SidebarStore extends SidebarState, SidebarActions {}

// 기본 펼쳐진 섹션
const DEFAULT_EXPANDED_SECTIONS: SidebarSection[] = ['favorites', 'menuTree'];

export const useSidebarStore = create<SidebarStore>()((set) => ({
  // Initial State
  isCollapsed: false,
  expandedSections: DEFAULT_EXPANDED_SECTIONS,
  searchQuery: '',
  expandedMenuIds: new Set<string>(),

  // Actions
  toggleCollapse: () => {
    set((state) => ({
      isCollapsed: !state.isCollapsed,
    }));
  },

  setCollapsed: (collapsed: boolean) => {
    set({
      isCollapsed: collapsed,
    });
  },

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

  // 메뉴 트리 펼치기
  toggleMenuExpand: (menuId: string) => {
    set((state) => {
      const newExpanded = new Set(state.expandedMenuIds);
      if (newExpanded.has(menuId)) {
        newExpanded.delete(menuId);
      } else {
        newExpanded.add(menuId);
      }
      return { expandedMenuIds: newExpanded };
    });
  },

  expandMenu: (menuId: string) => {
    set((state) => {
      if (state.expandedMenuIds.has(menuId)) return state;
      const newExpanded = new Set(state.expandedMenuIds);
      newExpanded.add(menuId);
      return { expandedMenuIds: newExpanded };
    });
  },

  collapseMenu: (menuId: string) => {
    set((state) => {
      if (!state.expandedMenuIds.has(menuId)) return state;
      const newExpanded = new Set(state.expandedMenuIds);
      newExpanded.delete(menuId);
      return { expandedMenuIds: newExpanded };
    });
  },

  collapseAllMenus: () => {
    set({ expandedMenuIds: new Set() });
  },
}));
