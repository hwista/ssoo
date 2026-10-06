#!/usr/bin/env node
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
export const APPS = ['admin', 'crm', 'pms', 'dms', 'sns'];
export async function verifyPlatform({ manifest, serverUrl, appUrls, token, request = fetch }) {
  if (!token) throw new Error('Deployment smoke requires a dedicated read-only account token');
  const checks = [];
  async function read(label, url, auth = false, method = 'GET', envelope = true) {
    const response = await request(url, { method, redirect: 'error', signal: AbortSignal.timeout(20_000), headers: { ...(auth ? { Authorization: `Bearer ${token}` } : {}), ...(method === 'POST' ? { Origin: new URL(url).origin, 'Content-Type': 'application/json', 'X-SSOO-CSRF': '1' } : {}) }, ...(method === 'POST' ? { body: '{}' } : {}) });
    const body = await response.json();
    if (!response.ok || (envelope ? body?.success !== true || !body.data : !body?.userId)) throw new Error(`${label} failed (${response.status})`);
    checks.push({ check: label, status: 'passed' });
    return envelope ? body.data : body;
  }
  const server = await read('server identity', `${serverUrl}/health`);
  if (server.releaseSha !== manifest.services.server.sourceCommit) throw new Error('Server source SHA mismatch');
  await read('core readiness', `${serverUrl}/health/core-readiness`);
  // Identify the runtime that blocks deployment before the aggregate endpoint
  // collapses its failure to a generic platform error.
  for (const app of APPS) await read(`${app} runtime readiness`, `${serverUrl}/health/apps/${app}`);
  const platform = await read('platform readiness', `${serverUrl}/health/readiness`);
  if (platform.services?.length !== APPS.length || APPS.some((app) => platform.services.filter((entry) => entry.app === app && entry.status === 'ready').length !== 1)) throw new Error('Incomplete platform readiness');
  const principal = await read('server authenticated session', `${serverUrl}/auth/me`, true, 'POST');
  if (!principal.userId) throw new Error('Missing authenticated principal');
  for (const app of APPS) {
    const web = await read(`${app} web identity`, `${appUrls[app]}/api/health`);
    if (web.service !== app || web.status !== 'ready' || web.releaseSha !== manifest.services[app].sourceCommit) throw new Error(`${app} web identity mismatch`);
    // The web auth proxy must actually talk to the server, not just render HTML.
    // The shared web proxy intentionally unwraps the server success envelope.
    const session = await read(`${app} authenticated session`, `${appUrls[app]}/api/auth/me`, true, 'POST', false);
    if (String(session.userId) !== String(principal.userId)) throw new Error(`${app} session principal mismatch`);
  }
  // Read-only domain routes exercise authorization and actual handlers.
  // CRM logo/template approvals and business data quality remain in its own
  // launch-readiness API; they do not determine technical deployment success.
  const domainRoutes = { admin: '/users?page=1&limit=1', crm: '/crm/opportunities', pms: '/projects?page=1&limit=1', dms: '/dms/settings/readiness', sns: '/sns/boards' };
  for (const app of APPS) await read(`${app} domain read`, `${serverUrl}${domainRoutes[app]}`, true);
  return { status: 'passed', releaseId: manifest.releaseId, checkedAt: new Date().toISOString(), checks };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const manifest = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
    const host = process.env.CI_SMOKE_HOST || '127.0.0.1';
    const appUrls = Object.fromEntries(APPS.map((app, i) => [app, process.env[`CI_${app.toUpperCase()}_SMOKE_URL`] || `http://${host}:${3000 + i}`]));
    const token = fs.readFileSync(process.env.CI_SMOKE_TOKEN_FILE, 'utf8').trim();
    const report = await verifyPlatform({ manifest, serverUrl: process.env.CI_SERVER_SMOKE_URL || `http://${host}:4000/api`, appUrls, token });
    fs.writeFileSync(process.argv[3], JSON.stringify(report, null, 2), { mode: 0o600 });
    console.log('[platform-release] server and all five apps passed');
  } catch (error) { console.error(`[platform-release] ${error.message}`); process.exitCode = 1; }
}
