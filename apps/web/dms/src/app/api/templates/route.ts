import {
  handleDeleteTemplate,
  handleListTemplates,
  handleUpsertTemplate,
} from '@/server/handlers/template.handler';

export async function GET(req: Request) {
  const result = handleListTemplates(req.headers);
  return Response.json(result);
}

export async function POST(req: Request) {
  const body = await req.json();
  const result = handleUpsertTemplate(body, req.headers);
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json(result);
}

export async function DELETE(req: Request) {
  const body = await req.json();
  const result = handleDeleteTemplate(body, req.headers);
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json(result);
}
