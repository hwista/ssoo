'use client';

import { useState } from 'react';
import { 
  ChevronDown, 
  RefreshCw, 
  Bookmark, 
  Layers, 
  FolderTree,
  FileText,
  BookOpen,
  Code,
} from 'lucide-react';
import { useLayoutStore, useTreeStore } from '@/stores';
import { LAYOUT_SIZES, DOCUMENT_TYPE_LABELS, type DocumentType } from '@/types/layout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarSearch } from './sidebar/SidebarSearch';
import { SidebarSection } from './sidebar/SidebarSection';
import { SidebarBookmarks } from './sidebar/SidebarBookmarks';
import { SidebarOpenTabs } from './sidebar/SidebarOpenTabs';
import { SidebarFileTree } from './sidebar/SidebarFileTree';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';

// 문서 타입별 아이콘
const DOCUMENT_TYPE_ICONS: Record<DocumentType, React.ComponentType<{ className?: string }>> = {
  wiki: BookOpen,
  'system-docs': Code,
  blog: FileText,
};

/**
 * DMS 메인 사이드바 (PMS 표준 적용)
 * - 로고: W 아이콘 + Wiki 텍스트
 * - 문서 타입 선택: 헤더 영역 (사이드바 접기 버튼 위치)
 * - 검색 + 새로고침
 * - 책갈피 / 현재 열린 페이지 / 전체 파일
 * - 하단 카피라이트
 */
export function MainSidebar() {
  const { documentType, setDocumentType, expandedSections, toggleSection, searchQuery, setSearchQuery, clearSearch } = useLayoutStore();
  const { refreshFileTree } = useTreeStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshFileTree();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const DocumentTypeIcon = DOCUMENT_TYPE_ICONS[documentType];

  return (
    <aside
      className="fixed left-0 top-0 h-full bg-ssoo-content-bg border-r border-ssoo-content-border flex flex-col overflow-hidden"
      style={{ width: LAYOUT_SIZES.sidebar.width }}
    >
      {/* 헤더 영역: 로고 + 문서 타입 선택 */}
      <div className="h-header-h flex items-center justify-between px-3 bg-ssoo-primary">
        {/* 로고 (PMS 스타일) */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-white rounded flex items-center justify-center">
            <span className="text-ssoo-primary font-bold text-lg">W</span>
          </div>
          <span className="font-semibold text-white text-lg">WIKI</span>
        </div>

        {/* 문서 타입 선택 드롭다운 (헤더 AI 검색 스타일) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1 h-control-h px-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm transition-colors"
            >
              <DocumentTypeIcon className="w-4 h-4" />
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((type) => {
              const TypeIcon = DOCUMENT_TYPE_ICONS[type];
              return (
                <DropdownMenuItem
                  key={type}
                  onClick={() => setDocumentType(type)}
                  className={documentType === type ? 'bg-gray-100' : ''}
                >
                  <TypeIcon className="w-4 h-4 mr-2" />
                  {DOCUMENT_TYPE_LABELS[type]}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 검색 + 새로고침 */}
      <div className="p-2 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-1">
          <SidebarSearch />
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-ssoo-sitemap-bg rounded-lg transition-colors disabled:opacity-50"
            title="새로고침"
          >
            <RefreshCw
              className={`w-4 h-4 text-ssoo-primary ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* 스크롤 영역 */}
      <ScrollArea variant="sidebar" className="flex-1">
        {/* 책갈피 */}
        <SidebarSection
          title="책갈피"
          icon={Bookmark}
          isExpanded={expandedSections.includes('bookmarks')}
          onToggle={() => toggleSection('bookmarks')}
        >
          <SidebarBookmarks />
        </SidebarSection>

        {/* 현재 열린 페이지 */}
        <SidebarSection
          title="현재 열린 페이지"
          icon={Layers}
          isExpanded={expandedSections.includes('openTabs')}
          onToggle={() => toggleSection('openTabs')}
        >
          <SidebarOpenTabs />
        </SidebarSection>

        {/* 전체 파일 */}
        <SidebarSection
          title="전체 파일"
          icon={FolderTree}
          isExpanded={expandedSections.includes('fileTree')}
          onToggle={() => toggleSection('fileTree')}
        >
          <SidebarFileTree />
        </SidebarSection>
      </ScrollArea>

      {/* 하단 카피라이트 (PMS 스타일) */}
      <div className="flex-shrink-0 border-t border-ssoo-content-border bg-ssoo-content-bg px-3 py-2">
        <div className="text-xs text-gray-500 space-y-0.5">
          <div className="font-medium text-gray-600">DMS v1.0.0</div>
          <div>© 2026 LS Electric Co., Ltd.</div>
          <div className="text-[10px] text-gray-400">All rights reserved.</div>
        </div>
      </div>
    </aside>
  );
}
