'use client';

import { useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { useLayoutStore, useFileStore } from '@/stores';

/**
 * (main) 그룹 레이아웃
 * - AppLayout (새 레이아웃 시스템) 적용
 * - 파일 트리 초기화
 * 
 * Note: PMS 패턴 동기화로 children은 더 이상 사용하지 않음.
 * AppLayout > ContentArea가 내부적으로 페이지 렌더링.
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initializeDeviceType } = useLayoutStore();
  const { refreshFileTree } = useFileStore();

  // 초기화
  useEffect(() => {
    initializeDeviceType();
    refreshFileTree();

    // 반응형 감지
    const handleResize = () => {
      initializeDeviceType();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initializeDeviceType, refreshFileTree]);

  // children은 Next.js 라우트 요구사항으로 받지만, AppLayout 내부에서 무시됨
  // ContentArea가 pageComponents로 직접 페이지 렌더링
  return <AppLayout />;
}
