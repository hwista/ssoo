'use client';

import * as React from 'react';
import { Maximize2, Minus, Plus, X } from 'lucide-react';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ImagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 이미지 URL (blob, 내부 경로, 외부 URL 모두 가능) */
  src: string;
  alt?: string;
}

function LightboxControls({ scale, onClose }: { scale: number; onClose: () => void }) {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[101] flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={() => zoomOut(0.5)} className="rounded-full p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors" title="축소">
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-[3.5rem] text-center text-xs font-medium text-white/90 select-none">
        {Math.round(scale * 100)}%
      </span>
      <button onClick={() => zoomIn(0.5)} className="rounded-full p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors" title="확대">
        <Plus className="h-4 w-4" />
      </button>
      <div className="mx-1 h-4 w-px bg-white/30" />
      <button onClick={() => resetTransform()} className="rounded-full p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors" title="원래 크기">
        <Maximize2 className="h-4 w-4" />
      </button>
      <button onClick={onClose} className="rounded-full p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors" title="닫기">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ImagePreviewDialog({ open, onOpenChange, src, alt = '이미지 미리보기' }: ImagePreviewDialogProps) {
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [scale, setScale] = React.useState(1);

  // 모달/lightbox 닫힐 때 상태 초기화
  React.useEffect(() => {
    if (!open) {
      setLightboxOpen(false);
      setScale(1);
    }
  }, [open]);

  // Lightbox ESC 키 닫기
  React.useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [lightboxOpen]);

  // 내부 이미지 경로를 API URL로 변환
  const resolvedSrc = React.useMemo(() => {
    if (!src) return null;
    if (src.startsWith('blob:') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      return src;
    }
    return `/api/file/raw?path=${encodeURIComponent(src)}`;
  }, [src]);

  const handleOpenLightbox = () => {
    setLightboxOpen(true);
  };

  const handleCloseLightbox = () => {
    setLightboxOpen(false);
    setScale(1);
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
            <img
              src={resolvedSrc}
              alt={alt}
              className="max-w-full max-h-full object-contain rounded-md cursor-pointer transition-opacity hover:opacity-80"
              title="클릭하여 확대 보기"
              onClick={handleOpenLightbox}
            />
          </div>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Fullscreen Lightbox with Zoom/Pan */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/80"
          role="dialog"
          aria-label="이미지 확대 보기"
        >
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={5}
            centerOnInit
            wheel={{ step: 0.1 }}
            doubleClick={{ mode: 'reset' }}
            onTransformed={(_, state) => setScale(state.scale)}
          >
            <TransformComponent
              wrapperStyle={{ width: '100vw', height: '100vh' }}
              contentStyle={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <img
                src={resolvedSrc}
                alt={alt}
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl select-none"
                draggable={false}
              />
            </TransformComponent>

            <LightboxControls scale={scale} onClose={handleCloseLightbox} />
          </TransformWrapper>

          {/* 우상단 닫기 */}
          <button
            className="absolute top-4 right-4 z-[101] rounded-full bg-white/20 p-2 text-white hover:bg-white/40 transition-colors"
            onClick={handleCloseLightbox}
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
}
