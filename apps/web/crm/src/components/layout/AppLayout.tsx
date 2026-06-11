'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AuthUserMenu,
  useSharedLogout,
} from '@ssoo/web-auth';
import {
  SsooHeader,
  SsooHeaderActionButton,
  SsooHeaderIconButton,
  SsooHeaderSearchBox,
  SsooCollapsedRailButton,
  SsooSidebarBrandHeader,
  SsooSidebarEmptyState,
  SsooSidebarFooter,
  SsooSidebarSearchBox,
  SsooSidebarSection,
  SsooSidebarSectionChevron,
  SsooSidebarShell,
  SsooSidebarToolbar,
  SsooSidebarToolbarAction,
  SsooSidebarTree,
  SsooTabBarHomeButton,
  SsooTabBarShell,
  SsooWorkbenchShell,
} from '@ssoo/web-shell';
import {
  BarChart3,
  BellOff,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  FileText,
  FolderTree,
  Handshake,
  Home,
  Layers,
  Menu,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { LOGIN_PATH } from '@/lib/constants/routes';
import { useAuthStore } from '@/stores/auth.store';

const SIDEBAR_WIDTH = 340;
const SIDEBAR_COLLAPSED_WIDTH = 56;

const menuItems = [
  { label: '영업기회', icon: BarChart3, active: true, hasChildren: false, disabled: false },
  { label: '견적', icon: FileText, active: false, hasChildren: true, disabled: true },
  { label: '계약 원장', icon: CircleDollarSign, active: false, hasChildren: true, disabled: true },
  { label: 'PMS 인계', icon: Handshake, active: false, hasChildren: true, disabled: true },
  { label: '공용 Admin', icon: ShieldCheck, active: false, hasChildren: false, disabled: true },
  { label: '설정', icon: Settings, active: false, hasChildren: false, disabled: true },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setIsSidebarCollapsed((current) => !current);

  return (
    <SsooWorkbenchShell
      sidebarMode="collapsible"
      sidebarExpanded={!isSidebarCollapsed}
      sidebarWidth={SIDEBAR_WIDTH}
      collapsedSidebarWidth={SIDEBAR_COLLAPSED_WIDTH}
      sidebarSlot={
        <CrmSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      }
      headerSlot={<CrmHeader />}
      tabBarSlot={<CrmTabBar />}
      className="bg-gray-50"
    >
      {children}
    </SsooWorkbenchShell>
  );
}

function CrmSidebar({
  isCollapsed,
  onToggleCollapse,
}: {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <SsooSidebarShell
      mode="collapsible"
      expanded={!isCollapsed}
      width={SIDEBAR_WIDTH}
      collapsedWidth={SIDEBAR_COLLAPSED_WIDTH}
      headerSlot={<CrmSidebarHeader isCollapsed={isCollapsed} onToggleCollapse={onToggleCollapse} />}
      railSlot={<CrmSidebarRail />}
      beforeContentSlot={<CrmSidebarSearch />}
      contentSlot={<CrmSidebarContent />}
      footerSlot={<CrmSidebarFooter isCollapsed={isCollapsed} />}
    />
  );
}

function CrmSidebarHeader({
  isCollapsed,
  onToggleCollapse,
}: {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <SsooSidebarBrandHeader
      title="SSOT"
      subtitle="CRM · 영업 허브"
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
  );
}

function CrmSidebarRail() {
  return (
    <nav className="flex flex-col items-center gap-1 py-2">
      {menuItems.map((item) => (
        <SsooCollapsedRailButton
          key={item.label}
          label={item.label}
          icon={item.icon}
          active={item.active}
          disabled={item.disabled}
        />
      ))}
    </nav>
  );
}

function CrmSidebarSearch() {
  return (
    <SsooSidebarToolbar>
      <div className="flex items-center gap-1">
        <SsooSidebarSearchBox
          placeholder="메뉴 검색... (준비 중)"
          disabled
          iconSlot={<Search className="h-4 w-4 text-gray-400" />}
        />
        <SsooSidebarToolbarAction
          label="메뉴 새로고침은 메뉴 API 연결 후 활성화됩니다."
          icon={RefreshCw}
          disabled
        />
      </div>
    </SsooSidebarToolbar>
  );
}

function CrmSidebarContent() {
  const [expandedSections, setExpandedSections] = useState({
    favorites: true,
    openTabs: false,
    menuTree: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((current) => ({ ...current, [section]: !current[section] }));
  };

  return (
    <nav className="min-h-0 flex-1 overflow-auto">
      <SsooSidebarSection
        title="즐겨찾기"
        icon={Star}
        collapsible
        expanded={expandedSections.favorites}
        onToggle={() => toggleSection('favorites')}
        actionSlot={<SsooSidebarSectionChevron expanded={expandedSections.favorites} expandedIcon={ChevronDown} collapsedIcon={ChevronRight} />}
      >
        <SsooSidebarEmptyState>즐겨찾기한 메뉴가 없습니다.</SsooSidebarEmptyState>
      </SsooSidebarSection>

      <SsooSidebarSection
        title="현재 열린 페이지"
        icon={Layers}
        collapsible
        expanded={expandedSections.openTabs}
        onToggle={() => toggleSection('openTabs')}
        actionSlot={<SsooSidebarSectionChevron expanded={expandedSections.openTabs} expandedIcon={ChevronDown} collapsedIcon={ChevronRight} />}
      >
        <SsooSidebarEmptyState>열린 페이지가 없습니다.</SsooSidebarEmptyState>
      </SsooSidebarSection>

      <SsooSidebarSection
        title="전체 메뉴"
        icon={FolderTree}
        collapsible
        expanded={expandedSections.menuTree}
        onToggle={() => toggleSection('menuTree')}
        actionSlot={<SsooSidebarSectionChevron expanded={expandedSections.menuTree} expandedIcon={ChevronDown} collapsedIcon={ChevronRight} />}
      >
        <SsooSidebarTree<(typeof menuItems)[number]>
          nodes={menuItems}
          getNodeId={(item) => item.label}
          getNodeLabel={(item) => item.label}
          getNodeTitle={(item) => item.label}
          isNodeFolder={(item) => item.hasChildren}
          isNodeActive={(item) => item.active}
          isNodeDisabled={(item) => item.disabled}
          getNodeIcon={(item) => item.icon}
          renderNodeTrailingAction={(item) => (
            item.disabled ? <span className="text-[10px] text-gray-400">준비 중</span> : null
          )}
          disclosureIcon={ChevronRight}
        />
      </SsooSidebarSection>
    </nav>
  );
}

function CrmSidebarFooter({ isCollapsed }: { isCollapsed: boolean }) {
  return <SsooSidebarFooter collapsed={isCollapsed} revealOnHover={isCollapsed} />;
}

function CrmHeader() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const handleLogout = useSharedLogout({
    authStore: useAuthStore,
    navigate: (path) => router.replace(path),
    loginPath: LOGIN_PATH,
  });

  return (
    <SsooHeader
      mode="primary"
      searchSlot={
        <SsooHeaderSearchBox
          placeholder="영업 검색... (준비 중)"
          disabled
          iconSlot={<Search className="h-4 w-4 text-white/50" />}
        />
      }
      actionsSlot={
        <>
          <SsooHeaderActionButton
            onClick={() => router.refresh()}
            tone="primary-on-color"
            title="인증된 CRM 영업기회 목록을 다시 조회합니다."
          >
            <RefreshCw className="h-4 w-4" />
            <span>목록 새로고침</span>
          </SsooHeaderActionButton>
          <SsooHeaderIconButton disabled tone="disabled-on-color" title="CRM 알림은 아직 연결되지 않았습니다.">
            <BellOff className="h-5 w-5 text-white" />
          </SsooHeaderIconButton>
          <AuthUserMenu
            user={user}
            onLogout={handleLogout}
            accountCenter={{ snsAppUrl: process.env.NEXT_PUBLIC_SNS_APP_URL }}
          />
        </>
      }
    />
  );
}

function CrmTabBar() {
  return (
    <SsooTabBarShell mode="static">
      <SsooTabBarHomeButton active>
        <Home className="h-5 w-5 text-ssoo-primary" />
      </SsooTabBarHomeButton>
    </SsooTabBarShell>
  );
}
