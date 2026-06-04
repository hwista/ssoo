'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { TocItem } from '@/components/templates/page-frame';
import { Toolbar, ZOOM_LEVELS, DEFAULT_ZOOM } from './toolbar/Toolbar';
import { Content, DOCUMENT_WIDTH } from './Content';
import { SectionedShell } from '@/components/templates/page-frame';
import { useViewerSearch } from './runtime/useViewerSearch';
import { findTocTarget, getNearestZoomIndex } from './runtime/viewerUtils';
import type { ViewerSearchControls, ViewerTocControls, ViewerZoomControls } from './toolbar/toolbarTypes';
import { useSettingsStore } from '@/stores';

type ViewerVariant = 'standalone' | 'embedded';

/**
 * Viewer Props
 */
export interface ViewerProps {
  /** 문서 콘텐츠 (HTML) */
  content: string;
  /** 목차 (마크다운 헤딩 기반) */
  toc?: TocItem[];
  /** 목차 항목 클릭 시 */
  onTocClick?: (id: string) => void;
  /** 문서 내 검색 */
  onSearch?: (query: string) => void;
  /** 현재 문서를 AI 첨부로 전환 */
  onAttachToAssistant?: () => void;
  /** 레이아웃 변형 */
  variant?: ViewerVariant;
  /** @deprecated Viewer 내부는 SectionedShell이 surface를 담당합니다. */
  showContentSurface?: boolean;
  /** 추가 className */
  className?: string;
  /** 본문 <a> 클릭 시 호출 */
  onLinkClick?: (href: string) => void;
  /** 본문 <img> 클릭 시 호출 */
  onImageClick?: (src: string, alt: string) => void;
  /** task checkbox 클릭 시 호출 */
  onCheckboxClick?: (taskIndex: number) => void | Promise<void>;
  /** 검색어 — 문서 열 때 자동 하이라이트 */
  initialSearchQuery?: string | null;
}

/**
 * Viewer 컴포넌트
 * 
 * 문서를 읽기 전용으로 렌더링
 * - 상단 툴바: 검색, 줌, 목차
 * - 최대 너비 975px로 읽기 최적화
 * - prose 스타일 적용
 * 
 * @example
 * ```tsx
 * <Viewer 
 *   content={htmlContent} 
 *   toc={headings}
 *   onTocClick={(id) => scrollTo(id)}
 * />
 * ```
 */
export function Viewer({
  content,
  toc,
  onTocClick,
  onSearch,
  onAttachToAssistant,
  variant = 'standalone',
  showContentSurface: _showContentSurface,
  className,
  onLinkClick,
  onImageClick,
  onCheckboxClick,
  initialSearchQuery,
}: ViewerProps) {
  void _showContentSurface;

  const defaultZoom = useSettingsStore((state) => state.config?.personal.viewer.defaultZoom ?? DEFAULT_ZOOM);
  const [zoomLevel, setZoomLevel] = React.useState(DEFAULT_ZOOM);
  const hasAdjustedZoomRef = React.useRef(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const {
    searchQuery,
    searchResultCount,
    currentResultIndex,
    hasSearched,
    highlightedContent,
    setSearchQuery,
    handleSearchSubmit,
    handleNavigateResult,
    handleSearchClose,
  } = useViewerSearch({ content, contentRef, onSearch, initialSearchQuery });

  const displayContent = highlightedContent ?? content;

  React.useEffect(() => {
    if (!hasAdjustedZoomRef.current) {
      setZoomLevel(defaultZoom);
    }
  }, [defaultZoom]);

  const handleZoomIn = React.useCallback(() => {
    hasAdjustedZoomRef.current = true;
    setZoomLevel((prev) => {
      const currentIndex = getNearestZoomIndex(ZOOM_LEVELS, prev);
      if (currentIndex < ZOOM_LEVELS.length - 1) {
        return ZOOM_LEVELS[currentIndex + 1];
      }
      return prev;
    });
  }, []);

  const handleZoomOut = React.useCallback(() => {
    hasAdjustedZoomRef.current = true;
    setZoomLevel((prev) => {
      const currentIndex = getNearestZoomIndex(ZOOM_LEVELS, prev);
      if (currentIndex > 0) {
        return ZOOM_LEVELS[currentIndex - 1];
      }
      return prev;
    });
  }, []);

  const handleZoomReset = React.useCallback(() => {
    hasAdjustedZoomRef.current = true;
    setZoomLevel(defaultZoom);
  }, [defaultZoom]);

  const handleTocClick = React.useCallback((id: string) => {
    onTocClick?.(id);

    const element = findTocTarget(contentRef.current, id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [onTocClick]);

  const tocControls = React.useMemo<ViewerTocControls>(() => ({
    items: toc,
    onItemClick: handleTocClick,
  }), [handleTocClick, toc]);

  const searchControls = React.useMemo<ViewerSearchControls>(() => ({
    query: searchQuery,
    onQueryChange: setSearchQuery,
    onSubmit: handleSearchSubmit,
    onClose: handleSearchClose,
    resultCount: searchResultCount,
    currentResultIndex,
    hasSearched,
    onNavigateResult: handleNavigateResult,
  }), [
    currentResultIndex,
    handleNavigateResult,
    handleSearchClose,
    handleSearchSubmit,
    hasSearched,
    searchQuery,
    searchResultCount,
    setSearchQuery,
  ]);

  const zoomControls = React.useMemo<ViewerZoomControls>(() => ({
    level: zoomLevel,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onZoomReset: handleZoomReset,
  }), [handleZoomIn, handleZoomOut, handleZoomReset, zoomLevel]);

  return (
    <SectionedShell
      className={cn('h-full', className)}
      variant="viewer_with_toolbar"
      toolbar={(
        <Toolbar
          maxWidth={DOCUMENT_WIDTH}
          variant={variant}
          toc={tocControls}
          search={searchControls}
          assistant={onAttachToAssistant ? { onAttach: onAttachToAssistant } : undefined}
          zoom={zoomControls}
        />
      )}
      body={(
        <Content
          content={displayContent}
          zoomLevel={zoomLevel}
          contentRef={contentRef}
          variant={variant}
          showSurface={false}
          onLinkClick={onLinkClick}
          onImageClick={onImageClick}
          onCheckboxClick={onCheckboxClick}
        />
      )}
    />
  );
}
