'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLayoutStore } from '@/stores';

/**
 * DocContent Props
 * PMS PageContent 참조 - 문서 본문 + Sidecar
 */
export interface DocContentProps {
  /** 자식 요소 (문서 본문) */
  children: React.ReactNode;
  /** Sidecar 컴포넌트 */
  sidecar?: React.ReactNode;
  /** Sidecar 너비 (px) - 가로 모드에서 사용 */
  sidecarWidth?: number;
  /** Sidecar 외부 제어 (가로 모드에서) */
  sidecarOpen?: boolean;
  onSidecarToggle?: () => void;
  /** 추가 className */
  className?: string;
}

/**
 * DocContent 컴포넌트
 * 
 * 문서 본문과 Sidecar를 담는 컨테이너
 * - 가로 모드: Sidecar 펼침 (토글 가능)
 * - 세로 모드: Sidecar 무조건 접힘
 * 
 * @example
 * ```tsx
 * <DocContent
 *   sidecar={<DocSidecar metadata={metadata} />}
 *   sidecarWidth={280}
 * >
 *   <article>문서 본문...</article>
 * </DocContent>
 * ```
 */
export function DocContent({
  children,
  sidecar,
  sidecarWidth = 280,
  sidecarOpen: controlledOpen,
  onSidecarToggle,
  className,
}: DocContentProps) {
  const deviceType = useLayoutStore((s) => s.deviceType);
  const isVertical = deviceType === 'mobile'; // 세로 모드

  // 내부 상태 (가로 모드에서 사용, 외부 제어가 없을 때)
  const [internalOpen, setInternalOpen] = React.useState(true);
  
  // 세로 모드면 무조건 닫힘, 가로 모드면 제어된 값 또는 내부 값
  const isOpen = isVertical ? false : (controlledOpen ?? internalOpen);

  const handleToggle = () => {
    if (onSidecarToggle) {
      onSidecarToggle();
    } else {
      setInternalOpen((prev) => !prev);
    }
  };

  return (
    <div
      className={cn(
        'relative flex flex-1 overflow-hidden',
        'bg-white border border-gray-200 rounded-lg',
        className
      )}
    >
      {/* 메인 콘텐츠 영역 */}
      <div
        className={cn(
          'flex-1 overflow-auto',
          'transition-all duration-300 ease-in-out'
        )}
      >
        {children}
      </div>

      {/* Sidecar 영역 (가로 모드에서만 표시) */}
      {sidecar && !isVertical && (
        <>
          {/* Sidecar 토글 버튼 (그립 버튼) */}
          <button
            onClick={handleToggle}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 z-10',
              'flex items-center justify-center',
              'w-5 h-12 rounded-l-md',
              'bg-gray-100 hover:bg-gray-200 border border-r-0 border-gray-200',
              'transition-all duration-300 ease-in-out',
              isOpen
                ? 'right-[calc(var(--sidecar-width))]'
                : 'right-0'
            )}
            style={{ '--sidecar-width': `${sidecarWidth}px` } as React.CSSProperties}
            aria-label={isOpen ? 'Sidecar 접기' : 'Sidecar 펼치기'}
          >
            {isOpen ? (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {/* Sidecar 패널 */}
          <div
            className={cn(
              'border-l border-gray-200 overflow-auto',
              'transition-all duration-300 ease-in-out',
              isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
            style={{
              width: isOpen ? sidecarWidth : 0,
              minWidth: isOpen ? sidecarWidth : 0,
            }}
          >
            {sidecar}
          </div>
        </>
      )}
    </div>
  );
}
