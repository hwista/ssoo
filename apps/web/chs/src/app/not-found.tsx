'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-body-sm text-muted-foreground">
          페이지를 찾을 수 없습니다. 메인 페이지로 이동 중...
        </p>
      </div>
    </div>
  );
}
