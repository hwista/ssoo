'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  getSsooAppIdentity,
  SsooSidebarEmptyState,
  SsooSidebarSearchableTree,
  SsooSidebarSurface,
  SsooSidebarTreeStatusBadge,
  SsooWorkbenchShell,
} from '@ssoo/web-shell';
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  FileText,
  FolderTree,
  Handshake,
  Layers,
  Menu,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Star,
  X,
} from 'lucide-react';
import { CRM_HOME_TAB, useTabStore } from '@/stores/tab.store';
import { TabBar } from './TabBar';
import { ContentArea } from './ContentArea';
import { Header } from './Header';

const CRM_APP_IDENTITY = getSsooAppIdentity('crm');

const menuItems = [
  { label: '영업기회', path: '/', icon: BarChart3, hasChildren: false, disabled: false },
  { label: '견적', icon: FileText, active: false, hasChildren: true, disabled: true },
  { label: '계약 원장', icon: CircleDollarSign, active: false, hasChildren: true, disabled: true },
  { label: 'PMS 인계', icon: Handshake, active: false, hasChildren: true, disabled: true },
  { label: '공용 Admin', icon: ShieldCheck, active: false, hasChildren: false, disabled: true },
  { label: '설정', icon: Settings, active: false, hasChildren: false, disabled: true },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setIsSidebarCollapsed((current) => !current);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openTab = useTabStore((state) => state.openTab);
  const currentPath = useMemo(() => {
    const search = searchParams.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    openTab({
      id: CRM_HOME_TAB.id,
      title: CRM_HOME_TAB.title,
      path: currentPath || CRM_HOME_TAB.path,
      closable: false,
    });
  }, [currentPath, openTab]);

  void children;

  return (
    <SsooWorkbenchShell
      sidebarMode="collapsible"
      sidebarExpanded={!isSidebarCollapsed}
      sidebarSlot={
        <CrmSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      }
      headerSlot={<Header />}
      tabBarSlot={<TabBar />}
      contentSlot={<ContentArea />}
    />
  );
}

function CrmSidebar({
  isCollapsed,
  onToggleCollapse,
}: {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const router = useRouter();
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const openTab = useTabStore((state) => state.openTab);
  const activateTab = useTabStore((state) => state.activateTab);
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    favorites: true,
    openTabs: false,
    menuTree: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((current) => ({ ...current, [section]: !current[section] }));
  };

  return (
    <SsooSidebarSurface
      expanded={!isCollapsed}
      onToggleCollapse={onToggleCollapse}
      toggleIcon={Menu}
      brandTitle={CRM_APP_IDENTITY.brandTitle}
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
          id: 'favorites',
          title: '즐겨찾기',
          icon: Star,
          expanded: expandedSections.favorites,
          onToggle: () => toggleSection('favorites'),
          children: <SsooSidebarEmptyState>즐겨찾기한 메뉴가 없습니다.</SsooSidebarEmptyState>,
        },
        {
          id: 'openTabs',
          title: '현재 열린 페이지',
          icon: Layers,
          expanded: expandedSections.openTabs,
          onToggle: () => toggleSection('openTabs'),
          children: tabs.filter((tab) => tab.id !== CRM_HOME_TAB.id).length > 0 ? (
            <SsooSidebarSearchableTree<(typeof tabs)[number]>
              nodes={tabs.filter((tab) => tab.id !== CRM_HOME_TAB.id)}
              getNodeId={(tab) => tab.id}
              getNodeLabel={(tab) => tab.title}
              getNodeTitle={(tab) => tab.title}
              getNodeSearchText={(tab) => [tab.title, tab.path]}
              getNodeIcon={() => BarChart3}
              isNodeActive={(tab) => tab.id === activeTabId}
              onNodeSelect={(tab) => activateTab(tab.id)}
              disclosureIcon={ChevronRight}
              emptyState={<SsooSidebarEmptyState>열린 페이지가 없습니다.</SsooSidebarEmptyState>}
            />
          ) : (
            <SsooSidebarEmptyState>열린 페이지가 없습니다.</SsooSidebarEmptyState>
          ),
        },
        {
          id: 'menuTree',
          title: '전체 메뉴',
          icon: FolderTree,
          expanded: expandedSections.menuTree,
          onToggle: () => toggleSection('menuTree'),
          children: (
            <SsooSidebarSearchableTree<(typeof menuItems)[number]>
              nodes={menuItems}
              getNodeId={(item) => item.label}
              getNodeLabel={(item) => item.label}
              getNodeTitle={(item) => item.label}
              getNodeSearchText={(item) => item.label}
              isNodeFolder={(item) => item.hasChildren}
              isNodeActive={(item) => Boolean('path' in item && activeTab?.path.split('?')[0] === item.path)}
              isNodeDisabled={(item) => item.disabled}
              getNodeIcon={(item) => item.icon}
              renderNodeTrailingAction={(item) => (
                item.disabled ? <SsooSidebarTreeStatusBadge>준비 중</SsooSidebarTreeStatusBadge> : null
              )}
              onNodeSelect={(item) => {
                if ('path' in item && item.path) {
                  openTab({
                    id: item.path === CRM_HOME_TAB.path ? CRM_HOME_TAB.id : item.path,
                    title: item.path === CRM_HOME_TAB.path ? CRM_HOME_TAB.title : item.label,
                    path: item.path,
                    closable: item.path !== CRM_HOME_TAB.path,
                  });
                }
              }}
              disclosureIcon={ChevronRight}
              emptyState={<SsooSidebarEmptyState>메뉴가 없습니다.</SsooSidebarEmptyState>}
            />
          ),
        },
      ]}
    />
  );
}
