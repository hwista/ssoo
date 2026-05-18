import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { registerUserScopedReset, shouldResetPersistedUserState } from '@/lib/user-scope';

export interface AiSearchHistoryItem {
  id: string;
  query: string;
  updatedAt: string;
  count: number;
  lastResultCount: number;
}

interface AiSearchState {
  history: AiSearchHistoryItem[];
  /**
   * 현 history 가 어느 사용자 소속인지 추적. setOwnerUserId 가 다른 user 를 받으면
   * history 를 비우고 새 owner 를 기록 — cross-user 잔존 방지.
   */
  ownerUserId: string | null;
}

interface AiSearchActions {
  recordSearch: (query: string, resultCount: number) => void;
}

type AiSearchStore = AiSearchState & AiSearchActions;

const MAX_HISTORY = 50;

export const useAiSearchStore = create<AiSearchStore>()(
  persist(
    (set) => ({
      history: [],
      ownerUserId: null,

      recordSearch: (query, resultCount) => {
        const normalized = query.trim();
        if (!normalized) return;
        const now = new Date().toISOString();

        set((state) => {
          const existing = state.history.find((item) => item.query === normalized);
          if (existing) {
            const next = state.history
              .map((item) => (item.id === existing.id
                ? {
                    ...item,
                    updatedAt: now,
                    count: item.count + 1,
                    lastResultCount: resultCount,
                  }
                : item))
              .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
            return { history: next.slice(0, MAX_HISTORY) };
          }

          const nextItem: AiSearchHistoryItem = {
            id: `search-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            query: normalized,
            updatedAt: now,
            count: 1,
            lastResultCount: resultCount,
          };
          const next = [nextItem, ...state.history]
            .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
          return { history: next.slice(0, MAX_HISTORY) };
        });
      },
    }),
    {
      name: 'dms-ai-search-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ history: state.history, ownerUserId: state.ownerUserId }),
    }
  )
);

// 사용자 변경 시 자체 invalidation: persist 의 ownerUserId 와 비교 후 다르면 history 비움.
// logout 시점 (next === null) 에는 ownerUserId 를 보존해 다음 login 시 비교가 가능하도록.
registerUserScopedReset((next) => {
  if (next === null) return;
  const state = useAiSearchStore.getState();
  if (shouldResetPersistedUserState(next, state.ownerUserId, state.history.length > 0)) {
    useAiSearchStore.setState({ history: [], ownerUserId: next });
  } else if (state.ownerUserId !== next) {
    useAiSearchStore.setState({ ownerUserId: next });
  }
});
