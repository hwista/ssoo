import { create } from 'zustand';
import type { SidebarState, SidebarActions, SidebarSection } from '@/types';
import { getCurrentUserScopeId, isUserScopeTransition, registerUserScopedReset } from '@/lib/user-scope';

interface SidebarStore extends SidebarState, SidebarActions {
  resetUserState: (ownerUserId?: string | null) => void;
}

// 파일 트리는 일반 sidebar 펼침 배열과 분리하고, 계정 전환 시 내부 탐색 상태만 비운다.
const DEFAULT_EXPANDED_SECTIONS: SidebarSection[] = ['bookmarks'];
const USER_SCOPE_RESET_EXPANDED_SECTIONS: SidebarSection[] = DEFAULT_EXPANDED_SECTIONS;
const FILE_TREE_SECTION: SidebarSection = 'fileTree';

function toNonFileTreeSections(sections: SidebarSection[]): SidebarSection[] {
  return sections.filter((section) => section !== FILE_TREE_SECTION);
}

function resolveUserScopeId(ownerUserId?: string | null): string | null {
  return ownerUserId === undefined ? getCurrentUserScopeId() : ownerUserId;
}

export const useSidebarStore = create<SidebarStore>()((set, get) => ({
  // Initial State
  expandedSections: DEFAULT_EXPANDED_SECTIONS,
  searchQuery: '',
  searchOwnerUserId: null,
  expandedFolders: new Set<string>(),
  isFileTreeOpen: false,
  fileTreeOwnerUserId: null,
  fileTreeResetEpoch: 0,
  isCompactMode: false,
  sidebarOpen: true,

  // 섹션 접기/펼치기
  toggleSection: (section: SidebarSection) => {
    set((state) => {
      if (section === FILE_TREE_SECTION) {
        const currentUserId = getCurrentUserScopeId();
        if (!currentUserId) return state;

        const isSameOwner = state.fileTreeOwnerUserId === currentUserId;
        const nextIsFileTreeOpen = isSameOwner ? !state.isFileTreeOpen : true;

        return {
          expandedSections: toNonFileTreeSections(state.expandedSections),
          expandedFolders: isSameOwner
            ? state.expandedFolders
            : new Set<string>(),
          isFileTreeOpen: nextIsFileTreeOpen,
          searchQuery: isSameOwner ? state.searchQuery : '',
          searchOwnerUserId: isSameOwner ? state.searchOwnerUserId : currentUserId,
          fileTreeOwnerUserId: currentUserId,
        };
      }

      const nextSections = toNonFileTreeSections(state.expandedSections);
      const isExpanded = nextSections.includes(section);
      return {
        expandedSections: isExpanded
          ? nextSections.filter((s) => s !== section)
          : [...nextSections, section],
      };
    });
  },

  setExpandedSections: (sections: SidebarSection[]) => {
    set({ expandedSections: toNonFileTreeSections(sections) });
  },

  // 검색
  setSearchQuery: (query: string) => {
    const currentUserId = getCurrentUserScopeId();
    set({
      searchQuery: query,
      searchOwnerUserId: currentUserId,
    });
  },

  clearSearch: () => {
    set({
      searchQuery: '',
      searchOwnerUserId: getCurrentUserScopeId(),
    });
  },

  // 폴더 확장 액션
  toggleFolder: (path: string) => {
    set((state) => {
      const currentUserId = getCurrentUserScopeId();
      if (!currentUserId) return state;

      const newExpanded = state.fileTreeOwnerUserId === currentUserId
        ? new Set(state.expandedFolders)
        : new Set<string>();
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      return {
        expandedFolders: newExpanded,
        fileTreeOwnerUserId: currentUserId,
      };
    });
  },

  expandFolder: (path: string) => {
    set((state) => {
      const currentUserId = getCurrentUserScopeId();
      if (!currentUserId) return state;

      const newExpanded = state.fileTreeOwnerUserId === currentUserId
        ? new Set(state.expandedFolders)
        : new Set<string>();
      if (newExpanded.has(path)) {
        return state.fileTreeOwnerUserId === currentUserId
          ? state
          : { expandedFolders: newExpanded, fileTreeOwnerUserId: currentUserId };
      }
      newExpanded.add(path);
      return {
        expandedFolders: newExpanded,
        fileTreeOwnerUserId: currentUserId,
      };
    });
  },

  collapseFolder: (path: string) => {
    set((state) => {
      const currentUserId = getCurrentUserScopeId();
      if (!currentUserId || state.fileTreeOwnerUserId !== currentUserId) return state;
      if (!state.expandedFolders.has(path)) return state;

      const newExpanded = new Set(state.expandedFolders);
      newExpanded.delete(path);
      return { expandedFolders: newExpanded };
    });
  },

  collapseAllFolders: () => {
    set({
      expandedFolders: new Set(),
      fileTreeOwnerUserId: getCurrentUserScopeId(),
    });
  },

  // 컴팩트 모드 액션
  setCompactMode: (isCompact: boolean) => {
    set({
      isCompactMode: isCompact,
      sidebarOpen: get().sidebarOpen,
    });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open });
  },

  resetUserState: (ownerUserId) => {
    const initialFileTreeOwnerUserId = resolveUserScopeId(ownerUserId);
    set((state) => ({
      expandedSections: USER_SCOPE_RESET_EXPANDED_SECTIONS,
      searchQuery: '',
      searchOwnerUserId: initialFileTreeOwnerUserId,
      expandedFolders: new Set(),
      isFileTreeOpen: initialFileTreeOwnerUserId !== null,
      fileTreeOwnerUserId: initialFileTreeOwnerUserId,
      fileTreeResetEpoch: state.fileTreeResetEpoch + 1,
      sidebarOpen: true,
    }));
  },
}));

registerUserScopedReset((next, prev) => {
  if (isUserScopeTransition(next, prev)) {
    useSidebarStore.getState().resetUserState(next);
  }
});
