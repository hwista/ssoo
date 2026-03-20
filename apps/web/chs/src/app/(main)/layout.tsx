'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/stores/auth.store';

const AppLayout = dynamic(
  () =>
    import('@/components/layout/AppLayout').then((mod) => ({
      default: mod.AppLayout,
    })),
  {
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    ),
  }
);

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const initCalled = useRef(false);

  useEffect(() => {
    if (!_hasHydrated || initCalled.current) return;
    initCalled.current = true;

    (async () => {
      await useAuthStore.getState().checkAuth();
    })();
  }, [_hasHydrated]);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [_hasHydrated, isAuthenticated, router]);

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <AppLayout>{children}</AppLayout>;
}
