'use client';

import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import {
  AuthUserMenu,
  getSsooUserSurfaceTabId,
  getSsooUserSurfaceTabPath,
  getSsooUserSurfaceTabTitle,
  useSharedLogout,
  type SsooUserSurfaceTabKind,
} from '@ssoo/web-auth';
import { LOGIN_PATH } from '@/lib/constants/routes';
import { useAccessStore, useAuthStore, useSettingsPageNavigationStore, useSettingsStore } from '@/stores';
import { useOpenTabWithConfirm } from '@/hooks';
import { getSettingsTabOptions } from '@/components/pages/settings/_utils/settingsNavigation';

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
  const applyWorkspacePreferences = useSettingsPageNavigationStore((state) => state.applyWorkspacePreferences);
  const enterSettings = useSettingsPageNavigationStore((state) => state.enterSettings);
  const openSection = useSettingsPageNavigationStore((state) => state.openSection);
  const openSettingsTab = useOpenTabWithConfirm();

  const openUserSurfaceTab = async (kind: SsooUserSurfaceTabKind) => {
    await openSettingsTab({
      id: getSsooUserSurfaceTabId(kind),
      title: getSsooUserSurfaceTabTitle(kind),
      icon: kind === 'personal-settings' ? 'Settings' : 'User',
      path: getSsooUserSurfaceTabPath(kind),
      closable: true,
      activate: true,
    });
  };

  const openSettings = async () => {
    if (!canManageSettings) {
      openSection('system', 'documentAccess');
      await openSettingsTab(getSettingsTabOptions('system', 'documentAccess'));
      return;
    }

    await loadSettings();
    const settingsState = useSettingsStore.getState();
    if (settingsState.config?.personal.workspace) {
      applyWorkspacePreferences(settingsState.config.personal.workspace);
    }
    enterSettings(settingsState.access?.canManageSystem ? undefined : 'personal');
    const settingsNavigation = useSettingsPageNavigationStore.getState();
    await openSettingsTab(getSettingsTabOptions(settingsNavigation.activeScope, settingsNavigation.activeSectionId));
  };

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
      userSurfaces={{
        myProfile: { onSelect: () => openUserSurfaceTab('my-profile') },
        personalSettings: { onSelect: () => openUserSurfaceTab('personal-settings') },
      }}
      actions={[
        {
          key: 'dms-settings',
          label: '문서 설정',
          icon: Settings,
          disabled: !(canManageSettings || canUseAccessCenter),
          onSelect: openSettings,
        },
      ]}
    />
  );
}
