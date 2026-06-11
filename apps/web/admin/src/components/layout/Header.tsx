'use client';

import { useRouter } from 'next/navigation';
import { AuthUserMenu, useSharedLogout } from '@ssoo/web-auth';
import { SsooHeader, SsooHeaderActionButton, SsooHeaderSearchBox } from '@ssoo/web-shell';
import { Search, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

const LOGIN_PATH = '/login';

export function AdminHeader() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const logout = useSharedLogout({
    authStore: useAuthStore,
    navigate: (path) => router.replace(path),
    loginPath: LOGIN_PATH,
  });

  return (
    <SsooHeader
      mode="primary"
      searchSlot={
        <SsooHeaderSearchBox
          placeholder="Admin 통합 검색... (준비 중)"
          disabled
          iconSlot={<Search className="h-4 w-4 text-white/50" />}
        />
      }
      actionsSlot={
        <>
          <SsooHeaderActionButton disabled tone="disabled-on-color" title="플랫폼 설정 변경은 각 관리 화면에서 수행합니다.">
            <ShieldCheck className="h-4 w-4" />
            <span>플랫폼 관리</span>
          </SsooHeaderActionButton>
          {user ? (
            <AuthUserMenu
              user={user}
              onLogout={logout}
              accountCenter={{ snsAppUrl: process.env.NEXT_PUBLIC_SNS_APP_URL }}
            />
          ) : (
            <span className="text-sm text-white/70">로딩 중...</span>
          )}
        </>
      }
    />
  );
}
