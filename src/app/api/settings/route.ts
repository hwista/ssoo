/**
 * Settings API Route - DMS 설정 관리
 * 비즈니스 로직은 @/server/handlers/settings.handler.ts 참조
 */
export const dynamic = 'force-dynamic';

import { handleGetSettings, handleSettingsAction } from '@/server/handlers/settings.handler';
import { toNextResponse } from '@/server/shared/result';

export async function GET() {
  return toNextResponse(handleGetSettings());
}

export async function POST(req: Request) {
  const body = await req.json();
  return toNextResponse(await handleSettingsAction(body));
}
