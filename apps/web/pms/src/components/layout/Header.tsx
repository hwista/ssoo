'use client';

import { SsooAppHeader, useSsooGlobalHeaderSearch } from '@ssoo/web-shell';
import { Plus } from 'lucide-react';
import { useTabStore } from '@/stores';
import { UserMenu } from './UserMenu';
import { HeaderNotifications } from './HeaderNotifications';

/**
 * 상단 헤더 컴포넌트
 * - 로고
 * - 햄버거 메뉴 (사이드바 토글)
 * - 빠른 생성 버튼
 * - 알림
 * - 사용자 프로필
 */
export function Header() {
  const openTab = useTabStore((state) => state.openTab);

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
      openTab({
        menuCode: 'PMS-GLOBAL-SEARCH',
        menuId: 'pms-global-search',
        title,
        path,
        icon,
        params: query ? { q: query } : undefined,
        closable: true,
        activate: true,
      });
    },
  });

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
