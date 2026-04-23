export const dynamic = 'force-dynamic';

import { proxyAccessJson } from '@/app/api/access/_shared/proxy';

export async function GET(req: Request) {
  return proxyAccessJson(
    req,
    '/dms/access/requests/documents/manageable',
    '관리 가능한 문서 목록 조회 중 오류가 발생했습니다.',
  );
}
