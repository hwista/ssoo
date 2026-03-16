'use client';

import { create } from 'zustand';
import type { InlineSummaryFileItem } from '@/components/common/assistant/reference/Picker';

interface AiSummaryPendingData {
  summaryFiles: InlineSummaryFileItem[];
}

interface NewDocStoreState {
  aiSummaryPending: AiSummaryPendingData | null;
}

interface NewDocStoreActions {
  setAiSummaryPending: (data: AiSummaryPendingData | null) => void;
  consumeAiSummaryPending: () => AiSummaryPendingData | null;
}

export const useNewDocStore = create<NewDocStoreState & NewDocStoreActions>((set, get) => ({
  aiSummaryPending: null,

  setAiSummaryPending: (data) => set({ aiSummaryPending: data }),

  consumeAiSummaryPending: () => {
    const data = get().aiSummaryPending;
    set({ aiSummaryPending: null });
    return data;
  },
}));
