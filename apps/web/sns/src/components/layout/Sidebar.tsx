'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  getSsooAppIdentity,
  SsooSidebarEmptyState,
  SsooSidebarSearchableTree,
  SsooSidebarSurface,
} from '@ssoo/web-shell';
import { ChevronDown, ChevronRight, LayoutGrid, Menu, RefreshCw, Search, X } from 'lucide-react';
import { useAccessStore, useTabStore } from '@/stores';
import { SNS_SHELL_NAV_ITEMS, getSnsShellSection, getSnsShellTabOptions } from './shell-navigation';

const SNS_APP_IDENTITY = getSsooAppIdentity('sns');

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  toggleLabel?: string;
}

export function Sidebar({ isCollapsed, onToggleCollapse, toggleLabel }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const openTab = useTabStore((state) => state.openTab);
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const currentSection = getSnsShellSection(activeTab?.path ?? '/');
  const canReadFeed = useAccessStore((state) => state.snapshot?.features.canReadFeed ?? false);
  const [isSocialSectionExpanded, setIsSocialSectionExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <SsooSidebarSurface
      expanded={!isCollapsed}
      onToggleCollapse={onToggleCollapse}
      toggleIcon={Menu}
      toggleLabel={toggleLabel}
      brandTitle={SNS_APP_IDENTITY.brandTitle}
      search={{
        inputId: 'ssoo-sns-navigation-search-input',
        inputName: 'ssoo-sns-navigation-search-query',
        ariaLabel: 'SNS 메뉴 검색',
        value: searchQuery,
        onChange: setSearchQuery,
        railIcon: Search,
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
        onClick: () => router.refresh(),
      }}
      expandedIcon={ChevronDown}
      collapsedIcon={ChevronRight}
      sections={[
        {
          id: 'social',
          title: '소셜 메뉴',
          icon: LayoutGrid,
          expanded: isSocialSectionExpanded,
          onToggle: () => setIsSocialSectionExpanded((current) => !current),
          children: (
            <SsooSidebarSearchableTree<(typeof SNS_SHELL_NAV_ITEMS)[number]>
              nodes={SNS_SHELL_NAV_ITEMS}
              getNodeId={(item) => item.key}
              getNodeLabel={(item) => item.label}
              getNodeTitle={(item) => item.label}
              getNodeSearchText={(item) => [item.label, item.description]}
              getNodeIcon={(item) => item.icon}
              isNodeActive={(item) => currentSection === item.key}
              isNodeDisabled={(item) => Boolean(item.requiresFeedAccess && !canReadFeed)}
              onNodeSelect={(item) => {
                const opened = openTab(getSnsShellTabOptions(item.href));
                if (opened && pathname.startsWith('/post/')) router.push(item.href);
              }}
              disclosureIcon={ChevronRight}
              emptyState={<SsooSidebarEmptyState>검색 결과가 없습니다.</SsooSidebarEmptyState>}
            />
          ),
        },
      ]}
    />
  );
}
