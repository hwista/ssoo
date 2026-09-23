'use client';

import { useRouter } from 'next/navigation';
import {
  AuthUserMenu,
  getSsooUserSurfaceTabId,
  getSsooUserSurfaceTabPath,
  getSsooUserSurfaceTabTitle,
  useSharedLogout,
  type SsooUserSurfaceTabKind,
} from '@ssoo/web-auth';
import { SsooAppHeader, useSsooGlobalHeaderSearch } from '@ssoo/web-shell';
import { Menu, Plus, X } from 'lucide-react';
import { LOGIN_PATH } from '@/lib/constants/routes';
import { useAuthStore } from '@/stores/auth.store';
import { useTabStore } from '@/stores/tab.store';
import { HeaderNotifications } from './HeaderNotifications';

interface HeaderProps {
  mobile?: boolean;
  mobileMenuOpen?: boolean;
  onMobileMenuClick?: () => void;
}

export function Header({
  mobile = false,
  mobileMenuOpen = false,
  onMobileMenuClick,
}: HeaderProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const openTab = useTabStore((state) => state.openTab);
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  const handleLogout = useSharedLogout({
    authStore: useAuthStore,
    navigate: (path) => router.replace(path),
    loginPath: LOGIN_PATH,
  });

  const handleCreateOpportunity = () => {
    const path = '/?sourceSurface=form&create=opportunity';
    const opened = openTab({
      id: 'crm-opportunity-create',
      title: '새 기회',
      path,
      closable: true,
      activate: true,
    });
    if (opened) router.push(path);
  };

  const openUserSurfaceTab = (kind: SsooUserSurfaceTabKind) => {
    const path = getSsooUserSurfaceTabPath(kind);
    const opened = openTab({
      id: getSsooUserSurfaceTabId(kind),
      title: getSsooUserSurfaceTabTitle(kind),
      path,
      closable: true,
      activate: true,
    });
    if (opened) router.push(path);
  };

  const globalHeaderSearch = useSsooGlobalHeaderSearch({
    onOpenSearch: ({ query, encodedQuery, path, title }) => {
      const opened = openTab({
        id: query ? `crm-global-search-${encodedQuery}` : 'crm-global-search',
        title,
        path,
        closable: true,
        activate: true,
      });
      if (opened) router.push(path);
    },
  });

  return (
    <SsooAppHeader
      mode="primary"
      leading={mobile ? { title: `CRM / ${activeTab?.title ?? '홈'}`, subtitle: '영업 관리' } : undefined}
      leadingAction={mobile ? {
        iconSlot: mobileMenuOpen ? <X /> : <Menu />,
        'aria-controls': 'crm-mobile-sidebar',
        'aria-expanded': mobileMenuOpen,
        'aria-label': mobileMenuOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기',
        title: mobileMenuOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기',
        onClick: onMobileMenuClick,
      } : null}
      search={mobile ? null : globalHeaderSearch.search}
      primaryAction={mobile ? null : {
        label: '새 기회',
        iconSlot: <Plus />,
        onClick: handleCreateOpportunity,
        tone: 'primary-on-color',
        title: '새 영업기회 탭 열기',
      }}
      notificationSlot={<HeaderNotifications />}
      userMenuSlot={({ dropdownWidth }) => (
        <AuthUserMenu
          user={user}
          onLogout={handleLogout}
          dropdownWidth={dropdownWidth}
          accountCenter={{ snsAppUrl: process.env.NEXT_PUBLIC_SNS_APP_URL }}
          userSurfaces={{
            myProfile: { onSelect: () => openUserSurfaceTab('my-profile') },
            personalSettings: { onSelect: () => openUserSurfaceTab('personal-settings') },
          }}
        />
      )}
    />
  );
}
