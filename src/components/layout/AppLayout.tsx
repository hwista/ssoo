'use client';

import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { useLayoutStore } from '@/stores';
import { LAYOUT_SIZES } from '@/types/layout';
import { cn } from '@/lib/utils';
import { MainSidebar } from './MainSidebar';
import { Header } from './Header';
import { TabBar } from './TabBar';
import { ContentArea } from './ContentArea';

// 본문 영역 최소 너비 (DocViewer와 동일)
const DOCUMENT_MIN_WIDTH = 975;

/**
 * DMS 메인 앱 레이아웃
 * - Desktop: Sidebar + Header + TabBar + Content
 * - Mobile: 별도 UI (추후 개발)
 * - Compact Mode: 사이드바 접힘 + 오버레이
 * 
 * Note: PMS 패턴 동기화로 children은 더 이상 사용하지 않음.
 * ContentArea가 내부적으로 pageComponents로 페이지 렌더링.
 */
export function AppLayout() {
  const { deviceType, isCompactMode, sidebarOpen, setCompactMode, toggleSidebar, setSidebarOpen } = useLayoutStore();

  // 컨텐츠 영역 크기 측정
  const contentRef = React.useRef<HTMLDivElement>(null);

  // 창 크기에 따른 컴팩트 모드 자동 전환
  React.useEffect(() => {
    const checkCompactMode = () => {
      // 사이드바를 제외한 가용 너비 계산
      const availableWidth = window.innerWidth - LAYOUT_SIZES.sidebar.width;
      // 본문 최소 너비보다 작으면 컴팩트 모드
      const shouldBeCompact = availableWidth < DOCUMENT_MIN_WIDTH;
      setCompactMode(shouldBeCompact);
    };

    checkCompactMode();
    window.addEventListener('resize', checkCompactMode);
    return () => window.removeEventListener('resize', checkCompactMode);
  }, [setCompactMode]);

  // 모바일은 별도 UI (추후 개발)
  if (deviceType === 'mobile') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center p-8">
          <h1 className="heading-1 mb-2">모바일 버전 준비 중</h1>
          <p className="text-gray-600">데스크톱에서 접속해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* 컴팩트 모드: 사이드바 그립 버튼 (왼쪽) */}
      {isCompactMode && !sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className={cn(
            'fixed left-0 top-1/2 -translate-y-1/2 z-30',
            'flex items-center justify-center',
            'w-5 h-12 rounded-r-md',
            'bg-ssoo-content-bg hover:bg-ssoo-content-border/50 border border-l-0 border-ssoo-content-border',
            'transition-all duration-300 ease-in-out',
            'shadow-sm'
          )}
          aria-label="사이드바 펼치기"
        >
          <ChevronRight className="h-4 w-4 text-gray-500" />
        </button>
      )}

      {/* 컴팩트 모드: 오버레이 배경 */}
      {isCompactMode && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - 컴팩트 모드에서는 오버레이 */}
      <MainSidebar 
        isCompactMode={isCompactMode}
        isOpen={!isCompactMode || sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div
        ref={contentRef}
        className="flex flex-col flex-1 min-w-0 transition-all duration-300"
        style={{ 
          marginLeft: isCompactMode ? 0 : LAYOUT_SIZES.sidebar.width 
        }}
      >
        {/* Header */}
        <Header />

        {/* TabBar */}
        <TabBar />

        {/* Content */}
        <ContentArea />
      </div>
    </div>
  );
}
