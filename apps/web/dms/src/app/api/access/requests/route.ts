export const dynamic = 'force-dynamic';

import { proxyAccessJson } from '@/app/api/access/_shared/proxy';

export async function POST(req: Request) {
  const body = await req.json();

  return proxyAccessJson(
    req,
    '/dms/access/requests',
    '문서 읽기 권한 요청 중 오류가 발생했습니다.',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );
}
