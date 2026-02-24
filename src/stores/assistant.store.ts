import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AssistantHelpAction } from '@/lib/utils/assistantHelp';
import { generateAssistantSuggestions } from '@/lib/utils/assistantSuggestions';
import type { TemplateItem } from '@/types/template';

export interface AssistantSearchResult {
  id: string;
  title: string;
  excerpt: string;
  path: string;
  summary?: string;
  snippets?: string[];
  totalSnippetCount?: number;
}

export type AssistantMessage =
  | {
      id: string;
      role: 'user' | 'assistant';
      kind: 'text';
      text: string;
      pending?: boolean;
    }
  | {
      id: string;
      role: 'assistant';
      kind: 'search-results';
      query: string;
      results: AssistantSearchResult[];
    }
  | {
      id: string;
      role: 'assistant';
      kind: 'help-actions';
      summary: string;
      actions: AssistantHelpAction[];
    };

export interface AssistantSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AssistantMessage[];
  persistedToDb?: boolean;
}

interface AssistantState {
  clientId: string;
  isOpen: boolean;
  messages: AssistantMessage[];
  sessions: AssistantSession[];
  activeSessionId: string | null;
  sessionsLoaded: boolean;
  inputDraft: string;
  isProcessing: boolean;
  suggestions: string[];
  suggestionsCollapsed: boolean;
  attachedReferences: Array<{ path: string; title: string }>;
  selectedTemplates: TemplateItem[];
  summaryFiles: Array<{ id: string; name: string; type?: string; textContent: string; size: number }>;
  relevanceWarnings: string[];
}

interface AssistantActions {
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setInputDraft: (value: string) => void;
  setIsProcessing: (value: boolean) => void;
  regenerateSuggestions: (count?: number) => void;
  setSuggestionsCollapsed: (value: boolean) => void;
  toggleReference: (reference: { path: string; title: string }) => void;
  setReferences: (references: Array<{ path: string; title: string }>) => void;
  removeReference: (path: string) => void;
  clearReferences: () => void;
  toggleTemplate: (template: TemplateItem) => void;
  removeTemplate: (id: string) => void;
  clearTemplates: () => void;
  upsertSummaryFiles: (files: Array<{ id: string; name: string; type?: string; textContent: string; size: number }>) => void;
  removeSummaryFile: (id: string) => void;
  clearSummaryFiles: () => void;
  setRelevanceWarnings: (warnings: string[]) => void;
  startNewSession: () => void;
  selectSession: (sessionId: string) => void;
  hydrateSessions: (sessions: AssistantSession[]) => void;
  mergeSessions: (sessions: AssistantSession[]) => void;
  markSessionsLoaded: () => void;
  setSessionPersisted: (sessionId: string, persisted: boolean) => void;
  appendMessage: (message: AssistantMessage) => AssistantMessage[];
  updateTextMessage: (id: string, updater: (prev: string) => string, pending?: boolean) => void;
}

type AssistantStore = AssistantState & AssistantActions;

const createClientId = () => `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const sortSessions = (sessions: AssistantSession[]) => (
  [...sessions].sort((a, b) => {
    const aTime = Number.isFinite(Date.parse(a.updatedAt)) ? Date.parse(a.updatedAt) : 0;
    const bTime = Number.isFinite(Date.parse(b.updatedAt)) ? Date.parse(b.updatedAt) : 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.id.localeCompare(b.id);
  })
);

const deriveTitle = (messages: AssistantMessage[]) => {
  const firstUser = messages.find(
    (item): item is { id: string; role: 'user'; kind: 'text'; text: string; pending?: boolean } =>
      item.kind === 'text' && item.role === 'user'
  );
  if (!firstUser) return '새 대화';
  const cleaned = firstUser.text.replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 30) || '새 대화';
};

export const useAssistantStore = create<AssistantStore>()(
  persist(
    (set, get) => ({
      clientId: createClientId(),
      isOpen: false,
      messages: [],
      sessions: [],
      activeSessionId: null,
      sessionsLoaded: false,
      inputDraft: '',
      isProcessing: false,
      suggestions: [],
      suggestionsCollapsed: false,
      attachedReferences: [],
      selectedTemplates: [],
      summaryFiles: [],
      relevanceWarnings: [],

      openPanel: () => set({ isOpen: true }),
      closePanel: () => set({ isOpen: false }),
      togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
      setInputDraft: (value) => set({ inputDraft: value }),
      setIsProcessing: (value) => set({ isProcessing: value }),
      regenerateSuggestions: (count = 6) => set({ suggestions: generateAssistantSuggestions(count) }),
      setSuggestionsCollapsed: (value) => set({ suggestionsCollapsed: value }),
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

      startNewSession: () => set({
        activeSessionId: null,
        messages: [],
        inputDraft: '',
        attachedReferences: [],
        selectedTemplates: [],
        summaryFiles: [],
        relevanceWarnings: [],
      }),

      selectSession: (sessionId) => set((state) => {
        const target = state.sessions.find((session) => session.id === sessionId);
        if (!target) return {};
        return {
          activeSessionId: sessionId,
          messages: target.messages,
          inputDraft: '',
          attachedReferences: [],
          selectedTemplates: [],
          summaryFiles: [],
          relevanceWarnings: [],
        };
      }),

      hydrateSessions: (sessions) => {
        const sorted = sortSessions(sessions);
        const latest = sorted[0];
        set({
          sessions: sorted,
          activeSessionId: latest?.id ?? null,
          messages: latest?.messages ?? [],
          sessionsLoaded: true,
          inputDraft: '',
          attachedReferences: [],
          selectedTemplates: [],
          summaryFiles: [],
          relevanceWarnings: [],
        });
      },

      mergeSessions: (sessions) => set((state) => {
        if (sessions.length === 0) return {};
        const map = new Map<string, AssistantSession>();
        for (const session of state.sessions) {
          map.set(session.id, session);
        }
        for (const incoming of sessions) {
          const current = map.get(incoming.id);
          if (!current) {
            map.set(incoming.id, incoming);
            continue;
          }
          map.set(incoming.id, incoming.updatedAt >= current.updatedAt
            ? { ...current, ...incoming }
            : current);
        }

        const merged = sortSessions([...map.values()]);
        const activeExists = state.activeSessionId
          ? merged.some((session) => session.id === state.activeSessionId)
          : false;
        const nextActiveId = activeExists ? state.activeSessionId : (merged[0]?.id ?? null);
        const nextMessages = nextActiveId
          ? merged.find((session) => session.id === nextActiveId)?.messages ?? []
          : [];

        return {
          sessions: merged,
          activeSessionId: nextActiveId,
          messages: nextMessages,
        };
      }),

      markSessionsLoaded: () => set({ sessionsLoaded: true }),

      setSessionPersisted: (sessionId, persisted) => set((state) => ({
        sessions: state.sessions.map((session) => (
          session.id === sessionId
            ? { ...session, persistedToDb: persisted }
            : session
        )),
      })),

      appendMessage: (message) => {
        const state = get();
        const nextMessages = [...state.messages, message];
        const now = new Date().toISOString();

        let nextSessions = state.sessions;
        let nextActiveId = state.activeSessionId;

        if (!nextActiveId) {
          nextActiveId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          nextSessions = sortSessions([
            {
              id: nextActiveId,
              title: deriveTitle(nextMessages),
              createdAt: now,
              updatedAt: now,
              messages: nextMessages,
              persistedToDb: false,
            },
            ...state.sessions,
          ]);
        } else {
          nextSessions = sortSessions(
            state.sessions.map((session) => {
              if (session.id !== nextActiveId) return session;
              return {
                ...session,
                title: deriveTitle(nextMessages),
                updatedAt: now,
                messages: nextMessages,
                persistedToDb: false,
              };
            })
          );
        }

        set({
          messages: nextMessages,
          sessions: nextSessions,
          activeSessionId: nextActiveId,
        });
        return nextMessages;
      },

      updateTextMessage: (id, updater, pending) => {
        const state = get();
        const nextMessages = state.messages.map((message) => {
          if (message.kind === 'text' && message.id === id) {
            return {
              ...message,
              text: updater(message.text),
              ...(pending !== undefined ? { pending } : {}),
            };
          }
          return message;
        });

        const now = new Date().toISOString();
        const nextSessions = state.activeSessionId
          ? sortSessions(
            state.sessions.map((session) => (
              session.id === state.activeSessionId
                ? { ...session, updatedAt: now, messages: nextMessages, persistedToDb: false }
                : session
            ))
          )
          : state.sessions;

        set({ messages: nextMessages, sessions: nextSessions });
      },
    }),
    {
      name: 'dms-assistant-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        clientId: state.clientId,
        messages: state.messages,
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
        inputDraft: state.inputDraft,
        suggestionsCollapsed: state.suggestionsCollapsed,
        attachedReferences: state.attachedReferences,
        selectedTemplates: state.selectedTemplates,
        summaryFiles: state.summaryFiles,
        relevanceWarnings: state.relevanceWarnings,
      }),
    }
  )
);
