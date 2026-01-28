'use client';

import { useTabStore, HOME_TAB } from '@/stores';

interface ContentAreaProps {
  children?: React.ReactNode;
}

/**
 * DMS 콘텐츠 영역
 * - 활성 탭에 따라 콘텐츠 렌더링
 * - Home 탭: 대시보드 / 환영 화면
 * - 문서 탭: WikiEditor/Viewer
 * - AI 검색 탭: AI 결과 페이지
 */
export function ContentArea({ children }: ContentAreaProps) {
  const { activeTabId, tabs } = useTabStore();
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  // 탭이 없을 때
  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <p className="text-gray-500">탭을 선택해주세요.</p>
      </div>
    );
  }

  // Home 탭
  if (activeTab.id === HOME_TAB.id) {
    return (
      <main className="flex-1 overflow-auto bg-white p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            문서 관리 시스템
          </h1>
          <p className="text-gray-600 mb-8">
            문서를 검색하거나 사이드바에서 파일을 선택하여 시작하세요.
          </p>
          
          {/* 빠른 액션 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-[#003366] cursor-pointer transition-colors">
              <h3 className="font-medium text-gray-900 mb-1">새 문서 작성</h3>
              <p className="text-sm text-gray-500">새로운 문서를 작성합니다</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-[#003366] cursor-pointer transition-colors">
              <h3 className="font-medium text-gray-900 mb-1">AI 검색</h3>
              <p className="text-sm text-gray-500">AI로 문서를 검색합니다</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-[#003366] cursor-pointer transition-colors">
              <h3 className="font-medium text-gray-900 mb-1">최근 문서</h3>
              <p className="text-sm text-gray-500">최근 열어본 문서</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // AI 검색 탭
  if (activeTab.path.startsWith('/ai-search')) {
    // TODO: AI 검색 결과 페이지 컴포넌트 연결
    return (
      <main className="flex-1 overflow-auto bg-white p-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            AI 검색 결과
          </h2>
          <p className="text-gray-600">
            검색 기능 구현 예정 (탭 경로: {activeTab.path})
          </p>
        </div>
      </main>
    );
  }

  // 일반 문서 탭 - children 또는 기본 메시지
  return (
    <main className="flex-1 overflow-auto bg-white">
      {children || (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">
            문서 로딩 중... (경로: {activeTab.path})
          </p>
        </div>
      )}
    </main>
  );
}
