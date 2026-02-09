'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/stores/auth.store';
import { useMenuStore } from '@/stores/menu.store';

/** 로딩 타임아웃 (ms) - 이 시간 초과 시 자동 새로고침 */
const LOADING_TIMEOUT_MS = 15_000;

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
 * 메인 레이아웃 (인증 후)
 * - 미인증 시 /login으로 리다이렉트
 * - 인증 후 AppLayout 적용
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading: authLoading, _hasHydrated } = useAuthStore();
  const { generalMenus } = useMenuStore();
  const [isChecking, setIsChecking] = useState(true);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const router = useRouter();

  const isShowingLoader = !_hasHydrated || isChecking || authLoading;

  // 로딩 타임아웃 - 일정 시간 초과 시 자동 새로고침
  useEffect(() => {
    if (!isShowingLoader) return;

    const timer = setTimeout(() => {
      setIsTimedOut(true);
    }, LOADING_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isShowingLoader]);

  // 타임아웃 시 자동 새로고침 (무한 루프 방지: sessionStorage 체크)
  const handleTimeout = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const retryKey = 'auth-loading-retry';
    const lastRetry = sessionStorage.getItem(retryKey);
    const now = Date.now();

    if (!lastRetry || now - Number(lastRetry) > 30_000) {
      // 30초 이내 재시도 이력 없으면 → 새로고침
      sessionStorage.setItem(retryKey, String(now));
      window.location.reload();
    } else {
      // 이미 새로고침 시도했으면 → 로그인 페이지로
      sessionStorage.removeItem(retryKey);
      window.location.href = '/login';
    }
  }, []);

  // 인증 상태 확인 - Hydration 완료 후 서버에서 토큰 유효성 검증
  useEffect(() => {
    if (!_hasHydrated) return;
    
    const check = async () => {
      await useAuthStore.getState().checkAuth();
      setIsChecking(false);
    };
    check();
  }, [_hasHydrated]);

  // 미인증 시 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!isChecking && !authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isChecking, authLoading, isAuthenticated, router]);

  // 인증 성공 후 메뉴 로드
  useEffect(() => {
    if (!isChecking && !authLoading && isAuthenticated && generalMenus.length === 0) {
      useMenuStore.getState().refreshMenu();
    }
  }, [isChecking, authLoading, isAuthenticated, generalMenus.length]);

  // 로딩 중 (Hydration 대기 또는 인증 확인 중)
  if (isShowingLoader) {
    // 타임아웃 발생 시 자동 복구
    if (isTimedOut) {
      handleTimeout();
      return null;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  // 미인증 상태 (리다이렉트 대기)
  if (!isAuthenticated) {
    return null;
  }

  return <AppLayout />;
}
