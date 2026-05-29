import { defineConfig } from '@playwright/test';
import { resolve } from 'path';

const automationDir = __dirname;
const repoRoot = resolve(automationDir, '..');

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
    baseURL: 'http://127.0.0.1:3001',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'bash automation/scripts/playwright/start-dms-e2e-stack.sh',
    cwd: repoRoot,
    url: 'http://127.0.0.1:3001/login',
    reuseExistingServer: false,
    timeout: 10 * 60 * 1000,
  },
});
