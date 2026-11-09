'use client';

import { useRouter } from 'next/navigation';
import {
  AuthUserMenu,
  getSsooUserSurfaceTabId,
  getSsooUserSurfaceTabPath,
  getSsooUserSurfaceTabTitle,
  useSharedLogout,
  usePlatformAccess,
  type SsooUserSurfaceTabKind,
} from '@ssoo/web-auth';
import { SsooAppHeader, SsooHeaderUserMenuLoadingState, useSsooGlobalHeaderSearch } from '@ssoo/web-shell';
import { Menu, Plus, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useTabStore } from '@/stores/tab.store';
import { HeaderNotifications } from './HeaderNotifications';

const LOGIN_PATH = '/login';

interface AdminHeaderProps {
  mobile?: boolean;
  mobileMenuOpen?: boolean;
  onMobileMenuClick?: () => void;
}

export function AdminHeader({
  mobile = false,
  mobileMenuOpen = false,
  onMobileMenuClick,
}: AdminHeaderProps) {
  const user = useAuthStore((s) => s.user);
  const access = usePlatformAccess();
  const canManage = access?.snapshot.isPlatformAdmin === true && access.snapshot.status === 'active';
  const openTab = useTabStore((s) => s.openTab);
  const router = useRouter();
  const logout = useSharedLogout({
    authStore: useAuthStore,
    navigate: (path) => router.replace(path),
    loginPath: LOGIN_PATH,
  });

  const handleCreateUser = () => {
    openTab({
      id: 'admin-user-create',
      title: '사용자 추가',
      path: '/users?create=1',
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
        id: query ? `admin-global-search-${encodedQuery}` : 'admin-global-search',
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
      leading={mobile ? { title: 'Admin / 플랫폼', subtitle: '시스템 관리' } : undefined}
      leadingAction={mobile ? {
        iconSlot: mobileMenuOpen ? <X /> : <Menu />,
        'aria-controls': 'admin-mobile-sidebar',
        'aria-expanded': mobileMenuOpen,
        'aria-label': mobileMenuOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기',
        title: mobileMenuOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기',
        onClick: onMobileMenuClick,
      } : null}
      search={mobile || !canManage ? null : globalHeaderSearch.search}
      primaryAction={mobile || !canManage ? null : {
        label: '새 사용자',
        iconSlot: <Plus />,
        onClick: handleCreateUser,
        tone: 'primary-on-color',
        title: '사용자 추가 탭 열기',
      }}
      notificationSlot={<HeaderNotifications />}
      userMenuSlot={({ dropdownWidth }) => (
        user ? (
          <AuthUserMenu
            user={user}
            onLogout={logout}
            dropdownWidth={dropdownWidth}
            accountCenter={{ snsAppUrl: process.env.NEXT_PUBLIC_SNS_APP_URL }}
            userSurfaces={{
              myProfile: { onSelect: () => openUserSurfaceTab('my-profile') },
              personalSettings: { onSelect: () => openUserSurfaceTab('personal-settings') },
            }}
          />
        ) : (
          <SsooHeaderUserMenuLoadingState />
        )
      )}
    />
  );
}
