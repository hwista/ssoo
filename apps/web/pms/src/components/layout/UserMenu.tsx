'use client';

import { useRouter } from 'next/navigation';
import { AuthUserMenu, useSharedLogout } from '@ssoo/web-auth';
import { LOGIN_PATH } from '@/lib/constants/routes';
import { useAuthStore } from '@/stores/auth.store';

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
  const router = useRouter();
  const handleLogout = useSharedLogout({
    authStore: useAuthStore,
    navigate: (path) => router.replace(path),
    loginPath: LOGIN_PATH,
  });

  return (
    <AuthUserMenu
      user={user}
      dropdownWidth={dropdownWidth}
      onLogout={handleLogout}
      accountCenter={{ snsAppUrl: process.env.NEXT_PUBLIC_SNS_APP_URL }}
    />
  );
}
