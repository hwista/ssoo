'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect, useMemo } from 'react';
import type { NotificationData } from '@/types';

interface NotificationContextType {
  notifications: NotificationData[];
  addNotification: (notification: Omit<NotificationData, 'id'>) => string;
  removeNotification: (id: string) => void;
  showSuccess: (title: string, message?: string, duration?: number) => string;
  showError: (title: string, message?: string, duration?: number) => string;
  showInfo: (title: string, message?: string, duration?: number) => string;
  showWarning: (title: string, message?: string, duration?: number) => string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    console.log('🏗️ NotificationProvider 마운트됨');
    const currentTimeouts = timeoutRefs.current;
    return () => {
      console.log('🔥 NotificationProvider 언마운트됨');
      // 모든 타이머 정리
      currentTimeouts.forEach((timeout: NodeJS.Timeout) => clearTimeout(timeout));
      currentTimeouts.clear();
    };
  }, []);

  const removeNotification = useCallback((id: string) => {
    console.log('🗑️ 노티피케이션 제거 시작:', id);
    
    // 타이머 정리
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
      console.log('⏰ 타이머 정리 완료:', id);
    }
    
    setNotifications(prev => {
      const filtered = prev.filter(notification => notification.id !== id);
      console.log('📝 노티피케이션 제거 완료. 남은 개수:', filtered.length);
      return filtered;
    });
  }, []);

  const addNotification = useCallback((notification: Omit<NotificationData, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newNotification: NotificationData = {
      id,
      duration: 4000, // 기본 4초
      ...notification
    };

    console.log('🔔 노티피케이션 추가 시작:', newNotification);
    console.trace('🔍 호출 스택:'); // 호출 경로 추적
    
    setNotifications(prev => {
      const updated = [...prev, newNotification];
      console.log('📝 업데이트된 노티피케이션 목록:', updated.map(n => ({ id: n.id, title: n.title })));
      return updated;
    });

    // 자동 제거 타이머
    if (newNotification.duration && newNotification.duration > 0) {
      const timeout = setTimeout(() => {
        console.log('⏰ 자동 제거 실행:', id);
        removeNotification(id);
      }, newNotification.duration);
      
      timeoutRefs.current.set(id, timeout);
      console.log('⏲️ 자동 제거 타이머 설정:', id, newNotification.duration + 'ms');
    }

    return id;
  }, [removeNotification]);

  const showSuccess = useCallback((title: string, message?: string, duration?: number) => {
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

  const contextValue = useMemo(() => {
    console.log('📋 Context 값 생성:', { notificationCount: notifications.length });
    return {
      notifications,
      addNotification,
      removeNotification,
      showSuccess,
      showError,
      showInfo,
      showWarning
    };
  }, [notifications, addNotification, removeNotification, showSuccess, showError, showInfo, showWarning]);

  useEffect(() => {
    console.log('🔄 노티피케이션 상태 변경:', notifications.map(n => ({ id: n.id, title: n.title })));
  }, [notifications]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};