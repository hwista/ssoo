export const dynamic = 'force-dynamic';

import { proxyNotificationJson } from '../_shared/proxy';

export async function PUT(req: Request) {
  const body = await req.text();

  return proxyNotificationJson(
    req,
    '/notifications/read-by-reference',
    '참조 문서 알림 읽음 처리 중 오류가 발생했습니다.',
    {
      method: 'PUT',
      body: body || undefined,
      headers: {
        'Content-Type': req.headers.get('content-type') || 'application/json',
      },
    },
  );
}
