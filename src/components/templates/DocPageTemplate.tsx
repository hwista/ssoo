'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores';
import { LAYOUT_SIZES } from '@/types/layout';
import { 
  Breadcrumb, 
  Header,
  Sidecar,
  type HeaderProps,
  type SidecarProps,
} from '../common/page';

// 본문 영역 최대 너비 (Viewer와 동일)
const DOCUMENT_WIDTH = 975;

/**
 * DocPageTemplate Props
 * 문서 페이지 공통 템플릿 - 슬롯 기반
 */
export interface DocPageTemplateProps {
  /** 파일 경로 */
  filePath: string;
  /** 현재 모드 */
  mode: 'viewer' | 'editor' | 'create';
  /** 콘텐츠 슬롯 (Viewer 또는 Editor) */
  children: React.ReactNode;
  
  /** Sidecar 관련 */
  metadata?: SidecarProps['metadata'];
  tags?: string[];
  sidecarWidth?: number;
  
  /** 액션 핸들러 */
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onHistory?: () => void;
  onPathClick?: (path: string) => void;
  
  /** 로딩/에러 상태 */
  loading?: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  
  /** 추가 className */
  className?: string;
}

/**
 * DocPageTemplate 컴포넌트
 * 
 * 문서 페이지의 공통 레이아웃 템플릿
 * - Breadcrumb + Header + Content 슬롯 + Sidecar
 * - 뷰어/에디터 모드에 따라 children(슬롯)에 다른 컴포넌트 삽입
 * - 사이드카: 공간이 충분하면 나란히, 부족하면 오버레이
 * 
 * @example
 * ```tsx
 * // 뷰어 모드
 * <DocPageTemplate filePath="docs/readme.md" mode="viewer">
 *   <Viewer content={htmlContent} />
 * </DocPageTemplate>
 * 
 * // 에디터 모드
 * <DocPageTemplate filePath="docs/readme.md" mode="editor" onSave={save}>
 *   <PageEditor content={markdownContent} onChange={setContent} />
 * </DocPageTemplate>
 * ```
 */
export function DocPageTemplate({
  filePath,
  mode,
  children,
  metadata,
  tags,
  sidecarWidth = LAYOUT_SIZES.sidebar.expandedWidth, // 메인 사이드바와 동일한 너비
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onHistory,
  onPathClick,
  loading = false,
  error,
  onRetry,
  className,
}: DocPageTemplateProps) {
  // 컴팩트 모드 (사이드바가 접힌 상태 = 본문 영역 < 975px)
  const isCompactMode = useSidebarStore((s) => s.isCompactMode);

  // 컨테이너 ref (너비 측정용)
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);

  // Sidecar 열림 상태
  const [sidecarOpen, setSidecarOpen] = React.useState(!isCompactMode);

  // 컴팩트 모드 변경 시 사이드카 자동 접기
  React.useEffect(() => {
    if (isCompactMode) {
      setSidecarOpen(false);
    }
  }, [isCompactMode]);

  // 컨테이너 너비 측정 (ResizeObserver)
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // 사이드카 배치 모드 결정
  // - 본문(975px) + 사이드카(340px) + 여유공간(40px) = 약 1355px 필요
  // - 콘텐츠 영역이 이보다 크면 나란히(side-by-side), 작으면 오버레이
  const minWidthForSideBySide = DOCUMENT_WIDTH + sidecarWidth + 40; // 여유 공간 포함
  const canSideBySide = !isCompactMode && containerWidth >= minWidthForSideBySide;
  
  // 사이드카 표시 여부
  const showSidecar = sidecarOpen;

  // 에러 상태
  if (error) {
    const errorMessage = typeof error === 'string' ? error : error.message;
    return (
      <div className={cn('flex flex-col h-full p-4 gap-4', className)}>
        <Breadcrumb filePath={filePath} onPathClick={onPathClick} />
        <Header mode={mode} />
        <div className="flex-1 flex items-center justify-center bg-white border border-gray-200 rounded-lg">
          <div className="text-center">
            <p className="text-destructive mb-4">{errorMessage}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-sm text-ssoo-primary hover:underline"
              >
                다시 시도
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 로딩 상태
  if (loading) {
    return (
      <div className={cn('flex flex-col h-full p-4 gap-4', className)}>
        <Breadcrumb filePath={filePath} onPathClick={onPathClick} />
        <Header mode={mode} />
        <div className="flex-1 flex items-center justify-center bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 text-gray-600">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-ssoo-primary border-t-transparent" />
            <span>문서를 불러오는 중...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full p-4 gap-4', className)}>
      {/* 브레드크럼 */}
      <Breadcrumb filePath={filePath} onPathClick={onPathClick} />

      {/* 헤더 - 모드에 따라 액션 변경 */}
      <Header
        mode={mode}
        onEdit={onEdit}
        onSave={onSave}
        onCancel={onCancel}
        onDelete={onDelete}
        onHistory={onHistory}
      />

      {/* 콘텐츠 영역 - 너비 측정용 ref */}
      <div 
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
      >
        <div className="flex h-full">
          {/* 메인 콘텐츠 슬롯 */}
          <div 
            className="h-full transition-all duration-300 ease-in-out"
            style={{ 
              // 나란히 모드에서 사이드카가 열려있으면 사이드카 너비만큼 줄임
              width: canSideBySide && showSidecar 
                ? `calc(100% - ${sidecarWidth}px)` 
                : '100%' 
            }}
          >
            {children}
          </div>

          {/* Sidecar 토글 버튼 */}
          <button
            onClick={() => setSidecarOpen((prev) => !prev)}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 z-20',
              'flex items-center justify-center',
              'w-5 h-12 rounded-l-md',
              'bg-ssoo-content-bg hover:bg-ssoo-content-border/50 border border-r-0 border-ssoo-content-border',
              'transition-all duration-300 ease-in-out',
              'shadow-sm'
            )}
            style={{ 
              right: showSidecar ? sidecarWidth : 0,
            }}
            aria-label={showSidecar ? 'Sidecar 접기' : 'Sidecar 펼치기'}
          >
            {showSidecar ? (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {/* Sidecar 패널 - 나란히 또는 오버레이 */}
          <div
            className={cn(
              'h-full z-10',
              'bg-ssoo-content-bg border-l border-ssoo-content-border',
              'overflow-auto',
              'transition-all duration-300 ease-in-out',
              // 라운드 처리 (왼쪽 위/아래 모서리)
              'rounded-l-lg',
              // 나란히 모드
              canSideBySide ? (
                showSidecar
                  ? 'relative opacity-100'
                  : 'absolute right-0 top-0 opacity-0 translate-x-full pointer-events-none'
              ) : (
                // 오버레이 모드
                showSidecar
                  ? 'absolute right-0 top-0 opacity-100 translate-x-0 shadow-lg'
                  : 'absolute right-0 top-0 opacity-0 translate-x-full pointer-events-none'
              )
            )}
            style={{ 
              width: sidecarWidth,
              // 나란히 모드에서는 flex-shrink 방지
              flexShrink: canSideBySide ? 0 : undefined,
            }}
          >
            <Sidecar
              metadata={metadata}
              tags={tags}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
