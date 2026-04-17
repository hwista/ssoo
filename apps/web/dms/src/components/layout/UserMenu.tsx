'use client';

import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import { AuthUserMenu } from '@ssoo/web-auth';
import { LOGIN_PATH } from '@/lib/constants/routes';
import { useAccessStore, useAuthStore, useSettingsShellStore, useSettingsStore } from '@/stores';

interface UserMenuProps {
  /** 드롭다운 너비 (부모 액션 영역 기준) */
  dropdownWidth?: number;
}

export function UserMenu({ dropdownWidth }: UserMenuProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const canManageSettings = useAccessStore((state) => state.snapshot?.features.canManageSettings ?? false);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const applyWorkspacePreferences = useSettingsShellStore((state) => state.applyWorkspacePreferences);
  const enterSettings = useSettingsShellStore((state) => state.enterSettings);

  const openSettings = async () => {
    await loadSettings();
    const settings = useSettingsStore.getState().config;
    if (settings?.personal.workspace) {
      applyWorkspacePreferences(settings.personal.workspace);
    }
    enterSettings();
  };

  const handleLogout = async () => {
    await logout();
    router.replace(LOGIN_PATH);
  };

  return (
    <AuthUserMenu
      user={user}
      dropdownWidth={dropdownWidth}
      onLogout={handleLogout}
      actions={[
        {
          key: 'settings',
          label: '설정',
          icon: Settings,
          disabled: !canManageSettings,
          onSelect: openSettings,
        },
      ]}
    />
  );
}
