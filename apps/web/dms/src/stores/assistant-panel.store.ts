import { create } from 'zustand';
import { generateAssistantSuggestions } from '@/lib/assistant/assistantSuggestions';

interface AssistantPanelState {
  isOpen: boolean;
  inputDraft: string;
  isProcessing: boolean;
  suggestions: string[];
  suggestionsCollapsed: boolean;
}

interface AssistantPanelActions {
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setInputDraft: (value: string) => void;
  setIsProcessing: (value: boolean) => void;
  regenerateSuggestions: (count?: number) => void;
  setSuggestionsCollapsed: (value: boolean) => void;
  resetDraftState: () => void;
}

type AssistantPanelStore = AssistantPanelState & AssistantPanelActions;

const INITIAL_STATE: AssistantPanelState = {
  isOpen: false,
  inputDraft: '',
  isProcessing: false,
  suggestions: [],
  suggestionsCollapsed: false,
};

export const useAssistantPanelStore = create<AssistantPanelStore>()((set) => ({
  ...INITIAL_STATE,

  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),
  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
  setInputDraft: (value) => set({ inputDraft: value }),
  setIsProcessing: (value) => set({ isProcessing: value }),
  regenerateSuggestions: (count = 6) => set({ suggestions: generateAssistantSuggestions(count) }),
  setSuggestionsCollapsed: (value) => set({ suggestionsCollapsed: value }),
  resetDraftState: () => set((state) => ({
    ...state,
    inputDraft: '',
    isProcessing: false,
  })),
}));
