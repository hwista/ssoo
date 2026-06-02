import { defineConfig } from '@playwright/test';
import { resolve } from 'path';

const automationDir = __dirname;
const repoRoot = resolve(automationDir, '..');
const dmsPort = process.env.PLAYWRIGHT_DMS_PORT ?? '3001';
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === '1'
  || process.env.PLAYWRIGHT_SKIP_WEB_SERVER === 'true';
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === '1'
  || process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === 'true';

export default defineConfig({
  testDir: resolve(automationDir, 'tests/e2e'),
  outputDir: resolve(repoRoot, 'test-results'),
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${dmsPort}`,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: skipWebServer ? undefined : {
      command: 'bash automation/scripts/playwright/start-dms-e2e-stack.sh',
      cwd: repoRoot,
      url: `http://127.0.0.1:${dmsPort}/login`,
      reuseExistingServer,
      timeout: 10 * 60 * 1000,
    },
});
