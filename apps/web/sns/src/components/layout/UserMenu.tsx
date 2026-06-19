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
import { LOGIN_PATH } from '@/lib/constants/routes';
import { useAuthStore, useTabStore } from '@/stores';

interface UserMenuProps {
  dropdownWidth?: number;
}

export function UserMenu({ dropdownWidth }: UserMenuProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const openTab = useTabStore((state) => state.openTab);
  const handleLogout = useSharedLogout({
    authStore: useAuthStore,
    navigate: (path) => router.replace(path),
    loginPath: LOGIN_PATH,
  });

  const openUserSurfaceTab = (kind: SsooUserSurfaceTabKind) => {
    openTab({
      id: getSsooUserSurfaceTabId(kind),
      title: getSsooUserSurfaceTabTitle(kind),
      path: getSsooUserSurfaceTabPath(kind),
      closable: true,
      activate: true,
    });
  };

  return (
    <AuthUserMenu
      user={user}
      dropdownWidth={dropdownWidth}
      onLogout={handleLogout}
      secondaryLabel={user?.displayName ?? user?.userName ?? null}
      accountCenter={{ snsAppUrl: process.env.NEXT_PUBLIC_SNS_APP_URL }}
      userSurfaces={{
        myProfile: { onSelect: () => openUserSurfaceTab('my-profile') },
        personalSettings: { onSelect: () => openUserSurfaceTab('personal-settings') },
      }}
    />
  );
}
