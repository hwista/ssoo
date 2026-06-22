'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Search as SearchIcon,
  Bookmark,
  Layers,
  FolderTree,
  GitBranch,
  Menu,
  Shield,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  createSsooSettingsSidebarSections,
  getSsooAppIdentity,
  SsooSidebarSurface,
} from '@ssoo/web-shell';
import {
  useAccessStore,
  useAuthStore,
  useSidebarStore,
  useFileStore,
  useGitStore,
  useSettingsPageNavigationStore,
  useSettingsStore,
  useTabStore,
  HOME_TAB,
} from '@/stores';
import { useOpenTabWithConfirm } from '@/hooks';
import {
  SETTING_SECTIONS,
  SETTINGS_SECTION_GROUP_LABELS,
  SETTINGS_SECTION_GROUP_ORDER,
  searchSettingEntries,
} from '@/components/pages/settings/_config/settingsPageConfig';
import type {
  SettingSearchEntry,
  SettingSection,
  SettingSectionGroup,
} from '@/components/pages/settings/_config/settingsPageConfig';
import { getSettingsTabOptions } from '@/components/pages/settings/_utils/settingsNavigation';
import { Bookmarks } from './Bookmarks';
import { OpenTabs } from './OpenTabs';
import { FileTree } from './FileTree';
import { Changes } from './Changes';

const DMS_APP_IDENTITY = getSsooAppIdentity('dms');

/**
 * Sidebar Props
 */
interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  variant?: 'workspace' | 'settings';
}

/**
 * DMS 사이드바 (PMS 표준 적용)
 * - 로고: S 아이콘 + SSOT Document 텍스트
 * - 공통 접기/펼치기 토글
 * - 검색 + 새로고침
 * - 책갈피 / 현재 열린 페이지 / 전체 파일
 * - 하단 카피라이트
 */
export function Sidebar({ isCollapsed, onToggleCollapse, variant = 'workspace' }: SidebarProps) {
  if (variant === 'settings') {
    return (
      <SettingsSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
      />
    );
  }

  return (
    <WorkspaceSidebar
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
    />
  );
}

function WorkspaceSidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const {
    expandedSections,
    isFileTreeOpen,
    fileTreeOwnerUserId,
    fileTreeResetEpoch,
    searchOwnerUserId,
    searchQuery,
    toggleSection,
    setSearchQuery,
    clearSearch,
  } = useSidebarStore();
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
      await refreshFileTree({ forceSync: true });
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };
  const scopedSearchQuery = currentUserId && searchOwnerUserId === currentUserId ? searchQuery : '';

  return (
    <SsooSidebarSurface
      expanded={!isCollapsed}
      onToggleCollapse={onToggleCollapse}
      toggleIcon={Menu}
      brandTitle={DMS_APP_IDENTITY.brandTitle}
      search={{
        value: scopedSearchQuery,
        disabled: !canReadDocuments,
        onChange: (value) => {
          if (!value) {
            clearSearch();
            return;
          }
          setSearchQuery(value);
        },
        onClear: clearSearch,
        railIcon: SearchIcon,
        railDisabled: !canReadDocuments,
        onRailSelect: () => {
          if (isCollapsed) {
            onToggleCollapse();
          }
        },
        clearLabel: '검색어 지우기',
        clearIcon: X,
      }}
      refreshAction={{
        label: '새로고침',
        icon: RefreshCw,
        onClick: handleRefresh,
        disabled: isRefreshing || !canReadDocuments,
        loading: isRefreshing,
      }}
      expandedIcon={ChevronDown}
      collapsedIcon={ChevronRight}
      sections={[
        {
          id: 'bookmarks',
          title: '책갈피',
          icon: Bookmark,
          expanded: expandedSections.includes('bookmarks'),
          onToggle: () => toggleSection('bookmarks'),
          children: <Bookmarks />,
        },
        {
          id: 'openTabs',
          title: '현재 열린 페이지',
          icon: Layers,
          expanded: expandedSections.includes('openTabs'),
          onToggle: () => toggleSection('openTabs'),
          children: <OpenTabs />,
        },
        {
          id: 'fileTree',
          title: '전체 파일',
          icon: FolderTree,
          hidden: !canReadDocuments,
          expanded: isFileTreeExpanded,
          onToggle: () => toggleSection('fileTree'),
          children: <FileTree key={`file-tree-${currentUserId ?? 'anonymous'}-${fileTreeResetEpoch}`} />,
        },
        {
          id: 'changes',
          title: `publish 복구 (${failureCount})`,
          icon: GitBranch,
          hidden: !(gitAvailable && canUseGit && failureCount > 0),
          expanded: expandedSections.includes('changes'),
          onToggle: () => toggleSection('changes'),
          children: <Changes />,
        },
      ]}
    />
  );
}

type SettingsSidebarNode =
  | {
      type: 'group';
      id: SettingSectionGroup;
      label: string;
      icon: LucideIcon;
      children: SettingsSidebarNode[];
    }
  | {
      type: 'section';
      id: string;
      section: SettingSection;
    };

const SETTINGS_GROUP_ICON_MAP = {
  operations: GitBranch,
  system: Shield,
  management: FolderTree,
  personal: SlidersHorizontal,
  external: ExternalLink,
} satisfies Record<SettingSectionGroup, LucideIcon>;

const SETTINGS_RUNTIME_SECTION_IDS = new Set(['git', 'storage', 'ingest', 'templates-runtime']);

function SettingsSidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const access = useSettingsStore((state) => state.access);
  const isSettingsLoading = useSettingsStore((state) => state.isLoading);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const activeScope = useSettingsPageNavigationStore((state) => state.activeScope);
  const activeSectionId = useSettingsPageNavigationStore((state) => state.activeSectionId);
  const exitSettings = useSettingsPageNavigationStore((state) => state.exitSettings);
  const openSection = useSettingsPageNavigationStore((state) => state.openSection);
  const activateTab = useTabStore((state) => state.activateTab);
  const openSettingsTab = useOpenTabWithConfirm();
  const [settingsSearchQuery, setSettingsSearchQuery] = useState('');
  const [settingsMenuExpanded, setSettingsMenuExpanded] = useState(true);
  const [settingsSearchExpanded, setSettingsSearchExpanded] = useState(true);
  const [expandedSettingsGroups, setExpandedSettingsGroups] = useState<Set<SettingSectionGroup>>(() => (
    new Set(SETTINGS_SECTION_GROUP_ORDER)
  ));

  const canManageSystemSettings = Boolean(access?.canManageSystem ?? false);
  const canManagePersonalSettings = Boolean(access?.canManagePersonal ?? true);
  const canUseDocumentAccessCenter = Boolean(
    accessSnapshot?.features.canReadDocuments || accessSnapshot?.features.canUseSearch
  );
  const canOpenSettingsSection = useCallback((section: SettingSection) => {
    if (section.scope === 'personal') {
      return canManagePersonalSettings;
    }
    if (section.id === 'documentAccess') {
      return canManageSystemSettings || canUseDocumentAccessCenter;
    }
    return canManageSystemSettings;
  }, [canManagePersonalSettings, canManageSystemSettings, canUseDocumentAccessCenter]);
  const settingsMenuTree = useMemo<SettingsSidebarNode[]>(() => {
    return SETTINGS_SECTION_GROUP_ORDER.flatMap<SettingsSidebarNode>((group) => {
      const children = SETTING_SECTIONS
        .filter((section) => section.group === group && canOpenSettingsSection(section))
        .map<SettingsSidebarNode>((section) => ({
          type: 'section',
          id: `${section.scope}:${section.id}`,
          section,
        }));

      if (children.length === 0) {
        return [];
      }

      return [{
        type: 'group',
        id: group,
        label: SETTINGS_SECTION_GROUP_LABELS[group],
        icon: SETTINGS_GROUP_ICON_MAP[group],
        children,
      }];
    });
  }, [canOpenSettingsSection]);
  const settingsSearchResults = useMemo(() => {
    return searchSettingEntries(settingsSearchQuery)
      .filter((result) => {
        const section = SETTING_SECTIONS.find((candidate) => (
          candidate.scope === result.scope && candidate.id === result.sectionId
        ));

        if (!section) {
          return false;
        }

        return canOpenSettingsSection(section);
      })
      .slice(0, 8);
  }, [canOpenSettingsSection, settingsSearchQuery]);
  const showSettingsSearchResults = settingsSearchQuery.trim().length > 0;

  useEffect(() => {
    if (showSettingsSearchResults) {
      setSettingsSearchExpanded(true);
    }
  }, [showSettingsSearchResults]);

  const handleRefreshSettings = async () => {
    const includeRuntime = activeScope === 'system'
      && canManageSystemSettings
      && SETTINGS_RUNTIME_SECTION_IDS.has(activeSectionId);
    await loadSettings(includeRuntime);
  };

  const handleOpenSettingsSection = (scope: SettingSection['scope'], sectionId: string) => {
    openSection(scope, sectionId);
    void openSettingsTab(getSettingsTabOptions(scope, sectionId));
    setSettingsSearchQuery('');
  };

  const handleExitSettings = () => {
    exitSettings();
    activateTab(HOME_TAB.id);
  };

  const handleSelectSearchResult = (result: SettingSearchEntry) => {
    handleOpenSettingsSection(result.scope, result.sectionId);
  };

  const handleSelectSettingsNode = (node: SettingsSidebarNode) => {
    if (node.type === 'group') {
      setExpandedSettingsGroups((current) => {
        const next = new Set(current);
        if (next.has(node.id)) {
          next.delete(node.id);
        } else {
          next.add(node.id);
        }
        return next;
      });
      return;
    }

    handleOpenSettingsSection(node.section.scope, node.section.id);
  };

  const isSettingsNodeActive = (node: SettingsSidebarNode) => {
    return node.type === 'section'
      && node.section.scope === activeScope
      && node.section.id === activeSectionId;
  };

  const getSettingsNodeLabel = (node: SettingsSidebarNode) => {
    return node.type === 'group' ? node.label : node.section.label;
  };

  const getSettingsNodeIcon = (node: SettingsSidebarNode): LucideIcon => {
    return node.type === 'group' ? node.icon : (node.section.icon as LucideIcon);
  };

  const getSettingsNodeTitle = (node: SettingsSidebarNode) => {
    return node.type === 'section' ? node.section.description : undefined;
  };

  const getSettingsNodeChildren = (node: SettingsSidebarNode) => {
    return node.type === 'group' ? node.children : undefined;
  };

  const isSettingsNodeFolder = (node: SettingsSidebarNode) => {
    return node.type === 'group';
  };

  const isSettingsNodeExpanded = (node: SettingsSidebarNode) => {
    return node.type === 'group' && expandedSettingsGroups.has(node.id);
  };

  const getSettingsNodeStatusLabel = (node: SettingsSidebarNode) => {
    return node.type === 'section' && isSettingsNodeActive(node) ? '열림' : null;
  };

  const settingsSidebarSections = createSsooSettingsSidebarSections<SettingSearchEntry, SettingsSidebarNode>({
    showSearchResults: showSettingsSearchResults,
    searchSection: {
      id: 'settings-search-results',
      title: '검색 결과',
      icon: SearchIcon,
      expanded: settingsSearchExpanded,
      onToggle: () => setSettingsSearchExpanded((expanded) => !expanded),
      emptyText: '일치하는 설정이 없습니다.',
    },
    menuSection: {
      id: 'settings-menu',
      title: '설정 메뉴',
      icon: Shield,
      expanded: settingsMenuExpanded,
      onToggle: () => setSettingsMenuExpanded((expanded) => !expanded),
      emptyText: '사용 가능한 설정 메뉴가 없습니다.',
    },
    searchResults: settingsSearchResults,
    menuNodes: settingsMenuTree,
    disclosureIcon: ChevronRight,
    getSearchEntryId: (result) => result.id,
    getSearchEntryTitle: (result) => result.title,
    getSearchEntrySubtitle: (result) => result.subtitle,
    getSearchEntryKindLabel: (result) => (result.kind === 'section' ? '섹션' : '필드'),
    getSearchEntryKindTone: (result) => (result.kind === 'section' ? 'primary' : 'muted'),
    isSearchEntryActive: (result) => result.scope === activeScope && result.sectionId === activeSectionId,
    onSearchEntrySelect: handleSelectSearchResult,
    getMenuNodeId: (node) => node.type === 'group' ? `group:${node.id}` : node.id,
    getMenuNodeLabel: getSettingsNodeLabel,
    getMenuNodeTitle: getSettingsNodeTitle,
    getMenuNodeChildren: getSettingsNodeChildren,
    getMenuNodeIcon: getSettingsNodeIcon,
    isMenuNodeFolder: isSettingsNodeFolder,
    isMenuNodeExpanded: isSettingsNodeExpanded,
    isMenuNodeActive: isSettingsNodeActive,
    getMenuNodeStatusLabel: getSettingsNodeStatusLabel,
    getMenuNodeStatusTone: () => 'primary',
    onMenuNodeSelect: handleSelectSettingsNode,
  });

  return (
    <SsooSidebarSurface
      expanded={!isCollapsed}
      onToggleCollapse={onToggleCollapse}
      toggleIcon={Menu}
      brandTitle="설정"
      brandAction={{
        label: '설정 닫기',
        icon: ArrowLeft,
        onClick: handleExitSettings,
      }}
      search={{
        value: settingsSearchQuery,
        onChange: setSettingsSearchQuery,
        onClear: () => setSettingsSearchQuery(''),
        railIcon: SearchIcon,
        onRailSelect: () => {
          if (isCollapsed) {
            onToggleCollapse();
          }
        },
        clearLabel: '검색어 지우기',
        clearIcon: X,
      }}
      refreshAction={{
        label: '설정 새로고침',
        icon: RefreshCw,
        onClick: () => {
          void handleRefreshSettings();
        },
        disabled: isSettingsLoading,
        loading: isSettingsLoading,
      }}
      expandedIcon={ChevronDown}
      collapsedIcon={ChevronRight}
      sections={settingsSidebarSections}
    />
  );
}
