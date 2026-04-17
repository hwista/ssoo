export const dynamic = 'force-dynamic';

import { proxyAccessJson } from '@/app/api/access/_shared/proxy';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  return proxyAccessJson(
    req,
    `/dms/access/requests/${encodeURIComponent(id)}/reject`,
    '문서 권한 요청 거절 중 오류가 발생했습니다.',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );
}
