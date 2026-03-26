/**
 * Toast 유틸리티 (sonner 기반)
 *
 * shadcn/ui 공식 toast 솔루션
 *
 * 사용법:
 * import { toast } from '@/lib/toast';
 * toast.success('저장 완료');
 * toast.error('오류 발생', { description: '상세 메시지' });
 */

import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  description?: string;
  duration?: number;
}

export const toast = {
  success: (title: string, options?: ToastOptions) => {
    sonnerToast.success(title, {
      description: options?.description,
      duration: options?.duration ?? 4000,
    });
  },

  error: (title: string, options?: ToastOptions) => {
    sonnerToast.error(title, {
      description: options?.description,
      duration: options?.duration ?? 5000,
    });
  },

  info: (title: string, options?: ToastOptions) => {
    sonnerToast.info(title, {
      description: options?.description,
      duration: options?.duration ?? 4000,
    });
  },

  warning: (title: string, options?: ToastOptions) => {
    sonnerToast.warning(title, {
      description: options?.description,
      duration: options?.duration ?? 4000,
    });
  },

  loading: (title: string, options?: ToastOptions) => {
    return sonnerToast.loading(title, {
      description: options?.description,
    });
  },

  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return sonnerToast.promise(promise, messages);
  },
};

// 하위 호환성을 위한 hook (점진적 마이그레이션용)
export function useToast() {
  return {
    showSuccess: (title: string, message?: string, duration?: number) => {
      toast.success(title, { description: message, duration });
    },
    showError: (title: string, message?: string, duration?: number) => {
      toast.error(title, { description: message, duration });
    },
    showInfo: (title: string, message?: string, duration?: number) => {
      toast.info(title, { description: message, duration });
    },
    showWarning: (title: string, message?: string, duration?: number) => {
      toast.warning(title, { description: message, duration });
    },
  };
}
