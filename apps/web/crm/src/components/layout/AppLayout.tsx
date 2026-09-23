'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  getSsooUserSurfaceTabId,
  parseSsooUserSurfaceRouteEntry,
} from '@ssoo/web-auth';
import {
  getSsooAppIdentity,
  SsooSidebarEmptyState,
  SsooSidebarSearchableTree,
  SsooSidebarSurface,
  SsooSidebarTreeStatusBadge,
  SsooMobileSidebarOverlay,
  SsooWorkbenchShell,
  useSsooMobileViewport,
} from '@ssoo/web-shell';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ssoo/web-ui';
import {
  BarChart3,
  Calculator,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileText,
  FilePlus2,
  FolderTree,
  Handshake,
  Layers,
  LineChart,
  List,
  Menu,
  PieChart,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  ShieldCheck,
  Star,
  UsersRound,
  X,
} from 'lucide-react';
import { CRM_HOME_TAB, useTabStore } from '@/stores/tab.store';
import { useAuthStore } from '@/stores/auth.store';
import { getCrmWorkspaceTabOptions, isCrmMenuPathActive, isCrmSystemSettingsPath } from '@/lib/crmWorkspaceRoutes';
import { TabBar } from './TabBar';
import { ContentArea } from './ContentArea';
import { Header } from './Header';

const CRM_APP_IDENTITY = getSsooAppIdentity('crm');

const menuItems = [
  { label: '대시보드', path: '/?sourceSurface=dashboard', icon: BarChart3, hasChildren: false, disabled: false },
  { label: '영업기회 현황', path: '/?sourceSurface=list', icon: List, hasChildren: false, disabled: false },
  { label: '영업기회 등록', path: '/?sourceSurface=form&create=opportunity', icon: FilePlus2, hasChildren: false, disabled: false },
  { label: '계약서 생성', path: '/?sourceSurface=contract-document', icon: FileText, hasChildren: false, disabled: false },
  { label: '영업기회 작업공간', path: '/', icon: Layers, hasChildren: false, disabled: false },
  { label: '고객/활동', path: '/customers', icon: UsersRound, hasChildren: false, disabled: false },
  { label: '회사 정보', path: '/quote-settings?mode=source-compatible', icon: FolderTree, hasChildren: false, disabled: false },
  { label: '견적 설정', path: '/quote-settings', icon: FileText, hasChildren: false, disabled: false },
  { label: '계약현황', path: '/contracts?sourceSurface=list', icon: List, hasChildren: false, disabled: false },
  { label: '계약등록', path: '/contracts?sourceSurface=form&create=contract', icon: FilePlus2, hasChildren: false, disabled: false },
  { label: '계약청구실적', path: '/contracts?sourceSurface=billing-actual', icon: CircleDollarSign, hasChildren: false, disabled: false },
  { label: '계약 원장', path: '/contracts', icon: CircleDollarSign, hasChildren: false, disabled: false },
  { label: '계약대비실적(월별)', path: '/contract-performance?mode=source-compatible', icon: BarChart3, hasChildren: false, disabled: false },
  { label: '계약대비실적', path: '/contract-performance', icon: BarChart3, hasChildren: false, disabled: false },
  { label: '보고 Preview', path: '/reports', icon: PieChart, hasChildren: false, disabled: false },
  { label: '사업계획 등록', path: '/business-plan?mode=source-compatible', icon: ClipboardList, hasChildren: false, disabled: false },
  { label: '사업계획 Preview', path: '/business-plan', icon: ClipboardList, hasChildren: false, disabled: false },
  { label: '사업계획대비실적(월별)', path: '/business-plan-performance?mode=source-compatible', icon: LineChart, hasChildren: false, disabled: false },
  { label: '사업계획대비실적 Preview', path: '/business-plan-performance', icon: LineChart, hasChildren: false, disabled: false },
  { label: '내부원가 등록', path: '/cost-plan?sourceSurface=internal-cost', icon: Calculator, hasChildren: false, disabled: false },
  { label: '공급업체 관리', path: '/cost-plan?sourceSurface=ams-vendor', icon: UsersRound, hasChildren: false, disabled: false },
  { label: '연간 외부원가', path: '/cost-plan?sourceSurface=ams-cost', icon: Calculator, hasChildren: false, disabled: false },
  { label: '원가/AMS Preview', path: '/cost-plan', icon: Calculator, hasChildren: false, disabled: false },
  { label: '운영 기준·제어', path: '/operations', icon: SlidersHorizontal, hasChildren: false, disabled: false },
  { label: 'PMS 인계', icon: Handshake, active: false, hasChildren: true, disabled: true },
  { label: '공용 Admin', icon: ShieldCheck, active: false, hasChildren: false, disabled: true },
  { label: 'CRM 시스템 설정', path: '/operations/settings', icon: Settings, active: false, hasChildren: false, disabled: false },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobileViewport = useSsooMobileViewport();
  const toggleSidebar = () => setIsSidebarCollapsed((current) => !current);
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(() => setIsMobileMenuOpen((current) => !current), []);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openTab = useTabStore((state) => state.openTab);
  const [tabsHydrated, setTabsHydrated] = useState(false);
  const currentPath = useMemo(() => {
    const search = searchParams.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    const unsubscribe = useTabStore.persist.onFinishHydration(() => setTabsHydrated(true));
    if (useTabStore.persist.hasHydrated()) setTabsHydrated(true);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!tabsHydrated) return;
    const workspaceTab = getCrmWorkspaceTabOptions(currentPath);
    const userSurfaceRoute = parseSsooUserSurfaceRouteEntry(currentPath);
    const requestedTab = workspaceTab ?? (userSurfaceRoute ? {
      id: getSsooUserSurfaceTabId(userSurfaceRoute.kind, userSurfaceRoute.userId),
      title: userSurfaceRoute.title,
      path: userSurfaceRoute.path,
      closable: true,
    } : CRM_HOME_TAB);

    if (!openTab(requestedTab)) {
      // Direct navigation may already have changed the URL; keep the mounted draft and repair it.
      const { tabs, activeTabId } = useTabStore.getState();
      const activeTab = tabs.find((tab) => tab.id === activeTabId);
      router.replace(activeTab?.path ?? CRM_HOME_TAB.path, { scroll: false });
    }
  }, [currentPath, openTab, router, tabsHydrated]);

  useEffect(() => {
    if (!isMobileViewport && isMobileMenuOpen) {
      closeMobileMenu();
    }
  }, [closeMobileMenu, isMobileMenuOpen, isMobileViewport]);

  void children;

  return (
    <>
      <SsooWorkbenchShell
        sidebarMode={isMobileViewport ? 'none' : 'collapsible'}
        sidebarExpanded={!isSidebarCollapsed}
        sidebarSlot={isMobileViewport ? (isMobileMenuOpen ? (
          <SsooMobileSidebarOverlay
            id="crm-mobile-sidebar"
            label="CRM 모바일 메뉴"
            onDismiss={closeMobileMenu}
          >
            <CrmSidebar
              isCollapsed={false}
              onToggleCollapse={closeMobileMenu}
              toggleLabel="모바일 메뉴 닫기"
            />
          </SsooMobileSidebarOverlay>
        ) : null) : (
          <CrmSidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebar}
          />
        )}
        headerSlot={isMobileViewport ? (
          <Header
            mobile
            mobileMenuOpen={isMobileMenuOpen}
            onMobileMenuClick={toggleMobileMenu}
          />
        ) : <Header />}
        tabBarSlot={<TabBar />}
        contentSlot={<ContentArea />}
      />
      <TabLimitDialog />
    </>
  );
}

function TabLimitDialog() {
  const open = useTabStore((state) => state.tabLimitReached);
  const maxTabs = useTabStore((state) => state.maxTabs);
  const dismiss = useTabStore((state) => state.dismissTabLimit);

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) dismiss(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>열린 화면 한도</AlertDialogTitle>
          <AlertDialogDescription>
            열린 화면은 최대 {maxTabs}개입니다. 필요한 입력을 저장한 뒤 사용하지 않는 탭을 닫고 다시 선택해 주세요.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>확인</AlertDialogCancel></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CrmSidebar({
  isCollapsed,
  onToggleCollapse,
  toggleLabel,
}: {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  toggleLabel?: string;
}) {
  const router = useRouter();
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const openTab = useTabStore((state) => state.openTab);
  const accessToken = useAuthStore((state) => state.accessToken);
  const activateTab = useTabStore((state) => state.activateTab);
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const [searchQuery, setSearchQuery] = useState('');
  const [canReadOperations, setCanReadOperations] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    favorites: true,
    openTabs: false,
    menuTree: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((current) => ({ ...current, [section]: !current[section] }));
  };

  useEffect(() => {
    if (!accessToken) {
      setCanReadOperations(false);
      return;
    }
    const controller = new AbortController();
    void fetch('/api/crm/operations/access', {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as { success?: boolean; data?: { features?: { canReadOperations?: boolean } } } | null;
        if (!controller.signal.aborted) setCanReadOperations(response.ok && payload?.success === true && payload.data?.features?.canReadOperations === true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setCanReadOperations(false);
      });
    return () => controller.abort();
  }, [accessToken]);

  const visibleMenuItems = menuItems.filter((item) => !('path' in item) || item.path !== '/operations/settings' || canReadOperations);

  return (
    <SsooSidebarSurface
      expanded={!isCollapsed}
      onToggleCollapse={onToggleCollapse}
      toggleIcon={Menu}
      toggleLabel={toggleLabel}
      brandTitle={CRM_APP_IDENTITY.brandTitle}
      search={{
        inputId: 'ssoo-crm-navigation-search-input',
        inputName: 'ssoo-crm-navigation-search-query',
        ariaLabel: 'CRM 메뉴 검색',
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
              onNodeSelect={(tab) => {
                activateTab(tab.id);
                router.push(tab.path);
              }}
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
              nodes={visibleMenuItems}
              getNodeId={(item) => item.label}
              getNodeLabel={(item) => item.label}
              getNodeTitle={(item) => item.label}
              getNodeSearchText={(item) => item.label}
              isNodeFolder={(item) => item.hasChildren}
              isNodeActive={(item) => Boolean(
                'path' in item
                && (
                  isCrmMenuPathActive(activeTab?.path, item.path ?? '')
                  || (item.path === '/operations/settings' && activeTab && isCrmSystemSettingsPath(activeTab.path))
                )
              )}
              isNodeDisabled={(item) => item.disabled}
              getNodeIcon={(item) => item.icon}
              renderNodeTrailingAction={(item) => (
                item.disabled ? <SsooSidebarTreeStatusBadge>준비 중</SsooSidebarTreeStatusBadge> : null
              )}
              onNodeSelect={(item) => {
                if ('path' in item && item.path) {
                  const tab = getCrmWorkspaceTabOptions(item.path);
                  const opened = openTab(tab ?? {
                    id: item.path,
                    title: item.label,
                    path: item.path,
                    closable: item.path !== CRM_HOME_TAB.path,
                  });
                  if (opened) router.push(item.path);
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
