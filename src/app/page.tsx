'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 루트 페이지 - /wiki로 리다이렉트
 * DMS는 /wiki가 메인 진입점
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/wiki');
  }, [router]);

  // 리다이렉트 중 표시
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-500">로딩 중...</p>
    </div>
  );
}
