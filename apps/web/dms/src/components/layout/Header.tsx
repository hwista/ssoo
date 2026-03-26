'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Plus, Bell } from 'lucide-react';
import { useTabStore } from '@/stores';
import { UserMenu } from './UserMenu';

/**
 * DMS 상단 헤더 컴포넌트
 * - AI 검색
 * - 새 도큐먼트 버튼 (탭 내 런처 페이지로 이동)
 * - 알림
 * - 사용자 프로필
 */
export function Header() {
  const { openTab, updateTab } = useTabStore();
  const [searchQuery, setSearchQuery] = useState('');
  const actionsRef = useRef<HTMLDivElement>(null);
  const [actionsWidth, setActionsWidth] = useState(0);

  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return;
    const update = () => setActionsWidth(el.getBoundingClientRect().width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleSearch = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const trimmedQuery = searchQuery.trim();
      const tabId = openTab({
        id: 'ai-search',
        title: 'AI 검색',
        path: `/ai/search?q=${encodeURIComponent(trimmedQuery)}`,
        icon: 'Bot',
        closable: true,
        activate: true,
      });
      if (tabId) {
        updateTab(tabId, {
          title: `AI 검색: ${trimmedQuery.slice(0, 20)}...`,
          path: `/ai/search?q=${encodeURIComponent(trimmedQuery)}`,
          icon: 'Bot',
        });
      }
      setSearchQuery('');
    }
  }, [searchQuery, openTab, updateTab]);

  const handleCreateDocument = useCallback(() => {
    openTab({
      id: `new-doc-${Date.now()}`,
      title: '새 문서',
      path: '/doc/new',
      icon: 'FileText',
      closable: true,
      activate: true,
    });
  }, [openTab]);

  return (
    <header className="h-header-h flex items-center justify-between px-4 bg-ssoo-primary">
      {/* 왼쪽: 검색 */}
      <div className="flex items-center flex-1 max-w-md gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="찾고 싶은 내용을 자유롭게 물어보세요!"
            className="w-full h-control-h pl-9 pr-4 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40"
          />
        </div>
      </div>

      {/* 오른쪽: 액션 버튼들 */}
      <div ref={actionsRef} className="flex items-center gap-2">
        {/* 새 도큐먼트 */}
        <button
          type="button"
          onClick={handleCreateDocument}
          className="flex items-center gap-1 h-control-h px-3 bg-white text-ssoo-primary text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>새 도큐먼트</span>
        </button>

        {/* 알림 */}
        <button
          className="relative h-control-h w-control-h flex items-center justify-center hover:bg-white/10 rounded-md transition-colors"
          title="알림"
        >
          <Bell className="w-5 h-5 text-white" />
          {/* 알림 뱃지 (임시) */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-ls-red rounded-full" />
        </button>

        {/* 사용자 프로필 */}
        <UserMenu dropdownWidth={actionsWidth} />
      </div>
    </header>
  );
}
