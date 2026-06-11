'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { SsooHeader, SsooHeaderActionButton, SsooHeaderSearchBox } from '@ssoo/web-shell';
import { Search, Plus } from 'lucide-react';
import { useAccessStore, useTabStore } from '@/stores';
import { UserMenu } from './UserMenu';
import { HeaderNotifications } from './HeaderNotifications';

/**
 * DMS 상단 헤더 컴포넌트
 * - AI 검색
 * - 새 도큐먼트 버튼 (탭 내 런처 페이지로 이동)
 * - 알림
 * - 사용자 프로필
 */
export function Header() {
  const { openTab, updateTab } = useTabStore();
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const canUseSearch = accessSnapshot?.features.canUseSearch ?? false;
  const canWriteDocuments = accessSnapshot?.features.canWriteDocuments ?? false;
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
    if (!canUseSearch) {
      return;
    }
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
  }, [canUseSearch, searchQuery, openTab, updateTab]);

  const handleCreateDocument = useCallback(() => {
    if (!canWriteDocuments) {
      return;
    }
    openTab({
      id: `new-doc-${Date.now()}`,
      title: '새 문서',
      path: '/doc/new',
      icon: 'FileText',
      closable: true,
      activate: true,
    });
  }, [canWriteDocuments, openTab]);

  return (
    <SsooHeader
      mode="primary"
      searchSlot={
        <SsooHeaderSearchBox
          value={searchQuery}
          onChange={setSearchQuery}
          onKeyDown={handleSearch}
          placeholder="문서·지식 검색..."
          disabled={!canUseSearch}
          iconSlot={<Search className="h-4 w-4 text-white/50" />}
        />
      }
      actionsSlot={
        <div ref={actionsRef} className="flex items-center gap-2">
          <SsooHeaderActionButton
            type="button"
            onClick={handleCreateDocument}
            disabled={!canWriteDocuments}
            tone="primary-on-color"
            title="새 문서를 작성합니다."
          >
            <Plus className="h-4 w-4" />
            <span>새 문서</span>
          </SsooHeaderActionButton>

          <HeaderNotifications />

          <UserMenu dropdownWidth={actionsWidth} />
        </div>
      }
    />
  );
}
