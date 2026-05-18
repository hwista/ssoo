export const dynamic = 'force-dynamic';

import { proxyNotificationJson } from './_shared/proxy';

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams.toString();
  const pathname = query ? `/notifications?${query}` : '/notifications';

  return proxyNotificationJson(
    req,
    pathname,
    '알림 목록 조회 중 오류가 발생했습니다.',
  );
}
