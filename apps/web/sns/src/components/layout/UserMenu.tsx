'use client';

import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import { AuthUserMenu } from '@ssoo/web-auth';
import { LOGIN_PATH } from '@/lib/constants/routes';
import { useAuthStore } from '@/stores/auth.store';

interface UserMenuProps {
  dropdownWidth?: number;
}

export function UserMenu({ dropdownWidth }: UserMenuProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace(LOGIN_PATH);
  };

  return (
    <AuthUserMenu
      user={user}
      dropdownWidth={dropdownWidth}
      onLogout={handleLogout}
      secondaryLabel={user?.displayName ?? user?.userName ?? null}
      actions={[
        {
          key: 'settings',
          label: '설정',
          icon: Settings,
          onSelect: () => router.push('/settings'),
        },
      ]}
    />
  );
}
