'use client';

import { useEffect } from 'react';
import { Button } from '@ssoo/web-ui';
import { isSsooChunkError, recoverSsooChunkOnce } from './chunk-recovery';

/** No router, auth store, query provider, icons or global CSS required. */
export function SsooFatalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const chunk = isSsooChunkError(error);
  useEffect(() => {
    recoverSsooChunkOnce(error);
  }, [error]);
  return <html lang="ko"><body>
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'Canvas', color: 'CanvasText', fontFamily: 'system-ui, sans-serif' /* design/font-override: root fallback must work without CSS */ }}>
      <section style={{ maxWidth: 480 }} data-ssoo-error="fatal">
        <h1 style={{ fontSize: 22 }}>페이지를 불러올 수 없습니다</h1>
        <p>{chunk ? '페이지 리소스를 불러오지 못했습니다.' : '예기치 않은 오류가 발생했습니다.'} 다시 시도하거나 홈으로 이동해 주세요.</p>
        {error.digest && /^[\w.-]{1,100}$/.test(error.digest) ? <p>문의 코드: {error.digest}</p> : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <Button variant="plain" size="plain" onClick={reset}>다시 시도</Button>
          <Button variant="plain" size="plain" onClick={() => window.location.reload()}>새로고침</Button>
          <a href="/">홈으로 이동</a>
          <a href="/recovery">다른 서비스·계정으로 이동</a>
        </div>
      </section>
    </main>
  </body></html>;
}
