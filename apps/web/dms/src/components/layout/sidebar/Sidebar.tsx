'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Bookmark,
  Layers,
  FolderTree,
  GitBranch,
  Menu,
} from 'lucide-react';
import {
  SsooCollapsedRailButton,
  SsooSidebarBrandHeader,
  SsooSidebarFooter,
  SsooSidebarSection,
  SsooSidebarSectionChevron,
  SsooSidebarShell,
  SsooSidebarToolbar,
  SsooSidebarToolbarAction,
} from '@ssoo/web-shell';
import { useAccessStore, useAuthStore, useSidebarStore, useFileStore, useGitStore } from '@/stores';
import { LAYOUT_SIZES } from '@/lib/constants/layout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from './Search';
import { Bookmarks } from './Bookmarks';
import { OpenTabs } from './OpenTabs';
import { FileTree } from './FileTree';
import { Changes } from './Changes';

/**
 * Sidebar Props
 */
interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * DMS 사이드바 (PMS 표준 적용)
 * - 로고: S 아이콘 + SSOT 텍스트
 * - 공통 접기/펼치기 토글
 * - 검색 + 새로고침
 * - 책갈피 / 현재 열린 페이지 / 전체 파일
 * - 하단 카피라이트
 */
export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const { expandedSections, isFileTreeOpen, fileTreeOwnerUserId, fileTreeResetEpoch, toggleSection } = useSidebarStore();
  const { refreshFileTree } = useFileStore();
  const currentUserId = useAuthStore((state) => state.user?.userId ?? null);
  const { failureCount, isAvailable: gitAvailable } = useGitStore();
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const canReadDocuments = accessSnapshot?.features.canReadDocuments ?? false;
  const canUseGit = accessSnapshot?.features.canUseGit ?? false;
  const isFileTreeExpanded = Boolean(
    currentUserId
    && isFileTreeOpen
    && fileTreeOwnerUserId === currentUserId
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!canReadDocuments) {
      return;
    }
    setIsRefreshing(true);
    try {
      await refreshFileTree();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <SsooSidebarShell
      mode="collapsible"
      expanded={!isCollapsed}
      width={LAYOUT_SIZES.sidebar.expandedWidth}
      collapsedWidth={LAYOUT_SIZES.sidebar.collapsedWidth}
      headerSlot={
        <SsooSidebarBrandHeader
          title="SSOT"
          subtitle="DMS · 문서 허브"
          collapsed={isCollapsed}
          revealOnHover={isCollapsed}
          actionsSlot={
            <button
              type="button"
              onClick={onToggleCollapse}
              className="rounded-lg p-2 transition-colors hover:bg-white/10"
              title={isCollapsed ? '펼치기' : '접기'}
            >
              <Menu className="h-5 w-5 text-white" />
            </button>
          }
        />
      }
      railSlot={
        <nav className="flex flex-col items-center gap-1 py-2">
          <SsooCollapsedRailButton
            label="책갈피"
            icon={Bookmark}
            active={expandedSections.includes('bookmarks')}
            onClick={() => toggleSection('bookmarks')}
          />
          <SsooCollapsedRailButton
            label="현재 열린 페이지"
            icon={Layers}
            active={expandedSections.includes('openTabs')}
            onClick={() => toggleSection('openTabs')}
          />
          {canReadDocuments ? (
            <SsooCollapsedRailButton
              label="전체 파일"
              icon={FolderTree}
              active={isFileTreeExpanded}
              onClick={() => toggleSection('fileTree')}
            />
          ) : null}
          {gitAvailable && canUseGit && failureCount > 0 ? (
            <SsooCollapsedRailButton
              label={`publish 복구 (${failureCount})`}
              icon={GitBranch}
              active={expandedSections.includes('changes')}
              onClick={() => toggleSection('changes')}
            />
          ) : null}
        </nav>
      }
      beforeContentSlot={
        <SsooSidebarToolbar>
          <div className="flex items-center gap-1">
            <Search />
            <SsooSidebarToolbarAction
              label="새로고침"
              icon={RefreshCw}
              onClick={handleRefresh}
              disabled={isRefreshing || !canReadDocuments}
              loading={isRefreshing}
            />
          </div>
        </SsooSidebarToolbar>
      }
      contentSlot={
        <ScrollArea variant="sidebar" className="flex-1">
            <SsooSidebarSection
              title="책갈피"
              icon={Bookmark}
              collapsible
              expanded={expandedSections.includes('bookmarks')}
              onToggle={() => toggleSection('bookmarks')}
              actionSlot={<SsooSidebarSectionChevron expanded={expandedSections.includes('bookmarks')} expandedIcon={ChevronDown} collapsedIcon={ChevronRight} />}
            >
              <Bookmarks />
            </SsooSidebarSection>

            <SsooSidebarSection
              title="현재 열린 페이지"
              icon={Layers}
              collapsible
              expanded={expandedSections.includes('openTabs')}
              onToggle={() => toggleSection('openTabs')}
              actionSlot={<SsooSidebarSectionChevron expanded={expandedSections.includes('openTabs')} expandedIcon={ChevronDown} collapsedIcon={ChevronRight} />}
            >
              <OpenTabs />
            </SsooSidebarSection>

            {canReadDocuments ? (
              <SsooSidebarSection
                key={`file-tree-section-${currentUserId ?? 'anonymous'}-${fileTreeResetEpoch}`}
                title="전체 파일"
                icon={FolderTree}
                collapsible
                expanded={isFileTreeExpanded}
                onToggle={() => toggleSection('fileTree')}
                actionSlot={<SsooSidebarSectionChevron expanded={isFileTreeExpanded} expandedIcon={ChevronDown} collapsedIcon={ChevronRight} />}
              >
                <FileTree key={`file-tree-${currentUserId ?? 'anonymous'}-${fileTreeResetEpoch}`} />
              </SsooSidebarSection>
            ) : null}

            {gitAvailable && canUseGit && failureCount > 0 ? (
              <SsooSidebarSection
                title={`publish 복구 (${failureCount})`}
                icon={GitBranch}
                collapsible
                expanded={expandedSections.includes('changes')}
                onToggle={() => toggleSection('changes')}
                actionSlot={<SsooSidebarSectionChevron expanded={expandedSections.includes('changes')} expandedIcon={ChevronDown} collapsedIcon={ChevronRight} />}
              >
                <Changes />
              </SsooSidebarSection>
            ) : null}
        </ScrollArea>
      }
      footerSlot={<SsooSidebarFooter collapsed={isCollapsed} revealOnHover={isCollapsed} />}
    />
  );
}
