import { create } from 'zustand';

/**
 * 전역 Confirm Dialog Store
 *
 * 사용법:
 * const { confirm } = useConfirmStore();
 * const result = await confirm({
 *   title: '탭 초과',
 *   description: '탭이 최대 개수에 도달했습니다. 가장 오래된 탭을 닫을까요?',
 * });
 * if (result) { ... }
 */

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
}

interface ConfirmActions {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
}

export type ConfirmStore = ConfirmState & ConfirmActions;

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
  // State
  isOpen: false,
  options: null,
  resolve: null,

  // Actions
  confirm: (options) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        options,
        resolve,
      });
    });
  },

  handleConfirm: () => {
    const { resolve } = get();
    if (resolve) {
      resolve(true);
    }
    set({
      isOpen: false,
      options: null,
      resolve: null,
    });
  },

  handleCancel: () => {
    const { resolve } = get();
    if (resolve) {
      resolve(false);
    }
    set({
      isOpen: false,
      options: null,
      resolve: null,
    });
  },
}));
