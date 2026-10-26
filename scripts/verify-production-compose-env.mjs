#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { X509Certificate } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const argv = process.argv.slice(2);
const options = {
  envFile: readOption('--env-file', '.env.production'),
  allowMissingPaths: argv.includes('--allow-missing-paths'),
  selfTest: argv.includes('--self-test'),
  help: argv.includes('--help'),
};

try {
  if (options.help) {
    printUsage();
    process.exit(0);
  }

  if (options.selfTest) {
    runSelfTest();
    process.exit(0);
  }

  const absoluteEnvPath = path.resolve(options.envFile);
  if (!fs.existsSync(absoluteEnvPath)) {
    throw new Error(`environment file does not exist: ${absoluteEnvPath}`);
  }

  const parsed = parseEnvFile(fs.readFileSync(absoluteEnvPath, 'utf8'));
  const issues = [
    ...parsed.issues,
    ...validateProductionEnv(parsed.values, { allowMissingPaths: options.allowMissingPaths }),
  ];

  if (issues.length > 0) {
    console.error('[error] production compose environment is not ready');
    for (const issue of issues) {
      console.error(`- ${issue.key}: ${issue.message}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`[ok] production compose environment passed (${absoluteEnvPath})`);
  }
} catch (error) {
  console.error(`[error] production compose environment verification failed: ${formatError(error)}`);
  process.exitCode = 1;
}

function readOption(name, fallback) {
  const inline = argv.find((argument) => argument.startsWith(`${name}=`));
  if (inline) {
    return inline.slice(name.length + 1);
  }

  const index = argv.indexOf(name);
  if (index >= 0) {
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`${name} requires a value`);
    }
    return value;
  }

  return fallback;
}

function parseEnvFile(source) {
  const values = {};
  const issues = [];

  source.split(/\r?\n/u).forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const withoutExport = trimmed.startsWith('export ') ? trimmed.slice(7).trimStart() : trimmed;
    const match = withoutExport.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u);
    if (!match) {
      issues.push({ key: `line ${lineNumber}`, message: 'expected KEY=value syntax' });
      return;
    }

    const [, key, rawValue] = match;
    const decoded = decodeEnvValue(rawValue);
    if (!decoded.ok) {
      issues.push({ key: `line ${lineNumber}`, message: decoded.message });
      return;
    }
    values[key] = decoded.value;
  });

  return { values, issues };
}

function decodeEnvValue(rawValue) {
  const value = rawValue.trim();
  if (!value) {
    return { ok: true, value: '' };
  }

  const quote = value[0];
  if (quote === '"' || quote === "'") {
    if (value.length < 2 || value[value.length - 1] !== quote) {
      return { ok: false, message: 'unterminated quoted value' };
    }
    const inner = value.slice(1, -1);
    return {
      ok: true,
      value: quote === '"'
        ? inner.replace(/\\n/gu, '\n').replace(/\\r/gu, '\r').replace(/\\t/gu, '\t').replace(/\\"/gu, '"').replace(/\\\\/gu, '\\')
        : inner,
    };
  }

  return {
    ok: true,
    value: value.replace(/\s+#.*$/u, '').trimEnd(),
  };
}

function validateProductionEnv(env, validationOptions = {}) {
  const issues = [];
  const required = [
    'SSOO_RELEASE_SHA',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'DOCKER_DATABASE_URL',
    'DOCKER_DMS_DATABASE_URL',
    'CORS_ORIGIN',
    'AUTH_PUBLIC_API_BASE_URL',
    'AUTH_DEFAULT_LOGIN_URL',
    'AUTH_TRUST_FORWARD_HEADERS',
    'AUTH_ALLOW_INSECURE_PRODUCTION_DEFAULTS',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'AUTH_OAUTH_STATE_SIGNING_SECRET',
    'AUTH_CONFIG_ENCRYPTION_KEY',
    'AUTH_EMAIL_OUTBOX_WORKER_ENABLED',
    'AUTH_EMAIL_SMTP_HOST',
    'AUTH_EMAIL_SMTP_PORT',
    'AUTH_EMAIL_SMTP_SECURE',
    'AUTH_EMAIL_SMTP_USERNAME',
    'AUTH_EMAIL_SMTP_PASSWORD',
    'AUTH_EMAIL_FROM_ADDRESS',
    'AUTH_SESSION_COOKIE_SECURE',
    'AUTH_SESSION_COOKIE_SAME_SITE',
    'ADMIN_NEXT_PUBLIC_API_URL',
    'CRM_NEXT_PUBLIC_API_URL',
    'PMS_NEXT_PUBLIC_API_URL',
    'DMS_NEXT_PUBLIC_API_URL',
    'SNS_NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_ADMIN_APP_URL',
    'NEXT_PUBLIC_CRM_APP_URL',
    'NEXT_PUBLIC_PMS_APP_URL',
    'NEXT_PUBLIC_DMS_APP_URL',
    'NEXT_PUBLIC_SNS_APP_URL',
    'DMS_MARKDOWN_HOST_PATH',
    'DMS_INGEST_HOST_PATH',
    'DMS_STORAGE_LOCAL_HOST_PATH',
    'DMS_BACKUP_ARCHIVE_ROOT',
    'DMS_BACKUP_ARCHIVE_NAME',
    'DMS_BACKUP_RETENTION_DAYS',
    'DMS_INSTANCE_ENV',
    'DMS_GIT_PROD_REMOTE_URL',
    'DMS_AI_RAG_LAUNCH_MODE',
  ];

  for (const key of required) {
    if (!getValue(env, key)) {
      addIssue(issues, key, 'is required');
    }
  }

  if (getValue(env, 'SSOO_RELEASE_SHA') && !/^[0-9a-f]{40}$/u.test(getValue(env, 'SSOO_RELEASE_SHA'))) {
    addIssue(issues, 'SSOO_RELEASE_SHA', 'must be the lowercase 40-character release commit SHA');
  }
  validateBoolean(env, issues, 'AUTH_TRUST_FORWARD_HEADERS');
  validateExact(env, issues, 'AUTH_ALLOW_INSECURE_PRODUCTION_DEFAULTS', 'false');
  validateExact(env, issues, 'AUTH_SESSION_COOKIE_SECURE', 'true');
  validateExact(env, issues, 'AUTH_EMAIL_OUTBOX_WORKER_ENABLED', 'true');
  validateBoolean(env, issues, 'AUTH_EMAIL_SMTP_SECURE');
  validateChoice(env, issues, 'AUTH_SESSION_COOKIE_SAME_SITE', ['lax', 'strict', 'none']);
  validateExact(env, issues, 'DMS_INSTANCE_ENV', 'prod');
  validateChoice(env, issues, 'DMS_AI_RAG_LAUNCH_MODE', ['exempted_external_provider', 'provider_ready']);
  if (getValue(env, 'DMS_GO_LIVE_ALLOW_HTTP')) {
    validateExact(env, issues, 'DMS_GO_LIVE_ALLOW_HTTP', 'false');
  }
  validateBackupPolicy(env, issues);

  const secretKeys = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'AUTH_OAUTH_STATE_SIGNING_SECRET',
    'AUTH_CONFIG_ENCRYPTION_KEY',
  ];
  for (const key of secretKeys) {
    validateSecret(env, issues, key, 32);
  }
  validateDistinct(env, issues, secretKeys);
  validateSecret(env, issues, 'POSTGRES_PASSWORD', 24);
  validateSecret(env, issues, 'AUTH_EMAIL_SMTP_PASSWORD', 16);

  const smtpPort = Number(getValue(env, 'AUTH_EMAIL_SMTP_PORT'));
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    addIssue(issues, 'AUTH_EMAIL_SMTP_PORT', 'must be an integer TCP port');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(getValue(env, 'AUTH_EMAIL_FROM_ADDRESS'))) {
    addIssue(issues, 'AUTH_EMAIL_FROM_ADDRESS', 'must be a valid email address');
  }

  if (/(^|[_-])(dev|test|demo|sample)([_-]|$)/iu.test(getValue(env, 'POSTGRES_DB'))) {
    addIssue(issues, 'POSTGRES_DB', 'must use a production database name');
  }

  validateDatabaseUrl(env, issues, 'DOCKER_DATABASE_URL');
  validateDatabaseUrl(env, issues, 'DOCKER_DMS_DATABASE_URL');

  const publicHttpsKeys = [
    'AUTH_PUBLIC_API_BASE_URL',
    'AUTH_DEFAULT_LOGIN_URL',
    'ADMIN_NEXT_PUBLIC_API_URL',
    'CRM_NEXT_PUBLIC_API_URL',
    'PMS_NEXT_PUBLIC_API_URL',
    'DMS_NEXT_PUBLIC_API_URL',
    'SNS_NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_ADMIN_APP_URL',
    'NEXT_PUBLIC_CRM_APP_URL',
    'NEXT_PUBLIC_PMS_APP_URL',
    'NEXT_PUBLIC_DMS_APP_URL',
    'NEXT_PUBLIC_SNS_APP_URL',
  ];
  const parsedPublicUrls = new Map();
  for (const key of publicHttpsKeys) {
    const parsedUrl = validatePublicUrl(env, issues, key, ['https:']);
    if (parsedUrl) {
      parsedPublicUrls.set(key, parsedUrl);
    }
  }

  const wsUrl = getValue(env, 'DMS_NEXT_PUBLIC_WS_URL');
  if (wsUrl) {
    validatePublicUrl(env, issues, 'DMS_NEXT_PUBLIC_WS_URL', ['wss:', 'https:']);
  }

  validateCors(env, issues, parsedPublicUrls);
  validateCookieDomain(env, issues);
  validateHostPaths(env, issues, validationOptions.allowMissingPaths === true);
  validateTlsCaFile(env, issues);
  validateGitRemote(env, issues);
  validateAzure(env, issues);
  if (
    getValue(env, 'DMS_AI_RAG_LAUNCH_MODE') === 'provider_ready'
    && !getValue(env, 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT')
  ) {
    addIssue(issues, 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT', 'is required when DMS_AI_RAG_LAUNCH_MODE=provider_ready');
  }

  return deduplicateIssues(issues);
}

function validateBoolean(env, issues, key) {
  const value = getValue(env, key).toLowerCase();
  if (value && value !== 'true' && value !== 'false') {
    addIssue(issues, key, 'must be true or false');
  }
}

function validateExact(env, issues, key, expected) {
  const value = getValue(env, key).toLowerCase();
  if (value && value !== expected) {
    addIssue(issues, key, `must be ${expected}`);
  }
}

function validateChoice(env, issues, key, allowed) {
  const value = getValue(env, key).toLowerCase();
  if (value && !allowed.includes(value)) {
    addIssue(issues, key, `must be one of: ${allowed.join(', ')}`);
  }
}

function validateSecret(env, issues, key, minimumLength) {
  const value = getValue(env, key);
  if (!value) {
    return;
  }
  if (value.length < minimumLength) {
    addIssue(issues, key, `must contain at least ${minimumLength} characters`);
  }
  if (hasPlaceholderMarker(value)) {
    addIssue(issues, key, 'must not contain a placeholder or development marker');
  }
}

function validateDistinct(env, issues, keys) {
  const groups = new Map();
  for (const key of keys) {
    const value = getValue(env, key);
    if (!value) continue;
    const matchingKeys = groups.get(value) ?? [];
    matchingKeys.push(key);
    groups.set(value, matchingKeys);
  }
  for (const matchingKeys of groups.values()) {
    if (matchingKeys.length > 1) {
      for (const key of matchingKeys) {
        addIssue(issues, key, 'must be independent from the other authentication secrets');
      }
    }
  }
}

function validateDatabaseUrl(env, issues, key) {
  const value = getValue(env, key);
  if (!value) return;

  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
      addIssue(issues, key, 'must use a PostgreSQL URL');
    }
    if (url.hostname !== 'postgres') {
      addIssue(issues, key, 'must use the internal compose hostname postgres');
    }
    if (decodeURIComponent(url.username) !== getValue(env, 'POSTGRES_USER')) {
      addIssue(issues, key, 'username must match POSTGRES_USER');
    }
    if (decodeURIComponent(url.password) !== getValue(env, 'POSTGRES_PASSWORD')) {
      addIssue(issues, key, 'password must match POSTGRES_PASSWORD');
    }
    if (decodeURIComponent(url.pathname.replace(/^\//u, '')) !== getValue(env, 'POSTGRES_DB')) {
      addIssue(issues, key, 'database name must match POSTGRES_DB');
    }
  } catch {
    addIssue(issues, key, 'must be a valid PostgreSQL URL');
  }
}

function validatePublicUrl(env, issues, key, allowedProtocols) {
  const value = getValue(env, key);
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!allowedProtocols.includes(url.protocol)) {
      addIssue(issues, key, `must use ${allowedProtocols.join(' or ')}`);
    }
    if (url.username || url.password) {
      addIssue(issues, key, 'must not embed credentials');
    }
    if (isLocalOrReservedHostname(url.hostname)) {
      addIssue(issues, key, 'must use a non-local deployment hostname');
    }
    return url;
  } catch {
    addIssue(issues, key, 'must be a valid absolute URL');
    return null;
  }
}

function validateCors(env, issues, publicUrls) {
  const origins = getValue(env, 'CORS_ORIGIN')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length === 0) return;

  const normalizedOrigins = new Set();
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (url.protocol !== 'https:' || url.origin !== origin.replace(/\/$/u, '')) {
        addIssue(issues, 'CORS_ORIGIN', 'must contain HTTPS origins without paths, queries, or fragments');
      }
      if (isLocalOrReservedHostname(url.hostname)) {
        addIssue(issues, 'CORS_ORIGIN', 'must not contain local or reserved hostnames');
      }
      normalizedOrigins.add(url.origin);
    } catch {
      addIssue(issues, 'CORS_ORIGIN', 'contains an invalid origin');
    }
  }

  for (const key of [
    'NEXT_PUBLIC_ADMIN_APP_URL',
    'NEXT_PUBLIC_CRM_APP_URL',
    'NEXT_PUBLIC_PMS_APP_URL',
    'NEXT_PUBLIC_DMS_APP_URL',
    'NEXT_PUBLIC_SNS_APP_URL',
  ]) {
    const url = publicUrls.get(key);
    if (url && !normalizedOrigins.has(url.origin)) {
      addIssue(issues, 'CORS_ORIGIN', `must include the origin configured by ${key}`);
    }
  }
}

function validateCookieDomain(env, issues) {
  const domain = getValue(env, 'AUTH_SESSION_COOKIE_DOMAIN');
  if (!domain) return;
  const normalized = domain.startsWith('.') ? domain.slice(1) : domain;
  if (!/^[A-Za-z0-9.-]+$/u.test(normalized) || !normalized.includes('.') || isLocalOrReservedHostname(normalized)) {
    addIssue(issues, 'AUTH_SESSION_COOKIE_DOMAIN', 'must be a non-local DNS suffix without a scheme or path');
  }
}

function validateHostPaths(env, issues, allowMissingPaths) {
  const keys = [
    'DMS_MARKDOWN_HOST_PATH',
    'DMS_INGEST_HOST_PATH',
    'DMS_STORAGE_LOCAL_HOST_PATH',
    'DMS_BACKUP_ARCHIVE_ROOT',
  ];
  const normalizedPaths = new Map();
  for (const key of keys) {
    const value = getValue(env, key);
    if (!value) continue;
    if (!path.isAbsolute(value)) {
      addIssue(issues, key, 'must be an absolute host path');
      continue;
    }
    const normalized = path.resolve(value);
    normalizedPaths.set(key, normalized);
    if (normalized.includes(`${path.sep}.runtime${path.sep}`) || normalized.endsWith(`${path.sep}.runtime`)) {
      addIssue(issues, key, 'must not use the repository-local .runtime directory');
    }
    if (!allowMissingPaths) {
      try {
        if (!fs.statSync(normalized).isDirectory()) {
          addIssue(issues, key, 'must point to an existing directory');
        } else {
          fs.accessSync(normalized, fs.constants.R_OK | fs.constants.W_OK);
        }
      } catch {
        addIssue(issues, key, 'must point to an existing readable and writable directory');
      }
    }
  }

  const entries = [...normalizedPaths.entries()];
  for (let index = 0; index < entries.length; index += 1) {
    for (let other = index + 1; other < entries.length; other += 1) {
      const [leftKey, leftPath] = entries[index];
      const [rightKey, rightPath] = entries[other];
      if (isSameOrNested(leftPath, rightPath) || isSameOrNested(rightPath, leftPath)) {
        addIssue(issues, leftKey, `must not equal, contain, or be contained by ${rightKey}`);
        addIssue(issues, rightKey, `must not equal, contain, or be contained by ${leftKey}`);
      }
    }
  }
}

function validateBackupPolicy(env, issues) {
  const name = getValue(env, 'DMS_BACKUP_ARCHIVE_NAME');
  if (name) {
    if (path.basename(name) !== name || (!name.endsWith('.tar.gz') && !name.endsWith('.tgz'))) {
      addIssue(issues, 'DMS_BACKUP_ARCHIVE_NAME', 'must be a safe basename ending in .tar.gz or .tgz');
    }
    if (hasPlaceholderMarker(name)) {
      addIssue(issues, 'DMS_BACKUP_ARCHIVE_NAME', 'must be a unique launch evidence archive name, not a placeholder');
    }
  }

  const retention = Number(getValue(env, 'DMS_BACKUP_RETENTION_DAYS'));
  if (!Number.isInteger(retention) || retention < 7) {
    addIssue(issues, 'DMS_BACKUP_RETENTION_DAYS', 'must be an integer of at least 7 days');
  }
}

function isSameOrNested(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function validateTlsCaFile(env, issues) {
  const key = 'SSOO_TLS_CA_CERT_FILE';
  const value = getValue(env, key);
  if (!value) return;

  if (!path.isAbsolute(value)) {
    addIssue(issues, key, 'must be an absolute path to an approved PEM certificate');
    return;
  }

  try {
    const stat = fs.statSync(value);
    if (!stat.isFile()) {
      addIssue(issues, key, 'must point to an existing readable PEM certificate file');
      return;
    }
    fs.accessSync(value, fs.constants.R_OK);
    const pem = fs.readFileSync(value, 'utf8');
    if (!pem.includes('-----BEGIN CERTIFICATE-----')) {
      throw new Error('missing PEM certificate marker');
    }
    new X509Certificate(pem);
  } catch {
    addIssue(issues, key, 'must point to an existing readable and valid PEM certificate file');
  }
}

function validateGitRemote(env, issues) {
  const key = 'DMS_GIT_PROD_REMOTE_URL';
  const remote = getValue(env, key);
  if (!remote) return;

  if (/^git@[^:]+:.+/u.test(remote)) {
    const hostname = remote.slice(4, remote.indexOf(':'));
    if (isLocalOrReservedHostname(hostname)) {
      addIssue(issues, key, 'must use a non-local Git host');
    }
    return;
  }

  try {
    const url = new URL(remote);
    if (!['ssh:', 'https:'].includes(url.protocol)) {
      addIssue(issues, key, 'must use SSH or HTTPS transport');
    }
    if (url.password || (url.protocol === 'https:' && url.username)) {
      addIssue(issues, key, 'must not embed Git credentials');
    }
    if (isLocalOrReservedHostname(url.hostname)) {
      addIssue(issues, key, 'must use a non-local Git host');
    }
  } catch {
    addIssue(issues, key, 'must be a valid SSH or HTTPS Git remote');
  }
}

function validateAzure(env, issues) {
  const azureKeys = [
    'AZURE_OPENAI_ENDPOINT',
    'AZURE_OPENAI_CHAT_DEPLOYMENT',
    'AZURE_OPENAI_DEPLOYMENT',
    'AZURE_OPENAI_EMBEDDING_DEPLOYMENT',
    'AZURE_OPENAI_API_KEY',
    'AZURE_TENANT_ID',
    'AZURE_CLIENT_ID',
    'AZURE_CLIENT_SECRET',
    'AZURE_USE_MANAGED_IDENTITY',
    'AZURE_MANAGED_IDENTITY_CLIENT_ID',
  ];
  const configured = azureKeys.some((key) => {
    if (key === 'AZURE_USE_MANAGED_IDENTITY') return getValue(env, key).toLowerCase() === 'true';
    return Boolean(getValue(env, key));
  });
  if (!configured) return;

  validatePublicUrl(env, issues, 'AZURE_OPENAI_ENDPOINT', ['https:']);
  if (!getValue(env, 'AZURE_OPENAI_CHAT_DEPLOYMENT') && !getValue(env, 'AZURE_OPENAI_DEPLOYMENT')) {
    addIssue(issues, 'AZURE_OPENAI_CHAT_DEPLOYMENT', 'or AZURE_OPENAI_DEPLOYMENT is required when Azure OpenAI is enabled');
  }
  if (!getValue(env, 'OPENAI_API_VERSION')) {
    addIssue(issues, 'OPENAI_API_VERSION', 'is required when Azure OpenAI is enabled');
  }

  const managedIdentity = getValue(env, 'AZURE_USE_MANAGED_IDENTITY').toLowerCase() === 'true';
  const apiKey = getValue(env, 'AZURE_OPENAI_API_KEY');
  const servicePrincipal = ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET']
    .every((key) => Boolean(getValue(env, key)));
  if (!managedIdentity && !apiKey && !servicePrincipal) {
    addIssue(issues, 'AZURE_OPENAI_API_KEY', 'or an explicit managed identity/service principal credential set is required');
  }
  if (apiKey) validateSecret(env, issues, 'AZURE_OPENAI_API_KEY', 20);
  if (getValue(env, 'AZURE_CLIENT_SECRET')) validateSecret(env, issues, 'AZURE_CLIENT_SECRET', 20);
}

function isLocalOrReservedHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/\.$/u, '');
  return normalized === 'localhost'
    || normalized === '0.0.0.0'
    || normalized === '127.0.0.1'
    || normalized === '::1'
    || normalized.endsWith('.localhost')
    || normalized.endsWith('.invalid')
    || normalized.endsWith('.example')
    || normalized.endsWith('.test');
}

function hasPlaceholderMarker(value) {
  const normalized = value.toLowerCase();
  return [
    'change-me',
    'development',
    'placeholder',
    'replace-with',
    'sample-secret',
    'your-secret',
    'your_',
    'your-',
  ].some((marker) => normalized.includes(marker));
}

function getValue(env, key) {
  const value = env[key];
  return typeof value === 'string' ? value.trim() : '';
}

function addIssue(issues, key, message) {
  issues.push({ key, message });
}

function deduplicateIssues(issues) {
  const seen = new Set();
  return issues.filter((issue) => {
    const signature = `${issue.key}\0${issue.message}`;
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function runSelfTest() {
  verifyRepositoryContract();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-production-env-'));
  const paths = {
    markdown: path.join(root, 'documents'),
    ingest: path.join(root, 'ingest'),
    storage: path.join(root, 'storage'),
    backup: path.join(root, 'backup'),
  };
  for (const value of Object.values(paths)) fs.mkdirSync(value);

  const valid = createValidFixture(paths);
  assertNoIssues(validateProductionEnv(valid), 'valid production fixture');

  const placeholder = { ...valid, JWT_SECRET: 'replace-with-an-independent-random-jwt-secret' };
  assertHasIssue(validateProductionEnv(placeholder), 'JWT_SECRET', 'placeholder secret');

  const localUrl = { ...valid, NEXT_PUBLIC_DMS_APP_URL: 'http://localhost:3003' };
  assertHasIssue(validateProductionEnv(localUrl), 'NEXT_PUBLIC_DMS_APP_URL', 'local public URL');

  const relativePath = { ...valid, DMS_MARKDOWN_HOST_PATH: './.runtime/documents' };
  assertHasIssue(validateProductionEnv(relativePath), 'DMS_MARKDOWN_HOST_PATH', 'relative DMS path');

  const relativeCaPath = { ...valid, SSOO_TLS_CA_CERT_FILE: './company-root-ca.pem' };
  assertHasIssue(validateProductionEnv(relativeCaPath), 'SSOO_TLS_CA_CERT_FILE', 'relative TLS CA path');

  const duplicateSecret = { ...valid, JWT_REFRESH_SECRET: valid.JWT_SECRET };
  assertHasIssue(validateProductionEnv(duplicateSecret), 'JWT_REFRESH_SECRET', 'duplicate auth secret');

  const implicitAiSkip = { ...valid, DMS_AI_RAG_LAUNCH_MODE: '' };
  assertHasIssue(validateProductionEnv(implicitAiSkip), 'DMS_AI_RAG_LAUNCH_MODE', 'implicit AI/RAG skip');

  const nestedBackup = { ...valid, DMS_BACKUP_ARCHIVE_ROOT: path.join(paths.markdown, 'backup') };
  assertHasIssue(validateProductionEnv(nestedBackup, { allowMissingPaths: true }), 'DMS_BACKUP_ARCHIVE_ROOT', 'nested backup root');

  const secretValues = [valid.JWT_SECRET, valid.JWT_REFRESH_SECRET, valid.POSTGRES_PASSWORD];
  const renderedIssues = JSON.stringify(validateProductionEnv({ ...valid, CORS_ORIGIN: 'not-a-url' }));
  if (secretValues.some((secret) => renderedIssues.includes(secret))) {
    throw new Error('self-test issue output exposed a secret value');
  }

  const parsed = parseEnvFile('A="quoted value"\nB=plain # comment\n');
  if (parsed.values.A !== 'quoted value' || parsed.values.B !== 'plain' || parsed.issues.length !== 0) {
    throw new Error('self-test env parser failed');
  }

  fs.rmSync(root, { recursive: true, force: true });
  console.log('[ok] production compose environment verifier self-test passed');
}

function verifyRepositoryContract() {
  const baseCompose = readRepoFile('compose.yaml');
  const localCompose = readRepoFile('compose.local.yaml');
  const productionCompose = readRepoFile('compose.production.yaml');
  const packageJson = readRepoFile('package.json');

  for (const dockerfile of [
    'docker/db-init.Dockerfile',
    'apps/server/Dockerfile',
    'apps/web/admin/Dockerfile',
    'apps/web/crm/Dockerfile',
    'apps/web/pms/Dockerfile',
    'apps/web/dms/Dockerfile',
    'apps/web/sns/Dockerfile',
  ]) {
    if (readRepoFile(dockerfile).includes('NODE_TLS_REJECT_UNAUTHORIZED')) {
      throw new Error(`${dockerfile} must not disable TLS certificate verification`);
    }
  }

  assertIncludes(
    baseCompose,
    'AUTH_ALLOW_INSECURE_PRODUCTION_DEFAULTS: ${AUTH_ALLOW_INSECURE_PRODUCTION_DEFAULTS:-false}',
    'base compose must fail closed for production authentication defaults',
  );
  for (const marker of [
    'file: ${SSOO_TLS_CA_CERT_FILE:-/dev/null}',
    'source: ssoo_tls_ca',
  ]) {
    assertIncludes(baseCompose, marker, `base compose must provide the optional TLS CA secret contract: ${marker}`);
  }
  const dockerfiles = [
    'docker/db-init.Dockerfile',
    'apps/server/Dockerfile',
    'apps/web/admin/Dockerfile',
    'apps/web/crm/Dockerfile',
    'apps/web/pms/Dockerfile',
    'apps/web/dms/Dockerfile',
    'apps/web/sns/Dockerfile',
  ];
  const workspaceManifestCopyMarkers = [
    'apps/server/package.json apps/server/package.json',
    'apps/web/admin/package.json apps/web/admin/package.json',
    'apps/web/crm/package.json apps/web/crm/package.json',
    'apps/web/dms/package.json apps/web/dms/package.json',
    'apps/web/pms/package.json apps/web/pms/package.json',
    'apps/web/sns/package.json apps/web/sns/package.json',
    'packages/database/package.json packages/database/package.json',
    'packages/types/package.json packages/types/package.json',
    'packages/web-auth/package.json packages/web-auth/package.json',
    'packages/web-shell/package.json packages/web-shell/package.json',
    'packages/web-ui/package.json packages/web-ui/package.json',
  ];
  for (const dockerfile of dockerfiles) {
    const dockerfileContents = readRepoFile(dockerfile);
    assertIncludes(
      dockerfileContents,
      '--mount=type=secret,id=ssoo_tls_ca,required=false',
      `${dockerfile} must consume the optional TLS CA as a build secret`,
    );
    assertIncludes(
      dockerfileContents,
      '--mount=type=cache,id=ssoo-pnpm-v11,target=/root/.local/share/pnpm/store,sharing=locked',
      `${dockerfile} must use the shared locked pnpm v11 BuildKit cache`,
    );
    assertIncludes(
      dockerfileContents,
      '--mount=type=cache,id=ssoo-pnpm-v11-metadata,target=/root/.cache/pnpm,sharing=locked',
      `${dockerfile} must use the shared locked pnpm v11 verification metadata cache`,
    );
    for (const [marker, expectedMountedRunCount] of [
      [
        '--mount=type=secret,id=ssoo_tls_ca,required=false',
        dockerfile === 'docker/db-init.Dockerfile' ? 1 : 2,
      ],
      ['--mount=type=cache,id=ssoo-pnpm-v11,target=/root/.local/share/pnpm/store,sharing=locked', 1],
    ]) {
      const mountedRunCount = dockerfileContents.split(marker).length - 1;
      if (mountedRunCount < expectedMountedRunCount) {
        throw new Error(
          `${dockerfile} must apply ${marker} to every dependency-sensitive RUN ` +
            `(expected at least ${expectedMountedRunCount}, received ${mountedRunCount})`,
        );
      }
    }
    for (const marker of workspaceManifestCopyMarkers) {
      assertIncludes(
        dockerfileContents,
        marker,
        `${dockerfile} must copy every workspace manifest before the filtered install: ${marker}`,
      );
    }
  }
  for (const [service, dockerfile] of [
    ['db-init', 'docker/db-init.Dockerfile'],
    ['server', 'apps/server/Dockerfile'],
    ['admin', 'apps/web/admin/Dockerfile'],
    ['crm', 'apps/web/crm/Dockerfile'],
    ['pms', 'apps/web/pms/Dockerfile'],
    ['dms', 'apps/web/dms/Dockerfile'],
    ['sns', 'apps/web/sns/Dockerfile'],
  ]) {
    const serviceMarker = `\n  ${service}:\n`;
    const serviceStart = baseCompose.indexOf(serviceMarker);
    const remainingCompose = baseCompose.slice(serviceStart + serviceMarker.length);
    const nextServiceMatch = remainingCompose.match(/\n  [^\s][^:\n]*:\n/);
    const nextServiceStart = nextServiceMatch
      ? serviceStart + serviceMarker.length + nextServiceMatch.index
      : -1;
    const serviceSection = baseCompose.slice(
      serviceStart,
      nextServiceStart === -1 ? baseCompose.length : nextServiceStart,
    );
    const buildSectionEnd = serviceSection.indexOf('\n    container_name:');
    const buildSection = serviceSection.slice(0, buildSectionEnd);
    assertIncludes(buildSection, `dockerfile: ${dockerfile}`, `${service} must build from ${dockerfile}`);
    assertIncludes(
      buildSection,
      'source: ssoo_tls_ca',
      `${service} build must receive the optional TLS CA secret`,
    );
  }
  assertIncludes(
    readRepoFile('docker/node-tls-ca-entrypoint.sh'),
    'NODE_EXTRA_CA_CERTS=/run/secrets/ssoo_tls_ca',
    'server runtime must consume the optional TLS CA from the Compose secret mount',
  );
  assertIncludes(
    readRepoFile('docker/db-init.Dockerfile'),
    'COPY scripts/verify-dms-backup-restore.mjs scripts/verify-dms-backup-restore.mjs',
    'db-init operations image must contain the backup/restore verifier',
  );
  for (const dockerfile of [
    'apps/server/Dockerfile',
    'apps/web/admin/Dockerfile',
    'apps/web/dms/Dockerfile',
  ]) {
    assertIncludes(
      readRepoFile(dockerfile),
      'ARG SSOO_RELEASE_SHA=',
      `${dockerfile} must accept the release commit as a build argument`,
    );
    assertIncludes(
      readRepoFile(dockerfile),
      'ENV SSOO_RELEASE_SHA=${SSOO_RELEASE_SHA}',
      `${dockerfile} must bake the release commit into the runtime artifact`,
    );
  }
  assertIncludes(
    readRepoFile('packages/web-shell/next-security-headers.cjs'),
    "{ key: 'X-SSOO-Release-SHA', value: releaseSha }",
    'shared Next.js security headers must expose the baked release commit',
  );
  assertIncludes(
    localCompose,
    'AUTH_ALLOW_INSECURE_PRODUCTION_DEFAULTS: "true"',
    'local compose must own the explicit localhost-only bypass',
  );
  for (const marker of [
    'ports: !reset []',
    'env_file: !reset []',
    '127.0.0.1:4000:4000',
    'AUTH_SESSION_COOKIE_SECURE=true',
    'AUTH_EMAIL_OUTBOX_WORKER_ENABLED:?Set AUTH_EMAIL_OUTBOX_WORKER_ENABLED=true',
    'AUTH_EMAIL_SMTP_HOST:?Set AUTH_EMAIL_SMTP_HOST',
    'AUTH_EMAIL_FROM_ADDRESS:?Set AUTH_EMAIL_FROM_ADDRESS',
    'DB_INIT_BASELINE_MODE: strict',
    'DMS_MARKDOWN_HOST_PATH:?Set absolute DMS_MARKDOWN_HOST_PATH',
    'dms-restore-verify:',
    'DMS_BACKUP_ARCHIVE_ROOT:?Set absolute DMS_BACKUP_ARCHIVE_ROOT',
    'entrypoint: ["node", "scripts/verify-dms-backup-restore.mjs"]',
    'SSOO_RELEASE_SHA:?Set SSOO_RELEASE_SHA to the release commit',
  ]) {
    assertIncludes(productionCompose, marker, `production compose contract must include ${marker}`);
  }
  for (const variable of [
    'NEXT_PUBLIC_ADMIN_APP_URL',
    'NEXT_PUBLIC_CRM_APP_URL',
    'NEXT_PUBLIC_PMS_APP_URL',
    'NEXT_PUBLIC_DMS_APP_URL',
    'NEXT_PUBLIC_SNS_APP_URL',
  ]) {
    assertIncludes(productionCompose, variable, `production compose must bind ${variable}`);
    for (const app of ['admin', 'crm', 'pms', 'dms', 'sns']) {
      assertIncludes(
        readRepoFile(`apps/web/${app}/Dockerfile`),
        `ARG ${variable}=`,
        `${app} Dockerfile must compile ${variable}`,
      );
    }
  }
  assertIncludes(
    packageJson,
    'pnpm run docker:local:config && bash scripts/storage/docker-job.sh local up',
    'local Docker package entrypoint must use the local overlay',
  );
  assertIncludes(
    packageJson,
    'pnpm run docker:production:config && bash scripts/storage/docker-job.sh production up',
    'production Docker package entrypoint must use the production overlay',
  );
}

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assertIncludes(content, expected, label) {
  if (!content.includes(expected)) {
    throw new Error(label);
  }
}

function createValidFixture(paths) {
  const postgresPassword = 'Db7Qp2Lm9Vr4Tx8Nc6Hs3Kw5Za1Y';
  const appOrigins = {
    admin: 'https://admin.ssoo.internal',
    crm: 'https://crm.ssoo.internal',
    pms: 'https://pms.ssoo.internal',
    dms: 'https://dms.ssoo.internal',
    sns: 'https://sns.ssoo.internal',
  };
  return {
    SSOO_RELEASE_SHA: '208acbe2c93b7218f2011820391234567890abcd',
    POSTGRES_DB: 'ssoo_prod',
    POSTGRES_USER: 'ssoo',
    POSTGRES_PASSWORD: postgresPassword,
    DOCKER_DATABASE_URL: `postgresql://ssoo:${postgresPassword}@postgres:5432/ssoo_prod?schema=public`,
    DOCKER_DMS_DATABASE_URL: `postgresql://ssoo:${postgresPassword}@postgres:5432/ssoo_prod?schema=public`,
    CORS_ORIGIN: Object.values(appOrigins).join(','),
    AUTH_PUBLIC_API_BASE_URL: 'https://api.ssoo.internal/api',
    AUTH_DEFAULT_LOGIN_URL: `${appOrigins.admin}/login`,
    AUTH_TRUST_FORWARD_HEADERS: 'false',
    AUTH_ALLOW_INSECURE_PRODUCTION_DEFAULTS: 'false',
    JWT_SECRET: 'N8f3vQ2xL7mK5pT9cR4sW6yB1hD0zJUa',
    JWT_REFRESH_SECRET: 'T4b9mZ1qV6xC8nL2sK7pR5wH3dF0yJGc',
    AUTH_OAUTH_STATE_SIGNING_SECRET: 'C7k2pW9rM4xT1vL8nQ5sZ3hB6dF0yJUa',
    AUTH_CONFIG_ENCRYPTION_KEY: 'V5m8qL2tR7xC1pK9sN4wZ6hB3dF0yJGc',
    AUTH_EMAIL_OUTBOX_WORKER_ENABLED: 'true',
    AUTH_EMAIL_SMTP_HOST: 'smtp.ssoo.internal',
    AUTH_EMAIL_SMTP_PORT: '587',
    AUTH_EMAIL_SMTP_SECURE: 'false',
    AUTH_EMAIL_SMTP_USERNAME: 'ssoo-auth-mailer',
    AUTH_EMAIL_SMTP_PASSWORD: 'Smtp7pQ2Lm9Vr4Tx8Nc6Hs3Kw5Za1Y',
    AUTH_EMAIL_FROM_ADDRESS: 'no-reply@ssoo.internal',
    AUTH_SESSION_COOKIE_SECURE: 'true',
    AUTH_SESSION_COOKIE_SAME_SITE: 'lax',
    AUTH_SESSION_COOKIE_DOMAIN: '.ssoo.internal',
    ADMIN_NEXT_PUBLIC_API_URL: 'https://api.ssoo.internal/api',
    CRM_NEXT_PUBLIC_API_URL: 'https://api.ssoo.internal/api',
    PMS_NEXT_PUBLIC_API_URL: 'https://api.ssoo.internal/api',
    DMS_NEXT_PUBLIC_API_URL: 'https://api.ssoo.internal/api',
    SNS_NEXT_PUBLIC_API_URL: 'https://api.ssoo.internal/api',
    DMS_NEXT_PUBLIC_WS_URL: 'wss://api.ssoo.internal',
    NEXT_PUBLIC_ADMIN_APP_URL: appOrigins.admin,
    NEXT_PUBLIC_CRM_APP_URL: appOrigins.crm,
    NEXT_PUBLIC_PMS_APP_URL: appOrigins.pms,
    NEXT_PUBLIC_DMS_APP_URL: appOrigins.dms,
    NEXT_PUBLIC_SNS_APP_URL: appOrigins.sns,
    DMS_MARKDOWN_HOST_PATH: paths.markdown,
    DMS_INGEST_HOST_PATH: paths.ingest,
    DMS_STORAGE_LOCAL_HOST_PATH: paths.storage,
    DMS_BACKUP_ARCHIVE_ROOT: paths.backup,
    DMS_BACKUP_ARCHIVE_NAME: 'dms-launch-backup-20260813T120000Z.tar.gz',
    DMS_BACKUP_RETENTION_DAYS: '30',
    DMS_INSTANCE_ENV: 'prod',
    DMS_GIT_PROD_REMOTE_URL: 'ssh://git@git.ssoo.internal/LSITC_WEB/LSWIKI_DOC.git',
    DMS_AI_RAG_LAUNCH_MODE: 'exempted_external_provider',
    AZURE_USE_MANAGED_IDENTITY: 'false',
  };
}

function assertNoIssues(issues, label) {
  if (issues.length > 0) {
    throw new Error(`${label} unexpectedly failed: ${issues.map((issue) => issue.key).join(', ')}`);
  }
}

function assertHasIssue(issues, key, label) {
  if (!issues.some((issue) => issue.key === key)) {
    throw new Error(`${label} did not report ${key}`);
  }
}

function printUsage() {
  console.log(`Usage: node scripts/verify-production-compose-env.mjs [options]

Options:
  --env-file <path>       Environment file to validate (default: .env.production)
  --allow-missing-paths   Validate path shape without requiring directories to exist
  --self-test             Run isolated positive and negative fixtures
  --help                  Show this help

The verifier reports variable names and requirements only. It never prints values.`);
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
