'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/stores/auth.store';
import { useMenuStore } from '@/stores/menu.store';

// AppLayout을 동적 임포트하여 청크 분리
const AppLayout = dynamic(
  () => import('@/components/layout/AppLayout').then((mod) => ({ default: mod.AppLayout })),
  {
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    ),
  },
);

/**
 * 메인 레이아웃 (낙관적 인증)
 *
 * - localStorage에 인증 정보가 있으면 API 응답 없이 즉시 렌더링
 * - 백그라운드에서 토큰 유효성 검증 → 확정 실패(401) 시만 리다이렉트
 * - 네트워크 에러/서버 다운 시 기존 인증 유지 (끊김 없는 UX)
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const { generalMenus } = useMenuStore();
  const router = useRouter();
  const checkAuthCalled = useRef(false);

  // Hydration 완료 후 백그라운드 토큰 검증 (1회만, 비차단)
  useEffect(() => {
    if (!_hasHydrated || checkAuthCalled.current) return;
    checkAuthCalled.current = true;
    useAuthStore.getState().checkAuth();
  }, [_hasHydrated]);

  // 미인증 시 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [_hasHydrated, isAuthenticated, router]);

  // 인증 상태에서 메뉴 로드
  useEffect(() => {
    if (_hasHydrated && isAuthenticated && generalMenus.length === 0) {
      useMenuStore.getState().refreshMenu();
    }
  }, [_hasHydrated, isAuthenticated, generalMenus.length]);

  // Hydration 대기 (localStorage 읽기, 보통 <100ms)
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 미인증 상태 → /login 리다이렉트 대기
  if (!isAuthenticated) {
    return null;
  }

  // 인증된 상태 → 즉시 앱 렌더링
  return <AppLayout />;
}
