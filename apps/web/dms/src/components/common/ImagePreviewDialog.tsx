'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { resolveImageSrc } from '@/lib/utils/linkUtils';
import { ImageLightbox } from './ImageLightbox';

export interface ImagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 이미지 URL (blob, 내부 경로, 외부 URL 모두 가능) */
  src: string;
  alt?: string;
}

export function ImagePreviewDialog({ open, onOpenChange, src, alt = '이미지 미리보기' }: ImagePreviewDialogProps) {
  const [lightboxOpen, setLightboxOpen] = React.useState(false);

  // 모달 닫힐 때 상태 초기화
  React.useEffect(() => {
    if (!open) {
      setLightboxOpen(false);
    }
  }, [open]);

  // 내부 이미지 경로를 API URL로 변환
  const resolvedSrc = React.useMemo(() => {
    if (!src) return null;
    return resolveImageSrc(src);
  }, [src]);

  const handleOpenLightbox = () => {
    setLightboxOpen(true);
  };

  const handleCloseLightbox = () => {
    setLightboxOpen(false);
  };

  if (!resolvedSrc) return null;

  return (
    <>
      {/* Dialog는 lightbox가 열리면 숨기되 unmount하지 않음 */}
      {!lightboxOpen && (
        <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg h-[480px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm truncate">{alt}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex items-center justify-center p-2">
            <button
              type="button"
              className="relative h-full w-full cursor-pointer rounded-md transition-opacity hover:opacity-80"
              onClick={handleOpenLightbox}
              title="클릭하여 확대 보기"
            >
              <Image
                src={resolvedSrc}
                alt={alt}
                fill
                unoptimized
                className="object-contain rounded-md"
                sizes="(max-width: 768px) 100vw, 32rem"
              />
            </button>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Fullscreen Lightbox (공용 컴포넌트 재사용) */}
      <ImageLightbox
        open={lightboxOpen}
        onClose={handleCloseLightbox}
        src={src}
        alt={alt}
      />
    </>
  );
}
