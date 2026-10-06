#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`missing required file: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function loadContract() {
  return {
    base: read('compose.yaml'),
    local: read('compose.local.yaml'),
    localTest: read('compose.local-test.yaml'),
    staging: read('compose.staging.yaml'),
    production: read('compose.production.yaml'),
    pipeline: read('.gitlab-ci.yml'),
    packageJson: read('package.json'),
    serverEntrypoint: read('docker/node-tls-ca-entrypoint.sh'),
    dmsModule: read('apps/server/src/modules/dms/dms.module.ts'),
    healthController: read('apps/server/src/modules/common/health/health.controller.ts'),
  };
}

function requireIncludes(content, marker, label) {
  if (!content.includes(marker)) {
    throw new Error(`${label} is missing required marker: ${marker}`);
  }
}

function requireExcludes(content, marker, label) {
  if (content.includes(marker)) {
    throw new Error(`${label} contains forbidden marker: ${marker}`);
  }
}

function verifyContract(contract) {
  requireIncludes(contract.base, 'DMS_INSTANCE_ENV: ""', 'compose.yaml');
  requireIncludes(contract.base, 'DMS_GIT_BOOTSTRAP_REMOTE_URL: ""', 'compose.yaml');
  requireIncludes(contract.base, '/api/health/core-readiness', 'compose.yaml');
  requireIncludes(contract.base, 'source: dms_git_http_credentials', 'compose.yaml');
  requireIncludes(contract.base, 'DMS_GIT_HTTP_AUTH_SCOPE: ${DMS_GIT_HTTP_AUTH_SCOPE:-}', 'compose.yaml');
  requireExcludes(contract.base, 'DMS_INSTANCE_ENV: ${DMS_INSTANCE_ENV:-prod}', 'compose.yaml');

  requireIncludes(contract.local, 'DMS_INSTANCE_ENV: "dev"', 'compose.local.yaml');
  requireIncludes(contract.local, 'DMS_GIT_BOOTSTRAP_REMOTE_URL: ""', 'compose.local.yaml');
  requireExcludes(contract.local, 'DMS_INSTANCE_ENV: ${', 'compose.local.yaml');

  requireIncludes(contract.localTest, 'DMS_INSTANCE_ENV: "local-test"', 'compose.local-test.yaml');
  requireIncludes(contract.localTest, 'DMS_GIT_BOOTSTRAP_REMOTE_URL: ""', 'compose.local-test.yaml');
  requireIncludes(contract.localTest, 'volumes: !override', 'compose.local-test.yaml');
  for (const marker of [
    'POSTGRES_DB: ssoo_local_test',
    'dms-local-test-postgres:/var/lib/postgresql/data',
    '@postgres:5432/ssoo_local_test?schema=public',
    'dms-local-test-documents:/var/lib/ssoo/documents',
    'dms-local-test-ingest:/var/lib/ssoo/document-ingest',
    'dms-local-test-storage:/var/lib/ssoo/document-storage/local',
    'name: ssoo-dms-local-test-postgres',
    'name: ssoo-dms-local-test-documents',
    'name: ssoo-dms-local-test-ingest',
    'name: ssoo-dms-local-test-storage',
  ]) {
    requireIncludes(contract.localTest, marker, 'compose.local-test.yaml');
  }
  requireExcludes(contract.localTest, 'DMS_INSTANCE_ENV: ${', 'compose.local-test.yaml');
  requireExcludes(contract.localTest, 'DMS_GIT_BOOTSTRAP_REMOTE_URL: ${', 'compose.local-test.yaml');
  requireExcludes(contract.localTest, '@postgres:5432/ssoo_dev?', 'compose.local-test.yaml');

  requireIncludes(contract.staging, 'DMS_INSTANCE_ENV: "prod"', 'compose.staging.yaml');
  requireIncludes(contract.staging, 'DMS_GIT_BOOTSTRAP_REMOTE_URL: ""', 'compose.staging.yaml');
  requireExcludes(contract.staging, 'DMS_INSTANCE_ENV: ${', 'compose.staging.yaml');
  requireExcludes(contract.staging, 'DMS_GIT_BOOTSTRAP_REMOTE_URL: ${', 'compose.staging.yaml');
  requireIncludes(contract.pipeline, 'COMPOSE_FILE: "compose.yaml:compose.staging.yaml"', '.gitlab-ci.yml');

  requireIncludes(
    contract.production,
    'DMS_INSTANCE_ENV: ${DMS_INSTANCE_ENV:?Set DMS_INSTANCE_ENV=prod}',
    'compose.production.yaml',
  );
  requireIncludes(
    contract.production,
    'DMS_GIT_BOOTSTRAP_REMOTE_URL: ${DMS_GIT_BOOTSTRAP_REMOTE_URL:-}',
    'compose.production.yaml',
  );

  const scripts = JSON.parse(contract.packageJson).scripts;
  const expectedScripts = {
    'verify:dms-runtime-profile-contract': 'node scripts/verify-dms-runtime-profile-contract.mjs',
    'verify:dms-runtime-profile-contract:self-test': 'node scripts/verify-dms-runtime-profile-contract.mjs --self-test',
    'docker:local:config': 'pnpm run verify:dms-runtime-profile-contract && docker compose -f compose.yaml -f compose.local.yaml config --quiet',
    'docker:local-test:config': 'pnpm run verify:dms-runtime-profile-contract && docker compose -f compose.yaml -f compose.local.yaml -f compose.local-test.yaml config --quiet',
  };
  for (const [name, expected] of Object.entries(expectedScripts)) {
    if (scripts[name] !== expected) {
      throw new Error(`package.json script ${name} must equal: ${expected}`);
    }
  }
  requireIncludes(scripts['docker:build'] ?? '', 'pnpm run docker:local:config &&', 'docker:build');
  requireIncludes(scripts['docker:up'] ?? '', 'pnpm run docker:local:config &&', 'docker:up');
  requireIncludes(scripts['docker:local-test:up'] ?? '', 'pnpm run docker:local-test:config &&', 'docker:local-test:up');
  requireIncludes(
    scripts['dms:git-http-auth:prepare'] ?? '',
    'scripts/prepare-dms-git-http-auth.sh',
    'dms:git-http-auth:prepare',
  );
  requireIncludes(
    scripts['docker:production:config'] ?? '',
    'pnpm run verify:dms-runtime-profile-contract &&',
    'docker:production:config',
  );

  requireIncludes(
    contract.dmsModule,
    'requireDmsGitInitialization(() => gitService.initialize())',
    'DmsModule',
  );
  requireIncludes(contract.dmsModule, 'requireDmsControlPlaneSync(', 'DmsModule control-plane startup path');
  requireIncludes(contract.healthController, "readiness.status !== 'ready'", 'HealthController');
  requireIncludes(contract.healthController, "code: 'DMS_RUNTIME_NOT_READY'", 'HealthController');
  requireIncludes(
    contract.serverEntrypoint,
    'credential.${DMS_GIT_HTTP_AUTH_SCOPE}.helper',
    'server entrypoint scoped DMS Git credential helper',
  );
  requireIncludes(
    contract.serverEntrypoint,
    '/run/secrets/dms_git_http_credentials',
    'server entrypoint DMS Git credential secret',
  );
}

function expectRejected(baseContract, mutate, label) {
  const mutated = mutate({ ...baseContract });
  try {
    verifyContract(mutated);
  } catch {
    return;
  }
  throw new Error(`self-test did not reject: ${label}`);
}

try {
  const contract = loadContract();
  verifyContract(contract);

  if (process.argv.includes('--self-test')) {
    expectRejected(contract, (next) => ({
      ...next,
      local: next.local.replace('DMS_INSTANCE_ENV: "dev"', 'DMS_INSTANCE_ENV: ${DMS_INSTANCE_ENV:-dev}'),
    }), 'root .env interpolation leaking into local');
    expectRejected(contract, (next) => ({
      ...next,
      localTest: next.localTest.replace('DMS_INSTANCE_ENV: "local-test"', 'DMS_INSTANCE_ENV: "prod"'),
    }), 'local-test selecting prod');
    expectRejected(contract, (next) => ({
      ...next,
      base: next.base.replace('DMS_INSTANCE_ENV: ""', 'DMS_INSTANCE_ENV: ${DMS_INSTANCE_ENV:-prod}'),
    }), 'base compose owning a runtime role');
    expectRejected(contract, (next) => ({
      ...next,
      localTest: next.localTest.replace(
        'DMS_GIT_BOOTSTRAP_REMOTE_URL: ""',
        'DMS_GIT_BOOTSTRAP_REMOTE_URL: ${DMS_GIT_BOOTSTRAP_REMOTE_URL:-}',
      ),
    }), 'local-test attaching a bootstrap remote');
    expectRejected(contract, (next) => ({
      ...next,
      localTest: next.localTest.replace(
        'dms-local-test-postgres:/var/lib/postgresql/data',
        'ssoo-postgres-data:/var/lib/postgresql/data',
      ),
    }), 'local-test reusing the development database volume');
    expectRejected(contract, (next) => ({
      ...next,
      staging: next.staging.replace('DMS_INSTANCE_ENV: "prod"', 'DMS_INSTANCE_ENV: ${DMS_INSTANCE_ENV:-prod}'),
    }), 'root .env interpolation leaking into staging');
    expectRejected(contract, (next) => ({
      ...next,
      pipeline: next.pipeline.replace('COMPOSE_FILE: "compose.yaml:compose.staging.yaml"', ''),
    }), 'GitLab deploy running without the staging overlay');
  }

  console.log('[dms-runtime-profile-contract] PASS — runtime roles are isolated and startup/readiness fail closed');
} catch (error) {
  console.error(`[dms-runtime-profile-contract] FAIL — ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
