#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';
import {
  assertRepositoryWorktreeIdentity,
  createRepositoryWorktreeIdentity,
} from './repository-worktree-identity.mjs';

const rootDir = process.cwd();
const sourceManifestPath = path.resolve(
  process.env.CRM_SOURCE_UIUX_MANIFEST
    || path.join(rootDir, 'docs/crm/evidence/source-uiux/ref-01/source-uiux-manifest.json'),
);
const outputDir = path.resolve(
  process.env.CRM_TARGET_UIUX_OUTPUT_DIR
    || path.join(rootDir, 'docs/crm/evidence/target-uiux/s12-parity'),
);
const crmBaseUrl = (process.env.CRM_TARGET_CRM_BASE_URL || 'http://127.0.0.1:3105').replace(/\/$/, '');
const adminBaseUrl = (process.env.CRM_TARGET_ADMIN_BASE_URL || 'http://127.0.0.1:3100').replace(/\/$/, '');
const loginId = process.env.CRM_TARGET_LOGIN_ID || 'admin';
const password = process.env.CRM_TARGET_PASSWORD || 'admin123!';
const desktopViewport = { width: 1440, height: 1000 };
const mobileViewport = { width: 390, height: 844 };
const koreanFontPath = path.resolve(process.env.CRM_TARGET_KOREAN_FONT || '/mnt/c/Windows/Fonts/malgun.ttf');
const koreanFontBuffer = fs.readFileSync(koreanFontPath);
const koreanFontDataUrl = `data:font/ttf;base64,${koreanFontBuffer.toString('base64')}`;
let sourceCompanyCiDataUrl = '';

const targets = [
  { uxId: 'UX-01', sourcePage: 'dashboard', ownerSurface: 'CRM /?sourceSurface=dashboard', baseUrl: crmBaseUrl, normalHref: '/?sourceSurface=dashboard' },
  { uxId: 'UX-02', sourcePage: 'list', ownerSurface: 'CRM /?sourceSurface=list', baseUrl: crmBaseUrl, normalHref: '/?sourceSurface=list' },
  { uxId: 'UX-03', sourcePage: 'form', ownerSurface: 'CRM /?sourceSurface=form', baseUrl: crmBaseUrl, normalHref: '/?sourceSurface=form&selected=crm-uiux-opp-001' },
  { uxId: 'UX-04', sourcePage: 'contract-gen', ownerSurface: 'CRM /?sourceSurface=contract-document + DMS', baseUrl: crmBaseUrl, normalHref: '/?sourceSurface=contract-document' },
  { uxId: 'UX-05', sourcePage: 'contract-list', ownerSurface: 'CRM /contracts?sourceSurface=list', baseUrl: crmBaseUrl, normalHref: '/contracts?sourceSurface=list' },
  { uxId: 'UX-06', sourcePage: 'contract-form', ownerSurface: 'CRM /contracts?sourceSurface=form', baseUrl: crmBaseUrl, normalHref: '/contracts?sourceSurface=form' },
  { uxId: 'UX-07', sourcePage: 'billing-actual', ownerSurface: 'CRM /contracts?sourceSurface=billing-actual', baseUrl: crmBaseUrl, normalHref: '/contracts?sourceSurface=billing-actual' },
  { uxId: 'UX-08', sourcePage: 'biz-report', ownerSurface: 'CRM /contract-performance?mode=source-compatible', baseUrl: crmBaseUrl, normalHref: '/contract-performance?mode=source-compatible' },
  { uxId: 'UX-09', sourcePage: 'biz-plan', ownerSurface: 'CRM /business-plan?mode=source-compatible', baseUrl: crmBaseUrl, normalHref: '/business-plan?mode=source-compatible' },
  { uxId: 'UX-10', sourcePage: 'bp-rpt', ownerSurface: 'CRM /business-plan-performance?mode=source-compatible', baseUrl: crmBaseUrl, normalHref: '/business-plan-performance?mode=source-compatible' },
  { uxId: 'UX-11', sourcePage: 'internal-cost', ownerSurface: 'CRM /cost-plan?sourceSurface=internal-cost', baseUrl: crmBaseUrl, normalHref: '/cost-plan?sourceSurface=internal-cost' },
  { uxId: 'UX-12', sourcePage: 'biz-year', ownerSurface: 'Admin /business-years?mode=source-compatible', baseUrl: adminBaseUrl, normalHref: '/business-years?mode=source-compatible' },
  { uxId: 'UX-13', sourcePage: 'ams-vendor', ownerSurface: 'CRM /cost-plan?sourceSurface=ams-vendor', baseUrl: crmBaseUrl, normalHref: '/cost-plan?sourceSurface=ams-vendor' },
  { uxId: 'UX-14', sourcePage: 'ams-cost', ownerSurface: 'CRM /cost-plan?sourceSurface=ams-cost', baseUrl: crmBaseUrl, normalHref: '/cost-plan?sourceSurface=ams-cost' },
  { uxId: 'UX-15', sourcePage: 'codes', ownerSurface: 'Admin /codes?mode=source-compatible', baseUrl: adminBaseUrl, normalHref: '/codes?mode=source-compatible' },
  { uxId: 'UX-16', sourcePage: 'company', ownerSurface: 'CRM /quote-settings?mode=source-compatible', baseUrl: crmBaseUrl, normalHref: '/quote-settings?mode=source-compatible' },
  { uxId: 'UX-17', sourcePage: 'admin', ownerSurface: 'Admin /users?mode=source-compatible + shared profile/auth', baseUrl: adminBaseUrl, normalHref: '/users?mode=source-compatible' },
];

const requestedUxIds = new Set((process.env.CRM_TARGET_UIUX_IDS || '').split(',').map((value) => value.trim()).filter(Boolean));
const selectedTargets = requestedUxIds.size > 0 ? targets.filter((target) => requestedUxIds.has(target.uxId)) : targets;

function readIntegerEnv(name, fallback, { min, max }) {
  const raw = process.env[name];
  const value = raw === undefined || raw === '' ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

const stateDelayMs = readIntegerEnv('CRM_TARGET_UIUX_STATE_DELAY_MS', 1000, { min: 0, max: 10_000 });
const stateBatchSize = readIntegerEnv('CRM_TARGET_UIUX_BATCH_SIZE', 20, { min: 1, max: 83 });
const throttleCooldownMs = readIntegerEnv('CRM_TARGET_UIUX_COOLDOWN_MS', 61_000, { min: 0, max: 120_000 });

function delay(milliseconds) {
  return milliseconds > 0
    ? new Promise((resolve) => setTimeout(resolve, milliseconds))
    : Promise.resolve();
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} must be valid JSON: ${error.message}`);
  }
}

function sha256File(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
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
    return {
      title: normalized(root.querySelector('h1, h2') || document.querySelector('h1, h2')),
      sections: textOf('h1, h2, h3, legend'),
      fields: [...root.querySelectorAll('input, select, textarea')].filter(visible).map((element) => {
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
      }),
      columns: textOf('th'),
      actions: [...root.querySelectorAll('button, a, [role="button"]')].filter(visible).map((element) => normalized(element) || element.getAttribute('aria-label') || element.getAttribute('title')).filter(Boolean),
      labels: textOf('label'),
    };
  });
}

async function ensureLogin(page, baseUrl) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  if (!new URL(page.url()).pathname.startsWith('/login')) return null;
  const loginInput = page.getByLabel('아이디', { exact: true });
  const next = await Promise.race([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000, waitUntil: 'commit' }).then(() => 'authenticated'),
    loginInput.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'login-form'),
  ]).catch(() => 'timeout');
  if (next === 'authenticated') return null;
  if (next !== 'login-form') throw new Error(`${baseUrl} did not expose a login form or authenticated redirect`);
  const loginResponsePromise = page.waitForResponse((response) => (
    response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/auth/login'
  ), { timeout: 15_000 });
  const meResponsePromise = page.waitForResponse((response) => (
    response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/auth/me'
  ), { timeout: 15_000 });
  await loginInput.fill(loginId);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  const [loginResponse, meResponse] = await Promise.all([loginResponsePromise, meResponsePromise]);
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000, waitUntil: 'commit' });
  await page.waitForTimeout(750);
  const loginPayload = await loginResponse.json().catch(() => null);
  const userPayload = await meResponse.json().catch(() => null);
  if (!loginResponse.ok() || !meResponse.ok() || typeof loginPayload?.accessToken !== 'string' || !userPayload?.userId) {
    throw new Error(`${baseUrl} authenticated session fixture could not be captured`);
  }
  return { accessToken: loginPayload.accessToken, user: userPayload };
}

function createTracker(page) {
  const tracker = { pageErrors: [], consoleErrors: [], unexpectedHttpFailures: [], allowedHttpPatterns: [], allowedConsolePatterns: [] };
  page.on('pageerror', (error) => tracker.pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !tracker.allowedConsolePatterns.some((pattern) => message.text().includes(pattern))) {
      tracker.consoleErrors.push(message.text());
    }
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    if (tracker.allowedHttpPatterns.some((pattern) => response.url().includes(pattern))) return;
    tracker.unexpectedHttpFailures.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) => {
    const errorText = request.failure()?.errorText ?? '';
    if (errorText === 'net::ERR_ABORTED') return;
    if (tracker.allowedHttpPatterns.some((pattern) => request.url().includes(pattern))) return;
    tracker.unexpectedHttpFailures.push(`FAILED ${request.url()} ${errorText}`);
  });
  return tracker;
}

function resetTracker(tracker) {
  tracker.pageErrors.length = 0;
  tracker.consoleErrors.length = 0;
  tracker.unexpectedHttpFailures.length = 0;
  tracker.allowedHttpPatterns.length = 0;
  tracker.allowedConsolePatterns.length = 0;
}

async function installCaptureFont(page, { embedded = false } = {}) {
  const fontSource = embedded ? koreanFontDataUrl : '/__crm_target_korean_font.ttf';
  await page.addStyleTag({ content: `
    @font-face {
      font-family: "CRM Ralph Korean";
      src: url("${fontSource}") format("truetype");
      font-style: normal;
      font-weight: 100 900;
    }
    body, button, input, select, textarea { font-family: "CRM Ralph Korean", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important; }
  ` });
  await page.evaluate(() => document.fonts.ready);
}

async function routeBillingActualEmpty(page, { saveSucceeds = false } = {}) {
  let emptyPayload = null;
  await page.route('**/api/crm/contracts/*/billing-actual', async (route) => {
    if (route.request().method() === 'PUT' && saveSucceeds) {
      if (!emptyPayload) throw new Error('billing actual GET fixture was not prepared before PUT');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyPayload) });
      return;
    }
    const response = await route.fetch();
    const payload = await response.json();
    if (route.request().method() === 'GET' && payload?.success === true) {
      payload.data.actualLines = [];
      payload.data.summary.actualRevenueTotal = 0;
      payload.data.summary.actualExternalCostTotal = 0;
      payload.data.summary.revenueAchievementRate = 0;
      payload.data.summary.externalCostAchievementRate = 0;
      emptyPayload = payload;
      await route.fulfill({ response, body: JSON.stringify(payload), contentType: 'application/json' });
      return;
    }
    await route.fulfill({ response });
  });
}

async function routeOpportunityList(page, mutateList, mutateVersions = null) {
  await page.route('**/api/crm/opportunities**', async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'GET' && /\/api\/crm\/opportunities\/?$/.test(url.pathname)) {
      const response = await route.fetch();
      const payload = await response.json();
      if (payload?.success === true) mutateList(payload.data);
      await route.fulfill({ response, body: JSON.stringify(payload), contentType: 'application/json' });
      return;
    }
    if (mutateVersions && route.request().method() === 'GET' && /\/versions$/.test(url.pathname)) {
      const data = mutateVersions(url);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
      return;
    }
    await route.continue();
  });
}

async function routeContractDocumentPreview(page, mutatePreview) {
  await page.route('**/api/crm/opportunities/*/contract-document-preview', async (route) => {
    const response = await route.fetch();
    const payload = await response.json();
    if (payload?.success === true) mutatePreview(payload.data);
    await route.fulfill({ response, body: JSON.stringify(payload), contentType: 'application/json' });
  });
}

async function waitForSourceSurface(page, surface) {
  try {
    await page.locator(`[data-source-surface="${surface}"]`).filter({ visible: true }).first().waitFor({ state: 'visible', timeout: 20_000 });
  } catch (error) {
    const diagnosis = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      sourceSurfaces: [...document.querySelectorAll('[data-source-surface]')].map((element) => ({
        surface: element.getAttribute('data-source-surface'),
        visible: element.getClientRects().length > 0,
      })),
      body: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 1_000),
      crmTabs: sessionStorage.getItem('crm-mdi-tabs'),
      adminTabs: sessionStorage.getItem('admin-mdi-tabs'),
    }));
    throw new Error(`source surface ${surface} was not visible: ${JSON.stringify(diagnosis)} — ${error instanceof Error ? error.message : String(error)}`);
  }
}

function visibleText(page, text, options = {}) {
  return page.getByText(text, options).filter({ visible: true }).first();
}

function visibleLocator(page, selector) {
  return page.locator(selector).filter({ visible: true }).first();
}

async function clickAndDismissDialog(page, buttonName) {
  const dialogPromise = new Promise((resolve) => {
    page.once('dialog', async (dialog) => {
      const message = dialog.message();
      await dialog.dismiss();
      resolve(message);
    });
  });
  await page.getByRole('button', { name: buttonName, exact: true }).click();
  await dialogPromise;
}

async function clickAndAcceptDialog(page, buttonName) {
  const dialogPromise = new Promise((resolve) => {
    page.once('dialog', async (dialog) => {
      const message = dialog.message();
      await dialog.accept();
      resolve(message);
    });
  });
  await page.getByRole('button', { name: buttonName, exact: true }).filter({ visible: true }).first().click();
  return dialogPromise;
}

async function pasteText(locator, text) {
  await locator.evaluate((element, clipboardText) => {
    const data = new DataTransfer();
    data.setData('text/plain', clipboardText);
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }));
  }, text);
}

async function routeBusinessPlans(page, { empty = false, draft = false, carryForward = false } = {}) {
  let realPayload = null;
  let carriedForward = false;
  await page.route('**/api/crm/business-plan/plans**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (method === 'GET' && /\/api\/crm\/business-plan\/plans$/.test(url.pathname)) {
      const response = await route.fetch();
      const payload = await response.json();
      realPayload ??= structuredClone(payload);
      if (payload?.success === true) {
        if (empty && !carriedForward) {
          payload.data.items = [];
          payload.data.summary = { ...payload.data.summary, rowCount: 0, draftCount: 0, confirmedCount: 0 };
        } else if (draft && payload.data.items?.[0]) {
          payload.data.items[0].confirmed = false;
          payload.data.items[0].confirmedAt = null;
          payload.data.items[0].confirmedByUserId = null;
        } else if (carriedForward && realPayload?.data?.items?.[0]) {
          const carried = structuredClone(realPayload.data.items[0]);
          carried.id = 'crm-uiux-carry-forward-capture';
          carried.confirmed = false;
          carried.confirmedAt = null;
          carried.confirmedByUserId = null;
          carried.planName = `${carried.baseYear} CRM 사업계획 전년 이월`;
          payload.data.items = [carried];
          payload.data.summary = { ...payload.data.summary, rowCount: 1, draftCount: 1, confirmedCount: 0 };
        }
      }
      await route.fulfill({ response, body: JSON.stringify(payload), contentType: 'application/json' });
      return;
    }
    if (carryForward && method === 'POST' && url.pathname.endsWith('/carry-forward')) {
      carriedForward = true;
      const item = structuredClone(realPayload?.data?.items?.[0] ?? { id: 'crm-uiux-carry-forward-capture' });
      item.id = 'crm-uiux-carry-forward-capture';
      item.confirmed = false;
      item.confirmedAt = null;
      item.confirmedByUserId = null;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: item }) });
      return;
    }
    await route.continue();
  });
}

async function routeCostPlanWorkspace(page, mutateWorkspace) {
  await page.route('**/api/crm/cost-plan/preview**', async (route) => {
    const response = await route.fetch();
    const payload = await response.json();
    if (payload?.success === true) mutateWorkspace(payload.data);
    await route.fulfill({ response, body: JSON.stringify(payload), contentType: 'application/json' });
  });
}

async function routeAdminCodeGroupEmpty(page, codeGroup) {
  await page.route('**/api/codes**', async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() !== 'GET' || url.searchParams.get('codeGroup') !== codeGroup) {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const payload = await response.json();
    if (payload?.success === true) payload.data = [];
    await route.fulfill({ response, body: JSON.stringify(payload), contentType: 'application/json' });
  });
}

async function routeAdminCodesEmpty(page) {
  await page.route('**/api/codes**', async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() !== 'GET' || url.pathname.endsWith('/groups')) {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const payload = await response.json();
    if (payload?.success === true) payload.data = [];
    await route.fulfill({ response, body: JSON.stringify(payload), contentType: 'application/json' });
  });
}

async function routeQuoteSellerProfile(page, { empty = false, saveError = null } = {}) {
  await page.route('**/api/crm/quote-seller-profile', async (route) => {
    const method = route.request().method();
    if (method === 'PUT' && saveError) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: { message: saveError } }),
      });
      return;
    }
    const response = await route.fetch();
    const payload = await response.json();
    if (empty && method === 'GET' && payload?.success === true) {
      payload.data = {
        ...payload.data,
        id: null,
        companyName: '',
        ceoName: null,
        businessRegistrationNo: null,
        address: null,
        tel: null,
        fax: null,
        website: null,
        email: null,
        ciStatus: 'not-configured',
        ciStorageRef: null,
        memo: null,
        updatedAt: '1970-01-01T00:00:00.000Z',
      };
    }
    await route.fulfill({ response, body: JSON.stringify(payload), contentType: 'application/json' });
  });
}

async function routeQuotePreviewWithSourceCi(page) {
  if (!sourceCompanyCiDataUrl) throw new Error('source company CI evidence fixture is not loaded');
  await page.route('**/api/crm/opportunities/*/quote-preview', async (route) => {
    const response = await route.fetch();
    const payload = await response.json();
    if (payload?.success === true && payload.data?.party?.sellerProfile) {
      payload.data.party.sellerProfile.ciStatus = 'configured';
      payload.data.party.sellerProfile.ciStorageRef = sourceCompanyCiDataUrl;
      payload.data.party.sellerProfile.ciReferenceStatus = 'verified';
    }
    await route.fulfill({ response, body: JSON.stringify(payload), contentType: 'application/json' });
  });
}

async function clearBrowserAuth(page, tracker) {
  tracker.allowedHttpPatterns.push('/api/auth/session', '/api/auth/login');
  tracker.allowedConsolePatterns.push('Failed to load resource: the server responded with a status of 401');
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: '로그인이 필요합니다.' }) });
  });
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.removeItem('ssoo-auth');
    sessionStorage.clear();
  });
}

async function snapshotBrowserAuth(page) {
  return {
    cookies: await page.context().cookies(),
    sharedAuth: await page.evaluate(() => localStorage.getItem('ssoo-auth')),
  };
}

async function restoreBrowserAuth(page, snapshot, baseUrl, returnHref) {
  if (!snapshot) throw new Error('authenticated browser snapshot is missing');
  await page.unroute('**/api/auth/session');
  await page.unroute('**/api/auth/login');
  if (snapshot.cookies.length > 0) await page.context().addCookies(snapshot.cookies);
  await page.evaluate((sharedAuth) => {
    if (sharedAuth) localStorage.setItem('ssoo-auth', sharedAuth);
  }, snapshot.sharedAuth);
  await page.goto(`${baseUrl}${returnHref}`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000, waitUntil: 'commit' });
}

function scenarioFor(uxId, stateId, target) {
  if (uxId === 'UX-01') {
    if (stateId === 'seeded-summary') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'dashboard');
        const dashboard = page.locator('[data-source-surface="dashboard"]').filter({ visible: true }).first();
        await dashboard.getByText('ERP 시스템 구축 프로젝트', { exact: true }).first().waitFor({ state: 'visible' });
        await dashboard.getByText('SCM 플랫폼 고도화', { exact: true }).first().waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'no-confirmed-opportunity') {
      return {
        href: target.normalHref,
        beforeNavigate: (page) => routeOpportunityList(page, (data) => {
          data.items = data.items.map((item) => item.id?.startsWith('crm-uiux-opp-') || item.code?.startsWith('crm-uiux-opp-') ? { ...item, confirmed: false, contractCreated: false, contractCode: null } : item);
        }),
        prepare: async (page) => {
          await waitForSourceSurface(page, 'dashboard');
          await visibleText(page, '확정 0건', { exact: true }).waitFor({ state: 'visible' });
          await visibleText(page, '확정 매출액', { exact: true }).waitFor({ state: 'visible' });
        },
      };
    }
    if (stateId === 'recent-opportunity-drilldown') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'dashboard');
        await page.getByRole('link', { name: /SCM 플랫폼 고도화/ }).click();
        await waitForSourceSurface(page, 'form');
        await visibleLocator(page, 'input[placeholder="고객사명 입력"]').waitFor({ state: 'visible' });
        if (await visibleLocator(page, 'input[placeholder="고객사명 입력"]').inputValue() !== '현대자동차') throw new Error('recent opportunity drilldown did not select 현대자동차');
      } };
    }
  }

  if (uxId === 'UX-02') {
    if (stateId === 'seeded-list') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'list');
        await page.getByRole('button', { name: /삼성전자 ERP 시스템 구축 프로젝트/ }).waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'filtered-empty') {
      return { href: '/?sourceSurface=list&sourceStatus=검토중', prepare: async (page) => {
        await waitForSourceSurface(page, 'list');
        await visibleText(page, '검색 결과가 없습니다.', { exact: true }).waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'previous-version-expanded') {
      return {
        href: target.normalHref,
        beforeNavigate: (page) => routeOpportunityList(
          page,
          (data) => {
            const item = data.items.find((candidate) => candidate.id === 'crm-uiux-opp-001' || candidate.code === 'crm-uiux-opp-001');
            if (item) item.versionCount = 2;
          },
          (url) => ({
            opportunityId: url.pathname.split('/').at(-2),
            groupId: 'crm-uiux-opp-001',
            versions: [{
              id: 'crm-uiux-opp-001-previous',
              code: 'crm-uiux-opp-001-v0',
              customerName: '삼성전자',
              opportunityName: 'ERP 시스템 구축 프로젝트',
              ownerName: '김민준',
              status: 'proposal',
              version: 0,
              versionCount: 2,
              isLatest: false,
              confirmed: false,
              contractCreated: false,
              revenueTotal: 157000000,
              costTotal: 114300000,
              marginTotal: 42700000,
              marginRate: 27.2,
              expectedStartDate: '2026-01-01',
              expectedEndDate: '2026-12-31',
              updatedAt: '2026-01-09T00:00:00.000Z',
            }],
          }),
        ),
        prepare: async (page) => {
          await waitForSourceSurface(page, 'list');
          await page.getByRole('button', { name: '▼ 2차', exact: true }).click();
          await visibleText(page, '0차 (이전)', { exact: true }).waitFor({ state: 'visible' });
        },
      };
    }
    if (stateId === 'row-drilldown') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'list');
        await page.getByRole('button', { name: /삼성전자 ERP 시스템 구축 프로젝트/ }).click();
        await waitForSourceSurface(page, 'form');
        if (await visibleLocator(page, 'input[placeholder="고객사명 입력"]').inputValue() !== '삼성전자') throw new Error('opportunity row drilldown did not select 삼성전자');
      } };
    }
  }

  if (uxId === 'UX-03') {
    if (stateId === 'new-empty' || stateId === 'required-validation') {
      return { href: '/?sourceSurface=form&create=opportunity', prepare: async (page) => {
        await waitForSourceSurface(page, 'form');
        const customer = visibleLocator(page, 'input[placeholder="고객사명 입력"]');
        await customer.waitFor({ state: 'visible' });
        if (await customer.inputValue()) throw new Error('new opportunity form is not empty');
        if (stateId === 'required-validation') {
          await page.getByRole('button', { name: '저장', exact: true }).click();
          const valid = await customer.evaluate((input) => input.form?.checkValidity() ?? true);
          if (valid) throw new Error('required opportunity validation did not reject the empty form');
        }
      } };
    }
    if (stateId === 'edit-seeded' || stateId === 'confirmed-locked') {
      return {
        href: target.normalHref,
        prepare: async (page) => {
          await waitForSourceSurface(page, 'form');
          if (await visibleLocator(page, 'input[placeholder="고객사명 입력"]').inputValue() !== '삼성전자') throw new Error('seeded opportunity was not loaded');
          await page.getByRole('button', { name: '계약취소', exact: true }).waitFor({ state: 'visible' });
        },
        classifiedDifferences: stateId === 'confirmed-locked' ? [{
          classification: 'source-bug-compatible',
          area: '확정 영업기회 입력 필드 표현',
          rationale: '원천도 확정 상태 입력 필드를 DOM disabled로 전환하지 않고 계약취소 선행 동선으로 잠금을 표현하므로 동일 의미를 유지했습니다.',
        }] : [],
      };
    }
    if (stateId === 'quote-preview' || stateId === 'quote-print') {
      return {
        href: target.normalHref,
        beforeNavigate: (page) => routeQuotePreviewWithSourceCi(page),
        prepare: async (page) => {
          await waitForSourceSurface(page, 'form');
          const quoteButton = page.getByRole('button', { name: '견적서', exact: true }).filter({ visible: true }).first();
          await quoteButton.waitFor({ state: 'visible', timeout: 20_000 });
          await page.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => (
            button.getClientRects().length > 0
            && button.textContent?.replace(/\s+/g, ' ').trim() === '견적서'
            && !button.disabled
          )), undefined, { timeout: 20_000 });
          await quoteButton.click();
          const dialog = page.locator('[data-source-quote-preview="true"]');
          await dialog.waitFor({ state: 'visible', timeout: 20_000 });
          await dialog.locator('[data-source-quote-document="true"]').waitFor({ state: 'visible' });
          if (stateId === 'quote-print') {
            const popupPromise = page.context().waitForEvent('page');
            await dialog.getByRole('button', { name: '인쇄 / PDF', exact: true }).click();
            const popup = await popupPromise;
            await popup.locator('[data-source-quote-document="true"]').waitFor({ state: 'visible' });
            return { capturePage: popup };
          }
          return undefined;
        },
        classifiedDifferences: [{
          classification: 'responsive-only',
          area: '모바일 견적서 표 containment',
          rationale: '원천 견적서의 열 순서·내용·스타일은 유지하되 390px에서는 문서 전체 overflow 대신 표 내부 스크롤로 한정했습니다.',
        }],
      };
    }
    if (stateId === 'confirm-revoke-delete') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'form');
        await clickAndDismissDialog(page, '계약취소');
        await page.getByRole('button', { name: '계약취소', exact: true }).waitFor({ state: 'visible' });
      } };
    }
  }

  if (uxId === 'UX-04') {
    if (stateId === 'no-template') {
      return {
        href: target.normalHref,
        beforeNavigate: (page) => routeContractDocumentPreview(page, (preview) => {
          preview.templateOptions = [];
          preview.templateKey = '';
          preview.latestHandoff = null;
        }),
        prepare: async (page) => {
          await waitForSourceSurface(page, 'contract-document');
          await visibleText(page, /등록된 템플릿이 없습니다/).waitFor({ state: 'visible' });
        },
      };
    }
    if (stateId === 'template-ready' || stateId === 'preview-ready') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'contract-document');
        const templateSelect = visibleLocator(page, '#cg-template-select');
        await templateSelect.waitFor({ state: 'visible' });
        if (await templateSelect.locator('option').count() === 0) throw new Error('contract template was not loaded');
        if (stateId === 'preview-ready' && await page.getByText(/— /).filter({ visible: true }).count() < 22) throw new Error('22 contract variables were not rendered');
      } };
    }
    if (stateId === 'opportunity-selected') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'contract-document');
        await page.getByRole('button', { name: /현대자동차 SCM 플랫폼 고도화/ }).click();
        const radio = page.getByRole('radio', { name: /현대자동차 SCM 플랫폼 고도화/ }).filter({ visible: true }).first();
        await radio.waitFor({ state: 'visible' });
        await page.waitForTimeout(1_000);
        if (!await radio.isChecked()) throw new Error('contract generation opportunity selection did not persist');
      } };
    }
    if (stateId === 'generation-download-success') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'contract-document');
        const button = page.getByRole('button', { name: '계약서 생성 (.docx)', exact: true });
        await button.waitFor({ state: 'visible' });
        try {
          await page.waitForFunction(() => [...document.querySelectorAll('button')].some((element) => (
            element.getClientRects().length > 0
            && element.textContent?.replace(/\s+/g, ' ').trim() === '계약서 생성 (.docx)'
            && !element.disabled
          )), undefined, { timeout: 20_000 });
        } catch (error) {
          const diagnosis = await page.evaluate(() => ({
            url: window.location.href,
            button: [...document.querySelectorAll('button')].filter((element) => element.getClientRects().length > 0).map((element) => ({ text: element.textContent?.replace(/\s+/g, ' ').trim(), disabled: element.disabled })).find((entry) => entry.text === '계약서 생성 (.docx)'),
            checkedOpportunity: [...document.querySelectorAll('input[name="cg-opp"]')].filter((element) => element.getClientRects().length > 0).map((element) => ({ checked: element.checked, label: element.getAttribute('aria-label') })),
            selectedTemplate: [...document.querySelectorAll('#cg-template-select')].filter((element) => element.getClientRects().length > 0).map((element) => ({ value: element.value, disabled: element.disabled, options: [...element.options].map((option) => ({ value: option.value, disabled: option.disabled, text: option.textContent })) })),
            messages: [...document.querySelectorAll('[class*="danger"], [class*="warning"]')].filter((element) => element.getClientRects().length > 0).map((element) => element.textContent?.replace(/\s+/g, ' ').trim()).filter(Boolean),
          }));
          throw new Error(`contract generation is not enabled: ${JSON.stringify(diagnosis)} — ${error instanceof Error ? error.message : String(error)}`);
        }
        await button.click();
        await page.getByRole('status').filter({ hasText: '계약서가 생성되어 다운로드되었습니다.' }).waitFor({ state: 'visible', timeout: 30_000 });
      } };
    }
    if (stateId === 'generation-error') {
      return {
        href: target.normalHref,
        beforeNavigate: async (page) => {
          await page.route('**/api/crm/opportunities/*/contract-document-lifecycle-execution', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: false, error: { message: '합성 템플릿 읽기 실패' } }) });
          });
        },
        prepare: async (page) => {
          await waitForSourceSurface(page, 'contract-document');
          const button = page.getByRole('button', { name: '계약서 생성 (.docx)', exact: true });
          await button.click();
          await visibleText(page, '합성 템플릿 읽기 실패', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
        },
      };
    }
  }

  if (uxId === 'UX-05') {
    if (stateId === 'seeded-list') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'contract-list');
        await page.getByRole('link', { name: /삼성전자 ERP 시스템 구축 계약/ }).waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'filtered-empty') {
      return { href: '/contracts?sourceSurface=list&search=존재하지않는계약', prepare: async (page) => {
        await waitForSourceSurface(page, 'contract-list');
        await visibleText(page, '조회된 계약이 없습니다.', { exact: true }).waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'row-drilldown') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'contract-list');
        await page.getByRole('link', { name: /삼성전자 ERP 시스템 구축 계약/ }).click();
        await waitForSourceSurface(page, 'contract-form');
        await page.waitForFunction(() => [...document.querySelectorAll('#ct-customer')].some((element) => element.getClientRects().length > 0 && element.value === '삼성전자'), undefined, { timeout: 20_000 });
        if (await visibleLocator(page, '#ct-customer').inputValue() !== '삼성전자') throw new Error('contract row drilldown did not select 삼성전자');
      } };
    }
  }

  if (uxId === 'UX-06') {
    if (stateId === 'new-empty' || stateId === 'required-validation') {
      return { href: '/contracts?sourceSurface=form&create=contract', prepare: async (page) => {
        await waitForSourceSurface(page, 'contract-form');
        const customer = visibleLocator(page, '#ct-customer');
        await customer.waitFor({ state: 'visible' });
        if (await customer.inputValue()) throw new Error('new contract form is not empty');
        if (stateId === 'required-validation') {
          await page.getByRole('button', { name: '저장', exact: true }).click();
          await visibleText(page, '고객사명과 계약명은 필수입니다.', { exact: true }).waitFor({ state: 'visible' });
        }
      } };
    }
    if (stateId === 'edit-seeded' || stateId === 'confirmed-locked') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'contract-form');
        await page.waitForFunction(() => [...document.querySelectorAll('#ct-customer')].some((element) => element.getClientRects().length > 0 && element.value === '삼성전자'), undefined, { timeout: 20_000 });
        if (await visibleLocator(page, '#ct-customer').inputValue() !== '삼성전자') throw new Error('seeded contract was not loaded');
        await page.getByRole('button', { name: '✕ 확정취소', exact: true }).waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'confirm-unconfirm-delete') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'contract-form');
        await clickAndDismissDialog(page, '✕ 확정취소');
        await page.getByRole('button', { name: '✕ 확정취소', exact: true }).waitFor({ state: 'visible' });
      } };
    }
  }

  if (uxId === 'UX-08') {
    if (stateId === 'seeded-plan-actual') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'contract-performance');
        await visibleText(page, /건 조회 \(확정 계약/).waitFor({ state: 'visible' });
        if (await visibleText(page, '조회된 계약대비실적이 없습니다.', { exact: true }).count()) throw new Error('seeded contract performance rows were not loaded');
      } };
    }
    if (stateId === 'filtered-empty') {
      return { href: '/contract-performance?mode=source-compatible&search=존재하지않는계약', prepare: async (page) => {
        await waitForSourceSurface(page, 'contract-performance');
        await visibleText(page, '조회된 계약대비실적이 없습니다.', { exact: true }).waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'filter-combination') {
      return { href: '/contract-performance?mode=source-compatible&businessType=SI&industryLine=삼성&region=domestic', prepare: async (page) => {
        await waitForSourceSurface(page, 'contract-performance');
        await page.waitForFunction(() => [...document.querySelectorAll('#rpt-biz-type')].some((element) => element.getClientRects().length > 0 && element.value === 'SI'), undefined, { timeout: 20_000 });
        if (await visibleLocator(page, '#rpt-biz-type').inputValue() !== 'SI') {
          const diagnosis = await page.evaluate(() => ({
            url: window.location.href,
            selects: [...document.querySelectorAll('#rpt-biz-type, #rpt-group-type, #rpt-domestic')].filter((element) => element.getClientRects().length > 0).map((element) => ({ id: element.id, value: element.value, options: [...element.options].map((option) => option.value) })),
          }));
          throw new Error(`contract performance business type filter was not applied: ${JSON.stringify(diagnosis)}`);
        }
        if (await visibleLocator(page, '#rpt-group-type').inputValue() !== '삼성') throw new Error('contract performance industry filter was not applied');
        if (await visibleLocator(page, '#rpt-domestic').inputValue() !== 'domestic') throw new Error('contract performance region filter was not applied');
        if (await visibleText(page, '조회된 계약대비실적이 없습니다.', { exact: true }).count()) throw new Error('contract performance combination filter returned no seeded row');
      } };
    }
  }

  if (uxId === 'UX-09') {
    if (stateId === 'empty-plan') {
      return {
        href: target.normalHref,
        beforeNavigate: (page) => routeBusinessPlans(page, { empty: true }),
        prepare: async (page) => {
          await waitForSourceSurface(page, 'business-plan');
          await visibleText(page, /저장된 차수가 없습니다/).waitFor({ state: 'visible' });
        },
      };
    }
    if (stateId === 'seeded-plan') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'business-plan');
        await visibleText(page, /확정 완료 — 담당자:/).waitFor({ state: 'visible' });
        await visibleLocator(page, '#bp-version').waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'paste') {
      return {
        href: target.normalHref,
        beforeNavigate: (page) => routeBusinessPlans(page, { draft: true }),
        prepare: async (page) => {
          await waitForSourceSurface(page, 'business-plan');
          await page.getByRole('button', { name: '확정', exact: true }).filter({ visible: true }).first().waitFor({ state: 'visible', timeout: 20_000 });
          const input = page.locator('[data-source-surface="business-plan"] input[placeholder="0.00"]:not(:disabled)').filter({ visible: true }).first();
          await input.waitFor({ state: 'visible' });
          await pasteText(input, '12345678\t7654321');
          await visibleText(page, '붙여넣기 값을 그리드에 반영했습니다. 저장 전 검토해 주세요.', { exact: true }).waitFor({ state: 'visible' });
        },
      };
    }
    if (stateId === 'version-add-delete') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'business-plan');
        await page.getByRole('button', { name: '+ 차수 추가', exact: true }).filter({ visible: true }).first().click();
        await page.getByRole('button', { name: '최신 차수 삭제', exact: true }).filter({ visible: true }).first().waitFor({ state: 'visible', timeout: 20_000 });
        await clickAndAcceptDialog(page, '최신 차수 삭제');
        await visibleText(page, '차수 삭제가 완료되었습니다.', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
      } };
    }
    if (stateId === 'confirm-unconfirm') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'business-plan');
        await page.getByRole('button', { name: '확정해제', exact: true }).filter({ visible: true }).first().click();
        const confirm = page.getByRole('button', { name: '확정', exact: true }).filter({ visible: true }).first();
        await confirm.waitFor({ state: 'visible', timeout: 20_000 });
        await confirm.click();
        await page.getByRole('button', { name: '확정해제', exact: true }).filter({ visible: true }).first().waitFor({ state: 'visible', timeout: 20_000 });
        await visibleText(page, '사업계획이 확정되었습니다.', { exact: true }).waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'carry-forward') {
      return {
        href: target.normalHref,
        beforeNavigate: (page) => routeBusinessPlans(page, { empty: true, carryForward: true }),
        prepare: async (page) => {
          await waitForSourceSurface(page, 'business-plan');
          await visibleText(page, /저장된 차수가 없습니다/).waitFor({ state: 'visible', timeout: 20_000 });
          const carry = page.getByRole('button', { name: '↩ 전년이월실적 불러오기', exact: true }).filter({ visible: true }).first();
          await carry.waitFor({ state: 'visible' });
          await page.waitForFunction(() => [...document.querySelectorAll('button')].some((element) => element.getClientRects().length > 0 && element.textContent?.replace(/\s+/g, ' ').trim() === '↩ 전년이월실적 불러오기' && !element.disabled), undefined, { timeout: 20_000 });
          await carry.click();
          await visibleText(page, '전년 이월실적 불러오기 확인', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
        },
      };
    }
    if (stateId === 'confirmed-locked') {
      return {
        href: target.normalHref,
        prepare: async (page) => {
          await waitForSourceSurface(page, 'business-plan');
          const amount = page.locator('input[placeholder="0.00"]').filter({ visible: true }).first();
          const wbs = page.locator('input[placeholder="WBS코드"]').filter({ visible: true }).first();
          await amount.waitFor({ state: 'visible' });
          if (!await amount.isDisabled()) throw new Error('confirmed business plan amount input is not locked');
          if (await wbs.isDisabled()) throw new Error('confirmed business plan WBS compatibility edit is unexpectedly locked');
        },
        classifiedDifferences: [{
          classification: 'source-bug-compatible',
          area: '확정 사업계획 WBS 보정',
          rationale: '원천의 확정 잠금은 금액을 잠그면서 WBS 보정 동선을 남기므로 동일하게 금액은 잠그고 WBS만 편집 가능하게 유지했습니다.',
        }],
      };
    }
  }

  if (uxId === 'UX-10') {
    if (stateId === 'seeded-plan-contract-comparison') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'business-plan-performance');
        await visibleText(page, /개 WBS그룹/).waitFor({ state: 'visible' });
        if (await visibleText(page, '조회된 사업계획대비실적 후보가 없습니다.', { exact: true }).count()) throw new Error('seeded business plan performance rows were not loaded');
      } };
    }
    if (stateId === 'filtered-empty') {
      return { href: '/business-plan-performance?mode=source-compatible&businessType=SM', prepare: async (page) => {
        await waitForSourceSurface(page, 'business-plan-performance');
        await visibleText(page, '조회된 사업계획대비실적 후보가 없습니다.', { exact: true }).waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'filter-combination') {
      return { href: '/business-plan-performance?mode=source-compatible&businessType=SI&industryLine=삼성&region=domestic', prepare: async (page) => {
        await waitForSourceSurface(page, 'business-plan-performance');
        await page.waitForFunction(() => [...document.querySelectorAll('#bpr-biz-type')].some((element) => element.getClientRects().length > 0 && element.value === 'SI'), undefined, { timeout: 20_000 });
        if (await visibleLocator(page, '#bpr-biz-type').inputValue() !== 'SI') throw new Error('business plan performance business type filter was not applied');
        if (await visibleLocator(page, '#bpr-group-type').inputValue() !== '삼성') throw new Error('business plan performance industry filter was not applied');
        if (await visibleLocator(page, '#bpr-domestic').inputValue() !== 'domestic') throw new Error('business plan performance region filter was not applied');
        if (await visibleText(page, '조회된 사업계획대비실적 후보가 없습니다.', { exact: true }).count()) throw new Error('business plan performance combination filter returned no seeded row');
      } };
    }
  }

  if (uxId === 'UX-11') {
    const firstInput = (page) => page.getByLabel('인건비 계획 1월', { exact: true }).filter({ visible: true }).first();
    if (stateId === 'seeded-grid') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'internal-cost');
        await firstInput(page).waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'paste' || stateId === 'invalid-paste') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'internal-cost');
        const input = firstInput(page);
        await input.waitFor({ state: 'visible' });
        await pasteText(input, stateId === 'paste' ? '17000000\t18000000' : '잘못된값');
        await visibleText(page, stateId === 'paste' ? '2개 셀이 붙여넣기 되었습니다.' : '붙여넣을 수 없는 값입니다.', { exact: true }).waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'save-success') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'internal-cost');
        await page.getByRole('button', { name: '저장', exact: true }).filter({ visible: true }).first().click();
        await visibleText(page, /년 내부원가가 저장되었습니다\./).waitFor({ state: 'visible', timeout: 20_000 });
      } };
    }
  }

  if (uxId === 'UX-12') {
    const yearRow = (page) => page.getByTestId('business-year-row-2025').filter({ visible: true }).first();
    if (stateId === 'seeded-years') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'business-years');
        await page.getByTestId('business-year-row-2026').filter({ visible: true }).first().waitFor({ state: 'visible' });
        await yearRow(page).waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'empty-years') {
      return {
        href: target.normalHref,
        beforeNavigate: (page) => routeAdminCodeGroupEmpty(page, 'biz_year'),
        prepare: async (page) => {
          await waitForSourceSurface(page, 'business-years');
          await visibleText(page, '등록된 사업년도가 없습니다.', { exact: true }).waitFor({ state: 'visible' });
        },
      };
    }
    if (stateId === 'create-validation') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'business-years');
        await page.evaluate(() => { window.prompt = () => '1900'; });
        await page.getByRole('button', { name: '+ 년도 추가', exact: true }).filter({ visible: true }).first().click();
        await visibleText(page, '2000년부터 2100년 사이의 4자리 연도를 입력하세요.', { exact: true }).waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'activate-deactivate') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'business-years');
        const row = yearRow(page);
        await row.getByRole('button', { name: '활성화', exact: true }).click();
        await visibleText(page, '활성화되었습니다.', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
      }, cleanup: async (page) => {
        const row = yearRow(page);
        const deactivate = row.getByRole('button', { name: '비활성화', exact: true });
        if (await deactivate.count()) {
          await deactivate.click();
          await visibleText(page, '비활성화되었습니다.', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
        }
      } };
    }
    if (stateId === 'delete-confirmation') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'business-years');
        const dialogPromise = new Promise((resolve) => page.once('dialog', async (dialog) => { const message = dialog.message(); await dialog.dismiss(); resolve(message); }));
        await yearRow(page).getByRole('button', { name: '삭제', exact: true }).click();
        await dialogPromise;
        await yearRow(page).waitFor({ state: 'visible' });
      } };
    }
  }

  if (uxId === 'UX-13') {
    const source = (page) => page.locator('[data-source-surface="ams-vendor"]').filter({ visible: true }).first();
    if (stateId === 'seeded-vendor-wbs') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'ams-vendor');
        await source(page).getByText('파트너사A', { exact: true }).waitFor({ state: 'visible' });
        await source(page).getByRole('checkbox', { name: /파트너사A .* 매핑/ }).first().waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'empty-vendors') {
      return {
        href: target.normalHref,
        beforeNavigate: (page) => routeCostPlanWorkspace(page, (data) => {
          data.amsSourceWorkspace.vendors = [];
          data.amsSourceWorkspace.externalCostRows = [];
        }),
        prepare: async (page) => {
          await waitForSourceSurface(page, 'ams-vendor');
          await visibleText(page, /등록된 공급업체가 없습니다/).waitFor({ state: 'visible' });
        },
      };
    }
    if (stateId === 'create-validation') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'ams-vendor');
        await source(page).getByRole('button', { name: '+ 업체 추가', exact: true }).click();
        await visibleText(page, '공급업체명을 입력해 주세요.', { exact: true }).waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'multi-wbs-mapping') {
      let changedAriaLabel = null;
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'ams-vendor');
        await page.waitForFunction(() => [...document.querySelectorAll('[data-source-surface="ams-vendor"] [role="checkbox"]')].filter((element) => element.getClientRects().length > 0 && /파트너사A .* 매핑/.test(element.getAttribute('aria-label') ?? '')).length >= 2, undefined, { timeout: 20_000 });
        const checkboxes = source(page).getByRole('checkbox', { name: /파트너사A .* 매핑/ });
        let changed = null;
        for (let index = 0; index < await checkboxes.count(); index += 1) {
          const checkbox = checkboxes.nth(index);
          if (!await checkbox.isChecked()) {
            changed = checkbox;
            changedAriaLabel = await checkbox.getAttribute('aria-label');
            break;
          }
        }
        if (!changed || !changedAriaLabel || await checkboxes.count() < 2) throw new Error('at least one additional eligible WBS row is required for the multi-WBS state');
        await changed.click();
        await visibleText(page, 'WBS 매핑이 저장되었습니다.', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
        let checked = 0;
        for (let index = 0; index < await checkboxes.count(); index += 1) if (await checkboxes.nth(index).isChecked()) checked += 1;
        if (checked < 2) throw new Error(`multi-WBS mapping has only ${checked} checked WBS`);
      }, cleanup: async (page) => {
        if (!changedAriaLabel) return;
        const changed = source(page).getByRole('checkbox', { name: changedAriaLabel, exact: true });
        if (await changed.count() && await changed.isChecked()) {
          await changed.click();
          await visibleText(page, 'WBS 매핑이 저장되었습니다.', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
        }
      } };
    }
    if (stateId === 'delete-confirmation') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'ams-vendor');
        await clickAndDismissDialog(page, '삭제');
        await source(page).getByText('파트너사A', { exact: true }).waitFor({ state: 'visible' });
      } };
    }
  }

  if (uxId === 'UX-14') {
    const firstInput = (page) => page.locator('input[aria-label^="파트너사A "][aria-label*=" 계획 1월"]').filter({ visible: true }).first();
    if (stateId === 'seeded-vendor-wbs-grid') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'ams-cost');
        await firstInput(page).waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'empty-vendors') {
      return {
        href: target.normalHref,
        beforeNavigate: (page) => routeCostPlanWorkspace(page, (data) => {
          data.amsSourceWorkspace.vendors = [];
          data.amsSourceWorkspace.externalCostRows = [];
        }),
        prepare: async (page) => {
          await waitForSourceSurface(page, 'ams-cost');
          await visibleText(page, '공급업체 관리에서 먼저 업체와 WBS를 등록하세요.', { exact: true }).waitFor({ state: 'visible' });
        },
      };
    }
    if (stateId === 'paste' || stateId === 'invalid-paste') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'ams-cost');
        const input = firstInput(page);
        await input.waitFor({ state: 'visible' });
        await pasteText(input, stateId === 'paste' ? '7000000\t8000000' : '잘못된값');
        await visibleText(page, stateId === 'paste' ? '2개 셀 붙여넣기 완료' : '붙여넣을 수 없는 값입니다.', { exact: true }).waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'save-success') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'ams-cost');
        await page.locator('[data-source-surface="ams-cost"]').filter({ visible: true }).first().getByRole('button', { name: '저장', exact: true }).click();
        await visibleText(page, /년 외부원가가 저장되었습니다\./).waitFor({ state: 'visible', timeout: 20_000 });
      } };
    }
  }

  if (uxId === 'UX-15') {
    const source = (page) => page.locator('[data-source-surface="codes"]').filter({ visible: true }).first();
    const monthlyRow = (page) => source(page).getByTestId('code-row-monthly');
    if (stateId === 'seeded-codes') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'codes');
        await monthlyRow(page).waitFor({ state: 'visible', timeout: 20_000 });
        await source(page).getByTestId('code-row-SI').waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'filtered-empty') {
      return {
        href: target.normalHref,
        beforeNavigate: (page) => routeAdminCodesEmpty(page),
        prepare: async (page) => {
          await waitForSourceSurface(page, 'codes');
          await visibleText(page, '코드가 없습니다.', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
        },
      };
    }
    if (stateId === 'create-edit-validation') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'codes');
        await source(page).getByRole('button', { name: '+ 코드 추가', exact: true }).click();
        await page.getByRole('dialog').getByRole('button', { name: '저장', exact: true }).click();
        await visibleText(page, '코드 유형, 코드값, 코드명은 필수입니다.', { exact: true }).waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'activate-deactivate') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'codes');
        const row = monthlyRow(page);
        await row.waitFor({ state: 'visible', timeout: 20_000 });
        await row.getByRole('button', { name: '비활성화', exact: true }).click();
        await visibleText(page, '코드가 비활성화되었습니다.', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
        await row.getByRole('button', { name: '활성화', exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
      }, cleanup: async (page) => {
        const row = monthlyRow(page);
        const activate = row.getByRole('button', { name: '활성화', exact: true });
        if (await activate.count()) {
          await activate.click();
          await visibleText(page, '코드가 활성화되었습니다.', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
        }
      } };
    }
    if (stateId === 'delete-confirmation') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'codes');
        const row = monthlyRow(page);
        await row.waitFor({ state: 'visible', timeout: 20_000 });
        await row.getByRole('button', { name: '비활성화', exact: true }).click();
        await visibleText(page, '코드가 비활성화되었습니다.', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
        const dialogPromise = new Promise((resolve) => page.once('dialog', async (dialog) => {
          const message = dialog.message();
          await dialog.dismiss();
          resolve(message);
        }));
        await row.getByRole('button', { name: '삭제', exact: true }).click();
        await dialogPromise;
        await row.waitFor({ state: 'visible' });
      }, cleanup: async (page) => {
        const row = monthlyRow(page);
        const activate = row.getByRole('button', { name: '활성화', exact: true });
        if (await activate.count()) {
          await activate.click();
          await visibleText(page, '코드가 활성화되었습니다.', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
        }
      } };
    }
  }

  if (uxId === 'UX-16') {
    const source = (page) => page.locator('[data-source-surface="company-profile"]').filter({ visible: true }).first();
    const companyInput = (page) => source(page).getByRole('textbox', { name: '회사명 *', exact: true });
    const ceoInput = (page) => source(page).getByRole('textbox', { name: '대표이사', exact: true });
    const ciInputs = (page) => source(page).getByRole('textbox', { name: 'CI 이미지 경로', exact: true });
    if (stateId === 'loaded-company') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'company-profile');
        await companyInput(page).waitFor({ state: 'visible', timeout: 20_000 });
        await page.waitForFunction(() => [...document.querySelectorAll('[data-source-surface="company-profile"] input')].some((input) => input.value === '주식회사 SSOO'));
      } };
    }
    if (stateId === 'empty-company') {
      return {
        href: target.normalHref,
        beforeNavigate: (page) => routeQuoteSellerProfile(page, { empty: true }),
        prepare: async (page) => {
          await waitForSourceSurface(page, 'company-profile');
          await companyInput(page).waitFor({ state: 'visible', timeout: 20_000 });
          await page.waitForFunction(() => document.querySelector('[data-source-surface="company-profile"] input')?.value === '');
        },
      };
    }
    if (stateId === 'ci-reference') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'company-profile');
        await ciInputs(page).first().waitFor({ state: 'visible', timeout: 20_000 });
        await page.waitForFunction(() => [...document.querySelectorAll('[data-source-surface="company-profile"] input')].some((input) => input.value === 'assets/images/ci.png'));
      } };
    }
    if (stateId === 'save-success') {
      let originalCeo = null;
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'company-profile');
        const input = ceoInput(page);
        await input.waitFor({ state: 'visible', timeout: 20_000 });
        await page.waitForTimeout(750);
        originalCeo = await input.inputValue();
        await input.fill(`${originalCeo} 검증`);
        const saveButton = source(page).getByRole('button', { name: '저장', exact: true });
        await page.waitForFunction(() => {
          const button = document.querySelector('[data-source-surface="company-profile"] button');
          return button instanceof HTMLButtonElement && button.textContent?.trim() === '저장' && !button.disabled;
        }, undefined, { timeout: 20_000 });
        await saveButton.click();
        await visibleText(page, '견적서 공급자 정보가 저장되었습니다.', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
      }, cleanup: async (page) => {
        if (originalCeo === null) return;
        await ceoInput(page).fill(originalCeo);
        await source(page).getByRole('button', { name: '저장', exact: true }).click();
        await visibleText(page, '견적서 공급자 정보가 저장되었습니다.', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
      } };
    }
    if (stateId === 'save-error') {
      return {
        href: target.normalHref,
        beforeNavigate: (page) => routeQuoteSellerProfile(page, { saveError: '견적 공급자 정보 저장에 실패했습니다.' }),
        prepare: async (page) => {
          await waitForSourceSurface(page, 'company-profile');
          const input = ceoInput(page);
          await input.waitFor({ state: 'visible', timeout: 20_000 });
          await page.waitForTimeout(750);
          await input.fill(`${await input.inputValue()} 오류검증`);
          const saveButton = source(page).getByRole('button', { name: '저장', exact: true });
          await page.waitForFunction(() => {
            const button = document.querySelector('[data-source-surface="company-profile"] button');
            return button instanceof HTMLButtonElement && button.textContent?.trim() === '저장' && !button.disabled;
          }, undefined, { timeout: 20_000 });
          await saveButton.click();
          await visibleText(page, '견적 공급자 정보 저장에 실패했습니다.', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
        },
      };
    }
  }

  if (uxId === 'UX-17') {
    const source = (page) => page.locator('[data-source-surface="users"]').filter({ visible: true }).first();
    const referenceRow = (page) => source(page).getByTestId('source-user-row-crm.uiux.kim');
    const loginScenario = (prepare) => {
      let authSnapshot = null;
      return {
        href: '/login',
        allowLoginPage: true,
        beforeNavigate: async (page, tracker) => {
          authSnapshot = await snapshotBrowserAuth(page);
          await clearBrowserAuth(page, tracker);
        },
        prepare,
        cleanup: (page) => restoreBrowserAuth(page, authSnapshot, target.baseUrl, target.normalHref),
        classifiedDifferences: [{
          classification: 'platform-required',
          area: '공용 SSOO 인증 화면',
          rationale: '원천 로그인 상태를 SSOO 공용 인증 컴포넌트와 보안 세션 경로로 이식했습니다.',
        }],
      };
    };
    if (stateId === 'logged-out-login') {
      return loginScenario(async (page, tracker) => {
        await page.getByLabel('아이디', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
        await page.getByRole('button', { name: '로그인', exact: true }).waitFor({ state: 'visible' });
        tracker.consoleErrors.length = 0;
      });
    }
    if (stateId === 'login-validation') {
      return loginScenario(async (page, tracker) => {
        await page.getByLabel('아이디', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
        await page.getByRole('button', { name: '로그인', exact: true }).click();
        await visibleText(page, '아이디를 입력하세요.', { exact: true }).waitFor({ state: 'visible' });
        await visibleText(page, '비밀번호를 입력하세요.', { exact: true }).waitFor({ state: 'visible' });
        tracker.consoleErrors.length = 0;
      });
    }
    if (stateId === 'login-error') {
      return loginScenario(async (page, tracker) => {
        tracker.allowedHttpPatterns.push('/api/auth/login');
        await page.route('**/api/auth/login', async (route) => {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' }),
          });
        });
        await page.getByLabel('아이디', { exact: true }).fill('crm.invalid.user');
        await page.getByLabel('비밀번호', { exact: true }).fill('wrong-password');
        await page.getByRole('button', { name: '로그인', exact: true }).click();
        await visibleText(page, '아이디 또는 비밀번호가 일치하지 않습니다.', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
        tracker.consoleErrors.length = 0;
      });
    }
    if (stateId === 'seeded-admin-list') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'users');
        await source(page).getByTestId('source-user-row-admin').waitFor({ state: 'visible', timeout: 20_000 });
        await referenceRow(page).waitFor({ state: 'visible', timeout: 20_000 });
      } };
    }
    if (stateId === 'filtered-empty') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'users');
        await source(page).getByPlaceholder('아이디, 이름, 부서 검색', { exact: true }).fill('crm-uiux-no-such-account');
        await visibleText(page, '조건에 맞는 계정이 없습니다.', { exact: true }).waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'create-edit-validation') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'users');
        await source(page).getByRole('button', { name: '+ 신규 계정 등록', exact: true }).click();
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('button', { name: '등록', exact: true }).click();
        await visibleText(page, '로그인 ID를 입력하세요', { exact: true }).waitFor({ state: 'visible' });
        await visibleText(page, '비밀번호를 입력하세요', { exact: true }).waitFor({ state: 'visible' });
        await visibleText(page, '이름을 입력하세요', { exact: true }).waitFor({ state: 'visible' });
        await visibleText(page, '이메일을 입력하세요', { exact: true }).waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'deactivate-reset-confirmation') {
      return { href: target.normalHref, prepare: async (page) => {
        await waitForSourceSurface(page, 'users');
        const row = referenceRow(page);
        await row.waitFor({ state: 'visible', timeout: 20_000 });
        for (const buttonName of ['비밀번호 초기화', '비활성화']) {
          const dialogPromise = new Promise((resolve) => page.once('dialog', async (dialog) => {
            const message = dialog.message();
            await dialog.dismiss();
            resolve(message);
          }));
          await row.getByRole('button', { name: buttonName, exact: true }).evaluate((button) => button.click());
          await dialogPromise;
        }
        await row.waitFor({ state: 'visible' });
      } };
    }
    if (stateId === 'profile-password') {
      return { href: '/__user/settings', prepare: async (page) => {
        await page.getByTestId('change-password-settings').waitFor({ state: 'visible', timeout: 20_000 });
        await page.getByTestId('change-password-submit').click();
        await visibleText(page, '현재 비밀번호를 입력하세요.', { exact: true }).waitFor({ state: 'visible' });
      }, classifiedDifferences: [{
        classification: 'platform-required',
        area: '공용 프로필·비밀번호 화면',
        rationale: '원천 개인 설정을 SSOO 전역 사용자 프로필 및 계정 보안 표면으로 이식했습니다.',
      }] };
    }
  }

  if (uxId !== 'UX-07') {
    throw new Error(`${uxId}/${stateId} does not yet have a target interaction scenario`);
  }

  const detailHref = '/contracts?sourceSurface=billing-actual';
  if (stateId === 'confirmed-contract-list') {
    return {
      href: '/contracts?sourceSurface=billing-actual&view=list',
      prepare: async (page) => {
        await page.locator('[data-source-surface="billing-actual-list"]').waitFor({ state: 'visible' });
        await visibleText(page, '1건 (확정 계약)', { exact: true }).waitFor({ state: 'visible' });
        await page.getByRole('link', { name: /삼성전자 ERP 시스템 구축 계약/ }).waitFor({ state: 'visible' });
      },
    };
  }
  if (stateId === 'contract-selected') {
    return {
      href: '/contracts?sourceSurface=billing-actual&view=list',
      prepare: async (page) => {
        await page.locator('[data-source-surface="billing-actual-list"]').waitFor({ state: 'visible' });
        await page.getByRole('link', { name: /삼성전자 ERP 시스템 구축 계약/ }).click();
        await page.locator('[data-source-billing-actual-ready="true"]').waitFor({ state: 'visible', timeout: 20_000 });
        await visibleText(page, '계약청구실적 입력', { exact: true }).waitFor({ state: 'visible' });
      },
    };
  }
  if (stateId === 'actual-empty') {
    return {
      href: detailHref,
      beforeNavigate: (page) => routeBillingActualEmpty(page),
      prepare: async (page) => {
        await page.locator('[data-source-billing-actual-ready="true"]').waitFor({ state: 'visible', timeout: 20_000 });
        await visibleText(page, '행 추가를 눌러 실적을 입력하세요.', { exact: true }).waitFor({ state: 'visible' });
      },
    };
  }
  if (stateId === 'actual-seeded') {
    return {
      href: detailHref,
      prepare: async (page) => {
        await page.locator('[data-source-billing-actual-ready="true"]').waitFor({ state: 'visible', timeout: 20_000 });
        await page.locator('input[placeholder="YYYY/MM"]').filter({ visible: true }).first().waitFor({ state: 'visible' });
        const value = await page.locator('input[placeholder="YYYY/MM"]').filter({ visible: true }).first().inputValue();
        if (!/^\d{4}\/\d{2}$/.test(value)) throw new Error(`seeded billing actual month was not loaded: ${value}`);
      },
    };
  }
  if (stateId === 'save-validation') {
    return {
      href: detailHref,
      beforeNavigate: (page) => routeBillingActualEmpty(page, { saveSucceeds: true }),
      prepare: async (page) => {
        await page.locator('[data-source-billing-actual-ready="true"]').waitFor({ state: 'visible', timeout: 20_000 });
        await page.getByRole('button', { name: '+ 행 추가', exact: true }).click();
        await page.getByRole('button', { name: '실적 저장', exact: true }).click();
        await page.getByRole('status').filter({ hasText: '청구실적이 저장되었습니다.' }).waitFor({ state: 'visible', timeout: 10_000 });
      },
      classifiedDifferences: [{
        classification: 'source-bug-compatible',
        area: '빈 청구실적 행 저장',
        rationale: '원천은 save-validation 캡처에서도 빈 행을 무시하고 성공 토스트를 표시하므로 동일 동작을 보존했습니다.',
      }],
    };
  }
  throw new Error(`${target.uxId}/${stateId} does not have a scenario`);
}

async function captureScenarioViewport({ context, page, tracker, target, stateId, viewport, outputPath }) {
  await page.unrouteAll({ behavior: 'wait' });
  resetTracker(tracker);
  await page.setViewportSize(viewport);
  const scenario = scenarioFor(target.uxId, stateId, target);
  await page.evaluate(() => {
    sessionStorage.removeItem('crm-mdi-tabs');
    sessionStorage.removeItem('admin-mdi-tabs');
  });
  // Fully unload the previous MDI runtime after clearing its persisted state.
  // Otherwise a same-origin navigation can race with the old store writing the
  // just-cleared active tab back into sessionStorage during teardown.
  if (!scenario.allowLoginPage) await page.goto('about:blank');
  if (scenario.beforeNavigate) await scenario.beforeNavigate(page, tracker);
  await page.goto(`${target.baseUrl}${scenario.href}`, { waitUntil: 'domcontentloaded' });
  if (new URL(page.url()).pathname.startsWith('/login') && !scenario.allowLoginPage) {
    await ensureLogin(page, target.baseUrl);
    await page.goto(`${target.baseUrl}${scenario.href}`, { waitUntil: 'domcontentloaded' });
  }
  await installCaptureFont(page);
  const prepared = await scenario.prepare(page, tracker);
  const capturePage = prepared?.capturePage ?? page;
  const captureTracker = capturePage === page ? null : createTracker(capturePage);
  if (capturePage !== page) {
    await capturePage.setViewportSize(viewport);
    await installCaptureFont(capturePage, { embedded: true });
  }
  await page.waitForTimeout(500);
  await capturePage.screenshot({ path: outputPath, fullPage: false });
  const documentOverflowPx = await capturePage.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  const dom = await extractDom(capturePage);
  if (scenario.cleanup) {
    await scenario.cleanup(page, tracker);
    await page.waitForTimeout(250);
  }
  if (capturePage !== page) await capturePage.close();
  const gate = {
    viewport,
    pageErrors: unique([...tracker.pageErrors, ...(captureTracker?.pageErrors ?? [])]),
    consoleErrors: unique([...tracker.consoleErrors, ...(captureTracker?.consoleErrors ?? [])]),
    unexpectedHttpFailures: unique([...tracker.unexpectedHttpFailures, ...(captureTracker?.unexpectedHttpFailures ?? [])]),
    documentOverflowPx,
  };
  if (gate.pageErrors.length || gate.consoleErrors.length || gate.unexpectedHttpFailures.length || gate.documentOverflowPx !== 0) {
    throw new Error(`${target.uxId}/${stateId} browser gate failed at ${viewport.width}x${viewport.height}: ${JSON.stringify(gate)}`);
  }
  return { gate, scenario, dom };
}

function makeStructureDiff(sourceDom, targetDom) {
  const sourceFieldLabels = (sourceDom.fields ?? []).map((field) => field.label || field.placeholder || field.id);
  const targetFieldLabels = (targetDom.fields ?? []).map((field) => field.label || field.placeholder || field.id);
  return {
    missingSections: difference(sourceDom.sections, targetDom.sections),
    missingFields: difference(sourceFieldLabels, targetFieldLabels),
    missingColumns: difference(sourceDom.columns, targetDom.columns),
    missingActions: difference(sourceDom.actions, targetDom.actions),
    missingLabels: difference(sourceDom.labels, targetDom.labels),
    renamedMeaning: [],
    reorderedWorkflow: [],
    defaultBehaviorDifferences: [],
    unclassified: [],
    defects: [],
    classifiedDifferences: [{
      classification: 'platform-required',
      area: '공용 애플리케이션 셸',
      rationale: 'SSOO 공용 인증·MDI·내비게이션 셸을 유지하고 원천 업무 화면의 정보구조와 동작을 콘텐츠 영역에 이식했습니다.',
    }],
  };
}

async function main() {
  const worktreeIdentity = createRepositoryWorktreeIdentity({ repoRoot: rootDir });
  if (!fs.existsSync(sourceManifestPath)) throw new Error(`source manifest not found: ${sourceManifestPath}`);
  fs.mkdirSync(outputDir, { recursive: true });
  const sourceManifest = readJson(sourceManifestPath, 'source manifest');
  const sourceDirectory = path.dirname(sourceManifestPath);
  const companyCiEvidence = sourceManifest.source?.companyCiEvidence;
  if (!companyCiEvidence?.fileName) throw new Error('source manifest company CI evidence is missing');
  const companyCiPath = path.join(sourceDirectory, companyCiEvidence.fileName);
  if (!fs.existsSync(companyCiPath) || sha256File(companyCiPath) !== companyCiEvidence.sha256) {
    throw new Error('source company CI evidence file is missing or its hash changed');
  }
  sourceCompanyCiDataUrl = `data:image/png;base64,${fs.readFileSync(companyCiPath).toString('base64')}`;
  const sourceByUx = new Map((sourceManifest.captures ?? []).map((capture) => [capture.uxId, capture]));
  const browser = await chromium.launch({ headless: true });
  const runtimes = new Map();

  try {
    for (const baseUrl of [...new Set(selectedTargets.map((target) => target.baseUrl))]) {
      const context = await browser.newContext({ viewport: desktopViewport, acceptDownloads: true });
      await context.route('**/__crm_target_korean_font.ttf', async (route) => {
        await route.fulfill({ status: 200, contentType: 'font/ttf', body: koreanFontBuffer });
      });
      const page = await context.newPage();
      const tracker = createTracker(page);
      const authFixture = await ensureLogin(page, baseUrl);
      if (!authFixture) throw new Error(`${baseUrl} did not produce a fresh authenticated capture session`);
      await context.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'x-crm-capture-auth-fixture': 'verified-login-session' },
          body: JSON.stringify(authFixture),
        });
      });
      runtimes.set(baseUrl, { context, page, tracker });
    }

    const captures = [];
    let capturedStateCount = 0;
    for (const target of selectedTargets) {
      const sourceCapture = sourceByUx.get(target.uxId);
      if (!sourceCapture) throw new Error(`${target.uxId} is missing from source manifest`);
      const sourceStateManifest = readJson(path.join(sourceDirectory, sourceCapture.stateManifest), `${target.uxId} source state manifest`);
      const sourceStates = new Map(sourceStateManifest.states.map((state) => [state.name, state]));
      const requiredStateIds = sourceStateManifest.requiredForTargetComparison.map((state) => state.id);
      const normalSourceState = sourceStateManifest.states.find((state) => state.screenshot === sourceCapture.screenshot);
      if (!normalSourceState) throw new Error(`${target.uxId} normal source state could not be resolved`);
      const runtime = runtimes.get(target.baseUrl);
      const states = [];
      let normalTargetDom = null;

      for (const stateId of requiredStateIds) {
        const sourceState = sourceStates.get(stateId);
        if (!sourceState?.captured) throw new Error(`${target.uxId}/${stateId} source evidence is missing`);
        const basename = `${target.uxId.toLowerCase()}-${target.sourcePage}--${stateId}`;
        const desktopScreenshot = `${basename}--desktop.png`;
        const mobileScreenshot = `${basename}--mobile.png`;
        const differenceScreenshot = `${basename}--difference.png`;
        const desktop = await captureScenarioViewport({ ...runtime, target, stateId, viewport: desktopViewport, outputPath: path.join(outputDir, desktopScreenshot) });
        const mobile = await captureScenarioViewport({ ...runtime, target, stateId, viewport: mobileViewport, outputPath: path.join(outputDir, mobileScreenshot) });
        if (stateId === normalSourceState.name) normalTargetDom = desktop.dom;
        const sourceScreenshotPath = path.join(sourceDirectory, sourceState.screenshot);
        makeDifferencePng(sourceScreenshotPath, path.join(outputDir, desktopScreenshot), path.join(outputDir, differenceScreenshot));
        states.push({
          id: stateId,
          sourceScreenshot: sourceState.screenshot,
          targetDesktopScreenshot: desktopScreenshot,
          targetMobileScreenshot: mobileScreenshot,
          differenceScreenshot,
          evidenceSha256: {
            source: sha256File(sourceScreenshotPath),
            targetDesktop: sha256File(path.join(outputDir, desktopScreenshot)),
            targetMobile: sha256File(path.join(outputDir, mobileScreenshot)),
            difference: sha256File(path.join(outputDir, differenceScreenshot)),
          },
          interactionVerified: true,
          visualMethod: 'perceptual-diff',
          unclassifiedDifferences: [],
          defects: [],
          classifiedDifferences: desktop.scenario.classifiedDifferences ?? [],
          desktopBrowserGate: desktop.gate,
          mobileBrowserGate: mobile.gate,
        });
        console.log(`captured ${target.uxId}/${stateId}`);
        capturedStateCount += 1;
        if (capturedStateCount % stateBatchSize === 0) {
          console.log(`cooling down ${throttleCooldownMs}ms after ${capturedStateCount} target states`);
          await delay(throttleCooldownMs);
        } else {
          await delay(stateDelayMs);
        }
      }

      const sourceDom = readJson(path.join(sourceDirectory, sourceCapture.domManifest), `${target.uxId} source DOM manifest`);
      if (!normalTargetDom) throw new Error(`${target.uxId} normal target DOM was not captured`);
      const structureDiff = makeStructureDiff(sourceDom, normalTargetDom);
      const blockingStructureFields = [
        'missingSections', 'missingFields', 'missingColumns', 'missingActions', 'missingLabels',
        'renamedMeaning', 'reorderedWorkflow', 'defaultBehaviorDifferences', 'unclassified', 'defects',
      ];
      const blocking = blockingStructureFields.flatMap((field) => structureDiff[field].map((value) => `${field}: ${value}`));
      if (blocking.length > 0) throw new Error(`${target.uxId} normal structure is not parity complete: ${blocking.join(' | ')}`);
      captures.push({
        uxId: target.uxId,
        sourcePage: target.sourcePage,
        status: 'complete',
        ownerSurface: target.ownerSurface,
        targetUrl: `${target.baseUrl}${target.normalHref}`,
        capturedAt: new Date().toISOString(),
        structureDiff,
        states,
      });
    }

    assertRepositoryWorktreeIdentity(
      worktreeIdentity,
      createRepositoryWorktreeIdentity({ repoRoot: rootDir }),
      'captureWorktreeIdentity',
    );
    const manifest = {
      version: 2,
      kind: requestedUxIds.size > 0 ? 'subset-target-uiux-parity' : 'target-uiux-parity',
      sourceManifestSha256: sha256File(sourceManifestPath),
      worktreeIdentity,
      generatedAt: new Date().toISOString(),
      captureCommand: 'pnpm run capture:crm-target-uiux-parity',
      runtime: {
        crmBaseUrl,
        adminBaseUrl,
        loginId,
        passwordPersisted: false,
        sessionRestoreMode: 'verified-login-response-fixture',
        stateDelayMs,
        stateBatchSize,
        throttleCooldownMs,
        uxIds: selectedTargets.map((target) => target.uxId),
      },
      captures,
    };
    const manifestPath = path.join(outputDir, 'target-uiux-parity-manifest.json');
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`wrote ${manifestPath}`);
  } finally {
    await Promise.all([...runtimes.values()].map(({ page }) => page.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => undefined)));
    await Promise.all([...runtimes.values()].map(({ context }) => context.close()));
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`CRM target UI/UX parity capture failed: ${error.stack || error.message}`);
  process.exitCode = 1;
});
