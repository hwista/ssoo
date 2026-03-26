import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface AiSearchHistoryItem {
  id: string;
  query: string;
  updatedAt: string;
  count: number;
  lastResultCount: number;
}

interface AiSearchState {
  history: AiSearchHistoryItem[];
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
      partialize: (state) => ({ history: state.history }),
    }
  )
);
