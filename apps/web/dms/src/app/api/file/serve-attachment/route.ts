export const dynamic = 'force-dynamic';

import { proxySessionBackedBinaryResponse } from '@/app/api/_shared/serverApiProxy';

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams.toString();
  const pathname = query ? `/dms/file/serve-attachment?${query}` : '/dms/file/serve-attachment';
  return proxySessionBackedBinaryResponse(req, pathname);
}
