'use client';

import dynamic from 'next/dynamic';

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
 * 메인 셸 페이지 (/)
 *
 * - shell-app blueprint 기준으로 실제 루트 셸 엔트리를 담당한다.
 * - 실제 콘텐츠 렌더링은 AppLayout > ContentArea가 담당한다.
 */
export default function MainPage() {
  return <AppLayout />;
}
