'use client';

import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import { AuthUserMenu } from '@ssoo/web-auth';
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
  const { user, logout } = useAuthStore();
  const router = useRouter();

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
          disabled: true,
          trailing: <span className="ml-auto text-xs text-white/40">준비 중</span>,
        },
      ]}
    />
  );
}
