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
  Menu,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import { ADMIN_NAV_GROUPS, PERSONAL_NAV_ITEMS, getAdminNavItem, getAdminTabOptions, type AdminNavItem } from './navigation';
import { usePlatformAccess } from '@ssoo/web-auth';
import { useTabStore } from '@/stores/tab.store';

const ADMIN_APP_IDENTITY = getSsooAppIdentity('admin');

interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  toggleLabel?: string;
  onNavigate?: () => void;
}

export function AdminSidebar({
  isCollapsed,
  onToggleCollapse,
  toggleLabel,
  onNavigate,
}: AdminSidebarProps) {
  const access = usePlatformAccess();
  const canManage = access?.snapshot.isPlatformAdmin === true && access.snapshot.status === 'active';
  const canReview = access?.snapshot.canReview === true;
  const router = useRouter();
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const openTab = useTabStore((state) => state.openTab);
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const renderTree = (nodes: AdminNavItem[]) => (
    <SsooSidebarSearchableTree<AdminNavItem>
      nodes={nodes} getNodeId={(item) => item.href} getNodeLabel={(item) => item.label}
      getNodeTitle={(item) => item.description ?? item.label} getNodeSearchText={(item) => `${item.label} ${item.keywords ?? ''}`} getNodeIcon={(item) => item.icon}
      isNodeActive={(item) => Boolean(activeTab && getAdminNavItem(activeTab.path).href === item.href)}
      onNodeSelect={(item) => { if (openTab(getAdminTabOptions(item.href))) onNavigate?.(); }}
      disclosureIcon={ChevronRight}
      emptyState={<SsooSidebarEmptyState>검색 결과가 없습니다.</SsooSidebarEmptyState>}
    />
  );

  const groups = [
    ...(canManage ? ADMIN_NAV_GROUPS : []),
    { id: 'personal', title: '내 업무', icon: Menu, items: PERSONAL_NAV_ITEMS.filter(item => item.href !== '/approvals' || (!canManage && canReview)) },
  ];
  const query = searchQuery.trim().toLocaleLowerCase();
  const visibleGroups = groups.filter(group => !query || group.items.some(item => `${item.label} ${item.keywords ?? ''}`.toLocaleLowerCase().includes(query)));

  return (
    <SsooSidebarSurface
      expanded={!isCollapsed}
      onToggleCollapse={onToggleCollapse}
      toggleIcon={Menu}
      toggleLabel={toggleLabel}
      brandTitle={ADMIN_APP_IDENTITY.brandTitle}
      search={{
        inputId: 'ssoo-admin-navigation-search-input',
        inputName: 'ssoo-admin-navigation-search-query',
        ariaLabel: 'Admin 메뉴 검색',
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
      sections={[...(visibleGroups.length ? visibleGroups.map(group => ({
        id: group.id, title: group.title, icon: group.icon,
        expanded: Boolean(query) || !collapsedGroups.includes(group.id),
        onToggle: () => setCollapsedGroups(current => current.includes(group.id) ? current.filter(id => id !== group.id) : [...current, group.id]),
        children: renderTree(group.items),
      })) : [{ id: 'empty', title: '메뉴 검색', icon: Search, expanded: true, children: <SsooSidebarEmptyState>검색 결과가 없습니다.</SsooSidebarEmptyState> }])]}
    />
  );
}
