'use client';

import { ChevronDown, FolderTree } from 'lucide-react';
import { useLayoutStore } from '@/stores';
import { LAYOUT_SIZES, DOCUMENT_TYPE_LABELS, type DocumentType } from '@/types/layout';
import { SidebarSearch } from './sidebar/SidebarSearch';
import { SidebarOpenTabs } from './sidebar/SidebarOpenTabs';
import { SidebarFileTree } from './sidebar/SidebarFileTree';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';

/**
 * DMS 메인 사이드바
 * - 접기 없음 (항상 펼침)
 * - 문서 타입 전환 드롭다운
 * - 파일 검색
 * - 열린 탭 목록
 * - 파일 트리
 */
export function MainSidebar() {
  const { documentType, setDocumentType, expandedSections, toggleSection } = useLayoutStore();

  return (
    <aside
      className="fixed left-0 top-0 h-full bg-gray-100 border-r border-gray-200 flex flex-col overflow-hidden"
      style={{ width: LAYOUT_SIZES.sidebar.width }}
    >
      {/* 로고 영역 */}
      <div className="h-[60px] flex items-center px-4 bg-[#003366]">
        <div className="flex items-center gap-2">
          <FolderTree className="w-6 h-6 text-white" />
          <span className="text-lg font-bold text-white">DMS</span>
        </div>
      </div>

      {/* 문서 타입 전환 드롭다운 */}
      <div className="px-3 py-2 border-b border-gray-200">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-full flex items-center justify-between h-9 px-3 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span>{DOCUMENT_TYPE_LABELS[documentType]}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[calc(100%-24px)]" sideOffset={4}>
            {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((type) => (
              <DropdownMenuItem
                key={type}
                onClick={() => setDocumentType(type)}
                className={documentType === type ? 'bg-gray-100' : ''}
              >
                {DOCUMENT_TYPE_LABELS[type]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 파일 검색 */}
      <div className="px-3 py-2">
        <SidebarSearch />
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto">
        {/* 열린 탭 섹션 */}
        <SidebarOpenTabs
          isExpanded={expandedSections.includes('openTabs')}
          onToggle={() => toggleSection('openTabs')}
        />

        {/* 파일 트리 섹션 */}
        <SidebarFileTree
          isExpanded={expandedSections.includes('fileTree')}
          onToggle={() => toggleSection('fileTree')}
        />
      </div>
    </aside>
  );
}
