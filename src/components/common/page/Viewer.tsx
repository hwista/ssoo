'use client';

import * as React from 'react';
import { Search, ZoomIn, ZoomOut, List, X, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { TocItem } from './Sidecar';

// 문서 본문 최대 너비 (DocPageTemplate과 동일)
const DOCUMENT_WIDTH = 975;

/**
 * Viewer Props
 * 문서 뷰어 컴포넌트 - 읽기 전용 렌더링 + 툴바
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
  /** 추가 className */
  className?: string;
}

// 줌 레벨 (퍼센트)
const ZOOM_LEVELS = [75, 100, 125, 150, 175, 200];
const DEFAULT_ZOOM = 100;

/**
 * Viewer 컴포넌트
 * 
 * 문서를 읽기 전용으로 렌더링
 * - 상단 툴바: 검색, 줌, 목차
 * - 최대 너비 975px로 읽기 최적화
 * - prose 스타일 적용
 * - DMS 테마 색상
 * 
 * @example
 * ```tsx
 * <Viewer 
 *   content={htmlContent} 
 *   toc={headings}
 *   onTocClick={(id) => scrollTo(id)}
 *   onSearch={(q) => search(q)}
 * />
 * ```
 */
export function Viewer({
  content,
  toc,
  onTocClick,
  onSearch,
  className,
}: ViewerProps) {
  // 줌 레벨 상태
  const [zoomLevel, setZoomLevel] = React.useState(DEFAULT_ZOOM);
  
  // 검색 관련 상태
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResultCount, setSearchResultCount] = React.useState(0);
  const [currentResultIndex, setCurrentResultIndex] = React.useState(-1);
  const [hasSearched, setHasSearched] = React.useState(false);
  
  // 하이라이트 적용된 HTML (검색 중일 때 사용)
  const [highlightedContent, setHighlightedContent] = React.useState<string | null>(null);
  
  // 실제 렌더링할 콘텐츠
  const displayContent = highlightedContent ?? content;
  
  // 목차 호버 상태
  const [tocHovered, setTocHovered] = React.useState(false);

  // 문서 스크롤 컨테이너 ref
  const contentRef = React.useRef<HTMLDivElement>(null);

  // 줌 핸들러
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

  // 하이라이트 제거 함수
  const clearHighlights = React.useCallback(() => {
    setHighlightedContent(null);
    setSearchResultCount(0);
    setCurrentResultIndex(-1);
    setHasSearched(false);
  }, []);

  // 텍스트 노드 내 검색 및 하이라이트
  const highlightText = React.useCallback((query: string) => {
    if (!query.trim()) {
      setHasSearched(true);
      setSearchResultCount(0);
      return;
    }
    
    // innerHTML을 사용하여 검색어를 mark로 감싸기
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(`(${escapedQuery})`, 'gi');
    
    // 원본 content에서 검색 (항상 원본 기준)
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

  // 검색 결과 인덱스 변경 시 해당 요소로 스크롤
  React.useEffect(() => {
    if (currentResultIndex < 0 || !highlightedContent) return;
    
    // DOM 업데이트 후 실행
    const timer = setTimeout(() => {
      const container = contentRef.current;
      if (!container) return;
      
      const marks = container.querySelectorAll('mark.search-highlight');
      
      // 모든 마크의 outline 제거
      marks.forEach((mark) => {
        (mark as HTMLElement).style.outline = 'none';
      });
      
      // 현재 결과 하이라이트 및 스크롤
      const currentMark = marks[currentResultIndex] as HTMLElement | undefined;
      if (currentMark) {
        currentMark.style.outline = '2px solid #fb923c';
        currentMark.style.outlineOffset = '1px';
        currentMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 10);
    
    return () => clearTimeout(timer);
  }, [currentResultIndex, highlightedContent]);

  // 검색 핸들러
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      highlightText(searchQuery.trim());
      onSearch?.(searchQuery.trim());
    }
  };

  // 검색 결과 탐색
  const navigateResult = (direction: 'prev' | 'next') => {
    if (searchResultCount === 0) return;
    
    let newIndex: number;
    if (direction === 'next') {
      newIndex = (currentResultIndex + 1) % searchResultCount;
    } else {
      newIndex = (currentResultIndex - 1 + searchResultCount) % searchResultCount;
    }
    
    setCurrentResultIndex(newIndex);
  };

  // 검색 닫기
  const handleSearchClose = () => {
    setSearchQuery('');
    clearHighlights();
  };

  // 목차 클릭 핸들러 (패널 닫지 않음)
  const handleTocClick = (id: string) => {
    onTocClick?.(id);
    
    const container = contentRef.current;
    if (!container) return;
    
    // 여러 방법으로 요소 찾기 시도
    let element: Element | null = null;
    
    // 1. CSS.escape로 id 선택
    try {
      const escapedId = CSS.escape(id);
      element = container.querySelector(`#${escapedId}`);
    } catch {
      // CSS.escape 실패 시 무시
    }
    
    // 2. data-id 속성으로 찾기 (일부 마크다운 파서는 data-id 사용)
    if (!element) {
      element = container.querySelector(`[data-id="${id}"]`);
    }
    
    // 3. name 속성으로 찾기
    if (!element) {
      element = container.querySelector(`[name="${id}"]`);
    }
    
    // 4. 텍스트 내용으로 헤딩 찾기 (마지막 수단)
    if (!element) {
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      for (const heading of headings) {
        // id 속성 확인
        if (heading.id === id) {
          element = heading;
          break;
        }
        // 텍스트 내용의 slug화된 버전과 비교
        const text = heading.textContent?.trim() || '';
        const slug = text.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/(^-|-$)/g, '');
        if (slug === id || text === id) {
          element = heading;
          break;
        }
      }
    }
    
    // 5. 전역 getElementById (fallback)
    if (!element) {
      element = document.getElementById(id);
    }
    
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 툴바 - 상단 고정, 중앙 정렬, 투명 배경 */}
      <div className="flex justify-center shrink-0 px-4">
        <div 
          className="flex items-center justify-between w-full px-4 py-3"
          style={{ maxWidth: DOCUMENT_WIDTH }}
        >
          {/* 좌측: 목차 + 검색 */}
          <div className="flex items-center gap-2">
            {/* 목차 버튼 (가장 왼쪽) - 마우스 오버 시 플로팅 */}
            {toc && toc.length > 0 && (
              <div 
                className="relative"
                onMouseEnter={() => setTocHovered(true)}
                onMouseLeave={() => setTocHovered(false)}
              >
                <Button
                  variant="ghost"
                  size="default"
                  className={cn(
                    'h-control-h gap-1.5',
                    tocHovered && 'bg-gray-100'
                  )}
                >
                  <List className="h-4 w-4" />
                  <span>목차</span>
                </Button>
                
                {/* 플로팅 목차 패널 - 버튼과 연결된 형태 */}
                {tocHovered && (
                  <div 
                    className={cn(
                      'absolute left-0 top-full z-50',
                      'w-72 max-h-80 overflow-y-auto',
                      'bg-gray-100 rounded-lg rounded-tl-none', // 왼쪽 위 모서리 볼록 튀어나온 형태
                      'shadow-lg',
                      'animate-in fade-in-0 zoom-in-95 duration-100'
                    )}
                  >
                    <div className="p-2">
                      <nav className="space-y-0.5">
                        {toc.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleTocClick(item.id)}
                            className={cn(
                              'block w-full text-left text-sm hover:text-ssoo-primary',
                              'hover:bg-white rounded px-2 py-1.5 transition-colors',
                              'truncate',
                              // 레벨별 스타일 구분
                              item.level === 1 && 'font-semibold text-gray-900',
                              item.level === 2 && 'font-medium text-gray-700',
                              item.level >= 3 && 'text-gray-500'
                            )}
                            style={{
                              paddingLeft: `${(item.level - 1) * 12 + 8}px`,
                            }}
                            title={item.text}
                          >
                            {item.text}
                          </button>
                        ))}
                      </nav>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 검색 - 항상 열림 */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-1">
              <div className="flex items-center">
                <Search className="h-4 w-4 text-gray-400 mr-1" />
                <div className="relative">
                  <input
                    type="text"
                    placeholder="문서 내 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      'h-control-h w-44 pr-7',
                      'bg-transparent border-0 border-b border-gray-300',
                      'focus:border-ssoo-primary focus:outline-none focus:ring-0',
                      'placeholder:text-gray-400 text-sm'
                    )}
                  />
                  {/* X 버튼 - 입력란 내부 오른쪽 */}
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleSearchClose}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
                      title="검색 지우기"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              {/* 검색 결과 카운트 + 탐색 */}
              {hasSearched && (
                <div className="flex items-center gap-0.5 text-sm text-gray-500">
                  <span className="min-w-[60px] text-center">
                    {searchResultCount > 0 ? `${currentResultIndex + 1} / ${searchResultCount}` : '0 / 0'}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="default"
                    onClick={() => navigateResult('prev')}
                    className="h-control-h w-8 p-0"
                    disabled={searchResultCount === 0}
                    title="이전 결과"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="default"
                    onClick={() => navigateResult('next')}
                    className="h-control-h w-8 p-0"
                    disabled={searchResultCount === 0}
                    title="다음 결과"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </form>
          </div>

          {/* 우측: 줌 컨트롤 */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="default"
              onClick={handleZoomOut}
              disabled={zoomLevel === ZOOM_LEVELS[0]}
              className="h-control-h w-8 p-0"
              title="축소"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <button
              onClick={handleZoomReset}
              className="px-2 h-control-h text-sm hover:bg-gray-100 rounded transition-colors min-w-[50px]"
              title="기본 크기로"
            >
              {zoomLevel}%
            </button>
            
            <Button
              variant="ghost"
              size="default"
              onClick={handleZoomIn}
              disabled={zoomLevel === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
              className="h-control-h w-8 p-0"
              title="확대"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 문서 본문 영역 */}
      <div className="flex-1 flex justify-center overflow-hidden px-4">
        {/* 문서 컨테이너 - 고정 너비 (975px) + 내부 스크롤 + 배경/그림자로 구분 */}
        <div 
          ref={contentRef}
          className={cn(
            'h-full w-full',
            'bg-white border border-gray-200 rounded-lg',
            'overflow-y-auto overflow-x-hidden',
            'scrollbar-thin'
          )}
          style={{ maxWidth: DOCUMENT_WIDTH }}
        >
          {/* 문서 본문 - 줌 적용 */}
          <article
            className={cn(
              'py-6 px-8',
              'prose prose-base max-w-none',
              'prose-headings:scroll-mt-4',
              // 코드 블록 스타일
              'prose-pre:bg-ssoo-content-bg prose-pre:text-ssoo-primary prose-pre:border-0',
              // 인라인 코드
              'prose-code:text-ssoo-primary prose-code:bg-ssoo-content-bg prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border-0'
            )}
            style={{
              fontSize: `${zoomLevel}%`,
            }}
            dangerouslySetInnerHTML={{ __html: displayContent }}
          />
        </div>
      </div>
    </div>
  );
}
