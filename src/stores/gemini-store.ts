'use client';

import { create } from 'zustand';

interface GeminiChatState {
  question: string;
  answer: string;
  loading: boolean;
}

interface GeminiChatActions {
  setQuestion: (question: string) => void;
  setAnswer: (answer: string) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

type GeminiChatStore = GeminiChatState & GeminiChatActions;

const initialState: GeminiChatState = {
  question: '',
  answer: '',
  loading: false,
};

export const useGeminiStore = create<GeminiChatStore>((set) => ({
  ...initialState,

  setQuestion: (question) => set({ question }),
  setAnswer: (answer) => set({ answer }),
  setLoading: (loading) => set({ loading }),
  reset: () => set(initialState),
}));
