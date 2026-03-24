'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUpdatePost } from '@/hooks/queries/usePosts';

interface EditPostDialogProps {
  postId: string;
  initialTitle?: string | null;
  initialContent: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPostDialog({
  postId,
  initialTitle,
  initialContent,
  open,
  onOpenChange,
}: EditPostDialogProps) {
  const [title, setTitle] = useState(initialTitle ?? '');
  const [content, setContent] = useState(initialContent);
  const updatePost = useUpdatePost();

  useEffect(() => {
    setTitle(initialTitle ?? '');
    setContent(initialContent);
  }, [initialContent, initialTitle, open]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('본문을 입력하세요.');
      return;
    }

    try {
      await updatePost.mutateAsync({
        id: postId,
        data: {
          title: title.trim() || undefined,
          content,
        },
      });
      toast.success('게시물을 수정했습니다.');
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '게시물 수정에 실패했습니다.';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>게시물 수정</DialogTitle>
          <DialogDescription>
            제목과 본문을 수정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Input
            placeholder="제목 (선택)"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Textarea
            placeholder="본문"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={8}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={updatePost.isPending}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
