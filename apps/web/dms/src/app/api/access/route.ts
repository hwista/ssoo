export const dynamic = 'force-dynamic';

import { proxyAccessJson } from '@/app/api/access/_shared/proxy';

export async function GET(req: Request) {
  return proxyAccessJson(
    req,
    '/dms/access/me',
    '접근 권한 조회 중 오류가 발생했습니다.',
  );
}
