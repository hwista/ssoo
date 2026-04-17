'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@/components/common/StateDisplay';
import { APP_HOME_PATH } from '@/lib/constants/routes';

/**
 * 404 Not Found 페이지
 * - 존재하지 않는 경로 접근 시 자동으로 메인 페이지(/)로 리다이렉트
 * - 메인 페이지의 인증 가드(checkAuth)가 알아서 로그인 여부 판단
 *   - 로그인됨 → 메인 페이지 표시
 *   - 미로그인 → /auth/login으로 리다이렉트
 */
export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // 무조건 메인 페이지로 리다이렉트
    // (main)/layout.tsx의 checkAuth가 인증 상태를 판단하여 처리
    router.replace(APP_HOME_PATH);
  }, [router]);

  return (
    <LoadingState
      message="페이지를 찾을 수 없습니다. 메인 페이지로 이동 중..."
      fullHeight
      className="min-h-screen bg-gray-50"
    />
  );
}
