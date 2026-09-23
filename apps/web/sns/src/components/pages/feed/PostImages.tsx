'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@ssoo/web-ui';
import { useAuthStore } from '@/stores';
import { usePostImage } from '@/hooks/queries/usePosts';
import type { PostImage } from '@/lib/api/endpoints/posts';

function ProtectedImage({ postId, image }: { postId: string; image: PostImage }) {
  const query = usePostImage(postId, image.id);
  const pathname = usePathname();
  const [url, setUrl] = useState('');
  const [open, setOpen] = useState(false);
  const [decodeError, setDecodeError] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!query.data || query.isError) { setUrl(''); setOpen(false); return; }
    const next = URL.createObjectURL(query.data);
    setUrl(next);
    setDecodeError(false);
    return () => URL.revokeObjectURL(next);
  }, [query.data, query.isError]);
  if (query.isError || decodeError) return <div className="space-y-2 rounded-md border p-3 text-body-sm" role="status">
    <p>이미지를 불러오지 못했습니다.</p>
    <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => { setDecodeError(false); void query.refetch(); }}>다시 시도</Button>
  </div>;
  if (!url) return <p role="status" className="text-body-sm text-muted-foreground">이미지를 불러오는 중입니다.</p>;
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="plain" size="plain" className="w-full overflow-hidden rounded-md" aria-label={`${image.fileName} 확대`}>
      {/* Authenticated blob URLs must not pass through the public image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={image.fileName} className="max-h-96 w-full object-contain" onError={() => setDecodeError(true)} />
    </Button></DialogTrigger>
    <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-4xl overflow-y-auto">
      <DialogHeader><DialogTitle>이미지 보기</DialogTitle><DialogDescription className="break-all">{image.fileName}</DialogDescription></DialogHeader>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={image.fileName} className="max-h-[70dvh] w-full object-contain" />
      <Button variant="outline" onClick={() => setOpen(false)}>닫기</Button>
    </DialogContent>
  </Dialog>;
}

export function PostImages({ postId, images }: { postId: string; images: PostImage[] }) {
  const userId = useAuthStore((state) => state.user?.userId);
  if (!userId || images.length === 0) return null;
  return <div className={`mb-3 grid gap-2 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
    {images.map((image) => <ProtectedImage key={`${userId}:${image.id}`} postId={postId} image={image} />)}
  </div>;
}
