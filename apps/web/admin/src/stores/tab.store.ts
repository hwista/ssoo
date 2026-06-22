import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface AdminTabItem {
  id: string;
  title: string;
  path: string;
  closable: boolean;
  openedAt: Date;
  lastActiveAt: Date;
}

export interface OpenAdminTabOptions {
  id?: string;
  title: string;
  path: string;
  closable?: boolean;
  activate?: boolean;
}

interface AdminTabStore {
  tabs: AdminTabItem[];
  activeTabId: string | null;
  maxTabs: number;
  openTab: (options: OpenAdminTabOptions) => string;
  closeTab: (tabId: string) => void;
  activateTab: (tabId: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
}

export const ADMIN_HOME_TAB = {
  id: 'home',
  title: '홈',
  path: '/',
  closable: false,
} as const;

function createHomeTab(): AdminTabItem {
  const now = new Date();
  return {
    id: ADMIN_HOME_TAB.id,
    title: ADMIN_HOME_TAB.title,
    path: ADMIN_HOME_TAB.path,
    closable: ADMIN_HOME_TAB.closable,
    openedAt: now,
    lastActiveAt: now,
  };
}

function createTabId(path: string, id?: string): string {
  if (id) return id;
  if (path === ADMIN_HOME_TAB.path) return ADMIN_HOME_TAB.id;
  return path.replace(/[/?#=&]/g, '-').replace(/^-+|-+$/g, '') || ADMIN_HOME_TAB.id;
}

export const useTabStore = create<AdminTabStore>()(
  persist(
    (set, get) => ({
      tabs: [createHomeTab()],
      activeTabId: ADMIN_HOME_TAB.id,
      maxTabs: 16,
      openTab: (options) => {
        const tabId = createTabId(options.path, options.id);
        const existing = get().tabs.find((tab) => tab.id === tabId);
        if (existing) {
          if (options.activate ?? true) {
            set((state) => ({
              activeTabId: tabId,
              tabs: state.tabs.map((tab) => (
                tab.id === tabId
                  ? { ...tab, title: options.title, path: options.path, lastActiveAt: new Date() }
                  : tab
              )),
            }));
          }
          return tabId;
        }

        if (get().tabs.length >= get().maxTabs) {
          return '';
        }

        const now = new Date();
        const nextTab: AdminTabItem = {
          id: tabId,
          title: options.title,
          path: options.path,
          closable: options.closable ?? tabId !== ADMIN_HOME_TAB.id,
          openedAt: now,
          lastActiveAt: now,
        };

        set((state) => ({
          tabs: [...state.tabs, nextTab],
          activeTabId: (options.activate ?? true) ? tabId : state.activeTabId,
        }));
        return tabId;
      },
      closeTab: (tabId) => {
        const { tabs, activeTabId } = get();
        const target = tabs.find((tab) => tab.id === tabId);
        if (!target?.closable) return;

        const nextTabs = tabs.filter((tab) => tab.id !== tabId);
        let nextActiveTabId = activeTabId;
        if (activeTabId === tabId) {
          const closedIndex = tabs.findIndex((tab) => tab.id === tabId);
          nextActiveTabId = nextTabs[Math.min(closedIndex, nextTabs.length - 1)]?.id ?? ADMIN_HOME_TAB.id;
        }
        set({ tabs: nextTabs, activeTabId: nextActiveTabId });
      },
      activateTab: (tabId) => {
        set((state) => ({
          activeTabId: tabId,
          tabs: state.tabs.map((tab) => (
            tab.id === tabId ? { ...tab, lastActiveAt: new Date() } : tab
          )),
        }));
      },
      reorderTabs: (fromIndex, toIndex) => {
        set((state) => {
          const nextTabs = [...state.tabs];
          const moved = nextTabs.splice(fromIndex, 1)[0];
          if (!moved) return state;
          nextTabs.splice(toIndex, 0, moved);
          return { tabs: nextTabs };
        });
      },
    }),
    {
      name: 'admin-mdi-tabs',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ tabs: state.tabs, activeTabId: state.activeTabId }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.tabs = state.tabs.map((tab) => ({
          ...tab,
          openedAt: new Date(tab.openedAt),
          lastActiveAt: new Date(tab.lastActiveAt),
        }));
        if (!state.tabs.some((tab) => tab.id === ADMIN_HOME_TAB.id)) {
          state.tabs = [createHomeTab(), ...state.tabs];
        }
        state.activeTabId = state.activeTabId ?? ADMIN_HOME_TAB.id;
      },
    }
  )
);
