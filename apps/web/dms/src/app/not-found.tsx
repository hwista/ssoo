'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { APP_HOME_PATH } from '@/lib/constants/routes';

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
    router.replace(APP_HOME_PATH);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ssoo-background">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-3 border-teal-600 border-t-transparent" />
        <p className="text-body-sm text-muted-foreground">
          유효하지 않은 경로입니다. 루트 화면으로 이동 중...
        </p>
      </div>
    </div>
  );
}
