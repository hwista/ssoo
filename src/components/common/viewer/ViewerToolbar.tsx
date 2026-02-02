'use client';

import * as React from 'react';
import { Search, ZoomIn, ZoomOut, List, X, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { TocItem } from '../page/Sidecar';

// 줌 레벨 상수
export const ZOOM_LEVELS = [75, 100, 125, 150, 175, 200];
export const DEFAULT_ZOOM = 100;

/**
 * ViewerToolbar Props
 */
export interface ViewerToolbarProps {
  /** 문서 최대 너비 */
  maxWidth: number;
  
  // 목차 관련
  toc?: TocItem[];
  onTocClick?: (id: string) => void;
  
  // 검색 관련
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearchSubmit: () => void;
  onSearchClose: () => void;
  searchResultCount: number;
  currentResultIndex: number;
  hasSearched: boolean;
  onNavigateResult: (direction: 'prev' | 'next') => void;
  
  // 줌 관련
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

/**
 * ViewerToolbar 컴포넌트
 * 
 * Viewer 상단 툴바 - 목차, 검색, 줌 컨트롤
 */
export function ViewerToolbar({
  maxWidth,
  toc,
  onTocClick,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  onSearchClose,
  searchResultCount,
  currentResultIndex,
  hasSearched,
  onNavigateResult,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: ViewerToolbarProps) {
  // 목차 호버 상태
  const [tocHovered, setTocHovered] = React.useState(false);

  // 검색 폼 제출
  const handleSearchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit();
  };

  // 목차 클릭 핸들러
  const handleTocItemClick = (id: string) => {
    onTocClick?.(id);
  };

  return (
    <div className="flex justify-center shrink-0 px-4">
      <div 
        className="flex items-center justify-between w-full px-4 py-3"
        style={{ maxWidth }}
      >
        {/* 좌측: 목차 + 검색 */}
        <div className="flex items-center gap-2">
          {/* 목차 버튼 - 마우스 오버 시 플로팅 */}
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
              
              {/* 플로팅 목차 패널 */}
              {tocHovered && (
                <div 
                  className={cn(
                    'absolute left-0 top-full z-50',
                    'w-72 max-h-80 overflow-y-auto',
                    'bg-gray-100 rounded-lg rounded-tl-none',
                    'shadow-lg',
                    'animate-in fade-in-0 zoom-in-95 duration-100'
                  )}
                >
                  <div className="p-2">
                    <nav className="space-y-0.5">
                      {toc.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleTocItemClick(item.id)}
                          className={cn(
                            'block w-full text-left text-sm hover:text-ssoo-primary',
                            'hover:bg-white rounded px-2 py-1.5 transition-colors',
                            'truncate',
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

          {/* 검색 폼 */}
          <form onSubmit={handleSearchFormSubmit} className="flex items-center gap-1">
            <div className="flex items-center">
              <Search className="h-4 w-4 text-gray-400 mr-1" />
              <div className="relative">
                <input
                  type="text"
                  placeholder="문서 내 검색..."
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  className={cn(
                    'h-control-h w-44 pr-7',
                    'bg-transparent border-0 border-b border-gray-300',
                    'focus:border-ssoo-primary focus:outline-none focus:ring-0',
                    'placeholder:text-gray-400 text-sm'
                  )}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={onSearchClose}
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
                  onClick={() => onNavigateResult('prev')}
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
                  onClick={() => onNavigateResult('next')}
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
            onClick={onZoomOut}
            disabled={zoomLevel === ZOOM_LEVELS[0]}
            className="h-control-h w-8 p-0"
            title="축소"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <button
            onClick={onZoomReset}
            className="px-2 h-control-h text-sm hover:bg-gray-100 rounded transition-colors min-w-[50px]"
            title="기본 크기로"
          >
            {zoomLevel}%
          </button>
          
          <Button
            variant="ghost"
            size="default"
            onClick={onZoomIn}
            disabled={zoomLevel === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
            className="h-control-h w-8 p-0"
            title="확대"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
