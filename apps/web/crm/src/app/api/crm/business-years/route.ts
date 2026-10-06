import { forwardCrmJson } from '../_shared/forwardCrmJson';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) { return forwardCrmJson(req, '/crm/business-years', 'GET'); }
export async function POST(req: Request) { return forwardCrmJson(req, '/crm/business-years', 'POST'); }
