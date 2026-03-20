'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@/components/common/StateDisplay';

/**
 * 404 Not Found 페이지
 *
 * 기본적으로는 middleware가 브라우저 직접 진입 경로를 `/`로 복구한다.
 * 이 페이지는 예외적으로 404가 발생했을 때 마지막 보조 복구 장치로 동작한다.
 */
export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // 루트 셸로 복구
    router.replace('/');
  }, [router]);

  return (
    <LoadingState
      message="유효하지 않은 경로입니다. 루트 화면으로 이동 중..."
      fullHeight
      className="min-h-screen bg-gray-50"
    />
  );
}
