'use client';

import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import { AuthUserMenu, useSharedLogout } from '@ssoo/web-auth';
import { LOGIN_PATH } from '@/lib/constants/routes';
import { resetDmsFileTreeSession } from '@/lib/file-tree-session';
import { useAccessStore, useAuthStore, useSettingsShellStore, useSettingsStore } from '@/stores';

interface UserMenuProps {
  /** 드롭다운 너비 (부모 액션 영역 기준) */
  dropdownWidth?: number;
}

export function UserMenu({ dropdownWidth }: UserMenuProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const accessFeatures = useAccessStore((state) => state.snapshot?.features);
  const canManageSettings = accessFeatures?.canManageSettings ?? false;
  const canUseAccessCenter = Boolean(accessFeatures?.canReadDocuments || accessFeatures?.canUseSearch);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const applyWorkspacePreferences = useSettingsShellStore((state) => state.applyWorkspacePreferences);
  const enterSettings = useSettingsShellStore((state) => state.enterSettings);
  const openSection = useSettingsShellStore((state) => state.openSection);

  const openSettings = async () => {
    if (!canManageSettings) {
      openSection('system', 'documentAccess');
      return;
    }

    await loadSettings();
    const settingsState = useSettingsStore.getState();
    if (settingsState.config?.personal.workspace) {
      applyWorkspacePreferences(settingsState.config.personal.workspace);
    }
    enterSettings(settingsState.access?.canManageSystem ? undefined : 'personal');
  };

  const handleLogout = useSharedLogout({
    authStore: useAuthStore,
    navigate: (path) => router.replace(path),
    loginPath: LOGIN_PATH,
    beforeLogout: resetDmsFileTreeSession,
  });

  return (
    <AuthUserMenu
      user={user}
      dropdownWidth={dropdownWidth}
      onLogout={handleLogout}
      accountCenter={{ snsAppUrl: process.env.NEXT_PUBLIC_SNS_APP_URL }}
      actions={[
        {
          key: 'dms-settings',
          label: '설정',
          icon: Settings,
          disabled: !(canManageSettings || canUseAccessCenter),
          onSelect: openSettings,
        },
      ]}
    />
  );
}
