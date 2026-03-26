'use client';

import { useEffect } from 'react';

/**
 * (main) 그룹 에러 바운더리
 * 
 * 인증 후 영역에서 발생하는 에러를 포착.
 * ChunkLoadError → 자동 새로고침, 그 외 → 복구 UI 제공
 */
export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError = error.name === 'ChunkLoadError'
    || error.message?.includes('Loading chunk')
    || error.message?.includes('Failed to fetch dynamically imported module');

  // ChunkLoadError 자동 새로고침 (1회)
  useEffect(() => {
    if (isChunkError && typeof window !== 'undefined') {
      const retryKey = 'main-chunk-retry';
      const lastRetry = sessionStorage.getItem(retryKey);
      const now = Date.now();

      if (!lastRetry || now - Number(lastRetry) > 10_000) {
        sessionStorage.setItem(retryKey, String(now));
        window.location.reload();
      }
    }
  }, [isChunkError]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-6">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-title-subsection text-gray-900 mb-2">
          {isChunkError ? '페이지 로딩 실패' : '오류가 발생했습니다'}
        </h2>
        <p className="text-body-sm text-gray-500 mb-6">
          {isChunkError
            ? '페이지 리소스를 불러오는 데 실패했습니다.'
            : '예기치 않은 오류가 발생했습니다. 다시 시도해주세요.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-6 py-2 text-label-md text-primary-foreground transition-colors hover:bg-primary/90"
          >
            새로고침
          </button>
          <button
            onClick={reset}
            className="rounded-md border border-gray-300 bg-white px-6 py-2 text-label-md text-gray-700 transition-colors hover:bg-gray-50"
          >
            다시 시도
          </button>
        </div>
      </div>
    </div>
  );
}
