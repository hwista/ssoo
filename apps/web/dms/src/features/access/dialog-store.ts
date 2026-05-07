'use client';

import { create } from 'zustand';
import type { DmsDocumentAccessRequestState } from '@ssoo/types/dms';

export interface DocumentAccessRequestTarget {
  title: string;
  path: string;
  owner?: string;
  readRequest?: DmsDocumentAccessRequestState;
}

interface DocumentAccessRequestStoreState {
  isOpen: boolean;
  target: DocumentAccessRequestTarget | null;
  overrides: Record<string, DmsDocumentAccessRequestState>;
}

interface DocumentAccessRequestStoreActions {
  open: (target: DocumentAccessRequestTarget) => void;
  close: () => void;
  setRequestState: (path: string, state: DmsDocumentAccessRequestState) => void;
  clearRequestState: (path: string) => void;
}

export function normalizeDocumentAccessRequestPath(path: string): string {
  return path.trim().replace(/^\/+/, '');
}

export const useDocumentAccessRequestStore = create<
  DocumentAccessRequestStoreState & DocumentAccessRequestStoreActions
>((set) => ({
  isOpen: false,
  target: null,
  overrides: {},
  open: (target) => set({ isOpen: true, target }),
  close: () => set({ isOpen: false, target: null }),
  setRequestState: (path, state) => set((current) => ({
    overrides: {
      ...current.overrides,
      [normalizeDocumentAccessRequestPath(path)]: state,
    },
  })),
  clearRequestState: (path) => set((current) => {
    const nextOverrides = { ...current.overrides };
    delete nextOverrides[normalizeDocumentAccessRequestPath(path)];
    return {
      overrides: nextOverrides,
    };
  }),
}));
