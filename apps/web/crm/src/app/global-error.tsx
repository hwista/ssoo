'use client';

import { SsooFatalError } from '@ssoo/web-shell/fatal-error';

export default function GlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SsooFatalError {...props} />;
}
