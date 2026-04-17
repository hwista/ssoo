'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { APP_HOME_PATH } from '@/lib/constants/routes';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace(APP_HOME_PATH);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          페이지를 찾을 수 없습니다. 기본 화면으로 이동 중...
        </p>
      </div>
    </div>
  );
}
