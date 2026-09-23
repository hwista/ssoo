'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Share2 } from 'lucide-react';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger, Input,
} from '@ssoo/web-ui';

export function SharePostButton({ postId }: { postId: string }) {
  const pathname = usePathname();
  const id = useId();
  const attempt = useRef(0);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('');
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    attempt.current++;
    setOpen(false);
    setStatus('');
    setCopying(false);
  }, [pathname]);

  function changeOpen(next: boolean) {
    attempt.current++;
    setOpen(next);
    setStatus('');
    setCopying(false);
    if (next) setUrl(`${window.location.origin}/post/${encodeURIComponent(postId)}`);
  }

  async function copy() {
    const current = ++attempt.current;
    setCopying(true);
    setStatus('');
    try {
      await navigator.clipboard.writeText(url);
      if (attempt.current === current) setStatus('링크를 복사했습니다.');
    } catch {
      if (attempt.current === current) setStatus('자동으로 복사하지 못했습니다. 아래 링크를 직접 복사해 주세요.');
    } finally {
      if (attempt.current === current) setCopying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Share2 className="h-4 w-4" />공유
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>게시물 공유</DialogTitle>
          <DialogDescription>링크를 받은 사람도 로그인과 게시물 열람 권한이 필요합니다.</DialogDescription>
        </DialogHeader>
        <p role="status" aria-live="polite" className="text-body-sm">{status}</p>
        <div className="space-y-1">
          <label htmlFor={id} className="text-body-sm">게시물 링크</label>
          <Input id={id} value={url} readOnly onFocus={(event) => event.currentTarget.select()} />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => changeOpen(false)}>닫기</Button>
          <Button disabled={copying} onClick={() => void copy()}>{copying ? '복사 중...' : '링크 복사'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
