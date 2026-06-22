import { getSsooAppIconResponse } from '@ssoo/web-shell';

export function GET(request: Request): Response {
  return getSsooAppIconResponse('admin', request);
}
