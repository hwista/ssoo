#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const rootDir = process.cwd();
const sourceManifestPath = path.resolve(
  process.env.CRM_SOURCE_UIUX_MANIFEST
    || path.join(rootDir, 'docs/crm/evidence/source-uiux/ref-01/source-uiux-manifest.json'),
);
const outputDir = path.resolve(
  process.env.CRM_TARGET_UIUX_OUTPUT_DIR
    || path.join(rootDir, 'docs/crm/evidence/target-uiux/s12-audit'),
);
const crmBaseUrl = (process.env.CRM_TARGET_CRM_BASE_URL || 'http://127.0.0.1:3105').replace(/\/$/, '');
const adminBaseUrl = (process.env.CRM_TARGET_ADMIN_BASE_URL || 'http://127.0.0.1:3100').replace(/\/$/, '');
const loginId = process.env.CRM_TARGET_LOGIN_ID || 'admin';
const password = process.env.CRM_TARGET_PASSWORD || 'admin123!';
const desktopViewport = { width: 1440, height: 1000 };
const mobileViewport = { width: 390, height: 844 };
const koreanFontPath = path.resolve(process.env.CRM_TARGET_KOREAN_FONT || '/mnt/c/Windows/Fonts/malgun.ttf');
const koreanFontBuffer = fs.readFileSync(koreanFontPath);

const targets = [
  { uxId: 'UX-01', sourcePage: 'dashboard', ownerSurface: 'CRM /?sourceSurface=dashboard', baseUrl: crmBaseUrl, href: '/?sourceSurface=dashboard', readySelector: '[data-source-surface="dashboard"]', readyText: '삼성전자' },
  { uxId: 'UX-02', sourcePage: 'list', ownerSurface: 'CRM /?sourceSurface=list', baseUrl: crmBaseUrl, href: '/?sourceSurface=list', readySelector: '[data-source-surface="list"]', readyText: '삼성전자' },
  { uxId: 'UX-03', sourcePage: 'form', ownerSurface: 'CRM /?sourceSurface=form', baseUrl: crmBaseUrl, href: '/?sourceSurface=form&selected=crm-uiux-opp-001', readySelector: '[data-source-surface="form"]', readyValueSelector: '[data-source-surface="form"] input[placeholder="고객사명 입력"]' },
  { uxId: 'UX-04', sourcePage: 'contract-gen', ownerSurface: 'CRM /?sourceSurface=contract-document + DMS', baseUrl: crmBaseUrl, href: '/?sourceSurface=contract-document', readySelector: '[data-source-surface="contract-document"]', readyText: '사용 가능한 템플릿 변수' },
  { uxId: 'UX-05', sourcePage: 'contract-list', ownerSurface: 'CRM /contracts?sourceSurface=list', baseUrl: crmBaseUrl, href: '/contracts?sourceSurface=list', readySelector: '[data-source-surface="contract-list"]', readyText: '계약현황' },
  { uxId: 'UX-06', sourcePage: 'contract-form', ownerSurface: 'CRM /contracts?sourceSurface=form', baseUrl: crmBaseUrl, href: '/contracts?sourceSurface=form', readySelector: '[data-source-surface="contract-form"]', readyText: '계약 조회' },
  { uxId: 'UX-07', sourcePage: 'billing-actual', ownerSurface: 'CRM /contracts?sourceSurface=billing-actual', baseUrl: crmBaseUrl, href: '/contracts?sourceSurface=billing-actual', readySelector: '[data-source-billing-actual-ready="true"]', readyText: '계약청구실적 입력', readyValueSelector: '[data-source-billing-actual-ready="true"] input[placeholder="YYYY/MM"]' },
  { uxId: 'UX-08', sourcePage: 'biz-report', ownerSurface: 'CRM /contract-performance?mode=source-compatible', baseUrl: crmBaseUrl, href: '/contract-performance?mode=source-compatible', readySelector: '[data-source-surface="contract-performance"]', readyText: '계약대비실적 (월별)' },
  { uxId: 'UX-09', sourcePage: 'biz-plan', ownerSurface: 'CRM /business-plan?mode=source-compatible', baseUrl: crmBaseUrl, href: '/business-plan?mode=source-compatible', readySelector: '[data-source-surface="business-plan"]', readyText: '사업계획 등록' },
  { uxId: 'UX-10', sourcePage: 'bp-rpt', ownerSurface: 'CRM /business-plan-performance?mode=source-compatible', baseUrl: crmBaseUrl, href: '/business-plan-performance?mode=source-compatible', readySelector: '[data-source-surface="business-plan-performance"]', readyText: '사업계획대비실적 (월별)' },
  { uxId: 'UX-11', sourcePage: 'internal-cost', ownerSurface: 'CRM /cost-plan?sourceSurface=internal-cost', baseUrl: crmBaseUrl, href: '/cost-plan?sourceSurface=internal-cost', readySelector: '[data-source-surface="internal-cost"]', readyText: '내부원가 등록' },
  { uxId: 'UX-12', sourcePage: 'biz-year', ownerSurface: 'Admin /business-years?mode=source-compatible', baseUrl: adminBaseUrl, href: '/business-years?mode=source-compatible', readySelector: '[data-source-surface="business-years"]', readyText: '사업년도 관리' },
  { uxId: 'UX-13', sourcePage: 'ams-vendor', ownerSurface: 'CRM /cost-plan?sourceSurface=ams-vendor', baseUrl: crmBaseUrl, href: '/cost-plan?sourceSurface=ams-vendor', readySelector: '[data-source-surface="ams-vendor"]', readyText: '공급업체 관리' },
  { uxId: 'UX-14', sourcePage: 'ams-cost', ownerSurface: 'CRM /cost-plan?sourceSurface=ams-cost', baseUrl: crmBaseUrl, href: '/cost-plan?sourceSurface=ams-cost', readySelector: '[data-source-surface="ams-cost"]', readyText: '연간 외부원가' },
  { uxId: 'UX-15', sourcePage: 'codes', ownerSurface: 'Admin /codes?mode=source-compatible', baseUrl: adminBaseUrl, href: '/codes?mode=source-compatible', readySelector: '[data-source-surface="codes"]', readyText: '코드 관리' },
  { uxId: 'UX-16', sourcePage: 'company', ownerSurface: 'CRM /quote-settings?mode=source-compatible', baseUrl: crmBaseUrl, href: '/quote-settings?mode=source-compatible', readySelector: '[data-source-surface="company-profile"]', readyText: '회사 정보' },
  { uxId: 'UX-17', sourcePage: 'admin', ownerSurface: 'Admin /users?mode=source-compatible + shared profile/auth', baseUrl: adminBaseUrl, href: '/users?mode=source-compatible', readySelector: '[data-source-surface="users"]', readyText: '계정 관리' },
];
const requestedUxIds = new Set((process.env.CRM_TARGET_UIUX_IDS || '').split(',').map((value) => value.trim()).filter(Boolean));
const selectedTargets = requestedUxIds.size > 0
  ? targets.filter((target) => requestedUxIds.has(target.uxId))
  : targets;

function sha256File(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} must be valid JSON: ${error.message}`);
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function difference(left = [], right = []) {
  const normalizedRight = new Set(right.map(normalizeText));
  return unique(left.map(normalizeText)).filter((value) => value && !normalizedRight.has(value));
}

function makeDifferencePng(sourcePath, targetPath, outputPath) {
  const result = spawnSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', sourcePath, '-i', targetPath,
    '-filter_complex', 'blend=all_mode=difference', '-frames:v', '1', outputPath,
  ], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`ffmpeg visual difference failed: ${(result.stderr || result.stdout).trim()}`);
  }
}

async function extractDom(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const normalized = (element) => (element?.innerText || element?.textContent || '').replace(/\s+/g, ' ').trim();
    const roots = [...document.querySelectorAll('main')].filter(visible);
    const root = roots.at(-1) || document.body;
    const textOf = (selector) => [...root.querySelectorAll(selector)].filter(visible).map(normalized).filter(Boolean);
    const fields = [...root.querySelectorAll('input, select, textarea')].filter(visible).map((element) => {
      const explicit = element.id ? root.querySelector(`label[for="${CSS.escape(element.id)}"]`) : null;
      const wrapping = element.closest('label');
      return {
        id: element.id || null,
        name: element.getAttribute('name'),
        type: element.tagName === 'SELECT' ? 'select' : (element.getAttribute('type') || element.tagName.toLowerCase()),
        label: normalized(explicit || wrapping) || null,
        placeholder: element.getAttribute('placeholder'),
        disabled: element.disabled,
        readOnly: element.readOnly,
      };
    });
    return {
      title: normalized(root.querySelector('h1, h2') || document.querySelector('h1, h2')),
      sections: textOf('h1, h2, h3, legend'),
      fields,
      columns: textOf('th'),
      actions: [...root.querySelectorAll('button, a, [role="button"]')].filter(visible).map((element) => normalized(element) || element.getAttribute('aria-label') || element.getAttribute('title')).filter(Boolean),
      labels: textOf('label'),
    };
  });
}

async function ensureLogin(page, baseUrl) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'load' });
  if (!new URL(page.url()).pathname.startsWith('/login')) return;
  const loginInput = page.getByLabel('아이디', { exact: true });
  const next = await Promise.race([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000, waitUntil: 'commit' }).then(() => 'authenticated'),
    loginInput.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'login-form'),
  ]).catch(() => 'timeout');
  if (next === 'authenticated') return;
  if (next !== 'login-form') throw new Error(`${baseUrl} login bootstrap did not expose a form or authenticated redirect`);
  await page.waitForTimeout(500);
  const authTraffic = [];
  const recordAuthResponse = (response) => {
    const url = new URL(response.url());
    if (url.pathname.startsWith('/api/auth/')) {
      authTraffic.push(`${response.request().method()} ${url.pathname} -> ${response.status()}`);
    }
  };
  page.on('response', recordAuthResponse);
  await loginInput.fill(loginId);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  try {
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000, waitUntil: 'commit' });
    page.off('response', recordAuthResponse);
  } catch (error) {
    const visibleMessages = await page.locator('[role="alert"], [aria-live], .text-ssoo-danger, .text-destructive')
      .filter({ visible: true })
      .allTextContents()
      .catch(() => []);
    const bodyText = normalizeText(await page.locator('body').innerText().catch(() => '')).slice(0, 800);
    page.off('response', recordAuthResponse);
    throw new Error([
      `${baseUrl} login did not navigate away from ${page.url()}`,
      visibleMessages.length > 0 ? `visible messages: ${visibleMessages.map(normalizeText).filter(Boolean).join(' | ')}` : '',
      authTraffic.length > 0 ? `auth traffic: ${authTraffic.join(' | ')}` : 'auth traffic: none',
      bodyText ? `body: ${bodyText}` : '',
      error instanceof Error ? error.message : String(error),
    ].filter(Boolean).join(' — '));
  }
  await page.waitForTimeout(1_000);
}

async function captureViewport(page, tracker, url, viewport, outputPath, navigate = true, readyText = null, readySelector = null, readyValueSelector = null) {
  await page.setViewportSize(viewport);
  tracker.pageErrors.length = 0;
  tracker.consoleErrors.length = 0;
  tracker.unexpectedHttpFailures.length = 0;
  if (navigate) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1_000);
    if (new URL(page.url()).pathname.startsWith('/login')) {
      await ensureLogin(page, new URL(url).origin);
      tracker.pageErrors.length = 0;
      tracker.consoleErrors.length = 0;
      tracker.unexpectedHttpFailures.length = 0;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1_000);
    }
    if (new URL(page.url()).pathname.startsWith('/login')) {
      throw new Error(`${url} redirected to login after one authenticated retry`);
    }
    await page.addStyleTag({ content: `
      @font-face {
        font-family: "CRM Ralph Korean";
        src: url("/__crm_target_korean_font.ttf") format("truetype");
        font-style: normal;
        font-weight: 100 900;
      }
      body, button, input, select, textarea { font-family: "CRM Ralph Korean", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important; }
    ` });
    await page.evaluate(() => document.fonts.ready);
  } else {
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(750);
  }
  if (readySelector) {
    try {
      await page.locator(readySelector).filter({ visible: true }).first().waitFor({ state: 'visible', timeout: 20_000 });
    } catch (error) {
      const diagnosis = await page.evaluate(() => ({
        url: window.location.href,
        titles: [...document.querySelectorAll('h1, h2')].map((element) => element.textContent?.replace(/\s+/g, ' ').trim()).filter(Boolean),
        sourceSurfaces: [...document.querySelectorAll('[data-source-surface]')].map((element) => element.getAttribute('data-source-surface')),
        bodyText: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 900),
      })).catch(() => null);
      throw new Error(`ready selector ${readySelector} was not visible: ${JSON.stringify(diagnosis)} — ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (readyText) {
    await page.getByText(readyText, { exact: false }).filter({ visible: true }).first().waitFor({ state: 'visible', timeout: 20_000 });
  }
  if (readyValueSelector) {
    await page.waitForFunction((selector) => [...document.querySelectorAll(selector)].some((element) => (
      element instanceof HTMLInputElement
      && element.getClientRects().length > 0
      && element.value.trim().length > 0
    )), readyValueSelector, { timeout: 20_000 });
  }
  await page.screenshot({ path: outputPath, fullPage: false });
  const documentOverflowPx = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  return {
    viewport,
    pageErrors: unique(tracker.pageErrors),
    consoleErrors: unique(tracker.consoleErrors),
    unexpectedHttpFailures: unique(tracker.unexpectedHttpFailures),
    documentOverflowPx,
  };
}

async function createAuthenticatedRuntime(browser, baseUrl) {
  const context = await browser.newContext({ viewport: desktopViewport });
  await context.route('**/__crm_target_korean_font.ttf', async (route) => {
    await route.fulfill({ status: 200, contentType: 'font/ttf', body: koreanFontBuffer });
  });
  const page = await context.newPage();
  const tracker = { pageErrors: [], consoleErrors: [], unexpectedHttpFailures: [] };
  page.on('pageerror', (error) => tracker.pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') tracker.consoleErrors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) tracker.unexpectedHttpFailures.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) => {
    const errorText = request.failure()?.errorText ?? '';
    if (errorText === 'net::ERR_ABORTED') return;
    tracker.unexpectedHttpFailures.push(`FAILED ${request.url()} ${errorText}`);
  });
  await ensureLogin(page, baseUrl);
  return { context, page, tracker };
}

async function main() {
  if (!fs.existsSync(sourceManifestPath)) throw new Error(`source manifest not found: ${sourceManifestPath}`);
  fs.mkdirSync(outputDir, { recursive: true });
  const sourceManifest = readJson(sourceManifestPath, 'source manifest');
  const sourceDirectory = path.dirname(sourceManifestPath);
  const sourceByUx = new Map((sourceManifest.captures ?? []).map((capture) => [capture.uxId, capture]));
  const browser = await chromium.launch({ headless: true });
  const runtimes = new Map();

  try {
    const capturesById = new Map();
    for (const baseUrl of [...new Set(selectedTargets.map((target) => target.baseUrl))]) {
      const runtime = await createAuthenticatedRuntime(browser, baseUrl);
      runtimes.set(baseUrl, runtime);
      for (const target of selectedTargets.filter((entry) => entry.baseUrl === baseUrl)) {
        const { page, tracker } = runtime;
      const sourceCapture = sourceByUx.get(target.uxId);
      if (!sourceCapture) throw new Error(`${target.uxId} missing from source manifest`);
      const sourceStateManifestPath = path.join(sourceDirectory, sourceCapture.stateManifest);
      const sourceStateManifest = readJson(sourceStateManifestPath, `${target.uxId} source state manifest`);
      const normalState = sourceStateManifest.states.find((state) => state.screenshot === sourceCapture.screenshot)
        || sourceStateManifest.states[0];
      const basename = `${target.uxId.toLowerCase()}-${target.sourcePage}`;
      const desktopScreenshot = `${basename}--audit-desktop.png`;
      const mobileScreenshot = `${basename}--audit-mobile.png`;
      const differenceScreenshot = `${basename}--audit-difference.png`;
      const domManifest = `${basename}--audit.dom.json`;
      const url = `${target.baseUrl}${target.href}`;
      const desktopGate = await captureViewport(page, tracker, url, desktopViewport, path.join(outputDir, desktopScreenshot), true, target.readyText, target.readySelector, target.readyValueSelector);
      const targetDom = await extractDom(page);
      fs.writeFileSync(path.join(outputDir, domManifest), `${JSON.stringify(targetDom, null, 2)}\n`);
      const mobileGate = await captureViewport(page, tracker, url, mobileViewport, path.join(outputDir, mobileScreenshot), false, target.readyText, target.readySelector, target.readyValueSelector);
      const sourceDom = readJson(path.join(sourceDirectory, sourceCapture.domManifest), `${target.uxId} source DOM manifest`);
      const sourceScreenshotPath = path.join(sourceDirectory, normalState.screenshot);
      makeDifferencePng(sourceScreenshotPath, path.join(outputDir, desktopScreenshot), path.join(outputDir, differenceScreenshot));
      const sourceFieldLabels = (sourceDom.fields ?? []).map((field) => field.label || field.placeholder || field.id);
      const targetFieldLabels = (targetDom.fields ?? []).map((field) => field.label || field.placeholder || field.id);
      const requiredStateIds = sourceStateManifest.requiredForTargetComparison.map((state) => state.id);
      const audit = {
        normalStateId: normalState.name,
        sourceScreenshot: normalState.screenshot,
        targetDesktopScreenshot: desktopScreenshot,
        targetMobileScreenshot: mobileScreenshot,
        differenceScreenshot,
        targetDomManifest: domManifest,
        missingStateIds: requiredStateIds.filter((id) => id !== normalState.name),
        structureDiff: {
          missingSections: difference(sourceDom.sections, targetDom.sections),
          missingFields: difference(sourceFieldLabels, targetFieldLabels),
          missingColumns: difference(sourceDom.columns, targetDom.columns),
          missingActions: difference(sourceDom.actions, targetDom.actions),
          missingLabels: difference(sourceDom.labels, targetDom.labels),
          renamedMeaning: [],
          reorderedWorkflow: [],
          defaultBehaviorDifferences: [],
          unclassified: ['audit-only exact text diff requires human classification'],
          defects: [],
          classifiedDifferences: [],
        },
        desktopBrowserGate: desktopGate,
        mobileBrowserGate: mobileGate,
        evidenceSha256: {
          source: sha256File(sourceScreenshotPath),
          targetDesktop: sha256File(path.join(outputDir, desktopScreenshot)),
          targetMobile: sha256File(path.join(outputDir, mobileScreenshot)),
          difference: sha256File(path.join(outputDir, differenceScreenshot)),
          targetDom: sha256File(path.join(outputDir, domManifest)),
        },
      };
      capturesById.set(target.uxId, {
        uxId: target.uxId,
        sourcePage: target.sourcePage,
        status: 'partial',
        ownerSurface: target.ownerSurface,
        targetUrl: url,
        capturedAt: new Date().toISOString(),
        audit,
      });
      console.log(`audited ${target.uxId} ${url}`);
      }
    }
    const captures = selectedTargets.map((target) => capturesById.get(target.uxId));
    const manifest = {
      version: 1,
      kind: requestedUxIds.size > 0 ? 'subset-target-uiux-audit' : 'partial-target-uiux-audit',
      sourceManifestSha256: sha256File(sourceManifestPath),
      generatedAt: new Date().toISOString(),
      captureCommand: 'pnpm run capture:crm-target-uiux-audit',
      runtime: { crmBaseUrl, adminBaseUrl, loginId, passwordPersisted: false, uxIds: selectedTargets.map((target) => target.uxId) },
      captures,
    };
    const manifestPath = path.join(outputDir, 'target-uiux-parity-manifest.json');
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`wrote ${manifestPath}`);
  } finally {
    await Promise.all([...runtimes.values()].map(({ context }) => context.close()));
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`CRM target UI/UX audit capture failed: ${error.stack || error.message}`);
  process.exitCode = 1;
});
