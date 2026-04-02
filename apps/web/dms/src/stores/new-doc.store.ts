'use client';

import { create } from 'zustand';
import type { InlineSummaryFileItem } from '@/components/common/assistant/reference/Picker';

interface AiSummaryPendingData {
  summaryFiles: InlineSummaryFileItem[];
}

export interface TemplateConversionPendingData {
  sourceFilePath: string;
  sourceTitle?: string;
  sourceContent: string;
}

interface NewDocStoreState {
  aiSummaryPending: AiSummaryPendingData | null;
  templateConversionPendingByTabId: Record<string, TemplateConversionPendingData>;
}

interface NewDocStoreActions {
  setAiSummaryPending: (data: AiSummaryPendingData | null) => void;
  consumeAiSummaryPending: () => AiSummaryPendingData | null;
  setTemplateConversionPending: (tabId: string, data: TemplateConversionPendingData) => void;
  getTemplateConversionPending: (tabId: string) => TemplateConversionPendingData | null;
  consumeTemplateConversionPending: (tabId: string) => TemplateConversionPendingData | null;
  clearTemplateConversionPending: (tabId: string) => void;
}

export const useNewDocStore = create<NewDocStoreState & NewDocStoreActions>((set, get) => ({
  aiSummaryPending: null,
  templateConversionPendingByTabId: {},

  setAiSummaryPending: (data) => set({ aiSummaryPending: data }),

  consumeAiSummaryPending: () => {
    const data = get().aiSummaryPending;
    set({ aiSummaryPending: null });
    return data;
  },

  setTemplateConversionPending: (tabId, data) => set((state) => ({
    templateConversionPendingByTabId: {
      ...state.templateConversionPendingByTabId,
      [tabId]: data,
    },
  })),

  getTemplateConversionPending: (tabId) => {
    return get().templateConversionPendingByTabId[tabId] ?? null;
  },

  consumeTemplateConversionPending: (tabId) => {
    const data = get().templateConversionPendingByTabId[tabId] ?? null;
    set((state) => {
      const next = { ...state.templateConversionPendingByTabId };
      delete next[tabId];
      return { templateConversionPendingByTabId: next };
    });
    return data;
  },

  clearTemplateConversionPending: (tabId) => set((state) => {
    const next = { ...state.templateConversionPendingByTabId };
    delete next[tabId];
    return { templateConversionPendingByTabId: next };
  }),
}));
