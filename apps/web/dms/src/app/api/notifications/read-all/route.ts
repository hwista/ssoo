export const dynamic = 'force-dynamic';

import { proxyNotificationJson } from '../_shared/proxy';

export async function PUT(req: Request) {
  const query = new URL(req.url).searchParams.toString();
  const pathname = query ? `/notifications/read-all?${query}` : '/notifications/read-all';

  return proxyNotificationJson(
    req,
    pathname,
    '알림 전체 읽음 처리 중 오류가 발생했습니다.',
    { method: 'PUT' },
  );
}
