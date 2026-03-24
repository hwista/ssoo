export const dynamic = 'force-dynamic';

import { handleGetTemplate } from '@/server/handlers/template.handler';
import { toNextResponse } from '@/server/shared/result';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const scope = url.searchParams.get('scope') === 'global' ? 'global' : 'personal';

  const result = handleGetTemplate(id, scope, req.headers);
  return toNextResponse(result);
}
