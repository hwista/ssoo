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
import { Plus } from 'lucide-react';
import { LOGIN_PATH } from '@/lib/constants/routes';
import { useAuthStore } from '@/stores/auth.store';
import { useTabStore } from '@/stores/tab.store';
import { HeaderNotifications } from './HeaderNotifications';

export function Header() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const openTab = useTabStore((state) => state.openTab);

  const handleLogout = useSharedLogout({
    authStore: useAuthStore,
    navigate: (path) => router.replace(path),
    loginPath: LOGIN_PATH,
  });

  const handleCreateOpportunity = () => {
    openTab({
      id: 'crm-opportunity-create',
      title: '새 기회',
      path: '/?create=opportunity',
      closable: true,
      activate: true,
    });
  };

  const openUserSurfaceTab = (kind: SsooUserSurfaceTabKind) => {
    openTab({
      id: getSsooUserSurfaceTabId(kind),
      title: getSsooUserSurfaceTabTitle(kind),
      path: getSsooUserSurfaceTabPath(kind),
      closable: true,
      activate: true,
    });
  };

  const globalHeaderSearch = useSsooGlobalHeaderSearch({
    onOpenSearch: ({ query, encodedQuery, path, title }) => {
      openTab({
        id: query ? `crm-global-search-${encodedQuery}` : 'crm-global-search',
        title,
        path,
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
