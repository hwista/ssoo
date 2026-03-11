'use client';

import { useCallback } from 'react';
import { FileText, Search, Clock, Plus } from 'lucide-react';
import { useOpenTabWithConfirm } from '@/hooks';

/**
 * DMS 홈 대시보드 페이지
 * - 빠른 액션 버튼
 * - 최근 문서 (향후 확장)
 */
export function DashboardPage() {
  const openTabWithConfirm = useOpenTabWithConfirm();

  const handleAISearch = useCallback(async () => {
    await openTabWithConfirm({
      id: 'ai-search',
      title: 'AI 검색',
      path: '/ai/search',
      icon: 'Bot',
      closable: true,
      activate: true,
    });
  }, [openTabWithConfirm]);

  const handleNewDocument = useCallback(async () => {
    await openTabWithConfirm({
      id: `new-doc-${Date.now()}`,
      title: '새 문서',
      path: '/wiki/new',
      icon: 'FileText',
      closable: true,
      activate: true,
    });
  }, [openTabWithConfirm]);

  return (
    <main className="flex-1 overflow-auto bg-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-ssoo-primary mb-4">
          문서 관리 시스템
        </h1>
        <p className="text-ssoo-primary/70 mb-8">
          문서를 검색하거나 사이드바에서 파일을 선택하여 시작하세요.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={handleNewDocument}
            className="p-4 bg-ssoo-content-bg/30 rounded-lg border border-ssoo-content-border hover:border-ssoo-primary cursor-pointer transition-colors text-left group"
          >
            <div className="flex items-center gap-2 mb-2">
              <Plus className="w-5 h-5 text-ssoo-primary/50 group-hover:text-ssoo-primary" />
              <h3 className="font-medium text-ssoo-primary">새 문서 작성</h3>
            </div>
            <p className="text-sm text-ssoo-primary/70">새로운 문서를 작성합니다</p>
          </button>

          <button
            onClick={handleAISearch}
            className="p-4 bg-ssoo-content-bg/30 rounded-lg border border-ssoo-content-border hover:border-ssoo-primary cursor-pointer transition-colors text-left group"
          >
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-5 h-5 text-ssoo-primary/50 group-hover:text-ssoo-primary" />
              <h3 className="font-medium text-ssoo-primary">AI 검색</h3>
            </div>
            <p className="text-sm text-ssoo-primary/70">AI로 문서를 검색합니다</p>
          </button>

          <div className="p-4 bg-ssoo-content-bg/30 rounded-lg border border-ssoo-content-border hover:border-ssoo-primary cursor-pointer transition-colors group">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-ssoo-primary/50 group-hover:text-ssoo-primary" />
              <h3 className="font-medium text-ssoo-primary">최근 문서</h3>
            </div>
            <p className="text-sm text-ssoo-primary/70">최근 열어본 문서</p>
          </div>
        </div>

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

export default DashboardPage;
