'use client';

import type { SidebarSection as SidebarSectionType } from '@/types';
import {
  Bookmark,
  Layers,
  FolderTree,
  GitBranch,
} from 'lucide-react';

/**
 * 섹션별 아이콘 매핑
 * - DMS: 책갈피, 열린페이지, 파일트리
 */
export const SECTION_ICONS: Record<SidebarSectionType, React.ComponentType<{ className?: string }>> = {
  bookmarks: Bookmark,
  openTabs: Layers,
  fileTree: FolderTree,
  changes: GitBranch,
};

export const SECTION_LABELS: Record<SidebarSectionType, string> = {
  bookmarks: '즐겨찾기',
  openTabs: '열린 문서',
  fileTree: '문서 탐색',
  changes: '변경 사항',
};
