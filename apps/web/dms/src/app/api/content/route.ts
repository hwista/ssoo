export const dynamic = 'force-dynamic';

import {
  handleLoadContent,
  handleSaveContent,
  handleDeleteContent,
  handleUpdateContentMetadata,
} from '@/server/handlers/content.handler';

/**
 * GET /api/content?path=...&strict=...
 * 콘텐츠(.md)와 메타데이터(.sidecar.json) 로드
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const contentPath = url.searchParams.get('path')?.trim();

  if (!contentPath) {
    return Response.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  const strict = url.searchParams.get('strict') === 'true';
  const result = handleLoadContent(contentPath, { strict });

  if (result.success) {
    return Response.json(result.data);
  }
  return Response.json({ error: result.error }, { status: result.status ?? 500 });
}

/**
 * POST /api/content
 * 콘텐츠 저장 또는 메타데이터 업데이트
 *
 * Body 형식:
 *   저장: { path, content, metadata?, skipMetadata? }
 *   메타데이터만: { path, metadataUpdate: { ... } }
 */
export async function POST(req: Request) {
  const body = await req.json();

  // 메타데이터만 업데이트하는 경우
  if (body.metadataUpdate && !body.content && body.path) {
    const result = handleUpdateContentMetadata(body.path, body.metadataUpdate);
    if (result.success) {
      return Response.json(result.data);
    }
    return Response.json({ error: result.error }, { status: result.status ?? 500 });
  }

  // 콘텐츠 저장
  const result = handleSaveContent(body);
  if (result.success) {
    return Response.json(result.data);
  }
  return Response.json({ error: result.error }, { status: result.status ?? 500 });
}

/**
 * DELETE /api/content
 * 콘텐츠(.md + .sidecar.json) 삭제
 *
 * Body: { path, candidatePaths? }
 */
export async function DELETE(req: Request) {
  const body = await req.json();
  const result = handleDeleteContent(body);

  if (result.success) {
    return Response.json(result.data);
  }
  return Response.json({ error: result.error }, { status: result.status ?? 500 });
}
