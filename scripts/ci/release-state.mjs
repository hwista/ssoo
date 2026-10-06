#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const SERVICES = ['server', 'db-init', 'admin', 'crm', 'pms', 'dms', 'sns'];
export const APPS = SERVICES.slice(2);
const hash = (value) => createHash('sha256').update(value).digest('hex');
export function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function affected(file) {
  if (file.endsWith('/package.json') || ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'turbo.json', 'tsconfig.base.json', '.dockerignore'].includes(file)) return SERVICES;
  if (/^apps\/server\//u.test(file)) return ['server'];
  const web = /^apps\/web\/(admin|crm|pms|dms|sns)\//u.exec(file);
  if (web) return [web[1]];
  if (file.startsWith('packages/types/')) return SERVICES;
  if (file.startsWith('packages/database/') || file === 'scripts/db-init-entrypoint.sh') return ['server', 'db-init'];
  if (/^packages\/web-(auth|shell|ui)\//u.test(file)) return APPS;
  if (file === 'docker/db-init.Dockerfile' || file === 'scripts/verify-dms-backup-restore.mjs') return ['db-init'];
  if (file === 'docker/node-tls-ca-entrypoint.sh') return ['server'];
  if (/^(docs\/|automation\/|\.github\/|\.codex\/)/u.test(file) || /^(README|HANDOFF|AGENTS|CLAUDE)\.md$/u.test(file)) return [];
  if (/^compose.*\.ya?ml$/u.test(file) || file === '.gitlab-ci.yml') return [];
  // Unknown files conservatively invalidate all services until explicitly classified.
  return SERVICES;
}
export function planRelease({ sha, pipeline, files, config, previous, key, baseImages, secretHashes = {}, incremental = false }) {
  if (!/^[a-f0-9]{40}$/u.test(sha) || !/^\d+$/u.test(pipeline)) throw new Error('Invalid release identity');
  if (previous) validateManifest(previous);
  const entries = Object.fromEntries(SERVICES.map((service) => {
    const build = structuredClone(config.services?.[service]?.build);
    if (!build) throw new Error(`Missing build service: ${service}`);
    if (build.args) delete build.args.SSOO_RELEASE_SHA;
    delete build.context;
    const secretInputs = (items = []) => Object.fromEntries(items.map((item) => {
      const name = typeof item === 'string' ? item : item.source;
      if (!(name in secretHashes)) throw new Error(`Missing secret fingerprint: ${name}`);
      return [name, secretHashes[name]];
    }));
    const inputHash = hash(stable({ files: files.filter((f) => affected(f.path).includes(service)), build,
      secrets: secretInputs(build.secrets), baseImages, contract: 2 }));
    const runtime = structuredClone(config.services[service]);
    delete runtime.build; delete runtime.image;
    if (runtime.environment) delete runtime.environment.SSOO_RELEASE_SHA;
    const runtimeHash = createHmac('sha256', key).update(stable({ runtime, secrets: secretInputs(runtime.secrets), volumes: config.volumes, networks: config.networks })).digest('hex');
    const old = previous?.services[service];
    const reuse = incremental && old?.inputHash === inputHash;
    return [service, {
      action: reuse ? 'reuse' : 'build', deploy: !reuse || old?.runtimeHash !== runtimeHash,
      inputHash, runtimeHash, sourceCommit: reuse ? old.sourceCommit : sha,
      imageRef: reuse ? old.imageRef : `app-${service}:${sha}`,
      imageId: reuse ? old.imageId : null,
    }];
  }));
  return { schemaVersion: 1, releaseId: `${pipeline}-${sha}`, targetCommit: sha,
    expectedBaseReleaseId: previous?.releaseId ?? null, services: entries,
    database: { changed: !previous || previous.services['db-init'].inputHash !== entries['db-init'].inputHash
      || previous.services['db-init'].runtimeHash !== entries['db-init'].runtimeHash, rollbackCompatibility: 'unknown' },
  };
}
export function validateManifest(manifest) {
  if (manifest?.schemaVersion !== 1 || !/^\d+-[a-f0-9]{40}$/u.test(manifest.releaseId)
    || !/^[a-f0-9]{40}$/u.test(manifest.targetCommit)
    || !manifest.releaseId.endsWith(`-${manifest.targetCommit}`)) throw new Error('Invalid manifest identity');
  if (Object.keys(manifest.services ?? {}).sort().join() !== [...SERVICES].sort().join()) throw new Error('Manifest must contain all seven services');
  for (const [service, item] of Object.entries(manifest.services)) {
    if (!/^[a-f0-9]{40}$/u.test(item.sourceCommit) || !/^sha256:[a-f0-9]{64}$/u.test(item.imageId ?? '')
      || item.imageRef !== `app-${service}:${item.sourceCommit}`
      || !/^[a-f0-9]{64}$/u.test(item.inputHash) || !/^[a-f0-9]{64}$/u.test(item.runtimeHash)) throw new Error(`Invalid image provenance: ${service}`);
  }
  return manifest;
}
export function assertCurrent(plan, previous) {
  if ((previous?.releaseId ?? null) !== plan.expectedBaseReleaseId) throw new Error('Stale plan: deployed release changed; plan and rehearse again');
}
function read(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function atomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
}
function escapeCompose(value) {
  if (typeof value === 'string') return value.replaceAll('$', () => '$$');
  if (Array.isArray(value)) return value.map(escapeCompose);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, escapeCompose(v)]));
  return value;
}
export function runtimeCompose(config, manifest) {
  validateManifest(manifest);
  const resolved = structuredClone(config);
  for (const service of SERVICES) {
    resolved.services[service].image = manifest.services[service].imageId;
    delete resolved.services[service].build;
    delete resolved.services[service].pull_policy;
  }
  resolved.services['db-init'].profiles = ['operations'];
  resolved.services['db-init'].environment ??= {};
  resolved.services['db-init'].environment.DB_INIT_BASELINE_MODE = 'strict';
  resolved.services['db-init'].environment.DB_INIT_SEED_MODE = 'upgrade';
  if (resolved.services.server.depends_on) delete resolved.services.server.depends_on['db-init'];
  // Runtime identity stays tied to the original image, not the release reusing it.
  for (const service of ['server', ...APPS]) {
    resolved.services[service].environment ??= {};
    resolved.services[service].environment.SSOO_RELEASE_SHA = manifest.services[service].sourceCommit;
  }
  return escapeCompose(resolved);
}
export function retirementCandidates(images, manifests, running, keep = 3) {
  if (!Number.isInteger(keep) || keep < 1) throw new Error('Invalid retention count');
  const protectedIds = new Set(running);
  // All retained manifests protect their images, including waiting/failed releases.
  // Releasing old manifests is a separate audited operation, never inferred from tags.
  for (const manifest of manifests) {
    validateManifest(manifest);
    for (const item of Object.values(manifest.services)) protectedIds.add(item.imageId);
  }
  const remove = [];
  for (const service of [...SERVICES, 'ci-verify']) {
    const entries = images.flatMap((image) => (image.RepoTags ?? []).filter((tag) =>
      new RegExp(`^app-${service}:[a-f0-9]{40}$`, 'u').test(tag)).map((tag) => ({ tag, image })));
    entries.sort((a,b) => Date.parse(b.image.Created) - Date.parse(a.image.Created));
    const recent = new Set(entries.slice(0, service === 'ci-verify' ? 1 : keep).map((entry) => entry.image.Id));
    for (const { tag, image } of entries) if (!protectedIds.has(image.Id) && !recent.has(image.Id)) remove.push(tag);
  }
  return remove;
}
export function fileHash(file) {
  const digest = createHash('sha256');
  const fd = fs.openSync(file, 'r');
  try {
    const chunk = Buffer.alloc(1024 * 1024);
    let size;
    while ((size = fs.readSync(fd, chunk, 0, chunk.length, null)) > 0) digest.update(chunk.subarray(0, size));
    return digest.digest('hex');
  } finally { fs.closeSync(fd); }
}
export function sourceHash(file) {
  return fs.lstatSync(file).isSymbolicLink()
    ? hash(`symlink:${fs.readlinkSync(file)}`)
    : fileHash(file);
}
export function rehearsalCompose(config, manifest, dir) {
  const services = {};
  const dbUrl = 'postgresql://ssoo:rehearsal-only@postgres:5432/ssoo_candidate?schema=public';
  services.postgres = {
    image: config.services.postgres.image,
    environment: { POSTGRES_USER: 'ssoo', POSTGRES_PASSWORD: 'rehearsal-only', POSTGRES_DB: 'ssoo_candidate' },
    volumes: ['database:/var/lib/postgresql/data'], networks: ['default'],
  };
  for (const service of SERVICES) {
    const env = structuredClone(config.services[service].environment ?? {});
    for (const name of ['DATABASE_URL', 'DMS_DATABASE_URL']) if (env[name]) env[name] = dbUrl;
    env.SSOO_RELEASE_SHA = manifest.services[service].sourceCommit;
    if (service === 'db-init') {
      env.DATABASE_URL = dbUrl;
      env.DB_INIT_BASELINE_MODE = 'strict';
      env.DB_INIT_SEED_MODE = 'upgrade';
    }
    if (service === 'server') {
      env.AUTH_ALLOW_INSECURE_PRODUCTION_DEFAULTS = 'true';
      env.AUTH_EMAIL_OUTBOX_WORKER_ENABLED = 'false';
      env.AUTH_EMAIL_OUTBOX_RUN_ON_START = 'false';
      env.DMS_GIT_PROD_REMOTE_URL = 'file:///rehearsal/git.git';
      env.DMS_GIT_BOOTSTRAP_REMOTE_URL = 'file:///rehearsal/git.git';
      env.DMS_INSTANCE_ENV = 'prod';
    }
    services[service] = { image: manifest.services[service].imageId, environment: env, networks: ['default'] };
    if (service === 'db-init') services[service].profiles = ['operations'];
    if (service === 'server') {
      const mapping = [
        ['markdown', env.DMS_MARKDOWN_ROOT || '/var/lib/ssoo/documents'],
        ['ingest', env.DMS_INGEST_QUEUE_PATH || '/var/lib/ssoo/document-ingest'],
        ['storage', env.DMS_STORAGE_LOCAL_BASE_PATH || '/var/lib/ssoo/document-storage/local'],
      ];
      services[service].volumes = mapping.map(([name, target]) => ({ type: 'bind', source: path.join(dir, 'rehearsal/runtime', name), target }));
      services[service].volumes.push({ type: 'bind', source: path.join(dir, 'rehearsal/git.git'), target: '/rehearsal/git.git' });
      // Local Git transports clear command-scope GIT_CONFIG_* settings before
      // opening the remote. A private system config also reaches upload-pack.
      services[service].volumes.push({ type: 'bind', source: path.join(dir, 'rehearsal/gitconfig'), target: '/etc/gitconfig', read_only: true });
    }
  }
  return escapeCompose({ services, networks: { default: { internal: true } }, volumes: { database: {} } });
}
export function cli(command, root, dir, ...args) {
  const previous = fs.existsSync(path.join(root, 'last-successful.json')) ? read(path.join(root, 'last-successful.json')) : null;
  const planFile = path.join(dir, 'plan.json');
  const manifestFile = path.join(dir, 'release.json');
  if (command === 'env-overlay') {
    if (!args.every((arg) => path.isAbsolute(arg)) || args.length !== 3) throw new Error('Absolute runtime/source paths required');
    const services = Object.fromEntries(SERVICES.map((service) => [service, { build: { context: args[2] } }]));
    services.server.env_file = [{ path: args[0], required: true }, { path: args[1], required: false }];
    services.dms.env_file = [{ path: args[1], required: false }];
    atomic(path.join(dir, 'compose.env.json'), { services });
  } else if (command === 'plan') {
    const [source, sha, pipeline, incremental] = args;
    if (fs.existsSync(manifestFile)) throw new Error('Release already sealed; create a new pipeline');
    const keyFile = path.join(root, '.config-hmac-key');
    if (!fs.existsSync(keyFile)) fs.writeFileSync(keyFile, randomBytes(32), { flag: 'wx', mode: 0o600 });
    const files = fs.readFileSync(path.join(dir, 'tracked-files'), 'utf8').split('\0').filter(Boolean).sort().map((file) => {
      if (path.isAbsolute(file) || file.split('/').includes('..')) throw new Error('Unsafe input path');
      return { path: file, hash: sourceHash(path.join(source, file)) };
    });
    const config = read(path.join(dir, 'config.json'));
    const key = fs.readFileSync(keyFile);
    const secretHashes = Object.fromEntries(Object.entries(config.secrets ?? {}).map(([name, item]) => {
      if (!item.file) throw new Error('Only snapshotted file secrets are supported');
      return [name, createHmac('sha256', key).update(fs.readFileSync(path.join(dir, 'secrets', name))).digest('hex')];
    }));
    const plan = planRelease({ sha, pipeline, files, config, previous, secretHashes,
      key, baseImages: read(path.join(dir, 'base-images.json')), incremental: incremental === 'true' });
    atomic(planFile, plan);
  } else if (command === 'list') {
    const plan = read(fs.existsSync(manifestFile) ? manifestFile : planFile);
    for (const service of SERVICES) {
      const item = plan.services[service];
      if (!args[0] || item.action === args[0]) console.log(`${service}\t${item.imageRef}\t${item.imageId ?? ''}`);
    }
  } else if (command === 'seal') {
    const plan = read(planFile); assertCurrent(plan, previous);
    const images = read(path.join(dir, 'images.json'));
    for (const service of SERVICES) {
      const item = plan.services[service];
      const image = images.find((entry) => entry.RepoTags?.includes(item.imageRef));
      if (!image || (item.imageId && image.Id !== item.imageId)) throw new Error(`Image missing or replaced: ${service}`);
      item.imageId = image.Id;
    }
    validateManifest(plan); atomic(manifestFile, plan);
    const config = read(path.join(dir, 'config.json'));
    for (const [name, secret] of Object.entries(config.secrets ?? {})) {
      if (secret.file) secret.file = path.join(dir, 'secrets', name);
    }
    atomic(path.join(dir, 'compose.runtime.json'), runtimeCompose(config, plan));
  } else if (command === 'check') {
    if (fs.existsSync(path.join(dir, 'deploy-attempt.json'))) throw new Error('Deployment already attempted; inspect DB/runtime and create a new release');
    const manifest = validateManifest(read(manifestFile)); assertCurrent(manifest, previous);
    const config = read(path.join(dir, 'config.json'));
    const current = read(path.join(dir, 'current-config.json'));
    if (stable(config) !== stable(current)) throw new Error('Environment changed after planning');
    const proof = read(path.join(dir, 'rehearsal.json'));
    if (proof.status !== 'passed' || proof.manifestHash !== hash(stable(manifest))) throw new Error('Missing or stale rehearsal');
    if (Date.now() - Date.parse(proof.checkedAt) > 24 * 60 * 60 * 1000 || Date.parse(proof.checkedAt) > Date.now() + 30_000 || !Number.isFinite(Date.parse(proof.checkedAt))) throw new Error('Rehearsal expired');
  } else if (command === 'backup-check' || command === 'backup-path') {
    const evidence = read(path.join(dir, 'backup-evidence.json'));
    const config = read(path.join(dir, 'config.json'));
    const db = new URL(config.services['db-init'].environment.DATABASE_URL);
    const source = evidence.database?.source;
    const archive = evidence.archive?.path;
    if (evidence.status !== 'passed' || evidence.database?.status !== 'passed'
      || evidence.database.restoreTargetWasEphemeral !== true || evidence.runtime?.sourceStableDuringSnapshot !== true
      || source?.host !== db.hostname || source?.name !== db.pathname.slice(1) || source?.port !== (db.port || '5432')
      || !Number.isFinite(Date.parse(evidence.finishedAt)) || Date.now() - Date.parse(evidence.finishedAt) > 3_600_000
      || Date.parse(evidence.finishedAt) > Date.now() + 30_000) throw new Error('Backup must be fresh, restored, stable and from this database');
    if (typeof archive !== 'string' || !fs.realpathSync(archive).startsWith(`${fs.realpathSync(root)}${path.sep}`)) throw new Error('Backup must be inside protected release storage');
    if (fileHash(archive) !== evidence.archive.sha256) throw new Error('Backup archive checksum mismatch');
    if (command === 'backup-path') console.log(archive);
  } else if (command === 'rehearsal-compose') {
    const manifest = validateManifest(read(manifestFile));
    atomic(path.join(dir, 'compose.rehearsal.json'), rehearsalCompose(read(path.join(dir, 'config.json')), manifest, dir));
  } else if (command === 'proof') {
    const manifest = validateManifest(read(manifestFile));
    const runtime = read(path.join(dir, 'rehearsal-runtime.json'));
    if (runtime.status !== 'passed' || runtime.releaseId !== manifest.releaseId) throw new Error('Rehearsal runtime evidence missing');
    atomic(path.join(dir, 'rehearsal.json'), { status: 'passed', manifestHash: hash(stable(manifest)), checkedAt: new Date().toISOString() });
  } else if (command === 'state') {
    const event = { status: args[0], releaseId: read(planFile).releaseId, checkedAt: new Date().toISOString() };
    atomic(path.join(dir, 'state.json'), event);
    fs.appendFileSync(path.join(dir, 'events.jsonl'), `${JSON.stringify(event)}\n`, { mode: 0o600 });
  } else if (command === 'status') {
    console.log(read(path.join(dir, 'state.json')).status);
  } else if (command === 'begin-deploy') {
    const marker = path.join(dir, 'deploy-attempt.json');
    if (fs.existsSync(marker)) throw new Error('Deployment already attempted; inspect DB/runtime and create a new release');
    fs.writeFileSync(marker, JSON.stringify({ releaseId: read(manifestFile).releaseId, startedAt: new Date().toISOString() }), { flag: 'wx', mode: 0o600 });
  } else if (command === 'changed') {
    for (const [service, item] of Object.entries(read(manifestFile).services)) if (service !== 'db-init' && item.deploy) console.log(service);
  } else if (command === 'db-changed') {
    console.log(String(read(manifestFile).database.changed));
  } else if (command === 'previous') {
    if (previous) console.log(path.join(root, previous.releaseId));
  } else if (command === 'commit') {
    const manifest = validateManifest(read(manifestFile)); assertCurrent(manifest, previous);
    const evidence = read(path.join(dir, 'evidence.json'));
    if (evidence.status !== 'passed' || evidence.releaseId !== manifest.releaseId) throw new Error('Missing release verification');
    atomic(path.join(root, 'last-successful.json'), manifest);
  } else if (command === 'retired-images') {
    const manifests = fs.readdirSync(root).filter((name) => /^\d+-[a-f0-9]{40}$/u.test(name))
      .map((name) => path.join(root, name, 'release.json')).filter((file) => fs.existsSync(file)).map(read);
    const images = read(path.join(dir, 'retention-images.json'));
    const running = read(path.join(dir, 'retention-containers.json')).map((item) => item.Image);
    for (const ref of retirementCandidates(images, manifests, running)) console.log(ref);
  } else if (command === 'base-ref') {
    const images = read(path.join(dir, 'base-images.json'));
    const ref = images[0]?.RepoDigests?.find((entry) => /^node@sha256:[a-f0-9]{64}$/u.test(entry));
    if (!ref) throw new Error('Node base image requires a registry digest');
    console.log(ref);
  } else if (command === 'secrets') {
    for (const [name, item] of Object.entries(read(path.join(dir, 'config.json')).secrets ?? {})) {
      if (item.file) {
        if (!/^[a-zA-Z0-9_-]+$/u.test(name) || /[\r\n\t]/u.test(item.file)) throw new Error('Invalid secret path');
        console.log(`${name}\t${item.file}`);
      }
    }
  } else throw new Error(`Unknown release command: ${command}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { cli(...process.argv.slice(2)); }
  catch (error) { console.error(`[release] ${error.message}`); process.exitCode = 1; }
}
