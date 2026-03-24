'use client';

import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeletePost } from '@/hooks/queries/usePosts';
import { useAuthStore } from '@/stores/auth.store';

interface PostMenuProps {
  postId: string;
  authorUserId: string;
  onEdit: () => void;
  onDeleteSuccess?: () => void;
}

export function PostMenu({
  postId,
  authorUserId,
  onEdit,
  onDeleteSuccess,
}: PostMenuProps) {
  const currentUserId = useAuthStore((state) => state.user?.userId);
  const deletePost = useDeletePost();

  if (!currentUserId || currentUserId !== authorUserId) {
    return null;
  }

  const handleDelete = async () => {
    const confirmed = window.confirm('이 게시물을 삭제하시겠습니까?');
    if (!confirmed) {
      return;
    }

    try {
      await deletePost.mutateAsync(postId);
      toast.success('게시물을 삭제했습니다.');
      onDeleteSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '게시물 삭제에 실패했습니다.';
      toast.error(message);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>수정</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void handleDelete()}>
          삭제
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
