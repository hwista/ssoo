'use client';

import { FileText, Search, Clock, Plus } from 'lucide-react';
import { useTabStore } from '@/stores';

/**
 * Wiki 홈 대시보드 페이지
 * - 빠른 액션 버튼
 * - 최근 문서 (향후 확장)
 */
export function WikiHomePage() {
  const { openTab } = useTabStore();

  // AI 검색 탭 열기
  const handleAISearch = () => {
    openTab({
      id: 'ai-search',
      title: 'AI 검색',
      path: '/ai-search',
      icon: 'Search',
      closable: true,
      activate: true,
    });
  };

  // 새 문서 작성 (향후 구현)
  const handleNewDocument = () => {
    // TODO: 새 문서 생성 모달 열기
    console.log('새 문서 작성 - 구현 예정');
  };

  return (
    <main className="flex-1 overflow-auto bg-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          문서 관리 시스템
        </h1>
        <p className="text-gray-600 mb-8">
          문서를 검색하거나 사이드바에서 파일을 선택하여 시작하세요.
        </p>

        {/* 빠른 액션 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* 새 문서 작성 */}
          <button
            onClick={handleNewDocument}
            className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-ssoo-primary cursor-pointer transition-colors text-left group"
          >
            <div className="flex items-center gap-2 mb-2">
              <Plus className="w-5 h-5 text-gray-400 group-hover:text-ssoo-primary" />
              <h3 className="font-medium text-gray-900">새 문서 작성</h3>
            </div>
            <p className="text-sm text-gray-500">새로운 문서를 작성합니다</p>
          </button>

          {/* AI 검색 */}
          <button
            onClick={handleAISearch}
            className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-ssoo-primary cursor-pointer transition-colors text-left group"
          >
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-5 h-5 text-gray-400 group-hover:text-ssoo-primary" />
              <h3 className="font-medium text-gray-900">AI 검색</h3>
            </div>
            <p className="text-sm text-gray-500">AI로 문서를 검색합니다</p>
          </button>

          {/* 최근 문서 */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-ssoo-primary cursor-pointer transition-colors group">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-gray-400 group-hover:text-ssoo-primary" />
              <h3 className="font-medium text-gray-900">최근 문서</h3>
            </div>
            <p className="text-sm text-gray-500">최근 열어본 문서</p>
          </div>
        </div>

        {/* 최근 문서 목록 (향후 확장) */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            최근 열어본 문서
          </h2>
          <div className="text-gray-500 text-sm p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            최근 문서 기록이 없습니다.
          </div>
        </section>
      </div>
    </main>
  );
}

export default WikiHomePage;
