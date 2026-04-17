export const dynamic = 'force-dynamic';

import { proxyAccessJson } from '@/app/api/access/_shared/proxy';

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams.toString();
  const pathname = query
    ? `/dms/access/requests/me?${query}`
    : '/dms/access/requests/me';

  return proxyAccessJson(
    req,
    pathname,
    '내 문서 권한 요청 조회 중 오류가 발생했습니다.',
  );
}
