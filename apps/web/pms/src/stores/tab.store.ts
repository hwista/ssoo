import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  TabItem,
  OpenTabOptions,
  TabStoreState,
  TabStoreActions,
} from '@/types';

// Home 탭 상수 (닫기 불가)
export const HOME_TAB = {
  menuCode: 'HOME',
  menuId: 'home',
  title: 'Home',
  icon: 'Home',
  path: '/home',
  closable: false,
} as const;

// 초기 Home 탭 생성
const createHomeTab = (): TabItem => {
  const now = new Date();
  return {
    id: HOME_TAB.menuCode,
    menuCode: HOME_TAB.menuCode,
    menuId: HOME_TAB.menuId,
    title: HOME_TAB.title,
    icon: HOME_TAB.icon,
    path: HOME_TAB.path,
    closable: HOME_TAB.closable,
    openedAt: now,
    lastActiveAt: now,
  };
};

// 탭 ID 생성 (menuCode + params 조합)
const generateTabId = (menuCode: string, params?: Record<string, string>): string => {
  if (!params || Object.keys(params).length === 0) {
    return menuCode;
  }
  const paramStr = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `${menuCode}?${paramStr}`;
};

interface TabStore extends TabStoreState, TabStoreActions {}

export const useTabStore = create<TabStore>()(
  persist(
    (set, get) => ({
      // Initial State - Home 탭으로 시작
      tabs: [createHomeTab()],
      activeTabId: HOME_TAB.menuCode,
      maxTabs: 16,

      // Actions
      openTab: (options: OpenTabOptions): string => {
        const {
          menuCode,
          menuId,
          title,
          icon,
          path,
          params,
          closable = true,
          activate = true,
          replaceExisting = false,
        } = options;

        const tabId = generateTabId(menuCode, params);
        const { tabs, maxTabs } = get();

        // 이미 존재하는 탭 확인
        const existingTab = tabs.find((t) => t.id === tabId);
        if (existingTab) {
          if (activate) {
            set({ activeTabId: tabId });
          }
          return tabId;
        }

        // 같은 menuCode 탭 교체 옵션
        if (replaceExisting) {
          const sameCodeTab = tabs.find((t) => t.menuCode === menuCode);
          if (sameCodeTab) {
            get().closeTab(sameCodeTab.id);
          }
        }

        // 최대 탭 수 초과 시 - 열지 않고 빈 문자열 반환 (컴포넌트에서 확인 처리)
        const currentTabs = get().tabs;
        if (currentTabs.length >= maxTabs) {
          return ''; // 초과 시 빈 문자열 반환
        }

        const now = new Date();
        const newTab: TabItem = {
          id: tabId,
          menuCode,
          menuId,
          title,
          icon,
          path,
          closable,
          params,
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
            // 왼쪽 탭 우선, 없으면 오른쪽
            newActiveTabId =
              newTabs[Math.min(closedIndex, newTabs.length - 1)]?.id ?? null;
          } else {
            newActiveTabId = null;
          }
        }

        set({ tabs: newTabs, activeTabId: newActiveTabId });
      },

      closeAllTabs: (): void => {
        const { tabs } = get();
        const unclosableTabs = tabs.filter((t) => !t.closable);
        const newActiveTabId = unclosableTabs[0]?.id ?? null;
        set({ tabs: unclosableTabs, activeTabId: newActiveTabId });
      },

      closeOtherTabs: (tabId: string): void => {
        const { tabs } = get();
        const keepTabs = tabs.filter((t) => t.id === tabId || !t.closable);
        set({ tabs: keepTabs, activeTabId: tabId });
      },

      activateTab: (tabId: string): void => {
        set((state) => ({
          activeTabId: tabId,
          tabs: state.tabs.map((t) =>
            t.id === tabId
              ? { ...t, lastActiveAt: new Date() }
              : t
          ),
        }));
      },

      updateTabTitle: (tabId: string, title: string): void => {
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, title } : t)),
        }));
      },

      reorderTabs: (fromIndex: number, toIndex: number): void => {
        set((state) => {
          const newTabs = [...state.tabs];
          const removed = newTabs.splice(fromIndex, 1)[0];
          if (!removed) return state;
          newTabs.splice(toIndex, 0, removed);
          return { tabs: newTabs };
        });
      },

      closeOldestTab: (): void => {
        const { tabs } = get();
        // closable한 탭 중 가장 오래된 탭 찾기 (openedAt 기준)
        const closableTabs = tabs.filter((t) => t.closable);
        if (closableTabs.length === 0) return;

        const oldestTab = closableTabs.reduce((oldest, tab) =>
          tab.openedAt < oldest.openedAt ? tab : oldest
        );
        get().closeTab(oldestTab.id);
      },

      getTabByMenuCode: (
        menuCode: string,
        params?: Record<string, string>
      ): TabItem | undefined => {
        const tabId = generateTabId(menuCode, params);
        return get().tabs.find((t) => t.id === tabId);
      },
    }),
    {
      name: 'ssoo-tabs',
      storage: createJSONStorage(() => sessionStorage), // 세션 스토리지 (브라우저 닫으면 초기화)
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
      // Date 객체 직렬화 처리 및 Home 탭 보장
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Date 복원
          state.tabs = state.tabs.map((tab) => ({
            ...tab,
            openedAt: new Date(tab.openedAt),
            lastActiveAt: new Date(tab.lastActiveAt),
          }));

          // Home 탭이 없으면 추가 (항상 첫 번째에 위치)
          const hasHomeTab = state.tabs.some((tab) => tab.menuCode === HOME_TAB.menuCode);
          if (!hasHomeTab) {
            state.tabs = [createHomeTab(), ...state.tabs];
          }

          // activeTabId가 없으면 Home 탭으로 설정
          if (!state.activeTabId) {
            state.activeTabId = HOME_TAB.menuCode;
          }
        }
      },
    }
  )
);
