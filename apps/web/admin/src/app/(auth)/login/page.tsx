'use client';

import { AuthLoginCard } from '@ssoo/web-auth';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const login = useAuthStore((s) => s.login);
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace('/');
    }
  }, [hasHydrated, isAuthenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <AuthLoginCard
        header={
          <div className="mb-2 text-center">
            <h1 className="text-xl font-bold text-foreground">SSOO Admin</h1>
            <p className="mt-1 text-sm text-muted-foreground">시스템 관리 포탈</p>
          </div>
        }
        onSubmit={async (cred) => login(cred.loginId, cred.password)}
      />
    </div>
  );
}
