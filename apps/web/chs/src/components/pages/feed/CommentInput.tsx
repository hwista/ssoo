'use client';

import { KeyboardEvent, useState } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCreateComment } from '@/hooks/queries/useComments';
import { useAuthStore } from '@/stores/auth.store';

interface CommentInputProps {
  postId: string;
  parentCommentId?: string;
  compact?: boolean;
  autoFocus?: boolean;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export function CommentInput({
  postId,
  parentCommentId,
  compact = false,
  autoFocus = false,
  onCancel,
  onSuccess,
}: CommentInputProps) {
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const createComment = useCreateComment();

  const initials =
    user?.displayName?.slice(0, 2) ||
    user?.userName?.slice(0, 2) ||
    user?.loginId?.slice(0, 2) ||
    '?';

  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      await createComment.mutateAsync({
        postId,
        data: {
          content: content.trim(),
          parentCommentId,
        },
      });
      setContent('');
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '댓글 저장에 실패했습니다.';
      toast.error(message);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className="flex gap-3">
      <Avatar className={compact ? 'h-8 w-8' : 'h-9 w-9'}>
        <AvatarImage src={user?.avatarUrl || undefined} />
        <AvatarFallback className="bg-ssoo-primary text-xs text-white">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          rows={compact ? 2 : 3}
          className="resize-none"
          placeholder={parentCommentId ? '답글을 입력하세요' : '댓글을 입력하세요'}
        />
        <div className="flex items-center justify-end gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              취소
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => void handleSubmit()}
            disabled={!content.trim() || createComment.isPending}
          >
            <Send className="mr-1 h-4 w-4" />
            등록
          </Button>
        </div>
      </div>
    </div>
  );
}
