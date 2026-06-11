'use client';

import { useTabStore, HOME_TAB } from '@/stores';
import { useAssistantPanelStore, useConfirmStore } from '@/stores';
import { useEditorMultiStore } from '@/stores/editor-core.store';
import { SsooTabBarControlButton, SsooTabBarHomeButton, SsooTabBarItem, SsooTabBarShell } from '@ssoo/web-shell';
import { X, Minimize2, ChevronLeft, ChevronRight, Home, FileText, Bot, Search, Sparkles, FileSearch, Settings, FilePenLine } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { LAYOUT_SIZES } from '@/lib/constants/layout';

/**
 * DMS 탭바 컴포넌트
 * - 열린 문서 탭 목록 표시
 * - 탭 활성화, 닫기
 * - 스크롤 네비게이션
 * - 드래그로 탭 순서 변경
 */
export function TabBar() {
  const { tabs, activeTabId, activateTab, closeTab, reorderTabs } = useTabStore();
  const openPanel = useAssistantPanelStore((state) => state.openPanel);
  const { confirm } = useConfirmStore();
  const editors = useEditorMultiStore((state) => state.editors);
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

  // 탭 아이콘 결정 (tab.icon 필드 기반)
  const TAB_ICON_MAP: Record<string, LucideIcon> = {
    Home,
    Bot,
    Search,
    FileSearch,
    Sparkles,
    FileText,
    Settings,
  };

  const getTabIcon = (tab: typeof tabs[0]): LucideIcon => {
    if (tab.id === HOME_TAB.id) return Home;
    if (tab.icon && TAB_ICON_MAP[tab.icon]) return TAB_ICON_MAP[tab.icon];
    return FileText;
  };

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
        const IconComponent = getTabIcon(tab);
        const isActive = tab.id === activeTabId;
        const isHomeTab = tab.id === HOME_TAB.id;
        const isTabEditing = Boolean(tab.isEditing);
        const hasUnsavedChanges = Boolean(editors[tab.id]?.hasUnsavedChanges);
        const isDragging = draggedIndex === index;
        const isDragOver = dragOverIndex === index;

        if (isHomeTab) {
          return (
            <SsooTabBarHomeButton key={tab.id} active={isActive} onClick={() => activateTab(tab.id)}>
              <IconComponent className={`h-5 w-5 ${isActive ? 'text-ssoo-primary' : 'text-white'}`} />
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
              isTabEditing ? (
                <FilePenLine className={`h-4 w-4 shrink-0 ${isActive ? 'text-ssoo-primary/80' : 'text-ssoo-primary/70'}`} />
              ) : (
                <IconComponent className={`h-4 w-4 shrink-0 ${isActive ? 'text-ssoo-primary' : 'text-gray-500'}`} />
              )
            }
            className={hasUnsavedChanges ? 'italic' : undefined}
            closeSlot={
              <>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  isTabEditing
                    ? hasUnsavedChanges ? 'bg-destructive/60' : 'bg-ssoo-primary/70'
                    : 'bg-transparent'
                }`} />
                {tab.closable ? (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (tab.path.startsWith('/ai/chat')) {
                        closeTab(tab.id);
                        openPanel();
                        return;
                      }
                      if (editors[tab.id]?.hasUnsavedChanges) {
                        const confirmed = await confirm({
                          title: '변경사항 폐기',
                          description: '저장하지 않은 변경사항이 있습니다. 정말로 진행하시겠습니까?',
                          confirmText: '확인',
                          cancelText: '돌아가기',
                        });
                        if (!confirmed) return;
                      }
                      closeTab(tab.id);
                    }}
                    className={`flex h-control-h-sm w-control-h-sm items-center justify-center rounded opacity-0 transition-opacity pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto ${
                      isActive ? 'hover:bg-ssoo-primary/20' : 'hover:bg-gray-200'
                    }`}
                  >
                    {tab.path.startsWith('/ai/chat') ? (
                      <Minimize2 className={`h-3 w-3 ${isActive ? 'text-ssoo-primary' : 'text-gray-500'}`} />
                    ) : (
                      <X className={`h-3 w-3 ${isActive ? 'text-ssoo-primary' : 'text-gray-500'}`} />
                    )}
                  </button>
                ) : null}
              </>
            }
          />
        );
      })}
    </SsooTabBarShell>
  );
}
