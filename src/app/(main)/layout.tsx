'use client';

import { useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { useLayoutStore, useTreeStore } from '@/stores';

/**
 * (main) 그룹 레이아웃
 * - AppLayout (새 레이아웃 시스템) 적용
 * - 파일 트리 초기화
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initializeDeviceType } = useLayoutStore();
  const { refreshFileTree } = useTreeStore();

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

  return <AppLayout>{children}</AppLayout>;
}
