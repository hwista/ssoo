'use client';

/**
 * 전역 에러 바운더리
 * 
 * ChunkLoadError, 네트워크 오류 등 루트 레이아웃 레벨 에러를 포착.
 * - ChunkLoadError → 자동 페이지 새로고침 (1회)
 * - 그 외 에러 → 새로고침 버튼 제공
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError = error.name === 'ChunkLoadError' 
    || error.message?.includes('Loading chunk')
    || error.message?.includes('Failed to fetch dynamically imported module');

  // ChunkLoadError는 자동 새로고침 (빌드 배포 후 구버전 청크 요청 등)
  if (isChunkError && typeof window !== 'undefined') {
    const retryKey = 'chunk-error-retry';
    const lastRetry = sessionStorage.getItem(retryKey);
    const now = Date.now();

    // 최근 10초 이내 이미 재시도했으면 무한 루프 방지
    if (!lastRetry || now - Number(lastRetry) > 10_000) {
      sessionStorage.setItem(retryKey, String(now));
      window.location.reload();
      return null;
    }
  }

  return (
    <html lang="ko">
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          fontFamily: 'system-ui, -apple-system, sans-serif', // design/font-override: global-error는 CSS 미로드 상태에서 렌더링
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px', padding: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
              페이지를 불러올 수 없습니다
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
              {isChunkError 
                ? '페이지 리소스를 불러오는 데 실패했습니다. 새로고침을 시도해주세요.'
                : '예기치 않은 오류가 발생했습니다.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '8px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                새로고침
              </button>
              <button
                onClick={() => { window.location.href = '/login'; }}
                style={{
                  padding: '8px 24px',
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                로그인 페이지로
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
