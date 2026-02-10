'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Plus, Bell, ChevronDown, Bot, FileSearch, FileText, Sparkles } from 'lucide-react';
import { useLayoutStore, useTabStore } from '@/stores';
import { AI_SEARCH_TYPE_LABELS } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';
import { UserMenu } from './UserMenu';

/**
 * DMS 상단 헤더 컴포넌트
 * - AI 검색 (Gemini / RAG 드롭다운)
 * - 새 도큐먼트 버튼
 * - 알림
 * - 사용자 프로필
 */
export function Header() {
  const { aiSearchType, setAISearchType } = useLayoutStore();
  const { openTab } = useTabStore();
  const [searchQuery, setSearchQuery] = useState('');
  const actionsRef = useRef<HTMLDivElement>(null);
  const [actionsWidth, setActionsWidth] = useState(0);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const [createMenuWidth, setCreateMenuWidth] = useState(0);

  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setActionsWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = createButtonRef.current;
    if (!el) return;
    setCreateMenuWidth(el.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCreateMenuWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isQuestionMode = aiSearchType === 'question';

  const handleSearch = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const trimmedQuery = searchQuery.trim();
      const label = AI_SEARCH_TYPE_LABELS[aiSearchType];
      const targetPath = isQuestionMode ? '/ai/ask' : '/ai/search';

      // AI 질문/검색 결과를 새 탭으로 열기
      openTab({
        id: `ai-${aiSearchType}-${Date.now()}`,
        title: `${label}: ${trimmedQuery.slice(0, 20)}...`,
        path: `${targetPath}?q=${encodeURIComponent(trimmedQuery)}`,
        icon: isQuestionMode ? 'Bot' : 'FileSearch',
        closable: true,
        activate: true,
      });
      setSearchQuery('');
    }
  }, [searchQuery, aiSearchType, isQuestionMode, openTab]);

  const handleCreateWithUi = useCallback(() => {
    openTab({
      id: `new-doc-${Date.now()}`,
      title: '새 문서',
      path: '/wiki/new',
      icon: 'FileText',
      closable: true,
      activate: true,
    });
  }, [openTab]);

  const handleCreateWithAi = useCallback(() => {
    openTab({
      id: `ai-create-${Date.now()}`,
      title: 'AI 작성',
      path: '/ai/create',
      icon: 'Sparkles',
      closable: true,
      activate: true,
    });
  }, [openTab]);

  return (
    <header className="h-header-h flex items-center justify-between px-4 bg-ssoo-primary">
      {/* 왼쪽: AI 검색 */}
      <div className="flex items-center flex-1 max-w-md gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            placeholder={isQuestionMode ? '질문을 입력하세요...' : '검색어를 입력하세요...'}
            className="w-full h-control-h pl-9 pr-4 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40"
          />
        </div>

        {/* AI 타입 선택 드롭다운 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1 h-control-h px-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm transition-colors cursor-pointer"
            >
              {isQuestionMode ? (
                <Bot className="w-4 h-4" />
              ) : (
                <FileSearch className="w-4 h-4" />
              )}
              <span className="text-sm">{AI_SEARCH_TYPE_LABELS[aiSearchType]}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={4}
            className="w-48 bg-ssoo-primary text-white border-white/20"
          >
            <DropdownMenuItem
              onClick={() => setAISearchType('question')}
              className={`text-white focus:bg-white/10 focus:text-white ${aiSearchType === 'question' ? 'bg-white/10' : ''}`}
            >
              <Bot className="w-4 h-4 mr-2" />
              질문
              <span className="ml-auto text-xs text-white/70">문서 기반 대화</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setAISearchType('search')}
              className={`text-white focus:bg-white/10 focus:text-white ${aiSearchType === 'search' ? 'bg-white/10' : ''}`}
            >
              <FileSearch className="w-4 h-4 mr-2" />
              검색
              <span className="ml-auto text-xs text-white/70">문서 목록</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 오른쪽: 액션 버튼들 */}
      <div ref={actionsRef} className="flex items-center gap-2">
        {/* 새 도큐먼트 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              ref={createButtonRef}
              className="flex items-center gap-1 h-control-h px-3 bg-white text-ssoo-primary text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>새 도큐먼트</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={4}
            className="bg-white border border-ssoo-content-border shadow-lg"
            style={createMenuWidth ? { width: createMenuWidth } : undefined}
          >
            <DropdownMenuItem
              onClick={handleCreateWithAi}
              className="flex items-center gap-2 px-3 py-2 text-sm text-ssoo-primary focus:bg-ssoo-content-bg/60 focus:text-ssoo-primary"
            >
              <Sparkles className="h-4 w-4 text-ssoo-primary" />
              <span>AI 작성</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleCreateWithUi}
              className="flex items-center gap-2 px-3 py-2 text-sm text-ssoo-primary focus:bg-ssoo-content-bg/60 focus:text-ssoo-primary"
            >
              <FileText className="h-4 w-4 text-ssoo-primary" />
              <span>UI 작성</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
