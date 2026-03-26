'use client';

import { useEffect } from 'react';
import { useMenuStore } from '@/stores';

/**
 * 메인 페이지 (대시보드)
 * - 로그인 후 기본 진입 페이지
 * - 메뉴 데이터 로드만 담당
 * - 실제 UI는 Home 탭 (HomeDashboardPage)에서 렌더링
 */
export default function MainPage() {
  const { refreshMenu } = useMenuStore();

  // 메뉴 데이터 초기 로드
  useEffect(() => {
    refreshMenu();
  }, [refreshMenu]);

  // Home 탭이 항상 존재하므로 ContentArea가 HomeDashboardPage를 렌더링
  // 이 컴포넌트는 메뉴 초기화만 담당
  return null;
}
