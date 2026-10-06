'use client';

import { useEffect } from 'react';
import { SsooErrorPage, SsooErrorPanel } from './error-recovery';
import { resolveSsooError } from './error-model';
import { recoverSsooChunkOnce } from './chunk-recovery';

export function SsooRouteError({ error, reset, fullPage = false }: {
  error: Error & { digest?: string };
  reset: () => void;
  fullPage?: boolean;
}) {
  useEffect(() => { recoverSsooChunkOnce(error); }, [error]);
  const Surface = fullPage ? SsooErrorPage : SsooErrorPanel;
  return <Surface error={error} description={resolveSsooError(error).description} onRetry={reset}
    actions={[
      { label: '새로고침', onClick: () => window.location.reload() },
      { label: '홈으로 이동', href: '/' },
      { label: '다른 서비스·계정으로 이동', href: '/recovery' },
    ]} />;
}
