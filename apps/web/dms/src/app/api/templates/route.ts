export const dynamic = 'force-dynamic';

import {
  handleDeleteTemplate,
  handleListTemplatesByReferenceDocument,
  handleListTemplates,
  handleUpsertTemplate,
} from '@/server/handlers/template.handler';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sourceDocumentPath = url.searchParams.get('sourceDocumentPath')?.trim();
  const originType = url.searchParams.get('originType');

  if (sourceDocumentPath) {
    const result = handleListTemplatesByReferenceDocument(sourceDocumentPath, req.headers);
    return Response.json(result.data);
  }

  const result = handleListTemplates(req.headers);
  if (originType === 'referenced' || originType === 'generated') {
    return Response.json({
      global: result.data.global.filter((item) => item.originType === originType),
      personal: result.data.personal.filter((item) => item.originType === originType),
    });
  }

  return Response.json(result.data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const result = handleUpsertTemplate(body, req.headers);
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json(result.data);
}

export async function DELETE(req: Request) {
  const body = await req.json();
  const result = handleDeleteTemplate(body, req.headers);
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json(result.data);
}
