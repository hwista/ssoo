/**
 * Create API Route - 문서 요약/생성 (스트리밍)
 * apps/server의 공용 DMS create 파이프라인으로 프록시한다.
 */
export const dynamic = 'force-dynamic';

import type { CreateSummaryRequest } from '@ssoo/types/dms';
import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

export async function POST(req: Request) {
  const body = await req.json();
  const payload: CreateSummaryRequest = {
    text: typeof body?.text === 'string' ? body.text : '',
    templateType: typeof body?.templateType === 'string' ? body.templateType : 'default',
  };

  if (!payload.text || payload.text.trim().length < 10) {
    return Response.json({ error: '요약할 텍스트가 너무 짧습니다.' }, { status: 400 });
  }

  const response = await fetch(createServerApiUrl('/dms/create'), createServerApiProxyInit(req, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  });
}
