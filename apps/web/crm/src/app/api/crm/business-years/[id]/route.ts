import { forwardCrmJson } from '../../_shared/forwardCrmJson';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
export async function PUT(req: Request, { params }: Context) {
  const { id } = await params;
  return forwardCrmJson(req, `/crm/business-years/${encodeURIComponent(id)}`, 'PUT');
}
export async function DELETE(req: Request, { params }: Context) {
  const { id } = await params;
  return forwardCrmJson(req, `/crm/business-years/${encodeURIComponent(id)}`, 'DELETE');
}
