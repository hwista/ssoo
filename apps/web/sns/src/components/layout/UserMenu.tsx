'use client';

import { useRouter } from 'next/navigation';
import { AuthUserMenu, useSharedLogout } from '@ssoo/web-auth';
import { LOGIN_PATH } from '@/lib/constants/routes';
import { useAuthStore } from '@/stores/auth.store';

interface UserMenuProps {
  dropdownWidth?: number;
}

export function UserMenu({ dropdownWidth }: UserMenuProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
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
      secondaryLabel={user?.displayName ?? user?.userName ?? null}
      accountCenter={{ snsAppUrl: process.env.NEXT_PUBLIC_SNS_APP_URL }}
    />
  );
}
