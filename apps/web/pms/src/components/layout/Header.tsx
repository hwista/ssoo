'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  SsooAppHeader,
  useSsooGlobalHeaderSearch,
} from '@ssoo/web-shell';
import { Menu, Plus, X } from 'lucide-react';
import { GLOBAL_SEARCH_PATH } from '@/lib/constants/routes';
import { useTabStore } from '@/stores';
import type { TabItem } from '@/types';
import { UserMenu } from './UserMenu';
import { HeaderNotifications } from './HeaderNotifications';

interface HeaderProps {
  mobile?: boolean;
  mobileMenuOpen?: boolean;
  onMobileMenuClick?: () => void;
}

const HEADER_SECTION_LABELS: Record<string, string> = {
  '/home': '홈',
  '/my-projects': '내 프로젝트',
  '/action-required': '처리 필요',
  '/closeout': '종료 관리',
  '/operations': '운영 흐름',
  '/request': '요청',
  '/request/create': '요청 등록',
  '/proposal': '제안',
  '/execution': '수행',
  '/transition': '전환',
  '/project/detail': '프로젝트 상세',
  '/settings': '설정',
  '/project-settings': '프로젝트 사용 설정',
  '/admin/code': '관리',
  '/admin/role': '관리',
  '/admin/menu': '관리',
  '/admin/master': '관리',
  '/admin/templates': '관리',
  '/__user/profile/me': '내 프로필',
  '/__user/settings': '개인 설정',
  [GLOBAL_SEARCH_PATH]: '통합 검색',
};

function stripQuery(path: string | undefined): string {
  return path?.split('?')[0] || '';
}

function getHeaderSectionLabel(tab: TabItem | undefined): string {
  const pathname = stripQuery(tab?.path);

  if (pathname in HEADER_SECTION_LABELS) {
    return HEADER_SECTION_LABELS[pathname];
  }

  if (pathname.startsWith('/__user/profile/')) {
    return '프로필';
  }

  return tab?.title || '홈';
}

function buildHeaderLeading(activeTab: TabItem | undefined) {
  const sectionLabel = getHeaderSectionLabel(activeTab);
  const tabTitle = activeTab?.title.trim();

  return {
    title: `PMS / ${sectionLabel}`,
    subtitle: tabTitle && tabTitle !== sectionLabel ? tabTitle : '프로젝트 관리',
  };
}

/**
 * 상단 헤더 컴포넌트
 * - 로고
 * - 햄버거 메뉴 (사이드바 토글)
 * - 빠른 생성 버튼
 * - 알림
 * - 사용자 프로필
 */
export function Header({
  mobile = false,
  mobileMenuOpen = false,
  onMobileMenuClick,
}: HeaderProps) {
  const openTab = useTabStore((state) => state.openTab);
  const updateTabPath = useTabStore((state) => state.updateTabPath);
  const pathname = usePathname();
  const router = useRouter();
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const headerLeading = buildHeaderLeading(activeTab);

  const handleCreateProject = () => {
    openTab({
      menuCode: 'PMS-REQUEST-CREATE',
      menuId: 'pms-request-create',
      title: '새 프로젝트',
      path: '/request/create',
      icon: 'Plus',
    });
  };

  const globalHeaderSearch = useSsooGlobalHeaderSearch({
    onOpenSearch: ({ query, path, title, icon }) => {
      const tabId = openTab({
        menuCode: 'PMS-GLOBAL-SEARCH',
        menuId: 'pms-global-search',
        title,
        path,
        icon,
        params: query ? { q: query } : undefined,
        closable: true,
        activate: true,
      });
      if (tabId) {
        updateTabPath(tabId, path);
        if (pathname === GLOBAL_SEARCH_PATH) router.replace(path);
      }
    },
  });

  if (mobile) {
    return (
      <SsooAppHeader
        mode="primary"
        leading={headerLeading}
        leadingAction={{
          iconSlot: mobileMenuOpen ? <X /> : <Menu />,
          'aria-controls': 'pms-mobile-sidebar',
          'aria-expanded': mobileMenuOpen,
          'aria-label': mobileMenuOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기',
          title: mobileMenuOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기',
          onClick: onMobileMenuClick,
        }}
        search={null}
        primaryAction={null}
        notificationSlot={<HeaderNotifications />}
        userMenuSlot={({ dropdownWidth }) => <UserMenu dropdownWidth={dropdownWidth} />}
      />
    );
  }

  return (
    <SsooAppHeader
      mode="primary"
      search={globalHeaderSearch.search}
      primaryAction={{
        label: '새 프로젝트',
        iconSlot: <Plus />,
        onClick: handleCreateProject,
        title: '새 프로젝트 요청 탭 열기',
      }}
      notificationSlot={<HeaderNotifications />}
      userMenuSlot={({ dropdownWidth }) => <UserMenu dropdownWidth={dropdownWidth} />}
    />
  );
}
