export const dynamic = 'force-dynamic';

/** Local web process identity. API/auth/domain checks run independently at release verification. */
export function GET() {
  return Response.json({
    success: true,
    data: {
      service: 'admin', status: 'ready',
      releaseSha: process.env.SSOO_RELEASE_SHA || 'local-development',
      checkedAt: new Date().toISOString(),
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
