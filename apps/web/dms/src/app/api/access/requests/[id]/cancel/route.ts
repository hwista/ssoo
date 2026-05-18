export const dynamic = 'force-dynamic';

import { proxyAccessJson } from '@/app/api/access/_shared/proxy';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return proxyAccessJson(
    req,
    `/dms/access/requests/${encodeURIComponent(id)}/cancel`,
    '문서 권한 요청 취소 중 오류가 발생했습니다.',
    {
      method: 'POST',
    },
  );
}
