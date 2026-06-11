'use client';

import { useTabStore, HOME_TAB } from '@/stores';
import { SsooTabBarControlButton, SsooTabBarHomeButton, SsooTabBarItem, SsooTabBarShell } from '@ssoo/web-shell';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getIconComponent } from '@/lib/utils/icons';
import { useRef, useState, useEffect, useCallback } from 'react';
import { LAYOUT_SIZES } from '@/types';

/**
 * MDI 탭바 컴포넌트
 * - 열린 탭 목록 표시
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
    if (tabs[index]?.menuCode === HOME_TAB.menuCode) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, [tabs]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    // Home 탭 위치로는 드롭 불가
    if (tabs[index]?.menuCode === HOME_TAB.menuCode) return;
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

  if (tabs.length === 0) {
    return null;
  }

  return (
    <SsooTabBarShell
      mode="mdi"
      height={LAYOUT_SIZES.tabBar.containerHeight}
      scrollRef={scrollRef}
      onScroll={checkScrollState}
      leftControlSlot={
        showLeftArrow ? (
          <SsooTabBarControlButton onClick={() => handleScroll('left')}>
            <ChevronLeft className="h-4 w-4 text-gray-500" />
          </SsooTabBarControlButton>
        ) : null
      }
      rightControlSlot={
        showRightArrow ? (
          <SsooTabBarControlButton onClick={() => handleScroll('right')}>
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </SsooTabBarControlButton>
        ) : null
      }
    >
      {tabs.map((tab, index) => {
        const IconComponent = getIconComponent(tab.icon);
        const isActive = tab.id === activeTabId;
        const isHomeTab = tab.menuCode === HOME_TAB.menuCode;
        const isDragging = draggedIndex === index;
        const isDragOver = dragOverIndex === index;

        if (isHomeTab) {
          return (
            <SsooTabBarHomeButton key={tab.id} active={isActive} onClick={() => activateTab(tab.id)}>
              {IconComponent && (
                <IconComponent className={`h-5 w-5 ${isActive ? 'text-ssoo-primary' : 'text-white'}`} />
              )}
            </SsooTabBarHomeButton>
          );
        }

        return (
          <SsooTabBarItem
            key={tab.id}
            title={tab.title}
            active={isActive}
            draggable
            dragging={isDragging}
            dragOver={isDragOver}
            onClick={() => activateTab(tab.id)}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onDragLeave={handleDragLeave}
            iconSlot={
              IconComponent ? (
                <IconComponent className={`h-4 w-4 ${isActive ? 'text-ssoo-primary' : 'text-gray-500'}`} />
              ) : null
            }
            closeSlot={
              tab.closable ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className={`flex h-control-h-sm w-control-h-sm items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 ${
                    isActive ? 'hover:bg-ssoo-primary/20' : 'hover:bg-gray-200'
                  }`}
                >
                  <X className={`h-3 w-3 ${isActive ? 'text-ssoo-primary' : 'text-gray-500'}`} />
                </button>
              ) : null
            }
          />
        );
      })}
    </SsooTabBarShell>
  );
}