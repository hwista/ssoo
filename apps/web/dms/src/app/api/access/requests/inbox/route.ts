export const dynamic = 'force-dynamic';

import { proxyAccessJson } from '@/app/api/access/_shared/proxy';

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams.toString();
  const pathname = query
    ? `/dms/access/requests/inbox?${query}`
    : '/dms/access/requests/inbox';

  return proxyAccessJson(
    req,
    pathname,
    '문서 권한 승인 inbox 조회 중 오류가 발생했습니다.',
  );
}
