export const dynamic = 'force-dynamic';

import { proxyAccessJson } from '@/app/api/access/_shared/proxy';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ documentId: string; grantId: string }> },
) {
  const { documentId, grantId } = await params;

  return proxyAccessJson(
    req,
    `/dms/access/requests/documents/${encodeURIComponent(documentId)}/grants/${encodeURIComponent(grantId)}`,
    '문서 grant 취소 중 오류가 발생했습니다.',
    {
      method: 'DELETE',
    },
  );
}
