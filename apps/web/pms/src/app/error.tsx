'use client';

import { SsooRouteError } from '@ssoo/web-shell';

export default function ErrorPage(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SsooRouteError {...props} fullPage />;
}
