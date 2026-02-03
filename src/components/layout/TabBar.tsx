'use client';

import { useTabStore, HOME_TAB } from '@/stores';
import { X, ChevronLeft, ChevronRight, Home, FileText } from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { LAYOUT_SIZES } from '@/types';

/**
 * DMS 탭바 컴포넌트
 * - 열린 문서 탭 목록 표시
 * - 탭 활성화, 닫기
 * - 스크롤 네비게이션
 * - 드래그로 탭 순서 변경
 */
export function TabBar() {
  const { tabs, activeTabId, activateTab, closeTab, reorderTabs } = useTabStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 스크롤 상태 체크
  const checkScrollState = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 1);
    }
  }, []);

  useEffect(() => {
    checkScrollState();
    window.addEventListener('resize', checkScrollState);
    return () => window.removeEventListener('resize', checkScrollState);
  }, [tabs, checkScrollState]);

  const handleScroll = useCallback((direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  }, []);

  // 드래그 앤 드롭 핸들러
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    // Home 탭은 드래그 불가
    if (tabs[index]?.id === HOME_TAB.id) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, [tabs]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    // Home 탭 위치로는 드롭 불가
    if (tabs[index]?.id === HOME_TAB.id) return;
    if (draggedIndex !== null && index !== draggedIndex) {
      setDragOverIndex(index);
    }
  }, [draggedIndex, tabs]);

  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      reorderTabs(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, dragOverIndex, reorderTabs]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  // 탭 아이콘 결정
  const getTabIcon = (tab: typeof tabs[0]) => {
    if (tab.id === HOME_TAB.id) {
      return Home;
    }
    return FileText;
  };

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div
      className="flex items-end bg-gray-50 border-b border-gray-200"
      style={{ height: LAYOUT_SIZES.tabBar.containerHeight }}
    >
      {/* 왼쪽 스크롤 버튼 */}
      {showLeftArrow && (
        <button
          onClick={() => handleScroll('left')}
          className="flex-shrink-0 h-control-h px-2 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
      )}

      {/* 탭 목록 */}
      <div
        ref={scrollRef}
        onScroll={checkScrollState}
        className="flex-1 flex items-end overflow-x-auto scrollbar-hide"
      >
        {tabs.map((tab, index) => {
          const IconComponent = getTabIcon(tab);
          const isActive = tab.id === activeTabId;
          const isHomeTab = tab.id === HOME_TAB.id;
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;

          // Home 탭 전용 스타일
          if (isHomeTab) {
            return (
              <div
                key={tab.id}
                className={`flex-shrink-0 flex items-center justify-center w-10 h-control-h border-r border-gray-200 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-ssoo-content-border border-b-2 border-b-ls-red'
                    : 'bg-ls-gray hover:bg-ssoo-content-border/80'
                }`}
              >
                <button
                  onClick={() => activateTab(tab.id)}
                  className="flex items-center justify-center w-full h-full"
                >
                  <IconComponent className={`w-5 h-5 ${isActive ? 'text-ssoo-primary' : 'text-white'}`} />
                </button>
              </div>
            );
          }

          // 일반 문서 탭
          return (
            <div
              key={tab.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onDragLeave={handleDragLeave}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 h-control-h border-r border-gray-200 transition-colors cursor-pointer group ${
                isActive
                  ? 'bg-ssoo-content-border border-b-2 border-b-ls-red'
                  : 'hover:bg-gray-100'
              } ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-l-2 border-l-ssoo-primary' : ''}`}
            >
              <button
                onClick={() => activateTab(tab.id)}
                className="flex items-center gap-1.5"
              >
                <IconComponent className={`w-4 h-4 ${isActive ? 'text-ssoo-primary' : 'text-gray-500'}`} />
                <span
                  className={`text-sm truncate max-w-[120px] ${
                    isActive ? 'text-ssoo-primary font-medium' : 'text-gray-600'
                  }`}
                >
                  {tab.title}
                </span>
              </button>
              {tab.closable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className={`h-control-h-sm w-control-h-sm flex items-center justify-center opacity-0 group-hover:opacity-100 rounded transition-opacity ${
                    isActive ? 'hover:bg-ssoo-primary/20' : 'hover:bg-gray-200'
                  }`}
                >
                  <X className={`w-3 h-3 ${isActive ? 'text-ssoo-primary' : 'text-gray-500'}`} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 오른쪽 스크롤 버튼 */}
      {showRightArrow && (
        <button
          onClick={() => handleScroll('right')}
          className="flex-shrink-0 h-control-h px-2 hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      )}
    </div>
  );
}
