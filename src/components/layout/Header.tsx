'use client';

import { useState, useCallback } from 'react';
import { Search, Plus, Bell, User, ChevronDown, Bot, FileSearch, FileText, Sparkles } from 'lucide-react';
import { useLayoutStore, useTabStore } from '@/stores';
import { AI_SEARCH_TYPE_LABELS } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

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

  const handleCreateNewDocument = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);

  const handleCreateWithUi = useCallback(() => {
    openTab({
      id: `new-doc-${Date.now()}`,
      title: '새 문서',
      path: '/wiki/new',
      icon: 'FileText',
      closable: true,
      activate: true,
    });
    setIsCreateDialogOpen(false);
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
    setIsCreateDialogOpen(false);
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
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={0}
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
      <div className="flex items-center gap-2">
        {/* 새 도큐먼트 */}
        <button
          onClick={handleCreateNewDocument}
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
        <button className="flex items-center gap-2 h-control-h px-2 hover:bg-white/10 rounded-md transition-colors">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <ChevronDown className="w-4 h-4 text-white/70" />
        </button>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>새 문서 생성</DialogTitle>
            <DialogDescription>문서 생성 방식을 선택하세요.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={handleCreateWithAi}
              className="flex items-start gap-3 rounded-lg border border-ssoo-content-border p-4 text-left transition-colors hover:border-ssoo-primary"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ssoo-content-bg">
                <Sparkles className="h-5 w-5 text-ssoo-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ssoo-primary">AI 작성</p>
                <p className="text-xs text-ssoo-primary/70">파일 첨부 후 템플릿 기반 요약</p>
              </div>
            </button>
            <button
              onClick={handleCreateWithUi}
              className="flex items-start gap-3 rounded-lg border border-ssoo-content-border p-4 text-left transition-colors hover:border-ssoo-primary"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ssoo-content-bg">
                <FileText className="h-5 w-5 text-ssoo-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ssoo-primary">UI 작성</p>
                <p className="text-xs text-ssoo-primary/70">기존 에디터로 직접 작성</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
