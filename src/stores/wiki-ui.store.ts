'use client';

import { create } from 'zustand';
import { RenamingState, CreateModalState, ContextMenuState } from '@/types/wiki';

interface UIState {
  sidebarWidth: number;
  renamingItem: RenamingState | null;
  createModal: CreateModalState;
  contextMenu: ContextMenuState | null;
}

interface UIActions {
  setSidebarWidth: (width: number) => void;
  setRenamingItem: (item: RenamingState | null) => void;
  setCreateModal: (modal: CreateModalState) => void;
  openCreateModal: (mode: 'file' | 'folder', initialPath?: string) => void;
  closeCreateModal: () => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
  closeContextMenu: () => void;
  reset: () => void;
}

type UIStore = UIState & UIActions;

const initialState: UIState = {
  sidebarWidth: 320,
  renamingItem: null,
  createModal: {
    isOpen: false,
    mode: 'file',
    initialPath: '',
  },
  contextMenu: null,
};

export const useWikiUIStore = create<UIStore>((set) => ({
  ...initialState,

  setSidebarWidth: (width) => set({ sidebarWidth: width }),

  setRenamingItem: (item) => set({ renamingItem: item }),

  setCreateModal: (modal) => set({ createModal: modal }),

  openCreateModal: (mode, initialPath = '') => set({
    createModal: {
      isOpen: true,
      mode,
      initialPath,
    },
  }),

  closeCreateModal: () => set({
    createModal: {
      isOpen: false,
      mode: 'file',
      initialPath: '',
    },
  }),

  setContextMenu: (menu) => set({ contextMenu: menu }),

  closeContextMenu: () => set({ contextMenu: null }),

  reset: () => set(initialState),
}));
