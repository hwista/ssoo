'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState, LoadingState } from '@/components/common/StateDisplay';
import { useFollowers, useFollowing } from '@/hooks/queries/useFollows';

interface FollowListDialogProps {
  userId: string;
  type: 'followers' | 'following';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FollowListDialog({
  userId,
  type,
  open,
  onOpenChange,
}: FollowListDialogProps) {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const followersQuery = useFollowers(userId, { page, pageSize });
  const followingQuery = useFollowing(userId, { page, pageSize });
  const query = type === 'followers' ? followersQuery : followingQuery;
  const items = query.data?.data?.data ?? [];
  const meta = query.data?.data?.meta;
  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1;

  useEffect(() => {
    if (open) {
      setPage(1);
    }
  }, [open, type, userId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{type === 'followers' ? '팔로워' : '팔로잉'}</DialogTitle>
          <DialogDescription>
            {type === 'followers'
              ? '이 사용자를 팔로우하는 사람들입니다.'
              : '이 사용자가 팔로우 중인 사람들입니다.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-96 pr-3">
          {query.isLoading ? (
            <LoadingState message="목록을 불러오는 중..." className="py-8" />
          ) : items.length === 0 ? (
            <EmptyState
              className="py-8"
              icon={<Users className="h-10 w-10" />}
              title={type === 'followers' ? '팔로워가 없습니다' : '팔로잉이 없습니다'}
              description="표시할 사용자 목록이 없습니다."
            />
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const initials =
                  item.displayName?.slice(0, 2) ||
                  item.userName.slice(0, 2);
                return (
                  <Link
                    key={`${type}-${item.userId}`}
                    href={`/profile/${item.userId}`}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-ssoo-content-bg"
                    onClick={() => onOpenChange(false)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={item.avatarUrl || undefined} />
                      <AvatarFallback className="bg-ssoo-primary text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {item.displayName || item.userName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{item.userName}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              이전
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              다음
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
