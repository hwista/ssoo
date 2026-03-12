'use client';

import { useEffect } from 'react';
import { useLayoutViewportSync } from '@/hooks';
import { useFileStore } from '@/stores';

/**
 * (main) 그룹 레이아웃
 * - 루트 셸 초기화
 * - 파일 트리 초기화
 *
 * Note: deviceType 자동 리사이즈는 layout.store.ts에서 처리 (PMS 패턴)
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { refreshFileTree } = useFileStore();
  useLayoutViewportSync();

  // 파일 트리 초기화
  useEffect(() => {
    refreshFileTree();
  }, [refreshFileTree]);

  return children;
}
