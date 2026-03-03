'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { TocItem } from '../page/toc';
import { Toolbar, ZOOM_LEVELS, DEFAULT_ZOOM } from './Toolbar';
import { Content, DOCUMENT_WIDTH } from './Content';
import { SectionedShell } from '../page/SectionedShell';

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
}: ViewerProps) {
  void _showContentSurface;

  // 줌 상태
  const [zoomLevel, setZoomLevel] = React.useState(DEFAULT_ZOOM);
  
  // 검색 상태
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResultCount, setSearchResultCount] = React.useState(0);
  const [currentResultIndex, setCurrentResultIndex] = React.useState(-1);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [highlightedContent, setHighlightedContent] = React.useState<string | null>(null);
  
  // 실제 렌더링할 콘텐츠
  const displayContent = highlightedContent ?? content;
  
  // 스크롤 컨테이너 ref
  const contentRef = React.useRef<HTMLDivElement>(null);

  // =====================
  // 줌 핸들러
  // =====================
  const handleZoomIn = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setZoomLevel(ZOOM_LEVELS[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex > 0) {
      setZoomLevel(ZOOM_LEVELS[currentIndex - 1]);
    }
  };

  const handleZoomReset = () => {
    setZoomLevel(DEFAULT_ZOOM);
  };

  // =====================
  // 검색 로직
  // =====================
  const clearHighlights = React.useCallback(() => {
    setHighlightedContent(null);
    setSearchResultCount(0);
    setCurrentResultIndex(-1);
    setHasSearched(false);
  }, []);

  const highlightText = React.useCallback((query: string) => {
    if (!query.trim()) {
      setHasSearched(true);
      setSearchResultCount(0);
      return;
    }
    
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(`(${escapedQuery})`, 'gi');
    
    let matchCount = 0;
    const newHtml = content.replace(/>([^<]+)</g, (match, text) => {
      const highlighted = text.replace(searchRegex, (matched: string) => {
        matchCount++;
        return `<mark class="search-highlight" style="background-color: #fef08a; color: inherit; border-radius: 2px; padding: 0 2px;" data-search-index="${matchCount - 1}">${matched}</mark>`;
      });
      return `>${highlighted}<`;
    });
    
    if (matchCount > 0) {
      setHighlightedContent(newHtml);
      setSearchResultCount(matchCount);
      setHasSearched(true);
      setCurrentResultIndex(0);
    } else {
      setHighlightedContent(null);
      setSearchResultCount(0);
      setHasSearched(true);
      setCurrentResultIndex(-1);
    }
  }, [content]);

  // 검색 결과 인덱스 변경 시 스크롤
  React.useEffect(() => {
    if (currentResultIndex < 0 || !highlightedContent) return;
    
    const timer = setTimeout(() => {
      const container = contentRef.current;
      if (!container) return;
      
      const marks = container.querySelectorAll('mark.search-highlight');
      marks.forEach((mark) => {
        (mark as HTMLElement).style.outline = 'none';
      });
      
      const currentMark = marks[currentResultIndex] as HTMLElement | undefined;
      if (currentMark) {
        currentMark.style.outline = '2px solid #fb923c';
        currentMark.style.outlineOffset = '1px';
        currentMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 10);
    
    return () => clearTimeout(timer);
  }, [currentResultIndex, highlightedContent]);

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      highlightText(searchQuery.trim());
      onSearch?.(searchQuery.trim());
    }
  };

  const handleNavigateResult = (direction: 'prev' | 'next') => {
    if (searchResultCount === 0) return;
    
    let newIndex: number;
    if (direction === 'next') {
      newIndex = (currentResultIndex + 1) % searchResultCount;
    } else {
      newIndex = (currentResultIndex - 1 + searchResultCount) % searchResultCount;
    }
    setCurrentResultIndex(newIndex);
  };

  const handleSearchClose = () => {
    setSearchQuery('');
    clearHighlights();
  };

  // =====================
  // 목차 클릭 핸들러
  // =====================
  const handleTocClick = (id: string) => {
    onTocClick?.(id);
    
    const container = contentRef.current;
    if (!container) return;
    
    let element: Element | null = null;
    
    // 여러 방법으로 요소 찾기
    try {
      const escapedId = CSS.escape(id);
      element = container.querySelector(`#${escapedId}`);
    } catch {
      // CSS.escape 실패 시 무시
    }
    
    if (!element) element = container.querySelector(`[data-id="${id}"]`);
    if (!element) element = container.querySelector(`[name="${id}"]`);
    
    if (!element) {
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      for (const heading of headings) {
        if (heading.id === id) {
          element = heading;
          break;
        }
        const text = heading.textContent?.trim() || '';
        const slug = text.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/(^-|-$)/g, '');
        if (slug === id || text === id) {
          element = heading;
          break;
        }
      }
    }
    
    if (!element) element = document.getElementById(id);
    
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <SectionedShell
      className={cn('h-full', variant === 'standalone' && 'overflow-hidden rounded-lg border border-gray-200 bg-white', className)}
      toolbarClassName="p-0"
      bodyClassName="overflow-hidden p-0"
      toolbar={(
        <Toolbar
          maxWidth={DOCUMENT_WIDTH}
          variant={variant}
          toc={toc}
          onTocClick={handleTocClick}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          onSearchClose={handleSearchClose}
          searchResultCount={searchResultCount}
          currentResultIndex={currentResultIndex}
          hasSearched={hasSearched}
          onNavigateResult={handleNavigateResult}
          onAttachToAssistant={onAttachToAssistant}
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
        />
      )}
      body={(
        <Content
          content={displayContent}
          zoomLevel={zoomLevel}
          contentRef={contentRef}
          variant={variant}
          showSurface={false}
        />
      )}
    />
  );
}
