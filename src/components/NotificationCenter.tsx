'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert24Regular,
  AlertBadge24Filled,
  Settings24Regular,
  Checkmark24Regular,
  Delete24Regular,
  ChevronRight24Regular,
  Dismiss24Regular
} from '@fluentui/react-icons';
import {
  Notification,
  NotificationType,
  NOTIFICATION_ICONS,
  NOTIFICATION_LABELS
} from '@/lib/notifications/types';
import NotificationSettings from './NotificationSettings';

interface NotificationCenterProps {
  userId: string;
  pollingInterval?: number; // 밀리초, 기본 30초
}

export default function NotificationCenter({
  userId,
  pollingInterval = 30000
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // 알림 목록 로드
  const loadNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        userId,
        limit: '50',
        unreadOnly: filter === 'unread' ? 'true' : 'false'
      });

      const response = await fetch(`/api/notifications?${params}`);
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unread);
      }
    } catch (error) {
      console.error('알림 로드 오류:', error);
    }
  }, [userId, filter]);

  // 초기 로드 및 폴링
  useEffect(() => {
    loadNotifications();

    // 폴링 시작
    pollingRef.current = setInterval(loadNotifications, pollingInterval);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [loadNotifications, pollingInterval]);

  // 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 알림 읽음 처리
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markAsRead',
          notificationId
        })
      });

      if ((await response.json()).success) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId
              ? { ...n, status: 'read', readAt: Date.now() }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('읽음 처리 오류:', error);
    }
  };

  // 모든 알림 읽음 처리
  const markAllAsRead = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markAllAsRead',
          userId
        })
      });

      if ((await response.json()).success) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, status: 'read' as const, readAt: Date.now() }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('전체 읽음 처리 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 알림 삭제
  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          notificationId
        })
      });

      if ((await response.json()).success) {
        const deleted = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        if (deleted && !deleted.readAt) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('알림 삭제 오류:', error);
    }
  };

  // 알림 클릭 핸들러
  const handleNotificationClick = (notification: Notification) => {
    // 읽음 처리
    if (!notification.readAt) {
      markAsRead(notification.id);
    }

    // 액션 URL이 있으면 이동
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }

    setIsOpen(false);
  };

  // 상대 시간 포맷
  const formatRelativeTime = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return '방금 전';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}일 전`;

    return new Date(timestamp).toLocaleDateString('ko-KR');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 알림 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="알림"
      >
        {unreadCount > 0 ? (
          <AlertBadge24Filled className="w-6 h-6 text-blue-500" />
        ) : (
          <Alert24Regular className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        )}

        {/* 배지 */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1.5 bg-red-500 text-white text-xs font-bold rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 드롭다운 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <h3 className="font-semibold dark:text-white">알림</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={isLoading}
                  className="text-sm text-blue-500 hover:text-blue-600 disabled:opacity-50"
                >
                  모두 읽음
                </button>
              )}
              <button
                onClick={() => setShowSettings(true)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <Settings24Regular className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* 필터 탭 */}
          <div className="flex border-b dark:border-gray-700">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                filter === 'unread'
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              안 읽음 {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          {/* 알림 목록 */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Alert24Regular className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{filter === 'unread' ? '읽지 않은 알림이 없어요' : '알림이 없어요'}</p>
              </div>
            ) : (
              <div>
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`group relative flex items-start gap-3 p-4 border-b dark:border-gray-700 cursor-pointer transition-colors ${
                      !notification.readAt
                        ? 'bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* 아이콘 */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      !notification.readAt
                        ? 'bg-blue-100 dark:bg-blue-800'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      {NOTIFICATION_ICONS[notification.type]}
                    </div>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${
                          !notification.readAt
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {notification.title}
                        </p>
                        {!notification.readAt && (
                          <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 dark:text-gray-500">
                        <span>{NOTIFICATION_LABELS[notification.type]}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(notification.createdAt)}</span>
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {notification.actionUrl && (
                        <ChevronRight24Regular className="w-5 h-5 text-gray-400" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                        title="삭제"
                      >
                        <Delete24Regular className="w-4 h-4 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 푸터 */}
          {notifications.length > 0 && (
            <div className="p-3 border-t dark:border-gray-700 text-center">
              <a
                href="/notifications"
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                모든 알림 보기
              </a>
            </div>
          )}
        </div>
      )}

      {/* 설정 모달 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="relative">
            <NotificationSettings
              userId={userId}
              onClose={() => setShowSettings(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
