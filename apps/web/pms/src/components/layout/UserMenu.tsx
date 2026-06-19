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
  /** 드롭다운 너비 (부모 액션 영역 기준) */
  dropdownWidth?: number;
}

/**
 * 사용자 프로필 드롭다운 메뉴
 * - 사용자 정보 표시 (loginId)
 * - 설정 (준비 중)
 * - 로그아웃
 */
export function UserMenu({ dropdownWidth }: UserMenuProps) {
  const user = useAuthStore((state) => state.user);
  const openTab = useTabStore((state) => state.openTab);
  const router = useRouter();
  const handleLogout = useSharedLogout({
    authStore: useAuthStore,
    navigate: (path) => router.replace(path),
    loginPath: LOGIN_PATH,
  });

  const openUserSurfaceTab = (kind: SsooUserSurfaceTabKind) => {
    const title = getSsooUserSurfaceTabTitle(kind);
    const path = getSsooUserSurfaceTabPath(kind);
    openTab({
      menuCode: getSsooUserSurfaceTabId(kind),
      menuId: getSsooUserSurfaceTabId(kind),
      title,
      icon: kind === 'personal-settings' ? 'Settings' : 'User',
      path,
      closable: true,
      activate: true,
    });
  };

  return (
    <AuthUserMenu
      user={user}
      dropdownWidth={dropdownWidth}
      onLogout={handleLogout}
      accountCenter={{ snsAppUrl: process.env.NEXT_PUBLIC_SNS_APP_URL }}
      userSurfaces={{
        myProfile: { onSelect: () => openUserSurfaceTab('my-profile') },
        personalSettings: { onSelect: () => openUserSurfaceTab('personal-settings') },
      }}
    />
  );
}
