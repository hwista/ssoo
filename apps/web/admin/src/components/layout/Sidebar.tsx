'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getSsooAppIdentity,
  SsooSidebarEmptyState,
  SsooSidebarSearchableTree,
  SsooSidebarSurface,
} from '@ssoo/web-shell';
import {
  Shield,
  Menu,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import { ADMIN_NAV_ITEMS, getAdminTabOptions } from './navigation';
import { useTabStore } from '@/stores/tab.store';

const ADMIN_APP_IDENTITY = getSsooAppIdentity('admin');

interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function AdminSidebar({
  isCollapsed,
  onToggleCollapse,
}: AdminSidebarProps) {
  const router = useRouter();
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const openTab = useTabStore((state) => state.openTab);
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const [isPlatformSectionExpanded, setIsPlatformSectionExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <SsooSidebarSurface
      expanded={!isCollapsed}
      onToggleCollapse={onToggleCollapse}
      toggleIcon={Menu}
      brandTitle={ADMIN_APP_IDENTITY.brandTitle}
      search={{
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
          id: 'platform',
          title: '플랫폼 관리',
          icon: Shield,
          expanded: isPlatformSectionExpanded,
          onToggle: () => setIsPlatformSectionExpanded((current) => !current),
          children: (
            <SsooSidebarSearchableTree<(typeof ADMIN_NAV_ITEMS)[number]>
              nodes={ADMIN_NAV_ITEMS}
              getNodeId={(item) => item.href}
              getNodeLabel={(item) => item.label}
              getNodeTitle={(item) => item.label}
              getNodeSearchText={(item) => item.label}
              getNodeIcon={(item) => item.icon}
              isNodeActive={(item) => {
                const activePath = activeTab?.path.split('?')[0] ?? '/';
                return item.href === '/' ? activePath === '/' : activePath === item.href || activePath.startsWith(`${item.href}/`);
              }}
              onNodeSelect={(item) => {
                openTab(getAdminTabOptions(item.href));
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
