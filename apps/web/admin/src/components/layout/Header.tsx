'use client';

import { AuthUserMenu } from '@ssoo/web-auth';
import { useAuthStore } from '@/stores/auth.store';

export function AdminHeader() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="flex h-[60px] items-center justify-between border-b bg-card px-6">
      <div />
      <div className="flex items-center gap-2">
        {user ? (
          <AuthUserMenu
            user={user}
            onLogout={logout}
          />
        ) : (
          <span className="text-sm text-muted-foreground">로딩 중...</span>
        )}
      </div>
    </header>
  );
}
