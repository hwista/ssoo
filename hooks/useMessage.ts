'use client';

import { useState, useCallback } from 'react';
import type { MessageConfig, MessageState } from '@/types';

export const useMessage = () => {
  const [messageState, setMessageState] = useState<MessageState>({
    isOpen: false,
    type: 'info',
    message: '',
    onConfirm: () => {},
  });

  const showMessage = useCallback((config: MessageConfig) => {
    setMessageState({
      ...config,
      isOpen: true,
      onConfirm: config.onConfirm || (() => {}),
    });
  }, []);

  const hideMessage = useCallback(() => {
    setMessageState(prev => ({ ...prev, isOpen: false }));
  }, []);

  // 편의 메서드들
  const showSuccess = useCallback((message: string, title?: string, onConfirm?: () => void) => {
    showMessage({
      type: 'success',
      title,
      message,
      onConfirm,
    });
  }, [showMessage]);

  const showError = useCallback((message: string, options?: {
    title?: string;
    details?: string;
    onConfirm?: () => void;
  }) => {
    showMessage({
      type: 'error',
      title: options?.title,
      message,
      details: options?.details,
      onConfirm: options?.onConfirm,
    });
  }, [showMessage]);

  const showWarning = useCallback((message: string, options?: {
    title?: string;
    details?: string;
    onConfirm?: () => void;
  }) => {
    showMessage({
      type: 'warning',
      title: options?.title,
      message,
      details: options?.details,
      onConfirm: options?.onConfirm,
    });
  }, [showMessage]);

  const showInfo = useCallback((message: string, title?: string, onConfirm?: () => void) => {
    showMessage({
      type: 'info',
      title,
      message,
      onConfirm,
    });
  }, [showMessage]);

  const showConfirm = useCallback((
    message: string, 
    options?: {
      title?: string;
      confirmText?: string;
      cancelText?: string;
      onConfirm?: () => void;
      onCancel?: () => void;
    }
  ) => {
    showMessage({
      type: 'confirm',
      title: options?.title,
      message,
      confirmText: options?.confirmText,
      cancelText: options?.cancelText,
      showCancel: true,
      onConfirm: options?.onConfirm,
      onCancel: options?.onCancel,
    });
  }, [showMessage]);

  return {
    messageState,
    showMessage,
    hideMessage,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
  };
};