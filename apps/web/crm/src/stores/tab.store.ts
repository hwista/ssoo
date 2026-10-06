import { isSsooHomeEntry, normalizeSsooHomeTabs } from '@ssoo/web-shell';
import { CRM_HOME_ENTRY, CRM_OPPORTUNITY_WORKSPACE_PATH, CRM_OPPORTUNITY_WORKSPACE_TITLE, normalizeCrmNavigationPath } from '@/lib/crmNavigation';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface CrmTabItem {
  id: string;
  title: string;
  path: string;
  closable: boolean;
  openedAt: Date;
  lastActiveAt: Date;
}

export interface OpenCrmTabOptions {
  id?: string;
  title: string;
  path: string;
  closable?: boolean;
  activate?: boolean;
}

interface CrmTabStore {
  tabs: CrmTabItem[];
  activeTabId: string | null;
  maxTabs: number;
  tabLimitReached: boolean;
  dismissTabLimit: () => void;
  openTab: (options: OpenCrmTabOptions) => string;
  closeTab: (tabId: string) => void;
  activateTab: (tabId: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
}

export const CRM_HOME_TAB = CRM_HOME_ENTRY;

function createHomeTab(): CrmTabItem {
  const now = new Date();
  return {
    id: CRM_HOME_TAB.id,
    title: CRM_HOME_TAB.title,
    path: CRM_HOME_TAB.path,
    closable: CRM_HOME_TAB.closable,
    openedAt: now,
    lastActiveAt: now,
  };
}

function createTabId(path: string, id?: string): string {
  if (id) return id;
  if (path === CRM_HOME_TAB.path) return CRM_HOME_TAB.id;
  return path.replace(/[/?#=&]/g, '-').replace(/^-+|-+$/g, '') || CRM_HOME_TAB.id;
}

export const useTabStore = create<CrmTabStore>()(
  persist(
    (set, get) => ({
      tabs: [createHomeTab()],
      activeTabId: CRM_HOME_TAB.id,
      maxTabs: 16,
      tabLimitReached: false,
      dismissTabLimit: () => set({ tabLimitReached: false }),
      openTab: (options) => {
        options = { ...options, path: normalizeCrmNavigationPath(options.path) };
        if (isSsooHomeEntry({ path: options.path }, CRM_HOME_TAB)) options = { ...options, ...CRM_HOME_TAB };
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
          set({ tabLimitReached: true });
          return '';
        }

        const now = new Date();
        const nextTab: CrmTabItem = {
          id: tabId,
          title: options.title,
          path: options.path,
          closable: options.closable ?? tabId !== CRM_HOME_TAB.id,
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
          nextActiveTabId = nextTabs[Math.min(closedIndex, nextTabs.length - 1)]?.id ?? CRM_HOME_TAB.id;
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
          if (isSsooHomeEntry(state.tabs[fromIndex] ?? {}, CRM_HOME_TAB) || toIndex === 0) return state;
          const nextTabs = [...state.tabs];
          const moved = nextTabs.splice(fromIndex, 1)[0];
          if (!moved) return state;
          nextTabs.splice(toIndex, 0, moved);
          return { tabs: nextTabs };
        });
      },
    }),
    {
      name: 'crm-mdi-tabs',
      version: 1,
      migrate: (persisted) => {
        const state = persisted as Pick<CrmTabStore, 'tabs' | 'activeTabId'>;
        if (!Array.isArray(state?.tabs)) return { tabs: [createHomeTab()], activeTabId: CRM_HOME_TAB.id };
        state.tabs = state.tabs.map((tab) => {
          if (tab.id === CRM_HOME_TAB.id && new URLSearchParams(tab.path.split('?')[1]).get('sourceSurface') !== 'dashboard') {
            return { ...tab, id: 'crm-opportunity-workspace', title: CRM_OPPORTUNITY_WORKSPACE_TITLE, path: tab.path === '/' ? CRM_OPPORTUNITY_WORKSPACE_PATH : normalizeCrmNavigationPath(tab.path), closable: true };
          }
          return tab;
        });
        if (state.activeTabId === CRM_HOME_TAB.id && !state.tabs.some((tab) => tab.id === CRM_HOME_TAB.id)) state.activeTabId = 'crm-opportunity-workspace';
        return state;
      },
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ tabs: state.tabs, activeTabId: state.activeTabId }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const normalizedTabs = state.tabs.map((tab) => ({
          ...tab,
          path: normalizeCrmNavigationPath(tab.path),
          ...(tab.id === '/settings' ? { id: '/operations/settings' } : {}),
          openedAt: new Date(tab.openedAt),
          lastActiveAt: new Date(tab.lastActiveAt),
        }));
        state.tabs = normalizedTabs.filter((tab, index) => (
          normalizedTabs.findIndex((candidate) => candidate.id === tab.id) === index
        ));
        if (state.activeTabId === '/settings') {
          state.activeTabId = '/operations/settings';
        }
        Object.assign(state, normalizeSsooHomeTabs(state.tabs, state.activeTabId, CRM_HOME_TAB, createHomeTab));
      },
    }
  )
);
