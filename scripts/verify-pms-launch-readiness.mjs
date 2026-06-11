#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const config = {
  skipRuntime: process.argv.includes('--skip-runtime'),
  apiBaseUrl: readOption('api-base-url', 'PMS_VERIFY_API_BASE_URL', 'http://localhost:4000/api'),
  webBaseUrl: readOption('web-base-url', 'PMS_VERIFY_WEB_BASE_URL', 'http://localhost:3000'),
};

async function main() {
  await verifySourceSurface();
  if (!config.skipRuntime) {
    await verifyRuntime();
  }
  console.log('✓ PMS launch readiness verification passed');
}

function readOption(name, envName, fallback) {
  const prefix = `--${name}=`;
  const cliValue = process.argv.find((arg) => arg.startsWith(prefix));
  if (cliValue) return cliValue.slice(prefix.length);
  return process.env[envName] || fallback;
}

async function verifySourceSurface() {
  const dashboard = await readText('apps/web/pms/src/components/pages/home/DashboardPage.tsx');
  const detail = await readText('apps/web/pms/src/components/pages/project/DetailPage.tsx');
  const queryIndex = await readText('apps/web/pms/src/hooks/queries/index.ts');
  const packageJson = await readText('package.json');

  assertIncludes(dashboard, 'PM 운영 포커스', 'dashboard exposes PM operating focus widget');
  assertIncludes(dashboard, '7일 이상 정체', 'dashboard surfaces stale active projects');
  assertIncludes(dashboard, '담당자 미지정', 'dashboard surfaces unowned active projects');
  assertIncludes(dashboard, '종료/전환 확인', 'dashboard surfaces closeout candidates');
  assertIncludes(detail, 'PM 실행 closeout', 'project detail exposes closeout panel');
  assertIncludes(detail, '막힌 조건', 'project detail shows blocking condition count');
  assertIncludes(detail, '종료 가능 여부', 'project detail shows readiness verdict');
  assertIncludes(queryIndex, 'useTransitionReadiness', 'query hook barrel exports transition readiness hook');
  assertIncludes(packageJson, 'verify:pms-launch', 'root package exposes PMS launch verification script');
}

async function verifyRuntime() {
  const health = await fetchJson(`${config.apiBaseUrl}/health`, { expectJson: false });
  if (health.status < 200 || health.status >= 300) {
    throw new Error(`server health failed: HTTP ${health.status}`);
  }

  const web = await fetchJson(config.webBaseUrl, { expectJson: false });
  if (web.status < 200 || web.status >= 400) {
    throw new Error(`PMS web failed: HTTP ${web.status}`);
  }
}

async function fetchJson(url, { expectJson }) {
  const response = await fetch(url);
  if (expectJson) return { status: response.status, data: await response.json() };
  await response.arrayBuffer();
  return { status: response.status };
}

async function readText(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    throw new Error(`required file missing: ${path} (${error.message})`);
  }
}

function assertIncludes(content, needle, label) {
  if (!content.includes(needle)) {
    throw new Error(`PMS readiness check failed: ${label}`);
  }
}

main().catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exit(1);
});
