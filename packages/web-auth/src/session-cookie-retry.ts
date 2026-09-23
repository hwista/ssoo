const RETRY_PARAMETER = '__ssoo_session_retry';
const RETRY_DELAYS_MS = [100, 200, 400, 800, 1600];

/** Let the browser send its latest HttpOnly cookie; never reuse a consumed token server-side. */
export async function createSessionCookieRetryResponse(
  request: Request,
  status: number,
  code: unknown,
): Promise<Response | null> {
  if (status !== 401 || code !== 'SESSION_TOKEN_ROTATED') return null;
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return null;
  const rawAttempt = url.searchParams.get(RETRY_PARAMETER) ?? '0';
  if (!/^[0-5]$/.test(rawAttempt)) return null;
  const attempt = Number(rawAttempt);
  if (attempt >= RETRY_DELAYS_MS.length) return null;

  // Stagger concurrent app/file requests so each can observe the preceding cookie response.
  await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt] + Math.floor(Math.random() * 100)));
  url.searchParams.set(RETRY_PARAMETER, String(attempt + 1));
  return new Response(null, {
    status: 307,
    headers: { Location: `${url.pathname}${url.search}`, 'Cache-Control': 'private, no-store' },
  });
}
