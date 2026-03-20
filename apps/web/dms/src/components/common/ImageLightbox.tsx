'use client';

import * as React from 'react';
import Image from 'next/image';
import { Maximize2, Minus, Plus, X } from 'lucide-react';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import { resolveImageSrc } from '@/lib/utils/linkUtils';

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

export interface ImageLightboxProps {
  open: boolean;
  onClose: () => void;
  /** 이미지 URL (blob, 내부 경로, 외부 URL 모두 가능) */
  src: string;
  alt?: string;
}

/**
 * 전체 화면 이미지 라이트박스.
 * 줌/팬/핀치 + ESC 닫기를 지원한다.
 * 미리보기 모달 없이 바로 전체화면으로 열릴 때 사용.
 */
export function ImageLightbox({ open, onClose, src, alt = '이미지' }: ImageLightboxProps) {
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    if (!open) {
      setScale(1);
    }
  }, [open]);

  // ESC 키 닫기
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [open, onClose]);

  const resolvedSrc = React.useMemo(() => {
    if (!src) return null;
    return resolveImageSrc(src);
  }, [src]);

  if (!open || !resolvedSrc) return null;

  return (
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
          <div className="relative h-[90vh] w-[90vw]">
            <Image
              src={resolvedSrc}
              alt={alt}
              fill
              unoptimized
              className="object-contain rounded-lg shadow-2xl select-none"
              draggable={false}
              sizes="90vw"
            />
          </div>
        </TransformComponent>

        <LightboxControls scale={scale} onClose={onClose} />
      </TransformWrapper>

      {/* 우상단 닫기 */}
      <button
        className="absolute top-4 right-4 z-[101] rounded-full bg-white/20 p-2 text-white hover:bg-white/40 transition-colors"
        onClick={onClose}
        aria-label="닫기"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
