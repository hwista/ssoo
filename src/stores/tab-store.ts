/**
 * DMS Tab Store
 * 문서 탭 상태 관리
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TabItem, OpenTabOptions } from '@/types/layout';

// Home 탭 상수 (닫기 불가)
export const HOME_TAB = {
  id: 'home',
  title: '홈',
  path: '/wiki',
  icon: 'Home',
  closable: false,
} as const;

// 초기 Home 탭 생성
const createHomeTab = (): TabItem => {
  const now = new Date();
  return {
    id: HOME_TAB.id,
    title: HOME_TAB.title,
    path: HOME_TAB.path,
    icon: HOME_TAB.icon,
    closable: HOME_TAB.closable,
    openedAt: now,
    lastActiveAt: now,
  };
};

interface TabStoreState {
  tabs: TabItem[];
  activeTabId: string | null;
  maxTabs: number;
}

interface TabStoreActions {
  openTab: (options: OpenTabOptions) => string;
  closeTab: (tabId: string) => void;
  activateTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  closeAllTabs: () => void;
  updateTabTitle: (tabId: string, title: string) => void;
  getActiveTab: () => TabItem | undefined;
}

interface TabStore extends TabStoreState, TabStoreActions {}

export const useTabStore = create<TabStore>()(
  persist(
    (set, get) => ({
      // Initial State - Home 탭으로 시작
      tabs: [createHomeTab()],
      activeTabId: HOME_TAB.id,
      maxTabs: 15,

      // Actions
      openTab: (options: OpenTabOptions): string => {
        const {
          id,
          title,
          path,
          icon,
          closable = true,
          activate = true,
        } = options;

        // ID가 없으면 path 기반으로 생성
        const tabId = id || path.replace(/\//g, '-').replace(/^-/, '');
        const { tabs, maxTabs } = get();

        // 이미 존재하는 탭 확인
        const existingTab = tabs.find((t) => t.id === tabId);
        if (existingTab) {
          if (activate) {
            set({
              activeTabId: tabId,
              tabs: tabs.map((t) =>
                t.id === tabId ? { ...t, lastActiveAt: new Date() } : t
              ),
            });
          }
          return tabId;
        }

        // 최대 탭 수 초과 시 가장 오래된 탭 닫기
        let currentTabs = get().tabs;
        if (currentTabs.length >= maxTabs) {
          const closableTabs = currentTabs.filter((t) => t.closable);
          if (closableTabs.length > 0) {
            const sorted = closableTabs.sort(
              (a, b) => a.lastActiveAt.getTime() - b.lastActiveAt.getTime()
            );
            const oldest = sorted[0];
            if (oldest) {
              get().closeTab(oldest.id);
              currentTabs = get().tabs;
            }
          }
        }

        const now = new Date();
        const newTab: TabItem = {
          id: tabId,
          title,
          path,
          icon,
          closable,
          openedAt: now,
          lastActiveAt: now,
        };

        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: activate ? tabId : state.activeTabId,
        }));

        return tabId;
      },

      closeTab: (tabId: string): void => {
        const { tabs, activeTabId } = get();
        const tabToClose = tabs.find((t) => t.id === tabId);

        if (!tabToClose || !tabToClose.closable) return;

        const newTabs = tabs.filter((t) => t.id !== tabId);

        // 닫는 탭이 활성 탭이면 다른 탭 활성화
        let newActiveTabId = activeTabId;
        if (activeTabId === tabId) {
          const closedIndex = tabs.findIndex((t) => t.id === tabId);
          if (newTabs.length > 0) {
            newActiveTabId =
              newTabs[Math.min(closedIndex, newTabs.length - 1)]?.id ?? null;
          } else {
            newActiveTabId = null;
          }
        }

        set({
          tabs: newTabs,
          activeTabId: newActiveTabId,
        });
      },

      activateTab: (tabId: string): void => {
        const { tabs } = get();
        const tab = tabs.find((t) => t.id === tabId);
        if (!tab) return;

        set({
          activeTabId: tabId,
          tabs: tabs.map((t) =>
            t.id === tabId ? { ...t, lastActiveAt: new Date() } : t
          ),
        });
      },

      closeOtherTabs: (tabId: string): void => {
        const { tabs } = get();
        const remainingTabs = tabs.filter(
          (t) => t.id === tabId || !t.closable
        );
        set({
          tabs: remainingTabs,
          activeTabId: tabId,
        });
      },

      closeAllTabs: (): void => {
        const homeTab = createHomeTab();
        set({
          tabs: [homeTab],
          activeTabId: HOME_TAB.id,
        });
      },

      updateTabTitle: (tabId: string, title: string): void => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, title } : t
          ),
        }));
      },

      getActiveTab: (): TabItem | undefined => {
        const { tabs, activeTabId } = get();
        return tabs.find((t) => t.id === activeTabId);
      },
    }),
    {
      name: 'dms-tab-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
      // Date 역직렬화
      onRehydrateStorage: () => (state) => {
        if (state?.tabs) {
          state.tabs = state.tabs.map((tab) => ({
            ...tab,
            openedAt: new Date(tab.openedAt),
            lastActiveAt: new Date(tab.lastActiveAt),
          }));
        }
      },
    }
  )
);
