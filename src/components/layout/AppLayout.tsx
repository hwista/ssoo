'use client';

import { useLayoutStore } from '@/stores';
import { LAYOUT_SIZES } from '@/types/layout';
import { MainSidebar } from './MainSidebar';
import { Header } from './Header';
import { TabBar } from './TabBar';
import { ContentArea } from './ContentArea';

/**
 * DMS 메인 앱 레이아웃
 * - Desktop: Sidebar + Header + TabBar + Content
 * - Mobile: 별도 UI (추후 개발)
 * 
 * Note: PMS 패턴 동기화로 children은 더 이상 사용하지 않음.
 * ContentArea가 내부적으로 pageComponents로 페이지 렌더링.
 */
export function AppLayout() {
  const { deviceType } = useLayoutStore();

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
      {/* Sidebar - 항상 펼침 (DMS는 접기 없음) */}
      <MainSidebar />

      {/* Main Content Area */}
      <div
        className="flex flex-col flex-1 min-w-0"
        style={{ marginLeft: LAYOUT_SIZES.sidebar.width }}
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
