'use client';
import { useState, useCallback } from 'react';
import type { NotificationData } from '@/types';

export const useNotification = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const addNotification = useCallback((notification: Omit<NotificationData, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newNotification: NotificationData = {
      id,
      ...notification
    };

    console.log('노티피케이션 추가:', newNotification);
    setNotifications(prev => {
      console.log('이전 노티피케이션:', prev);
      const updated = [...prev, newNotification];
      console.log('업데이트된 노티피케이션:', updated);
      return updated;
    });
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    console.log('노티피케이션 제거:', id);
    setNotifications(prev => {
      const updated = prev.filter(notification => notification.id !== id);
      console.log('제거 후 노티피케이션:', updated);
      return updated;
    });
  }, []);

  // 편의 메서드들
  const showSuccess = useCallback((title: string, message?: string, duration?: number) => {
    console.log('showSuccess 호출:', { title, message, duration });
    return addNotification({ type: 'success', title, message, duration });
  }, [addNotification]);

  const showError = useCallback((title: string, message?: string, duration?: number) => {
    return addNotification({ type: 'error', title, message, duration });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message?: string, duration?: number) => {
    return addNotification({ type: 'info', title, message, duration });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message?: string, duration?: number) => {
    return addNotification({ type: 'warning', title, message, duration });
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    showSuccess,
    showError,
    showInfo,
    showWarning
  };
};