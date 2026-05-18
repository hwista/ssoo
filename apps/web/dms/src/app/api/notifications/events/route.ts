export const dynamic = 'force-dynamic';

import { proxySessionBackedStreamResponse } from '@/app/api/_shared/serverApiProxy';

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams.toString();
  const pathname = query ? `/notifications/events?${query}` : '/notifications/events';

  return proxySessionBackedStreamResponse(req, pathname);
}
