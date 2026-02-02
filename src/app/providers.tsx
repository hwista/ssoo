'use client';

import { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * 전역 Providers
 * - Toast 알림 (sonner)
 * - 확인 다이얼로그 (탭 초과 등)
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <>
      {children}
      {/* 전역 Confirm Dialog */}
      <ConfirmDialog />
      {/* 전역 Toast */}
      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={4000}
      />
    </>
  );
}
