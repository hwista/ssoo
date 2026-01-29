'use client';

import { create } from 'zustand';

interface ItemsState {
  newlyCreatedItems: Set<string>;
  updatedItems: Set<string>;
}

interface ItemsActions {
  addNewlyCreatedItem: (path: string) => void;
  removeNewlyCreatedItem: (path: string) => void;
  clearNewlyCreatedItems: () => void;
  
  addUpdatedItem: (path: string) => void;
  removeUpdatedItem: (path: string) => void;
  clearUpdatedItems: () => void;
  
  clearAll: () => void;
  reset: () => void;
}

type ItemsStore = ItemsState & ItemsActions;

const initialState: ItemsState = {
  newlyCreatedItems: new Set<string>(),
  updatedItems: new Set<string>(),
};

export const useWikiItemsStore = create<ItemsStore>((set) => ({
  ...initialState,

  addNewlyCreatedItem: (path) => set((state) => ({
    newlyCreatedItems: new Set([...state.newlyCreatedItems, path]),
  })),

  removeNewlyCreatedItem: (path) => set((state) => {
    const newSet = new Set(state.newlyCreatedItems);
    newSet.delete(path);
    return { newlyCreatedItems: newSet };
  }),

  clearNewlyCreatedItems: () => set({ newlyCreatedItems: new Set() }),

  addUpdatedItem: (path) => set((state) => ({
    updatedItems: new Set([...state.updatedItems, path]),
  })),

  removeUpdatedItem: (path) => set((state) => {
    const newSet = new Set(state.updatedItems);
    newSet.delete(path);
    return { updatedItems: newSet };
  }),

  clearUpdatedItems: () => set({ updatedItems: new Set() }),

  clearAll: () => set({
    newlyCreatedItems: new Set(),
    updatedItems: new Set(),
  }),

  reset: () => set(initialState),
}));
