// Tests Docker deployment orchestration, not CRM or real authentication.
import http from 'node:http';
import { execFileSync } from 'node:child_process';
const apps = ['admin', 'crm', 'pms', 'dms', 'sns'];
const service = process.env.FIXTURE_SERVICE;
http.createServer(async (req, res) => {
  const send = (data, status = 200, envelope = true) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(envelope ? { success: status === 200, data } : data));
  };
  const url = new URL(req.url, 'http://fixture');
  if (url.pathname === '/api/health') return send({ service, status: 'ready', releaseSha: process.env.SSOO_RELEASE_SHA });
  if (url.pathname === '/api/health/core-readiness') {
    try { execFileSync('psql', [process.env.DATABASE_URL, '-Atqc', 'SELECT 1'], { stdio: 'pipe', timeout: 3000 }); }
    catch { return send({}, 503); }
    return send({ status: 'ready' });
  }
  if (url.pathname === '/api/health/readiness') return send({ services: apps.map(app => ({ app, status: 'ready' })) });
  if (url.pathname.startsWith('/api/health/apps/')) return send({ status: 'ready' });
  if (url.pathname === '/api/auth/me') {
    if (process.env.FIXTURE_AUTH_FAIL === 'true') return send({}, 503);
    if (req.headers.authorization !== 'Bearer docker-fixture-token') return send({}, 401);
    if (service === 'server') return send({ userId: 'fixture-user' });
    try {
      const r = await fetch('http://server:4000/api/auth/me', { method: 'POST', headers: { Authorization: req.headers.authorization }, signal: AbortSignal.timeout(3000) });
      const body = await r.json(); return send(body.data, r.status, false);
    } catch { return send({}, 503); }
  }
  return send({ fixture: true });
}).listen(Number(process.env.PORT), '0.0.0.0');
