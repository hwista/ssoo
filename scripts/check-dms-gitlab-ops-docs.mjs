#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relPath) {
  const abs = path.join(root, relPath);
  if (!fs.existsSync(abs)) {
    throw new Error(`missing required document: ${relPath}`);
  }
  return fs.readFileSync(abs, 'utf8');
}

function requireIncludes(content, needles, label) {
  const missing = needles.filter((needle) => !content.includes(needle));
  if (missing.length > 0) {
    throw new Error(`${label} is missing required marker(s): ${missing.join(', ')}`);
  }
}

function requireRegex(content, checks, label) {
  const missing = checks.filter(({ name, pattern }) => !pattern.test(content)).map(({ name }) => name);
  if (missing.length > 0) {
    throw new Error(`${label} is missing required pattern(s): ${missing.join(', ')}`);
  }
}

try {
  const guidePath = 'docs/dms/guides/gitlab-document-sync.md';
  const guide = read(guidePath);

  requireIncludes(
    guide,
    [
      'DMS_INSTANCE_ENV',
      'DMS_GIT_PROD_REMOTE_URL',
      'DMS_GIT_DEV_REMOTE_URL',
      'DMS_GIT_BOOTSTRAP_REMOTE_URL',
      'DMS_GIT_BOOTSTRAP_BRANCH',
      'LSWIKI_DOC.git',
      'LSWIKI_DOC_DEV.git',
      'apps/server/src/modules/dms/dms.module.ts',
      'apps/server/src/modules/dms/runtime/dms-config.service.ts',
      'gitService.initialize()',
      'apps/server/src/modules/dms/runtime/git.service.ts',
      'pnpm run codex:workspace-sync-from-gitlab',
      'compose.yaml',
      '.env',
    ],
    guidePath,
  );

  requireRegex(
    guide,
    [
      { name: 'prod role mapping', pattern: /DMS_INSTANCE_ENV[^\n]+prod[^\n]+LSWIKI_DOC\.git/i },
      { name: 'dev role mapping', pattern: /DMS_INSTANCE_ENV[^\n]+dev[^\n]+LSWIKI_DOC_DEV\.git/i },
      { name: 'local-test remote empty mapping', pattern: /local-test[^\n]+remote-empty|local-test[^\n]+remote[^\n]+비워/i },
      { name: 'wrong remote blocking', pattern: /wrong-remote|wrong remote|mismatch[^\n]+차단|mutation 차단/i },
      { name: 'operator-owned env boundary', pattern: /운영자[^\n]+\.env[^\n]+DMS_INSTANCE_ENV/ },
      { name: 'phase out of scope boundary', pattern: /이번 묶음[^\n]+out of scope/ },
      { name: 'no secrets in docs', pattern: /secret|token|credential|값은 기록하지 않는다/i },
    ],
    guidePath,
  );

  const operations = read('docs/dms/guides/operations.md');
  requireIncludes(
    operations,
    [
      'docs/dms/guides/gitlab-document-sync.md',
      'DMS GitLab 문서 자동 싱크',
      'DMS_INSTANCE_ENV',
      'DMS_GIT_PROD_REMOTE_URL',
      'DMS_GIT_DEV_REMOTE_URL',
      'DMS 챗봇 / Azure OpenAI 환경변수',
      'AZURE_OPENAI_ENDPOINT',
      'AZURE_OPENAI_DEPLOYMENT',
      'AZURE_OPENAI_EMBEDDING_DEPLOYMENT',
    ],
    'docs/dms/guides/operations.md',
  );

  const compose = read('compose.yaml');
  requireIncludes(
    compose,
    [
      'DMS_INSTANCE_ENV: ${DMS_INSTANCE_ENV:-prod}',
      'DMS_GIT_PROD_REMOTE_URL: ${DMS_GIT_PROD_REMOTE_URL:-http://10.125.31.72:8010/LSITC_WEB/LSWIKI_DOC.git}',
      'DMS_GIT_DEV_REMOTE_URL: ${DMS_GIT_DEV_REMOTE_URL:-git@10.125.31.72:LSITC_WEB/LSWIKI_DOC_DEV.git}',
      'DMS_GIT_BOOTSTRAP_REMOTE_URL: ${DMS_GIT_BOOTSTRAP_REMOTE_URL:-}',
      'DMS_GIT_BOOTSTRAP_BRANCH: ${DMS_GIT_BOOTSTRAP_BRANCH:-master}',
      'AZURE_OPENAI_ENDPOINT: ${AZURE_OPENAI_ENDPOINT:-}',
      'AZURE_OPENAI_DEPLOYMENT: ${AZURE_OPENAI_DEPLOYMENT:-}',
      'AZURE_OPENAI_EMBEDDING_DEPLOYMENT: ${AZURE_OPENAI_EMBEDDING_DEPLOYMENT:-}',
      'OPENAI_API_VERSION: ${OPENAI_API_VERSION:-2024-10-21}',
      'AZURE_USE_MANAGED_IDENTITY: ${AZURE_USE_MANAGED_IDENTITY:-true}',
      'AZURE_OPENAI_API_KEY: ${AZURE_OPENAI_API_KEY:-}',
    ],
    'compose.yaml',
  );

  const envExample = read('.env.example');
  requireIncludes(
    envExample,
    [
      'DMS_INSTANCE_ENV=dev',
      'DMS_GIT_PROD_REMOTE_URL=http://10.125.31.72:8010/LSITC_WEB/LSWIKI_DOC.git',
      'DMS_GIT_DEV_REMOTE_URL=git@10.125.31.72:LSITC_WEB/LSWIKI_DOC_DEV.git',
      'DMS_GIT_BOOTSTRAP_REMOTE_URL=',
      'DMS_GIT_BOOTSTRAP_BRANCH=master',
      'AZURE_OPENAI_ENDPOINT=',
      'AZURE_OPENAI_DEPLOYMENT=',
      'AZURE_OPENAI_EMBEDDING_DEPLOYMENT=',
      'OPENAI_API_VERSION=2024-10-21',
      'AZURE_USE_MANAGED_IDENTITY=true',
      'AZURE_MANAGED_IDENTITY_CLIENT_ID=',
    ],
    '.env.example',
  );

  const changelog = read('docs/dms/planning/changelog.md');
  requireIncludes(
    changelog,
    [
      'DMS GitLab 문서 자동 싱크 운영 가이드',
      'DMS_INSTANCE_ENV',
      'LSWIKI_DOC.git',
      'LSWIKI_DOC_DEV.git',
    ],
    'docs/dms/planning/changelog.md',
  );

  console.log('[dms-gitlab-ops-docs] PASS — GitLab document sync operator guide is present and guarded');
} catch (error) {
  console.error(`[dms-gitlab-ops-docs] FAIL — ${error.message}`);
  process.exit(1);
}
