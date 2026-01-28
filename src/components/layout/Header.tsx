'use client';

import { useState, useCallback } from 'react';
import { Search, Plus, Bell, User, ChevronDown, Bot, FileSearch } from 'lucide-react';
import { useLayoutStore, useTabStore } from '@/stores';
import type { AISearchType } from '@/types/layout';
import { AI_SEARCH_TYPE_LABELS } from '@/types/layout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';

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

  const handleSearch = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // AI 검색 결과를 새 탭으로 열기
      openTab({
        id: `ai-search-${Date.now()}`,
        title: `${aiSearchType === 'gemini' ? 'Gemini' : 'RAG'}: ${searchQuery.slice(0, 20)}...`,
        path: `/ai-search?type=${aiSearchType}&q=${encodeURIComponent(searchQuery)}`,
        icon: aiSearchType === 'gemini' ? 'Bot' : 'FileSearch',
        closable: true,
        activate: true,
      });
      setSearchQuery('');
    }
  }, [searchQuery, aiSearchType, openTab]);

  const handleNewDocument = useCallback(() => {
    // TODO: 새 문서 생성 모달 또는 탭 열기
    openTab({
      id: `new-doc-${Date.now()}`,
      title: '새 문서',
      path: '/wiki/new',
      icon: 'FileText',
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
            placeholder={`${AI_SEARCH_TYPE_LABELS[aiSearchType]}으로 검색...`}
            className="w-full h-control-h pl-9 pr-4 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40"
          />
        </div>

        {/* AI 타입 선택 드롭다운 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1 h-control-h px-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm transition-colors"
            >
              {aiSearchType === 'gemini' ? (
                <Bot className="w-4 h-4" />
              ) : (
                <FileSearch className="w-4 h-4" />
              )}
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem
              onClick={() => setAISearchType('gemini')}
              className={aiSearchType === 'gemini' ? 'bg-gray-100' : ''}
            >
              <Bot className="w-4 h-4 mr-2" />
              Gemini AI
              <span className="ml-auto text-xs text-gray-500">일반 질문</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setAISearchType('rag')}
              className={aiSearchType === 'rag' ? 'bg-gray-100' : ''}
            >
              <FileSearch className="w-4 h-4 mr-2" />
              RAG 검색
              <span className="ml-auto text-xs text-gray-500">문서 기반</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 오른쪽: 액션 버튼들 */}
      <div className="flex items-center gap-2">
        {/* 새 도큐먼트 */}
        <button
          onClick={handleNewDocument}
          className="flex items-center gap-1 h-control-h px-3 bg-white text-ssoo-primary text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>새 도큐먼트</span>
        </button>

        {/* 알림 */}
        <button
          className="relative p-2 hover:bg-white/10 rounded-md transition-colors"
          title="알림"
        >
          <Bell className="w-5 h-5 text-white" />
          {/* 알림 뱃지 (임시) */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* 사용자 프로필 */}
        <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/10 rounded-md transition-colors">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <ChevronDown className="w-4 h-4 text-white/70" />
        </button>
      </div>
    </header>
  );
}
