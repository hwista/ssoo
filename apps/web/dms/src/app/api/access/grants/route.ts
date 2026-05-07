export const dynamic = 'force-dynamic';

import { proxyAccessJson } from '@/app/api/access/_shared/proxy';

export async function POST(req: Request) {
  const body = await req.json();

  return proxyAccessJson(
    req,
    '/dms/access/grants',
    '권한 부여 중 오류가 발생했습니다.',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );
}
