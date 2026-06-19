import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { APP_HOME_PATH } from '@/lib/constants/routes';

export interface SnsTabItem {
  id: string;
  title: string;
  path: string;
  closable: boolean;
  openedAt: Date;
  lastActiveAt: Date;
}

export interface OpenSnsTabOptions {
  id?: string;
  title: string;
  path: string;
  closable?: boolean;
  activate?: boolean;
}

interface SnsTabStore {
  tabs: SnsTabItem[];
  activeTabId: string | null;
  maxTabs: number;
  openTab: (options: OpenSnsTabOptions) => string;
  closeTab: (tabId: string) => void;
  activateTab: (tabId: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
}

export const SNS_HOME_TAB = {
  id: 'home',
  title: '홈',
  path: APP_HOME_PATH,
  closable: false,
} as const;

function createHomeTab(): SnsTabItem {
  const now = new Date();
  return {
    id: SNS_HOME_TAB.id,
    title: SNS_HOME_TAB.title,
    path: SNS_HOME_TAB.path,
    closable: SNS_HOME_TAB.closable,
    openedAt: now,
    lastActiveAt: now,
  };
}

function createTabId(path: string, id?: string): string {
  if (id) return id;
  const normalizedPath = path || APP_HOME_PATH;
  if (normalizedPath === APP_HOME_PATH) return SNS_HOME_TAB.id;
  return normalizedPath.replace(/[/?#=&]/g, '-').replace(/^-+|-+$/g, '') || SNS_HOME_TAB.id;
}

export const useTabStore = create<SnsTabStore>()(
  persist(
    (set, get) => ({
      tabs: [createHomeTab()],
      activeTabId: SNS_HOME_TAB.id,
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
        const nextTab: SnsTabItem = {
          id: tabId,
          title: options.title,
          path: options.path,
          closable: options.closable ?? tabId !== SNS_HOME_TAB.id,
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
          nextActiveTabId = nextTabs[Math.min(closedIndex, nextTabs.length - 1)]?.id ?? SNS_HOME_TAB.id;
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
      name: 'sns-mdi-tabs',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ tabs: state.tabs, activeTabId: state.activeTabId }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.tabs = state.tabs.map((tab) => ({
          ...tab,
          openedAt: new Date(tab.openedAt),
          lastActiveAt: new Date(tab.lastActiveAt),
        }));
        if (!state.tabs.some((tab) => tab.id === SNS_HOME_TAB.id)) {
          state.tabs = [createHomeTab(), ...state.tabs];
        }
        state.activeTabId = state.activeTabId ?? SNS_HOME_TAB.id;
      },
    }
  )
);
