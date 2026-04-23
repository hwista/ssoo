'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLayoutStore } from '@/stores';

/**
 * Content Props
 * PMS Content 참조 - 문서 본문 + 보조 패널
 */
export interface ContentProps {
  /** 자식 요소 (문서 본문) */
  children: React.ReactNode;
  /** 보조 패널 컴포넌트 */
  panel?: React.ReactNode;
  /** 보조 패널 너비 (px) - 가로 모드에서 사용 */
  panelWidth?: number;
  /** 보조 패널 외부 제어 (가로 모드에서) */
  panelOpen?: boolean;
  onPanelToggle?: () => void;
  /** 추가 className */
  className?: string;
}

/**
 * Content 컴포넌트
 * 
 * 문서 본문과 보조 패널을 담는 컨테이너
 * - 가로 모드: 패널 펼침 (토글 가능)
 * - 세로 모드: 패널 무조건 접힘
 * 
 * @example
 * ```tsx
 * <Content
 *   panel={<Panel metadata={metadata} />}
 *   panelWidth={280}
 * >
 *   <article>문서 본문...</article>
 * </Content>
 * ```
 */
export function Content({
  children,
  panel,
  panelWidth = 280,
  panelOpen: controlledOpen,
  onPanelToggle,
  className,
}: ContentProps) {
  const deviceType = useLayoutStore((s) => s.deviceType);
  const isVertical = deviceType === 'mobile'; // 세로 모드

  // 내부 상태 (가로 모드에서 사용, 외부 제어가 없을 때)
  const [internalOpen, setInternalOpen] = React.useState(true);
  
  // 세로 모드면 무조건 닫힘, 가로 모드면 제어된 값 또는 내부 값
  const isOpen = isVertical ? false : (controlledOpen ?? internalOpen);

  const handleToggle = () => {
    if (onPanelToggle) {
      onPanelToggle();
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

      {/* 패널 영역 (가로 모드에서만 표시) */}
      {panel && !isVertical && (
        <>
          {/* 패널 토글 버튼 (그립 버튼) */}
          <button
            onClick={handleToggle}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 z-10',
              'flex items-center justify-center',
              'w-5 h-12 rounded-l-md',
              'bg-gray-100 hover:bg-gray-200 border border-r-0 border-gray-200',
              'transition-all duration-300 ease-in-out',
              isOpen
                ? 'right-[calc(var(--panel-width))]'
                : 'right-0'
            )}
            style={{ '--panel-width': `${panelWidth}px` } as React.CSSProperties}
            aria-label={isOpen ? '패널 접기' : '패널 펼치기'}
          >
            {isOpen ? (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {/* 보조 패널 */}
          <div
            className={cn(
              'border-l border-gray-200 overflow-auto',
              'transition-all duration-300 ease-in-out',
              isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
            style={{
              width: isOpen ? panelWidth : 0,
              minWidth: isOpen ? panelWidth : 0,
            }}
          >
            {panel}
          </div>
        </>
      )}
    </div>
  );
}
