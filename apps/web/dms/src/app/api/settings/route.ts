/**
 * Settings API Route - DMS 설정 관리
 * 비즈니스 로직은 @/server/handlers/settings.handler.ts 참조
 */
export const dynamic = 'force-dynamic';

import { handleGetSettings, handleSettingsAction } from '@/server/handlers/settings.handler';

export async function GET() {
  const result = handleGetSettings();
  return Response.json(result);
}

export async function POST(req: Request) {
  const body = await req.json();
  const result = await handleSettingsAction(body);

  if (result.success) {
    return Response.json({
      config: result.config,
      wikiDir: result.wikiDir,
    });
  }
  return Response.json({ error: result.error }, { status: 400 });
}
