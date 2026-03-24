export const dynamic = 'force-dynamic';

import {
  handleDeleteTemplate,
  handleListTemplates,
  handleUpsertTemplate,
} from '@/server/handlers/template.handler';
import { toNextResponse } from '@/server/shared/result';

export async function GET(req: Request) {
  return toNextResponse(handleListTemplates(req.headers));
}

export async function POST(req: Request) {
  const body = await req.json();
  return toNextResponse(handleUpsertTemplate(body, req.headers));
}

export async function DELETE(req: Request) {
  const body = await req.json();
  return toNextResponse(handleDeleteTemplate(body, req.headers));
}
