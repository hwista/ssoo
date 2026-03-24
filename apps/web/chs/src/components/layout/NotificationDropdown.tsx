'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/common/StateDisplay';
import { useMarkAllRead, useMarkRead, useNotifications } from '@/hooks/queries/useNotifications';
import type { NotificationItem as NotificationEntity } from '@/lib/api/endpoints/notifications';
import { NotificationItem } from './NotificationItem';

interface NotificationDropdownProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationDropdown({
  open,
  onClose,
}: NotificationDropdownProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const notificationsQuery = useNotifications(1);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const notifications = notificationsQuery.data?.data?.data ?? [];

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [onClose, open]);

  if (!open) return null;

  const handleNotificationClick = async (notification: NotificationEntity) => {
    try {
      if (!notification.isRead) {
        await markRead.mutateAsync(notification.id);
      }

      const referenceType = notification.referenceType.toLowerCase();
      if (referenceType.includes('profile') || referenceType.includes('user')) {
        router.push(`/profile/${notification.referenceId}`);
      } else if (referenceType.includes('post')) {
        router.push(`/post/${notification.referenceId}`);
      }
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '알림 처리에 실패했습니다.';
      toast.error(message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutateAsync();
      toast.success('모든 알림을 읽음 처리했습니다.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '읽음 처리에 실패했습니다.';
      toast.error(message);
    }
  };

  return (
    <div
      ref={rootRef}
      className="absolute right-0 top-12 z-50 w-[360px] rounded-xl border bg-white shadow-lg"
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="font-semibold">알림</p>
          <p className="text-xs text-muted-foreground">
            최근 활동과 반응을 확인하세요.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void handleMarkAllRead()}
          disabled={markAllRead.isPending || notifications.length === 0}
        >
          모두 읽음
        </Button>
      </div>

      <ScrollArea className="max-h-96">
        <div className="p-2">
          {notificationsQuery.isLoading ? (
            <LoadingState message="알림을 불러오는 중..." className="py-8" />
          ) : notifications.length === 0 ? (
            <EmptyState
              className="py-10"
              icon={<Bell className="h-10 w-10" />}
              title="새 알림이 없습니다"
              description="새 반응이나 멘션이 생기면 여기에 표시됩니다."
            />
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={(item) => void handleNotificationClick(item)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
