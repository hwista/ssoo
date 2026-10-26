#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { policy } from './retention.mjs';

const [profile, operation, ...extra] = process.argv.slice(2);
if (!['local', 'local-test', 'production'].includes(profile) || !['build', 'up', 'cleanup', 'status'].includes(operation)) {
  throw new Error('Usage: docker-job.sh local|local-test|production build|up|cleanup|status [compose arguments]');
}
process.umask(0o077);
function run(command, args, inherit = false) {
  const result = spawnSync(command, args, { encoding: 'utf8', stdio: inherit ? 'inherit' : 'pipe', timeout: 7200_000, maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`${command} ${args.slice(0, 2).join(' ')} failed (${result.status}): ${result.error?.message || result.stderr || ''}`);
  return (result.stdout || '').trim();
}
const docker = (...args) => run('docker', args);
const compose = ['compose', ...(profile === 'production' ? ['--env-file', '.env.production'] : []), '-f', 'compose.yaml',
  '-f', profile === 'production' ? 'compose.production.yaml' : 'compose.local.yaml',
  ...(profile === 'local-test' ? ['-f', 'compose.local-test.yaml'] : [])];
const hash = (value) => createHash('sha256').update(value).digest('hex');
const engine = docker('info', '--format', '{{.ID}}');
if (!engine) throw new Error('Docker engine identity unavailable');
const config = JSON.parse(docker(...compose, 'config', '--format', 'json'));
if (!/^[a-z0-9][a-z0-9_-]*$/.test(config.name)) throw new Error('Invalid Compose project');
const scope = hash(`${engine}:${config.name}:${profile}`).slice(0, 16);
const stateDir = path.join(process.env.SSOO_STORAGE_STATE_DIR || path.join(os.homedir(), '.local/state/ssoo/storage'), scope);
fs.mkdirSync(stateDir, { recursive: true });
const historyFile = path.join(stateDir, 'history.json');
let history = fs.existsSync(historyFile) ? JSON.parse(fs.readFileSync(historyFile, 'utf8')) : [];
const services = ['server', 'db-init', 'admin', 'crm', 'pms', 'dms', 'sns'];
const prefix = `ssoo-retained-${scope}-`;
function save() {
  fs.writeFileSync(`${historyFile}.tmp`, JSON.stringify(history, null, 2));
  fs.renameSync(`${historyFile}.tmp`, historyFile);
}
function containers() {
  const ids = docker('ps', '-aq').split('\n').filter(Boolean);
  return ids.length ? JSON.parse(docker('inspect', ...ids)) : [];
}
function snapshot(required) {
  const all = containers().filter((c) => c.Config.Labels?.['com.docker.compose.project'] === config.name);
  const images = {};
  for (const service of services) {
    const c = all.find((item) => item.Config.Labels?.['com.docker.compose.service'] === service && item.Config.Labels?.['com.docker.compose.oneoff'] !== 'True');
    const healthy = service === 'db-init' ? c?.State.Status === 'exited' && c.State.ExitCode === 0 : c?.State.Running && c.State.Health?.Status === 'healthy';
    if (!healthy) {
      if (required) throw new Error(`Deployment not verified: ${service} is not healthy/completed`);
      return;
    }
    images[service] = c.Image;
  }
  const id = hash(JSON.stringify(images)).slice(0, 24);
  for (const [service, image] of Object.entries(images)) docker('image', 'tag', image, `${prefix}${service}:${id}`);
  history = [{ id, images, checkedAt: new Date().toISOString() }, ...history.filter((r) => r.id !== id)];
  save();
}
function cleanup() {
  const used = new Set(containers().map((c) => c.Image));
  const retained = history.slice(0, policy.previousSuccessfulReleases + 1);
  const retainedImages = new Set(retained.flatMap((r) => Object.values(r.images)));
  for (const record of history.slice(retained.length)) {
    if (!/^[a-f0-9]{24}$/.test(record.id)) throw new Error('Invalid local history identity');
    for (const [service, image] of Object.entries(record.images)) {
      if (!services.includes(service)) throw new Error('Invalid local history service');
      if (used.has(image) && !retainedImages.has(image)) continue;
      const ref = `${prefix}${service}:${record.id}`;
      const found = docker('image', 'ls', '--no-trunc', '--format', '{{.ID}}', ref);
      if (!found) continue;
      if (found !== image) throw new Error(`Retained image tag changed: ${ref}`);
      // No force: a concurrent container reference prevents image deletion.
      docker('image', 'rm', ref);
    }
  }
  // Keep audit history for protected old container references; it is retried on the next cleanup.
  history = [...retained, ...history.slice(retained.length).filter((r) => Object.values(r.images).some((id) => used.has(id) && !retainedImages.has(id)))];
  save();
  run('bash', ['-c', 'source scripts/storage/cache.sh; storage_cache_cleanup'], true);
}
function capacity() {
  const probe = docker('image', 'ls', '--format', '{{.Repository}}:{{.Tag}}', config.services.server.image || `${config.name}-server`).split('\n')[0] || 'node:22';
  const output = docker('run', '--rm', '--network', 'none', '--entrypoint', 'df', probe, '-Pk', '/');
  const freeKiB = Number(output.split('\n')[1]?.trim().split(/\s+/)[3]);
  if (!Number.isFinite(freeKiB) || freeKiB < policy.minimumFreeGiB * 1024 ** 2) throw new Error('Insufficient Docker disk space after cleanup');
  const powershell = '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
  if (fs.existsSync(powershell)) {
    const free = Number(run(powershell, ['-NoProfile', '-NonInteractive', '-Command', '(Get-PSDrive C).Free']));
    if (!Number.isFinite(free) || free < policy.minimumFreeGiB * 1024 ** 3) throw new Error('Insufficient actual C: space; run Windows storage maintenance');
  }
}
const report = { startedAt: new Date().toISOString(), profile, operation, scope, deployment: 'not-run', status: 'running' };
let failure;
try {
  report.before = docker('system', 'df');
  if (operation !== 'status') {
    snapshot(false);
    cleanup();
    capacity();
    if (operation === 'build') run('docker', [...compose, 'build', ...extra], true);
    if (operation === 'up') {
      run('docker', [...compose, 'up', '-d', '--build', '--wait', '--wait-timeout', '300', ...extra], true);
      snapshot(true);
      report.deployment = 'verified';
    }
    cleanup();
    capacity();
  }
  report.status = 'passed';
} catch (error) {
  failure = error;
  report.status = 'failed';
  report.error = error.message;
} finally {
  try { report.after = docker('system', 'df'); } catch (error) { report.measurementError = error.message; }
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(stateDir, 'latest-report.json'), JSON.stringify(report, null, 2));
  console.log(`[storage] ${report.status}; report=${path.join(stateDir, 'latest-report.json')}`);
}
if (failure) { console.error(failure.message); process.exitCode = 1; }
