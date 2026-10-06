#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const options = {
  help: argv.includes('--help'),
  selfTest: argv.includes('--self-test'),
  overwrite: argv.includes('--overwrite'),
  databaseUrl: process.env.DMS_BACKUP_DATABASE_URL || process.env.DATABASE_URL || '',
  adminDatabaseUrl: process.env.DMS_BACKUP_ADMIN_DATABASE_URL || '',
  markdownRoot: process.env.DMS_MARKDOWN_HOST_PATH || '',
  ingestRoot: process.env.DMS_INGEST_HOST_PATH || '',
  storageRoot: process.env.DMS_STORAGE_LOCAL_HOST_PATH || '',
  archivePath: process.env.DMS_BACKUP_ARCHIVE_PATH || '',
  evidencePath: process.env.DMS_BACKUP_EVIDENCE_PATH || '',
  pgBinDir: process.env.PG_BIN_DIR || '',
  pnpmCommand: process.env.PNPM_BIN || 'pnpm',
};

if (options.help) {
  printUsage();
  process.exit(0);
}

if (options.selfTest) {
  runSelfTest();
  process.exit(0);
}

const startedAt = new Date().toISOString();
let evidencePath = '';
let report = {
  schemaVersion: 1,
  status: 'failed',
  startedAt,
  finishedAt: null,
  archive: null,
  runtime: null,
  database: {
    status: 'not-run',
    verification: 'pnpm --filter @ssoo/database db:runtime:verify',
  },
};

try {
  const config = validateOptions(options);
  evidencePath = config.evidencePath;
  report = await runBackupRestore(config, report);
  report.status = 'passed';
  report.finishedAt = new Date().toISOString();
  writeJson(evidencePath, report, options.overwrite);
  console.log(`[ok] DMS backup/restore drill passed; evidence=${evidencePath}`);
} catch (error) {
  report.status = 'failed';
  report.finishedAt = new Date().toISOString();
  report.error = sanitizeError(error);
  if (evidencePath) {
    try {
      writeJson(evidencePath, report, options.overwrite);
    } catch (writeError) {
      console.error(`[error] failed to write backup/restore evidence: ${sanitizeError(writeError)}`);
    }
  }
  console.error(`[error] DMS backup/restore drill failed: ${sanitizeError(error)}`);
  process.exitCode = 1;
}

async function runBackupRestore(config, initialReport) {
  const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-dms-restore-'));
  const stageRoot = path.join(workRoot, 'stage');
  const restoreRoot = path.join(workRoot, 'restore');
  const runtimeStageRoot = path.join(stageRoot, 'runtime');
  let restoreDatabaseName = '';

  fs.mkdirSync(runtimeStageRoot, { recursive: true, mode: 0o700 });
  fs.mkdirSync(restoreRoot, { recursive: true, mode: 0o700 });

  try {
    const sourceRoots = {
      markdown: config.markdownRoot,
      ingest: config.ingestRoot,
      storage: config.storageRoot,
    };
    const sourceBefore = buildRuntimeManifest(sourceRoots);
    validateRuntimeContracts(sourceRoots);

    for (const [key, sourceRoot] of Object.entries(sourceRoots)) {
      fs.cpSync(sourceRoot, path.join(runtimeStageRoot, key), {
        recursive: true,
        dereference: false,
        preserveTimestamps: true,
        errorOnExist: true,
      });
    }

    const stagedRoots = mapRuntimeRoots(runtimeStageRoot);
    const stagedManifest = buildRuntimeManifest(stagedRoots);
    const sourceAfter = buildRuntimeManifest(sourceRoots);
    assertManifestEqual(sourceBefore, sourceAfter, 'runtime roots changed during snapshot');
    assertManifestEqual(sourceBefore, stagedManifest, 'staged runtime snapshot differs from source');
    validateRuntimeContracts(stagedRoots);

    const dumpPath = path.join(stageRoot, 'database.dump');
    runPgTool(config, 'pg_dump', ['--format=custom', '--file', dumpPath], config.databaseUrl);
    const dumpSha256 = sha256File(dumpPath);

    const archiveMetadata = {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      runtime: summarizeManifest(sourceBefore),
      databaseDump: {
        file: 'database.dump',
        bytes: fs.statSync(dumpPath).size,
        sha256: dumpSha256,
      },
    };
    fs.writeFileSync(
      path.join(stageRoot, 'backup-manifest.json'),
      `${JSON.stringify(archiveMetadata, null, 2)}\n`,
      { encoding: 'utf8', mode: 0o600 },
    );

    ensureNewOutput(config.archivePath, config.overwrite);
    fs.mkdirSync(path.dirname(config.archivePath), { recursive: true, mode: 0o700 });
    runCommand('tar', ['-czf', config.archivePath, '-C', stageRoot, '.']);
    fs.chmodSync(config.archivePath, 0o600);
    const archiveSha256 = sha256File(config.archivePath);

    runCommand('tar', ['-xzf', config.archivePath, '-C', restoreRoot]);
    const restoredManifest = buildRuntimeManifest(mapRuntimeRoots(path.join(restoreRoot, 'runtime')));
    assertManifestEqual(sourceBefore, restoredManifest, 'restored runtime snapshot differs from source');
    validateRuntimeContracts(mapRuntimeRoots(path.join(restoreRoot, 'runtime')));

    const restoredDumpPath = path.join(restoreRoot, 'database.dump');
    if (sha256File(restoredDumpPath) !== dumpSha256) {
      throw new Error('restored database dump checksum differs from the archived dump');
    }

    restoreDatabaseName = createRestoreDatabaseName();
    const adminUrl = config.adminDatabaseUrl || withDatabaseName(config.databaseUrl, 'postgres');
    runPgTool(
      config,
      'psql',
      ['--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--command', `CREATE DATABASE ${quoteIdentifier(restoreDatabaseName)} TEMPLATE template0`],
      adminUrl,
    );
    const restoreDatabaseUrl = withDatabaseName(adminUrl, restoreDatabaseName);
    runPgTool(
      config,
      'pg_restore',
      ['--exit-on-error', '--no-owner', '--no-acl', '--dbname', restoreDatabaseName, restoredDumpPath],
      restoreDatabaseUrl,
    );
    runCommand(
      config.pnpmCommand,
      ['--filter', '@ssoo/database', 'db:runtime:verify'],
      { cwd: repoRoot, env: { ...process.env, DATABASE_URL: restoreDatabaseUrl } },
    );

    return {
      ...initialReport,
      archive: {
        path: config.archivePath,
        bytes: fs.statSync(config.archivePath).size,
        sha256: archiveSha256,
        databaseDumpSha256: dumpSha256,
      },
      runtime: {
        status: 'passed',
        sourceStableDuringSnapshot: true,
        ...summarizeManifest(sourceBefore),
        ingestQueue: inspectIngestQueue(config.ingestRoot),
        markdownGitMetadataPresent: hasGitMetadata(config.markdownRoot),
      },
      database: {
        status: 'passed',
        restoreTargetWasEphemeral: true,
        source: { host: new URL(config.databaseUrl).hostname, port: new URL(config.databaseUrl).port || '5432', name: new URL(config.databaseUrl).pathname.slice(1) },
        restoreDatabaseName,
        verification: 'pnpm --filter @ssoo/database db:runtime:verify',
      },
    };
  } finally {
    if (restoreDatabaseName) {
      const adminUrl = config.adminDatabaseUrl || withDatabaseName(config.databaseUrl, 'postgres');
      try {
        runPgTool(
          config,
          'psql',
          [
            '--no-psqlrc',
            '--set',
            'ON_ERROR_STOP=1',
            '--command',
            `DROP DATABASE IF EXISTS ${quoteIdentifier(restoreDatabaseName)} WITH (FORCE)`,
          ],
          adminUrl,
        );
      } catch (error) {
        console.error(`[warn] failed to remove ephemeral restore database: ${sanitizeError(error)}`);
      }
    }
    fs.rmSync(workRoot, { recursive: true, force: true });
  }
}

function validateOptions(config) {
  const missing = [];
  for (const [key, value] of [
    ['DMS_BACKUP_DATABASE_URL or DATABASE_URL', config.databaseUrl],
    ['DMS_MARKDOWN_HOST_PATH', config.markdownRoot],
    ['DMS_INGEST_HOST_PATH', config.ingestRoot],
    ['DMS_STORAGE_LOCAL_HOST_PATH', config.storageRoot],
    ['DMS_BACKUP_ARCHIVE_PATH', config.archivePath],
  ]) {
    if (!value) missing.push(key);
  }
  if (missing.length > 0) {
    throw new Error(`required environment is missing: ${missing.join(', ')}`);
  }

  const databaseUrl = parsePostgresUrl(config.databaseUrl, 'DMS_BACKUP_DATABASE_URL');
  if (config.adminDatabaseUrl) {
    parsePostgresUrl(config.adminDatabaseUrl, 'DMS_BACKUP_ADMIN_DATABASE_URL');
  }

  const roots = [config.markdownRoot, config.ingestRoot, config.storageRoot].map((entry) => path.resolve(entry));
  for (const root of roots) {
    const stat = fs.statSync(root);
    if (!stat.isDirectory()) throw new Error(`runtime root is not a directory: ${root}`);
    fs.accessSync(root, fs.constants.R_OK);
  }
  for (let index = 0; index < roots.length; index += 1) {
    for (let other = index + 1; other < roots.length; other += 1) {
      if (isSameOrNested(roots[index], roots[other]) || isSameOrNested(roots[other], roots[index])) {
        throw new Error('DMS runtime roots must be distinct and must not contain one another');
      }
    }
  }

  const archivePath = path.resolve(config.archivePath);
  if (!archivePath.endsWith('.tar.gz') && !archivePath.endsWith('.tgz')) {
    throw new Error('DMS_BACKUP_ARCHIVE_PATH must end with .tar.gz or .tgz');
  }
  if (roots.some((root) => isSameOrNested(root, archivePath))) {
    throw new Error('backup archive must be stored outside all DMS runtime roots');
  }

  return {
    ...config,
    databaseUrl: databaseUrl.toString(),
    markdownRoot: roots[0],
    ingestRoot: roots[1],
    storageRoot: roots[2],
    archivePath,
    evidencePath: path.resolve(config.evidencePath || `${archivePath}.evidence.json`),
  };
}

function buildRuntimeManifest(roots) {
  const entries = [];
  for (const [rootKey, rootPath] of Object.entries(roots)) {
    walk(rootPath, '', rootKey, entries);
  }
  entries.sort((left, right) => `${left.root}/${left.path}`.localeCompare(`${right.root}/${right.path}`));
  return entries;
}

function walk(rootPath, relativePath, rootKey, entries) {
  const absolutePath = relativePath ? path.join(rootPath, relativePath) : rootPath;
  const stat = fs.lstatSync(absolutePath);
  if (stat.isSymbolicLink()) {
    throw new Error(`runtime backup refuses symbolic links: ${rootKey}/${relativePath || '.'}`);
  }
  if (stat.isDirectory()) {
    entries.push({ root: rootKey, path: relativePath || '.', type: 'directory' });
    for (const name of fs.readdirSync(absolutePath).sort()) {
      walk(rootPath, relativePath ? path.join(relativePath, name) : name, rootKey, entries);
    }
    return;
  }
  if (!stat.isFile()) {
    throw new Error(`runtime backup refuses non-file entries: ${rootKey}/${relativePath}`);
  }
  entries.push({
    root: rootKey,
    path: relativePath,
    type: 'file',
    bytes: stat.size,
    sha256: sha256File(absolutePath),
  });
}

function summarizeManifest(manifest) {
  const files = manifest.filter((entry) => entry.type === 'file');
  const directories = manifest.filter((entry) => entry.type === 'directory');
  const totalBytes = files.reduce((sum, entry) => sum + entry.bytes, 0);
  return {
    files: files.length,
    directories: directories.length,
    bytes: totalBytes,
    manifestSha256: crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),
    roots: Object.fromEntries(['markdown', 'ingest', 'storage'].map((root) => {
      const rootEntries = manifest.filter((entry) => entry.root === root);
      return [root, {
        files: rootEntries.filter((entry) => entry.type === 'file').length,
        bytes: rootEntries.reduce((sum, entry) => sum + (entry.bytes || 0), 0),
        manifestSha256: crypto.createHash('sha256').update(JSON.stringify(rootEntries)).digest('hex'),
      }];
    })),
  };
}

function assertManifestEqual(expected, actual, label) {
  const expectedDigest = crypto.createHash('sha256').update(JSON.stringify(expected)).digest('hex');
  const actualDigest = crypto.createHash('sha256').update(JSON.stringify(actual)).digest('hex');
  if (expectedDigest !== actualDigest) {
    throw new Error(`${label}: expected=${expectedDigest}, actual=${actualDigest}`);
  }
}

function validateRuntimeContracts(roots) {
  if (!hasGitMetadata(roots.markdown)) {
    throw new Error('markdown root does not contain .git metadata');
  }
  inspectIngestQueue(roots.ingest);
}

function hasGitMetadata(markdownRoot) {
  const gitPath = path.join(markdownRoot, '.git');
  if (!fs.existsSync(gitPath)) return false;
  const stat = fs.statSync(gitPath);
  if (stat.isFile()) {
    const match = fs.readFileSync(gitPath, 'utf8').trim().match(/^gitdir:\s*(.+)$/u);
    if (!match) return false;
    const resolvedGitDir = path.resolve(markdownRoot, match[1]);
    if (
      !isSameOrNested(markdownRoot, resolvedGitDir)
      || !fs.existsSync(resolvedGitDir)
      || !fs.statSync(resolvedGitDir).isDirectory()
    ) {
      return false;
    }
  } else if (!stat.isDirectory()) {
    return false;
  }

  const result = spawnSync('git', ['-C', markdownRoot, 'rev-parse', '--is-inside-work-tree'], {
    encoding: 'utf8',
    timeout: 10_000,
  });
  return result.status === 0 && result.stdout.trim() === 'true';
}

function inspectIngestQueue(ingestRoot) {
  const queuePath = path.join(ingestRoot, 'jobs.json');
  if (!fs.existsSync(queuePath)) {
    return { state: 'empty', jobs: 0 };
  }
  const parsed = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.jobs)) {
    throw new Error('ingest jobs.json must contain a jobs array');
  }
  return { state: 'valid', jobs: parsed.jobs.length, bytes: fs.statSync(queuePath).size };
}

function mapRuntimeRoots(runtimeRoot) {
  return {
    markdown: path.join(runtimeRoot, 'markdown'),
    ingest: path.join(runtimeRoot, 'ingest'),
    storage: path.join(runtimeRoot, 'storage'),
  };
}

function runPgTool(config, tool, args, databaseUrl) {
  const command = config.pgBinDir ? path.join(config.pgBinDir, tool) : tool;
  const url = parsePostgresUrl(databaseUrl, tool);
  const connectionEnv = {
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//u, '')),
  };
  for (const [queryKey, envKey] of [
    ['sslmode', 'PGSSLMODE'],
    ['sslrootcert', 'PGSSLROOTCERT'],
    ['sslcert', 'PGSSLCERT'],
    ['sslkey', 'PGSSLKEY'],
  ]) {
    const value = url.searchParams.get(queryKey);
    if (value) connectionEnv[envKey] = value;
  }
  runCommand(command, args, { env: { ...process.env, ...connectionEnv } });
}

function runCommand(command, args, spawnOptions = {}) {
  const result = spawnSync(command, args, {
    cwd: spawnOptions.cwd || repoRoot,
    env: spawnOptions.env || process.env,
    encoding: 'utf8',
    timeout: 30 * 60 * 1000,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`${path.basename(command)} failed (${result.status ?? 'spawn'}): ${truncate(detail || result.error?.message || '')}`);
  }
}

function parsePostgresUrl(value, label) {
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
      throw new Error('unsupported protocol');
    }
    if (!url.hostname || !url.username || !url.pathname.replace(/^\//u, '')) {
      throw new Error('host, user, and database are required');
    }
    return url;
  } catch {
    throw new Error(`${label} must be a valid PostgreSQL URL`);
  }
}

function withDatabaseName(value, databaseName) {
  const url = parsePostgresUrl(value, 'database URL');
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function createRestoreDatabaseName() {
  return `ssoo_restore_verify_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function quoteIdentifier(value) {
  if (!/^ssoo_restore_verify_[a-z0-9_]+$/u.test(value)) {
    throw new Error('refusing unsafe restore database identifier');
  }
  return `"${value.replaceAll('"', '""')}"`;
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function ensureNewOutput(filePath, overwrite) {
  if (fs.existsSync(filePath) && !overwrite) {
    throw new Error(`output already exists; choose a unique path or pass --overwrite: ${filePath}`);
  }
}

function writeJson(filePath, value, overwrite) {
  ensureNewOutput(filePath, overwrite);
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
}

function isSameOrNested(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function sanitizeError(error) {
  return String(error instanceof Error ? error.message : error)
    .replace(/(postgres(?:ql)?:\/\/[^:\s/@]+:)[^@\s/]+@/giu, '$1***@')
    .replace(/(password|token|secret)=([^\s&]+)/giu, '$1=***');
}

function truncate(value, limit = 3000) {
  return value.length <= limit ? value : `${value.slice(0, limit)}...`;
}

function runSelfTest() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-dms-backup-self-test-'));
  try {
    const runtimeRoot = path.join(root, 'runtime');
    const roots = mapRuntimeRoots(runtimeRoot);
    fs.mkdirSync(roots.markdown, { recursive: true });
    fs.mkdirSync(path.join(roots.markdown, '_templates'), { recursive: true });
    fs.mkdirSync(roots.ingest, { recursive: true });
    fs.mkdirSync(path.join(roots.storage, 'binary'), { recursive: true });
    fs.writeFileSync(path.join(roots.markdown, 'launch.md'), '# launch\n', 'utf8');
    runCommand('git', ['init', roots.markdown]);
    fs.writeFileSync(path.join(roots.ingest, 'jobs.json'), '{"jobs":[]}\n', 'utf8');
    fs.writeFileSync(path.join(roots.storage, 'binary', 'asset.bin'), Buffer.from([0, 1, 2, 255]));

    validateRuntimeContracts(roots);
    const source = buildRuntimeManifest(roots);
    const copyRoot = path.join(root, 'copy');
    fs.cpSync(runtimeRoot, copyRoot, { recursive: true, dereference: false });
    const copied = buildRuntimeManifest(mapRuntimeRoots(copyRoot));
    assertManifestEqual(source, copied, 'self-test copy manifest');
    const summary = summarizeManifest(source);
    if (summary.files < 4 || summary.roots.markdown.files < 2 || summary.roots.ingest.files !== 1) {
      throw new Error('self-test manifest summary is incorrect');
    }

    fs.writeFileSync(path.join(roots.ingest, 'jobs.json'), '{"invalid":true}\n', 'utf8');
    let rejected = false;
    try {
      validateRuntimeContracts(roots);
    } catch {
      rejected = true;
    }
    if (!rejected) throw new Error('self-test did not reject a corrupt ingest queue');
    console.log('[ok] DMS backup/restore verifier self-test passed');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function printUsage() {
  console.log(`Usage: pnpm run verify:dms-backup-restore

Creates one archive containing a PostgreSQL custom-format dump and the three DMS runtime roots,
extracts it into an isolated directory, restores it into a uniquely named temporary database,
and runs the canonical runtime database contract against that restored database.

Required environment:
  DMS_BACKUP_DATABASE_URL          Reachable source PostgreSQL URL (DATABASE_URL fallback)
  DMS_MARKDOWN_HOST_PATH          Markdown Git working tree
  DMS_INGEST_HOST_PATH            Ingest queue root
  DMS_STORAGE_LOCAL_HOST_PATH     Local binary storage root
  DMS_BACKUP_ARCHIVE_PATH         New .tar.gz or .tgz archive path outside runtime roots

Optional environment:
  DMS_BACKUP_ADMIN_DATABASE_URL   Same-cluster URL with CREATE/DROP DATABASE permission
  DMS_BACKUP_EVIDENCE_PATH        JSON evidence path (default: <archive>.evidence.json)
  PG_BIN_DIR                      Directory containing pg_dump, pg_restore, and psql
  PNPM_BIN                        pnpm executable (default: pnpm)

Options:
  --overwrite                     Replace explicitly selected archive/evidence files
  --self-test                     Run deterministic filesystem/contract self-tests only
  --help                          Show this help

Run during an ingest/write freeze. The gate fails if runtime content changes while it is copied.
Credentials are passed to PostgreSQL tools through process environment and are never written to evidence.`);
}
