export const dynamic = 'force-dynamic';

import { proxyNotificationJson } from '../_shared/proxy';

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams.toString();
  const pathname = query ? `/notifications/unread-count?${query}` : '/notifications/unread-count';

  return proxyNotificationJson(
    req,
    pathname,
    '미읽음 알림 수 조회 중 오류가 발생했습니다.',
  );
}
