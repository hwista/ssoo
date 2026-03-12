import { create } from 'zustand';
import type { TemplateItem } from '@/types/template';

interface AssistantReference {
  path: string;
  title: string;
}

interface AssistantSummaryFile {
  id: string;
  name: string;
  type?: string;
  textContent: string;
  size: number;
}

interface AssistantContextState {
  attachedReferences: AssistantReference[];
  selectedTemplates: TemplateItem[];
  summaryFiles: AssistantSummaryFile[];
  relevanceWarnings: string[];
}

interface AssistantContextActions {
  toggleReference: (reference: AssistantReference) => void;
  setReferences: (references: AssistantReference[]) => void;
  removeReference: (path: string) => void;
  clearReferences: () => void;
  toggleTemplate: (template: TemplateItem) => void;
  removeTemplate: (id: string) => void;
  clearTemplates: () => void;
  upsertSummaryFiles: (files: AssistantSummaryFile[]) => void;
  removeSummaryFile: (id: string) => void;
  clearSummaryFiles: () => void;
  setRelevanceWarnings: (warnings: string[]) => void;
  resetContext: () => void;
}

type AssistantContextStore = AssistantContextState & AssistantContextActions;

const INITIAL_STATE: AssistantContextState = {
  attachedReferences: [],
  selectedTemplates: [],
  summaryFiles: [],
  relevanceWarnings: [],
};

export const useAssistantContextStore = create<AssistantContextStore>()((set) => ({
  ...INITIAL_STATE,

  toggleReference: (reference) => set((state) => {
    const exists = state.attachedReferences.some((item) => item.path === reference.path);
    if (exists) {
      return {
        attachedReferences: state.attachedReferences.filter((item) => item.path !== reference.path),
      };
    }
    return {
      attachedReferences: [...state.attachedReferences, reference],
    };
  }),
  setReferences: (references) => set({
    attachedReferences: Array.from(
      new Map(
        references
          .filter((item) => item.path.trim().length > 0)
          .map((item) => [item.path, { path: item.path, title: item.title || item.path }])
      ).values()
    ),
  }),
  removeReference: (path) => set((state) => ({
    attachedReferences: state.attachedReferences.filter((item) => item.path !== path),
  })),
  clearReferences: () => set({ attachedReferences: [] }),
  toggleTemplate: (template) => set((state) => {
    const exists = state.selectedTemplates.some((item) => item.id === template.id);
    if (exists) {
      return { selectedTemplates: state.selectedTemplates.filter((item) => item.id !== template.id) };
    }
    return { selectedTemplates: [...state.selectedTemplates, template] };
  }),
  removeTemplate: (id) => set((state) => ({
    selectedTemplates: state.selectedTemplates.filter((item) => item.id !== id),
  })),
  clearTemplates: () => set({ selectedTemplates: [] }),
  upsertSummaryFiles: (files) => set((state) => {
    const map = new Map(state.summaryFiles.map((item) => [item.id, item]));
    for (const file of files) {
      if (!file.id) continue;
      map.set(file.id, file);
    }
    return { summaryFiles: Array.from(map.values()) };
  }),
  removeSummaryFile: (id) => set((state) => ({
    summaryFiles: state.summaryFiles.filter((item) => item.id !== id),
  })),
  clearSummaryFiles: () => set({ summaryFiles: [] }),
  setRelevanceWarnings: (warnings) => set({ relevanceWarnings: warnings }),
  resetContext: () => set(INITIAL_STATE),
}));
