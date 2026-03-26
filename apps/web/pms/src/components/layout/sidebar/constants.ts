'use client';

import type { SidebarSection as SidebarSectionType } from '@/types';
import {
  Search,
  Star,
  Layers,
  FolderTree,
  Settings,
} from 'lucide-react';

/**
 * 섹션별 아이콘 매핑
 */
export const SECTION_ICONS: Record<SidebarSectionType, React.ComponentType<{ className?: string }>> = {
  search: Search,
  favorites: Star,
  openTabs: Layers,
  menuTree: FolderTree,
  admin: Settings,
};
