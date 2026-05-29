export const dynamic = 'force-dynamic';

import { proxyNotificationJson } from '../../_shared/proxy';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: Request, context: RouteContext) {
  const { id } = await context.params;

  return proxyNotificationJson(
    req,
    `/notifications/${encodeURIComponent(id)}/unread`,
    '알림 안읽음 처리 중 오류가 발생했습니다.',
    { method: 'PUT' },
  );
}
