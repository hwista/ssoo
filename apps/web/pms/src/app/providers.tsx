'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

// DevExtreme 라이선스 설정 (상용 라이선스 보유 시)
// import { licenseKey } from './devextreme-license';
// import config from 'devextreme/core/config';
// config({ licenseKey });

interface ProvidersProps {
  children: ReactNode;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 5분간 stale 상태로 두지 않음
        staleTime: 5 * 60 * 1000,
        // 가비지 컬렉션 시간 (기본 5분)
        gcTime: 5 * 60 * 1000,
        // 에러 시 재시도 1회
        retry: 1,
        // 윈도우 포커스 시 자동 리페치 비활성화
        refetchOnWindowFocus: false,
      },
      mutations: {
        // 뮤테이션 에러 시 재시도 안함
        retry: false,
      },
    },
  });
}

// 브라우저에서는 싱글톤
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // 서버: 항상 새로 생성
    return makeQueryClient();
  } else {
    // 브라우저: 싱글톤 사용
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function Providers({ children }: ProvidersProps) {
  // useState로 초기화하여 SSR에서 일관성 유지
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
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
      {/* 개발 환경에서만 DevTools 표시 */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
