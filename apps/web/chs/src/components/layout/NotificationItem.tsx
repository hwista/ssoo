'use client';

import { Bell, Heart, MessageCircle, UserPlus } from 'lucide-react';
import type { NotificationItem as NotificationEntity } from '@/lib/api/endpoints/notifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getTimeAgo } from '@/lib/utils';

interface NotificationItemProps {
  notification: NotificationEntity;
  onClick: (notification: NotificationEntity) => void;
}

function getNotificationIcon(notificationType: string) {
  const normalizedType = notificationType.toLowerCase();

  if (normalizedType.includes('reaction')) return Heart;
  if (normalizedType.includes('comment')) return MessageCircle;
  if (normalizedType.includes('follow')) return UserPlus;
  return Bell;
}

export function NotificationItem({
  notification,
  onClick,
}: NotificationItemProps) {
  const Icon = getNotificationIcon(notification.notificationType);
  const initials =
    notification.actor?.displayName?.slice(0, 2) ||
    notification.actor?.userName?.slice(0, 2) ||
    '??';

  return (
    <button
      className={cn(
        'flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted/70',
        !notification.isRead && 'bg-ssoo-primary/5'
      )}
      onClick={() => onClick(notification)}
    >
      <Avatar className="h-9 w-9">
        <AvatarImage src={notification.actor?.avatarUrl || undefined} />
        <AvatarFallback className="bg-ssoo-primary text-xs text-white">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm">{notification.message}</p>
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">
          {getTimeAgo(notification.createdAt)}
        </p>
      </div>
    </button>
  );
}
