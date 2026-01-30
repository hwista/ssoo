'use client';

import { useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { useFileStore } from '@/stores';

/**
 * (main) 그룹 레이아웃
 * - AppLayout (새 레이아웃 시스템) 적용
 * - 파일 트리 초기화
 * 
 * Note: PMS 패턴 동기화로 children은 더 이상 사용하지 않음.
 * AppLayout > ContentArea가 내부적으로 페이지 렌더링.
 * 
 * Note: deviceType 자동 리사이즈는 layout.store.ts에서 처리 (PMS 패턴)
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { refreshFileTree } = useFileStore();

  // 파일 트리 초기화
  useEffect(() => {
    refreshFileTree();
  }, [refreshFileTree]);

  // children은 Next.js 라우트 요구사항으로 받지만, AppLayout 내부에서 무시됨
  // ContentArea가 pageComponents로 직접 페이지 렌더링
  return <AppLayout />;
}
