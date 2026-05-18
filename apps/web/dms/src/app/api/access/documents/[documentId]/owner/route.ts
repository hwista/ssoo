export const dynamic = 'force-dynamic';

import { proxyAccessJson } from '@/app/api/access/_shared/proxy';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params;
  const body = await req.json();

  return proxyAccessJson(
    req,
    `/dms/access/requests/documents/${encodeURIComponent(documentId)}/owner`,
    '문서 소유권 이전 중 오류가 발생했습니다.',
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );
}
