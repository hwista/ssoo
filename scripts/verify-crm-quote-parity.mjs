#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFromDatabase = createRequire(path.join(repoRoot, 'packages', 'database', 'package.json'));
const requireFromServer = createRequire(path.join(repoRoot, 'apps', 'server', 'package.json'));
const { config: loadEnv } = requireFromDatabase('dotenv');
const { Client } = requireFromDatabase('pg');
const JSZip = requireFromServer('jszip');

loadEnv({ path: path.join(repoRoot, '.env.local'), quiet: true });
loadEnv({ path: path.join(repoRoot, '.env'), quiet: true, override: false });

const contract = 'BT-06';
const action = process.argv.slice(2).find((argument) => argument !== '--') ?? 'run';
const opportunityCode = process.env.CRM_QUOTE_PARITY_OPPORTUNITY ?? 'crm-uiux-opp-001';
const dmsOpportunityCode = process.env.CRM_QUOTE_PARITY_DMS_OPPORTUNITY ?? 'crm-uiux-opp-002';
const apiBaseUrl = (process.env.CRM_QUOTE_PARITY_API_URL ?? 'http://127.0.0.1:4105/api').replace(/\/$/, '');
const webBaseUrl = (process.env.CRM_QUOTE_PARITY_WEB_URL ?? 'http://127.0.0.1:3105').replace(/\/$/, '');
const markdownRoot = path.resolve(process.env.CRM_QUOTE_PARITY_MARKDOWN_ROOT ?? '/tmp/ssoo-crm-ralph-20260818-s5/markdown');
const storageRoot = path.resolve(process.env.CRM_QUOTE_PARITY_STORAGE_ROOT ?? '/tmp/ssoo-crm-ralph-20260818-s5/storage');
const evidenceRoot = path.resolve(
  process.env.CRM_QUOTE_PARITY_EVIDENCE_DIR
    ?? path.join(repoRoot, 'docs', 'crm', 'evidence', 'target-functional', 'bt-06-quote'),
);
const sourceManifestPath = path.resolve(
  process.env.CRM_SOURCE_UIUX_MANIFEST
    ?? path.join(repoRoot, 'docs', 'crm', 'evidence', 'source-uiux', 'ref-01', 'source-uiux-manifest.json'),
);
const evidencePath = path.join(evidenceRoot, 'bt-06-quote-parity.json');
const desktopScreenshotPath = path.join(evidenceRoot, 'quote-preview-desktop.png');
const mobileScreenshotPath = path.join(evidenceRoot, 'quote-preview-mobile.png');
const printScreenshotPath = path.join(evidenceRoot, 'quote-print-desktop.png');
const browserPdfPath = path.join(evidenceRoot, 'quote-browser-print.pdf');
const sourceDatabaseUrl = process.env.DATABASE_URL;

if (!sourceDatabaseUrl) throw new Error('DATABASE_URL is required.');
const databaseName = process.env.CRM_RALPH_DATABASE_NAME?.trim() || new URL(sourceDatabaseUrl).pathname.slice(1);
if (!/^ssoo_crm_ralph_[a-z0-9_]+$/.test(databaseName)) {
  throw new Error(`BT-06 verification is restricted to an isolated ssoo_crm_ralph_* database, got ${databaseName}`);
}
const targetDatabaseUrl = new URL(sourceDatabaseUrl);
targetDatabaseUrl.pathname = `/${databaseName}`;
targetDatabaseUrl.searchParams.delete('schema');

function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item));
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function isContained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

async function listFiles(root) {
  const files = [];
  async function visit(directory) {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) files.push(absolute);
    }
  }
  await visit(root);
  return files.sort();
}

async function writeEvidence(evidence) {
  await fs.mkdir(evidenceRoot, { recursive: true });
  await fs.writeFile(evidencePath, `${JSON.stringify(jsonSafe(evidence), null, 2)}\n`, 'utf8');
}

async function requestJson(baseUrl, pathname, { token, method = 'GET', body, statuses = [200], headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      'x-ssoo-app': 'crm',
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  assert.ok(statuses.includes(response.status), `${method} ${pathname} expected ${statuses.join('/')}, got ${response.status}: ${text.slice(0, 800)}`);
  return { status: response.status, payload, headers: Object.fromEntries(response.headers.entries()) };
}

async function requestBinary(baseUrl, pathname, { token, statuses = [200] } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-ssoo-app': 'crm',
    },
    signal: AbortSignal.timeout(30_000),
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  assert.ok(statuses.includes(response.status), `GET ${pathname} expected ${statuses.join('/')}, got ${response.status}: ${buffer.toString('utf8', 0, 500)}`);
  return { buffer, headers: Object.fromEntries(response.headers.entries()), status: response.status };
}

async function loginApi() {
  const response = await requestJson(apiBaseUrl, '/auth/login', {
    method: 'POST',
    body: {
      loginId: process.env.CRM_QUOTE_PARITY_LOGIN_ID ?? 'admin',
      password: process.env.CRM_QUOTE_PARITY_PASSWORD ?? 'admin123!',
    },
  });
  const token = response.payload?.data?.accessToken;
  assert.equal(typeof token, 'string', 'admin login did not return an access token');
  const me = await requestJson(apiBaseUrl, '/auth/me', { token, method: 'POST' });
  assert.equal(typeof me.payload?.data?.userId, 'string', 'admin identity lookup did not return a user');
  return { token, user: me.payload.data };
}

function readSourceCi() {
  const manifest = JSON.parse(fsSync.readFileSync(sourceManifestPath, 'utf8'));
  const ciEvidence = manifest.source?.companyCiEvidence;
  assert.equal(typeof ciEvidence?.fileName, 'string', 'source company CI evidence is missing');
  assert.match(ciEvidence.fileName, /^[^/\\]+$/, 'source company CI evidence must be a local evidence file');
  const sourceCiPath = path.join(path.dirname(sourceManifestPath), ciEvidence.fileName);
  const buffer = fsSync.readFileSync(sourceCiPath);
  assert.equal(sha256(buffer), ciEvidence.sha256, 'source company CI evidence hash changed');
  assert.ok(buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'source company CI is not a PNG');
  return { buffer, sourceCiPath, sha256: ciEvidence.sha256 };
}

async function uploadSourceCi(token, sourceCi) {
  const form = new FormData();
  form.append('file', new Blob([sourceCi.buffer], { type: 'image/png' }), 'source-company-ci.png');
  const response = await fetch(`${apiBaseUrl}/crm/quote-seller-profile/ci`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'x-ssoo-app': 'crm' },
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  assert.ok([200, 201].includes(response.status), `CI upload returned ${response.status}: ${text.slice(0, 800)}`);
  assert.equal(payload?.data?.checksum, sourceCi.sha256, 'stored CI checksum differs from the source artifact');
  assert.equal(payload?.data?.mimeType, 'image/png');
  assert.equal(typeof payload?.data?.storageRef, 'string');
  return payload.data;
}

function assertPdf(buffer, label) {
  assert.ok(buffer.length > 1_000, `${label} is unexpectedly small (${buffer.length} bytes)`);
  assert.equal(buffer.subarray(0, 5).toString('ascii'), '%PDF-', `${label} does not have a PDF header`);
  assert.match(buffer.subarray(Math.max(0, buffer.length - 1024)).toString('latin1'), /%%EOF\s*$/, `${label} does not have a PDF trailer`);
}

async function assertDocx(buffer, expectedValues) {
  assert.ok(buffer.length > 1_000, `DMS DOCX is unexpectedly small (${buffer.length} bytes)`);
  assert.equal(buffer.subarray(0, 2).toString('ascii'), 'PK', 'DMS DOCX is not a ZIP package');
  const zip = await JSZip.loadAsync(buffer);
  const entryNames = new Set(Object.keys(zip.files));
  for (const required of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml']) {
    assert.ok(entryNames.has(required), `DMS DOCX is missing ${required}`);
  }
  const documentXml = await zip.file('word/document.xml').async('string');
  for (const expected of expectedValues) {
    assert.ok(documentXml.includes(expected), `DMS DOCX is missing rendered value: ${expected}`);
  }
  assert.doesNotMatch(documentXml, /\{\{[^}]+\}\}/, 'DMS DOCX contains an unresolved template placeholder');
  return { entryCount: entryNames.size, documentXmlSha256: sha256(Buffer.from(documentXml)) };
}

function createBrowserTracker(page) {
  const tracker = { pageErrors: [], consoleErrors: [], httpFailures: [] };
  page.on('pageerror', (error) => tracker.pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') tracker.consoleErrors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) tracker.httpFailures.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') {
      tracker.httpFailures.push(`FAILED ${request.url()} ${request.failure()?.errorText ?? ''}`);
    }
  });
  return tracker;
}

async function restoreBrowserSession(page) {
  await page.goto(`${webBaseUrl}/login`, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForFunction(() => (
      window.location.pathname !== '/login'
      || document.querySelector('#loginId') instanceof HTMLInputElement
    ), undefined, { timeout: 20_000 });
  } catch (error) {
    const browserState = {
      url: page.url(),
      title: await page.title().catch(() => ''),
      text: (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 500),
    };
    throw new Error(`browser authentication bootstrap stalled: ${JSON.stringify(browserState)}`, { cause: error });
  }

  if (new URL(page.url()).pathname === '/login') {
    await page.locator('#loginId').fill(process.env.CRM_QUOTE_PARITY_LOGIN_ID ?? 'admin');
    await page.locator('#password').fill(process.env.CRM_QUOTE_PARITY_PASSWORD ?? 'admin123!');
    await Promise.all([
      page.waitForURL((url) => url.pathname !== '/login', { timeout: 20_000 }),
      page.locator('form[name="ssoo-login"] button[type="submit"]').click(),
    ]);
  }

  assert.notEqual(new URL(page.url()).pathname, '/login', 'browser login did not leave the login route');
}

async function verifyBrowserQuote(authFixture) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  await context.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'x-crm-bt06-auth-fixture': 'verified-login-session' },
      body: JSON.stringify({ accessToken: authFixture.token, user: authFixture.user }),
    });
  });
  const page = await context.newPage();
  const tracker = createBrowserTracker(page);
  let popup;
  let mobilePage;
  try {
    await restoreBrowserSession(page);
    tracker.pageErrors.length = 0;
    tracker.consoleErrors.length = 0;
    tracker.httpFailures.length = 0;
    const originalUrl = `${webBaseUrl}/?sourceSurface=form&selected=${encodeURIComponent(opportunityCode)}`;
    await page.goto(originalUrl, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-source-surface="form"]').waitFor({ state: 'visible', timeout: 20_000 });
    const quoteButton = page.getByRole('button', { name: '견적서', exact: true }).filter({ visible: true }).first();
    await quoteButton.waitFor({ state: 'visible', timeout: 20_000 });
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => (
      button.getClientRects().length > 0
      && button.textContent?.replace(/\s+/g, ' ').trim() === '견적서'
      && !button.disabled
    )), undefined, { timeout: 20_000 });
    assert.equal(await quoteButton.isEnabled(), true, 'actual quote button is disabled');
    await quoteButton.click();

    const dialog = page.locator('[data-source-quote-preview="true"]');
    await dialog.waitFor({ state: 'visible', timeout: 20_000 });
    const document = dialog.locator('[data-source-quote-document="true"]');
    await document.waitFor({ state: 'visible' });
    const text = (await document.innerText()).replace(/\s+/g, ' ');
    for (const expected of [
      'QUOTATION', '삼성전자 귀중', 'ERP 시스템 구축 프로젝트', '월별', '주식회사 SSOO',
      '김민준 (영업1팀)', '90,000,000 원', '72,000,000 원', '162,000,000 원',
      '5,000,000 원', '157,000,000 원', 'VAT 별도',
    ]) {
      assert.ok(text.includes(expected), `quote preview is missing: ${expected}`);
    }
    const ci = document.locator('img[alt="CI"]');
    await ci.waitFor({ state: 'visible' });
    const ciState = await ci.evaluate((image) => ({ src: image.getAttribute('src'), complete: image.complete, naturalWidth: image.naturalWidth }));
    assert.match(ciState.src ?? '', /^data:image\/png;base64,/, 'actual seller CI was not hydrated through the authenticated binary route');
    assert.equal(ciState.complete, true);
    assert.ok(ciState.naturalWidth > 0, 'actual seller CI did not render');
    await page.waitForTimeout(500);
    await page.screenshot({ path: desktopScreenshotPath, fullPage: false });
    [popup] = await Promise.all([
      page.waitForEvent('popup', { timeout: 20_000 }),
      dialog.getByRole('button', { name: '인쇄 / PDF', exact: true }).click(),
    ]);
    const popupTracker = createBrowserTracker(popup);
    const popupDocument = popup.locator('[data-source-quote-document="true"]');
    await popupDocument.waitFor({ state: 'visible', timeout: 20_000 });
    await popup.locator('img[alt="CI"]').evaluate((image) => new Promise((resolve, reject) => {
      if (image.complete && image.naturalWidth > 0) return resolve(true);
      image.addEventListener('load', () => resolve(true), { once: true });
      image.addEventListener('error', () => reject(new Error('print CI failed to load')), { once: true });
    }));
    const popupText = (await popupDocument.innerText()).replace(/\s+/g, ' ');
    assert.ok(popupText.includes('157,000,000 원'));
    assert.ok(popupText.includes('월별'));
    assert.equal(new URL(page.url()).searchParams.get('selected'), opportunityCode, 'opening print changed the owner route');
    await popup.screenshot({ path: printScreenshotPath, fullPage: false });
    const browserPdf = await popup.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    await fs.writeFile(browserPdfPath, browserPdf);
    const reopenedPdf = await fs.readFile(browserPdfPath);
    assert.equal(sha256(reopenedPdf), sha256(browserPdf), 'reopened browser PDF differs from the generated bytes');
    assertPdf(reopenedPdf, 'browser print PDF');

    mobilePage = await context.newPage();
    await mobilePage.setViewportSize({ width: 390, height: 844 });
    const mobileTracker = createBrowserTracker(mobilePage);
    await restoreBrowserSession(mobilePage);
    await mobilePage.goto(originalUrl, { waitUntil: 'domcontentloaded' });
    await mobilePage.locator('[data-source-surface="form"]').waitFor({ state: 'visible', timeout: 20_000 });
    const mobileQuoteButton = mobilePage.getByRole('button', { name: '견적서', exact: true }).filter({ visible: true }).first();
    await mobileQuoteButton.waitFor({ state: 'visible', timeout: 20_000 });
    await mobilePage.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => (
      button.getClientRects().length > 0
      && button.textContent?.replace(/\s+/g, ' ').trim() === '견적서'
      && !button.disabled
    )), undefined, { timeout: 20_000 });
    await mobileQuoteButton.click();
    const mobileDialog = mobilePage.locator('[data-source-quote-preview="true"]');
    await mobileDialog.waitFor({ state: 'visible', timeout: 20_000 });
    const mobileDocument = mobileDialog.locator('[data-source-quote-document="true"]');
    await mobileDocument.waitFor({ state: 'visible' });
    const mobileText = (await mobileDocument.innerText()).replace(/\s+/g, ' ');
    assert.ok(mobileText.includes('157,000,000 원'));
    assert.ok(mobileText.includes('월별'));
    await mobileDocument.locator('img[alt="CI"]').waitFor({ state: 'visible' });
    await mobilePage.waitForTimeout(500);
    const mobileOverflow = await mobilePage.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    assert.equal(mobileOverflow, 0, `mobile quote preview overflows the document by ${mobileOverflow}px`);
    await mobilePage.screenshot({ path: mobileScreenshotPath, fullPage: false });

    assert.deepEqual(tracker.pageErrors, [], `page errors: ${tracker.pageErrors.join(' | ')}`);
    assert.deepEqual(tracker.consoleErrors, [], `console errors: ${tracker.consoleErrors.join(' | ')}`);
    assert.deepEqual(tracker.httpFailures, [], `HTTP failures: ${tracker.httpFailures.join(' | ')}`);
    assert.deepEqual(popupTracker.pageErrors, [], `popup errors: ${popupTracker.pageErrors.join(' | ')}`);
    assert.deepEqual(popupTracker.consoleErrors, [], `popup console errors: ${popupTracker.consoleErrors.join(' | ')}`);
    assert.deepEqual(popupTracker.httpFailures, [], `popup HTTP failures: ${popupTracker.httpFailures.join(' | ')}`);
    assert.deepEqual(mobileTracker.pageErrors, [], `mobile page errors: ${mobileTracker.pageErrors.join(' | ')}`);
    assert.deepEqual(mobileTracker.consoleErrors, [], `mobile console errors: ${mobileTracker.consoleErrors.join(' | ')}`);
    assert.deepEqual(mobileTracker.httpFailures, [], `mobile HTTP failures: ${mobileTracker.httpFailures.join(' | ')}`);

    return {
      desktopViewport: { width: 1440, height: 1000 },
      mobileViewport: { width: 390, height: 844 },
      mobileOverflowPx: mobileOverflow,
      routePreserved: true,
      ciRendered: {
        sourceMode: 'authenticated-data-url',
        complete: ciState.complete,
        naturalWidth: ciState.naturalWidth,
      },
      browserGate: { pageErrors: 0, consoleErrors: 0, unexpectedHttpFailures: 0 },
      browserPdf: { size: reopenedPdf.length, sha256: sha256(reopenedPdf), reopened: true },
    };
  } finally {
    await mobilePage?.close().catch(() => undefined);
    await popup?.close().catch(() => undefined);
    await context.close();
    await browser.close();
  }
}

async function captureBaseline(client) {
  const opportunity = await client.query(`
    select
      opportunity_id as id,
      opportunity_code as "opportunityCode",
      dms_link_status_code as "dmsLinkStatusCode",
      updated_by as "updatedBy",
      updated_at as "updatedAt",
      last_source as "lastSource",
      last_activity as "lastActivity",
      transaction_id as "transactionId",
      coalesce((select max(history_seq) from crm.crm_opportunity_h h where h.opportunity_id = o.opportunity_id), 0) as "historySeq"
      from crm.crm_opportunity_m o
     where opportunity_code = $1 and is_active = true
  `, [dmsOpportunityCode]);
  assert.equal(opportunity.rowCount, 1, `active DMS opportunity ${dmsOpportunityCode} was not found`);

  const seller = await client.query(`
    select
      seller_profile_id as id, profile_code as "profileCode", company_name as "companyName",
      ceo_name as "ceoName", business_registration_no as "businessRegistrationNo", address, tel, fax, website, email,
      ci_status_code as "ciStatusCode", ci_storage_ref as "ciStorageRef", is_active as "isActive", memo,
      created_by as "createdBy", created_at as "createdAt", updated_by as "updatedBy", updated_at as "updatedAt",
      last_source as "lastSource", last_activity as "lastActivity", transaction_id as "transactionId",
      coalesce((select max(history_seq) from crm.crm_quote_seller_profile_h h where h.seller_profile_id = s.seller_profile_id), 0) as "historySeq"
      from crm.crm_quote_seller_profile_m s
     where profile_code = 'default'
  `);
  assert.equal(seller.rowCount, 1, 'default seller profile was not found');

  const auth = await client.query(`
    select
      a.user_id as id, a.last_login_at as "lastLoginAt", a.login_fail_count as "loginFailCount", a.locked_until as "lockedUntil",
      a.updated_by as "updatedBy", a.updated_at as "updatedAt", a.last_source as "lastSource",
      a.last_activity as "lastActivity", a.transaction_id as "transactionId",
      coalesce((select max(history_seq) from common.cm_user_auth_h h where h.user_id = a.user_id), 0) as "historySeq"
      from common.cm_user_auth_m a
     where a.login_id = $1
  `, [process.env.CRM_QUOTE_PARITY_LOGIN_ID ?? 'admin']);
  assert.equal(auth.rowCount, 1, 'admin auth row was not found');

  const [handoffs, attempts, jobs, sessions, markdownFiles, storageFiles] = await Promise.all([
    client.query('select quote_dms_handoff_id::text as id from crm.crm_quote_dms_handoff_m where opportunity_id = $1 order by quote_dms_handoff_id', [opportunity.rows[0].id]),
    client.query("select operation_attempt_id::text as id from crm.crm_operation_attempt_m where source_entity_type = 'crm.opportunity' and source_entity_id = $1 order by operation_attempt_id", [dmsOpportunityCode]),
    client.query("select ai_index_job_id::text as id from common.cm_ai_index_job_m where source_app_code = 'crm' and entity_type_code = 'opportunity' and entity_id = $1 order by ai_index_job_id", [dmsOpportunityCode]),
    client.query('select session_id::text as id from common.cm_user_session_m where user_id = $1 order by session_id', [auth.rows[0].id]),
    listFiles(markdownRoot),
    listFiles(storageRoot),
  ]);
  return {
    opportunity: opportunity.rows[0],
    seller: seller.rows[0],
    auth: auth.rows[0],
    handoffIds: handoffs.rows.map((row) => row.id),
    attemptIds: attempts.rows.map((row) => row.id),
    aiJobIds: jobs.rows.map((row) => row.id),
    sessionIds: sessions.rows.map((row) => row.id),
    files: [...markdownFiles, ...storageFiles],
  };
}

function difference(current, baseline) {
  const before = new Set(baseline);
  return current.filter((value) => !before.has(value));
}

async function captureMutations(client, baseline) {
  const [handoffs, attempts, jobs, sessions, markdownFiles, storageFiles] = await Promise.all([
    client.query('select quote_dms_handoff_id::text as id from crm.crm_quote_dms_handoff_m where opportunity_id = $1 order by quote_dms_handoff_id', [baseline.opportunity.id]),
    client.query("select operation_attempt_id::text as id from crm.crm_operation_attempt_m where source_entity_type = 'crm.opportunity' and source_entity_id = $1 order by operation_attempt_id", [dmsOpportunityCode]),
    client.query("select ai_index_job_id::text as id from common.cm_ai_index_job_m where source_app_code = 'crm' and entity_type_code = 'opportunity' and entity_id = $1 order by ai_index_job_id", [dmsOpportunityCode]),
    client.query('select session_id::text as id from common.cm_user_session_m where user_id = $1 order by session_id', [baseline.auth.id]),
    listFiles(markdownRoot),
    listFiles(storageRoot),
  ]);
  return {
    handoffIds: difference(handoffs.rows.map((row) => row.id), baseline.handoffIds),
    attemptIds: difference(attempts.rows.map((row) => row.id), baseline.attemptIds),
    aiJobIds: difference(jobs.rows.map((row) => row.id), baseline.aiJobIds),
    sessionIds: difference(sessions.rows.map((row) => row.id), baseline.sessionIds),
    files: difference([...markdownFiles, ...storageFiles], baseline.files),
  };
}

async function removeCreatedFiles(createdFiles) {
  const roots = [markdownRoot, storageRoot];
  const directories = new Set();
  for (const file of createdFiles) {
    const absolute = path.resolve(file);
    const root = roots.find((candidate) => isContained(candidate, absolute));
    if (!root) throw new Error(`Refusing to remove a file outside isolated roots: ${absolute}`);
    await fs.rm(absolute, { force: true });
    let directory = path.dirname(absolute);
    while (isContained(root, directory)) {
      directories.add(directory);
      directory = path.dirname(directory);
    }
  }
  for (const directory of [...directories].sort((left, right) => right.length - left.length)) {
    try {
      await fs.rmdir(directory);
    } catch (error) {
      if (!['ENOENT', 'ENOTEMPTY'].includes(error?.code)) throw error;
    }
  }
}

async function cleanup(client, baseline, mutations) {
  await client.query('begin');
  try {
    if (mutations.aiJobIds.length) {
      await client.query('delete from common.cm_ai_index_job_m where ai_index_job_id = any($1::bigint[])', [mutations.aiJobIds]);
    }
    if (mutations.handoffIds.length) {
      await client.query('delete from crm.crm_quote_dms_handoff_m where quote_dms_handoff_id = any($1::bigint[])', [mutations.handoffIds]);
    }
    if (mutations.attemptIds.length) {
      await client.query('delete from crm.crm_operation_attempt_h where operation_attempt_id = any($1::bigint[])', [mutations.attemptIds]);
      await client.query('delete from crm.crm_operation_attempt_m where operation_attempt_id = any($1::bigint[])', [mutations.attemptIds]);
    }
    if (mutations.sessionIds.length) {
      await client.query('delete from common.cm_user_session_h where session_id = any($1::uuid[])', [mutations.sessionIds]);
      await client.query('delete from common.cm_user_session_m where session_id = any($1::uuid[])', [mutations.sessionIds]);
    }

    const opportunity = baseline.opportunity;
    await client.query(`
      update crm.crm_opportunity_m
         set dms_link_status_code = $2, updated_by = $3::bigint, updated_at = $4::timestamptz,
             last_source = $5, last_activity = $6, transaction_id = $7::uuid
       where opportunity_id = $1::bigint
    `, [opportunity.id, opportunity.dmsLinkStatusCode, opportunity.updatedBy, opportunity.updatedAt, opportunity.lastSource, opportunity.lastActivity, opportunity.transactionId]);
    await client.query('delete from crm.crm_opportunity_h where opportunity_id = $1::bigint and history_seq > $2::bigint', [opportunity.id, opportunity.historySeq]);

    const seller = baseline.seller;
    await client.query(`
      update crm.crm_quote_seller_profile_m
         set profile_code = $2, company_name = $3, ceo_name = $4, business_registration_no = $5,
             address = $6, tel = $7, fax = $8, website = $9, email = $10,
             ci_status_code = $11, ci_storage_ref = $12, is_active = $13, memo = $14,
             created_by = $15::bigint, created_at = $16::timestamptz, updated_by = $17::bigint,
             updated_at = $18::timestamptz, last_source = $19, last_activity = $20, transaction_id = $21::uuid
       where seller_profile_id = $1::bigint
    `, [
      seller.id, seller.profileCode, seller.companyName, seller.ceoName, seller.businessRegistrationNo,
      seller.address, seller.tel, seller.fax, seller.website, seller.email, seller.ciStatusCode,
      seller.ciStorageRef, seller.isActive, seller.memo, seller.createdBy, seller.createdAt,
      seller.updatedBy, seller.updatedAt, seller.lastSource, seller.lastActivity, seller.transactionId,
    ]);
    await client.query('delete from crm.crm_quote_seller_profile_h where seller_profile_id = $1::bigint and history_seq > $2::bigint', [seller.id, seller.historySeq]);

    const auth = baseline.auth;
    await client.query(`
      update common.cm_user_auth_m
         set last_login_at = $2::timestamptz, login_fail_count = $3, locked_until = $4::timestamptz,
             updated_by = $5::bigint, updated_at = $6::timestamptz, last_source = $7,
             last_activity = $8, transaction_id = $9::uuid
       where user_id = $1::bigint
    `, [auth.id, auth.lastLoginAt, auth.loginFailCount, auth.lockedUntil, auth.updatedBy, auth.updatedAt, auth.lastSource, auth.lastActivity, auth.transactionId]);
    await client.query('delete from common.cm_user_auth_h where user_id = $1::bigint and history_seq > $2::bigint', [auth.id, auth.historySeq]);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
  await removeCreatedFiles(mutations.files);

  const residue = await captureMutations(client, baseline);
  assert.deepEqual(residue, { handoffIds: [], attemptIds: [], aiJobIds: [], sessionIds: [], files: [] }, `BT-06 residue remains: ${JSON.stringify(residue)}`);
  return {
    databaseRowsRemaining: { handoffs: 0, operationAttempts: 0, aiJobs: 0, authSessions: 0 },
    filesRemaining: 0,
  };
}

async function run() {
  await fs.mkdir(evidenceRoot, { recursive: true });
  const client = new Client({ connectionString: targetDatabaseUrl.toString() });
  await client.connect();
  const baseline = await captureBaseline(client);
  const startedAt = new Date().toISOString();
  let mutations = { handoffIds: [], attemptIds: [], aiJobIds: [], sessionIds: [], files: [] };
  let verificationError;
  let result;
  try {
    const authFixture = await loginApi();
    const { token } = authFixture;
    const sourceCi = readSourceCi();
    const upload = await uploadSourceCi(token, sourceCi);
    const sellerProfile = await requestJson(apiBaseUrl, '/crm/quote-seller-profile', {
      token,
      method: 'PUT',
      body: {
        companyName: '주식회사 SSOO',
        ceoName: '대표이사',
        businessRegistrationNo: '000-00-00000',
        address: '서울특별시',
        tel: '02-0000-0000',
        fax: '02-0000-0001',
        website: 'https://example.invalid',
        email: 'admin@example.invalid',
        ciStatus: 'configured',
        ciStorageRef: upload.storageRef,
        memo: 'BT-06 disposable source-compatible seller profile',
      },
    });
    assert.equal(sellerProfile.payload?.data?.ciStatus, 'configured');

    const ciApi = await requestBinary(apiBaseUrl, '/crm/quote-seller-profile/ci', { token });
    assert.match(ciApi.headers['content-type'] ?? '', /^image\/png\b/);
    assert.equal(sha256(ciApi.buffer), sourceCi.sha256, 'API CI binary differs from source CI');
    const ciProxy = await requestBinary(webBaseUrl, '/api/crm/quote-seller-profile/ci', { token });
    assert.equal(sha256(ciProxy.buffer), sourceCi.sha256, 'web proxy CI binary differs from source CI');

    const opportunityResponse = await requestJson(apiBaseUrl, `/crm/opportunities/${encodeURIComponent(opportunityCode)}`, { token });
    const opportunity = opportunityResponse.payload?.data;
    assert.equal(opportunity?.id, opportunityCode);
    assert.equal(opportunity.revenueSubtotal, 162_000_000);
    assert.equal(opportunity.specialDiscountAmount, 5_000_000);
    assert.equal(opportunity.revenueTotal, 157_000_000);
    assert.equal(
      opportunity.revenueLines.reduce((sum, line) => sum + line.amount, 0),
      162_000_000,
      'source-compatible dashboard/list raw revenue must stay additive to the final discounted total',
    );

    const previewResponse = await requestJson(apiBaseUrl, `/crm/opportunities/${encodeURIComponent(opportunityCode)}/quote-preview`, { token });
    const preview = previewResponse.payload?.data;
    assert.equal(preview?.workflow?.sourceOpportunityId, opportunityCode);
    assert.equal(preview.workflow.paymentTermCode, 'monthly');
    assert.equal(preview.workflow.paymentTermLabel, '월별');
    assert.deepEqual(preview.summary, {
      productSubtotal: 90_000_000,
      serviceSubtotal: 72_000_000,
      revenueSubtotal: 162_000_000,
      specialDiscountType: 'amount',
      specialDiscountValue: 5_000_000,
      specialDiscountAmount: 5_000_000,
      quoteTotal: 157_000_000,
      vatIncluded: false,
      vatNotice: 'VAT 별도',
    });
    assert.deepEqual(preview.productLines.map((line) => [line.label, line.quantity, line.unitPrice, line.amount]), [
      ['서버 장비 (HP DL380)', 5, 18_000_000, 90_000_000],
    ]);
    assert.deepEqual(preview.serviceLines.map((line) => [line.department, line.memberName, line.grade, line.quantity, line.unitPrice, line.amount]), [
      ['영업1팀', '김민준', '특급', 6, 12_000_000, 72_000_000],
    ]);
    assert.equal(preview.party.sellerProfile.ciStatus, 'configured');
    assert.equal(preview.party.sellerProfile.ciStorageRef, upload.storageRef);
    assert.deepEqual(preview.party.ownerContact, {
      userId: '9', displayName: '김민준', departmentName: '영업1팀', phone: '010-0000-0001', email: 'kim@example.invalid',
    });
    const variables = Object.fromEntries(preview.dmsDocument.variables.map((variable) => [variable.key, variable.value]));
    assert.equal(preview.dmsDocument.variables.length, 20);
    assert.equal(variables.customerName, '삼성전자');
    assert.equal(variables.opportunityName, 'ERP 시스템 구축 프로젝트');
    assert.equal(variables.ownerDepartment, '영업1팀');
    assert.equal(variables.paymentTermCode, 'monthly');
    assert.equal(variables.quoteTotal, '157,000,000원');
    assert.equal(variables.sellerCompanyName, '주식회사 SSOO');
    assert.equal(preview.dmsDocument.readiness, 'ready');

    const browser = await verifyBrowserQuote(authFixture);

    const dmsPreviewResponse = await requestJson(apiBaseUrl, `/crm/opportunities/${encodeURIComponent(dmsOpportunityCode)}/quote-preview`, { token });
    const dmsPreview = dmsPreviewResponse.payload?.data;
    assert.equal(dmsPreview?.workflow?.sourceOpportunityId, dmsOpportunityCode);
    assert.equal(dmsPreview?.workflow?.confirmed, true, 'DMS artifact candidate must be confirmed');
    assert.equal(dmsPreview?.dmsDocument?.readiness, 'ready', `DMS artifact candidate is not ready: ${JSON.stringify(dmsPreview?.dmsDocument?.blockedReasons)}`);

    const draftResponse = await requestJson(webBaseUrl, `/api/crm/opportunities/${encodeURIComponent(dmsOpportunityCode)}/quote-dms-document-draft`, {
      token,
      method: 'POST',
      body: { templateKey: 'crm-quote-v1', memo: 'BT-06 disposable quote draft' },
      statuses: [200, 201],
    });
    assert.equal(draftResponse.payload?.data?.savedPath, dmsPreview.dmsDocument.draftPathHint);
    const executionResponse = await requestJson(webBaseUrl, `/api/crm/opportunities/${encodeURIComponent(dmsOpportunityCode)}/quote-dms-document-lifecycle-execution`, {
      token,
      method: 'POST',
      body: { memo: 'BT-06 disposable quote DOCX/PDF execution' },
      statuses: [200, 201],
      headers: { 'x-idempotency-key': `bt-06-${Date.now()}` },
    });
    assert.equal(executionResponse.payload?.data?.opportunityId, baseline.opportunity.id.toString());

    const word = await requestBinary(webBaseUrl, `/api/crm/opportunities/${encodeURIComponent(dmsOpportunityCode)}/quote-dms-artifacts/word-export`, { token });
    const pdf = await requestBinary(webBaseUrl, `/api/crm/opportunities/${encodeURIComponent(dmsOpportunityCode)}/quote-dms-artifacts/pdf-export`, { token });
    const docx = await assertDocx(word.buffer, [
      dmsPreview.party.customerName,
      dmsPreview.dmsDocument.opportunityName,
      dmsPreview.summary.quoteTotal.toLocaleString('ko-KR'),
      dmsPreview.party.sellerName,
      dmsPreview.party.ownerName,
    ]);
    assertPdf(pdf.buffer, 'DMS quote PDF');

    result = {
      status: 'PASS_PENDING_CLEANUP',
      sourceCi: { sha256: sourceCi.sha256, size: sourceCi.buffer.length, sourceEvidence: path.relative(repoRoot, sourceCi.sourceCiPath) },
      ciRoundTrip: { apiSha256: sha256(ciApi.buffer), proxySha256: sha256(ciProxy.buffer), exact: true },
      preview: {
        opportunityCode,
        paymentTermCode: preview.workflow.paymentTermCode,
        paymentTermLabel: preview.workflow.paymentTermLabel,
        totals: preview.summary,
        productLineCount: preview.productLines.length,
        serviceLineCount: preview.serviceLines.length,
        variableCount: preview.dmsDocument.variables.length,
        sellerCiStatus: preview.party.sellerProfile.ciStatus,
      },
      sourceContradictionPolicy: {
        opportunityCode,
        dashboardListRawRevenue: opportunity.revenueLines.reduce((sum, line) => sum + line.amount, 0),
        formQuoteSubtotal: opportunity.revenueSubtotal,
        specialDiscountAmount: opportunity.specialDiscountAmount,
        formQuoteFinalRevenue: opportunity.revenueTotal,
        policy: 'source-compatible dashboard/list raw total plus additive coherent form/quote subtotal-discount-final metrics',
      },
      browser,
      dms: {
        opportunityCode: dmsOpportunityCode,
        draftStatus: draftResponse.status,
        lifecycleStatus: executionResponse.status,
        word: { size: word.buffer.length, sha256: sha256(word.buffer), contentType: word.headers['content-type'], ...docx, reopened: true },
        pdf: { size: pdf.buffer.length, sha256: sha256(pdf.buffer), contentType: pdf.headers['content-type'], reopened: true },
      },
    };
  } catch (error) {
    verificationError = error;
  } finally {
    try {
      mutations = await captureMutations(client, baseline);
      const cleanupResult = await cleanup(client, baseline, mutations);
      const finalEvidence = {
        contract,
        status: verificationError ? 'FAIL_CLEANED' : 'PASS_CLEANED',
        databaseName,
        startedAt,
        completedAt: new Date().toISOString(),
        credentialsStored: false,
        evidenceFiles: {
          desktopPreview: path.relative(repoRoot, desktopScreenshotPath),
          mobilePreview: path.relative(repoRoot, mobileScreenshotPath),
          desktopPrint: path.relative(repoRoot, printScreenshotPath),
          browserPdf: path.relative(repoRoot, browserPdfPath),
        },
        ...result,
        statusBeforeCleanup: result?.status,
        mutationsCreated: {
          handoffs: mutations.handoffIds.length,
          operationAttempts: mutations.attemptIds.length,
          aiJobs: mutations.aiJobIds.length,
          authSessions: mutations.sessionIds.length,
          files: mutations.files.length,
        },
        cleanup: cleanupResult,
        ...(verificationError ? { failureMessage: verificationError instanceof Error ? verificationError.message : String(verificationError) } : {}),
        status: verificationError ? 'FAIL_CLEANED' : 'PASS_CLEANED',
      };
      await writeEvidence(finalEvidence);
    } catch (cleanupError) {
      await writeEvidence({
        contract,
        status: 'FAIL_RETAINED_FOR_CLEANUP',
        databaseName,
        startedAt,
        failedAt: new Date().toISOString(),
        credentialsStored: false,
        failureMessage: verificationError instanceof Error ? verificationError.message : String(verificationError ?? 'verification passed before cleanup'),
        cleanupFailureMessage: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        mutationsCreated: jsonSafe(mutations),
      });
      throw cleanupError;
    } finally {
      await client.end();
    }
  }

  if (verificationError) throw verificationError;
  process.stdout.write(`${JSON.stringify({
    status: 'PASS_CLEANED',
    contract,
    databaseName,
    opportunityCode,
    dmsOpportunityCode,
    evidencePath: path.relative(repoRoot, evidencePath),
    browserPdf: path.relative(repoRoot, browserPdfPath),
    residue: { databaseRows: 0, files: 0 },
  }, null, 2)}\n`);
}

async function inspectStale() {
  const cutoff = process.env.CRM_QUOTE_PARITY_CUTOFF;
  assert.ok(cutoff && Number.isFinite(Date.parse(cutoff)), 'CRM_QUOTE_PARITY_CUTOFF must be an ISO timestamp');
  const client = new Client({ connectionString: targetDatabaseUrl.toString() });
  await client.connect();
  try {
    const [sellerHistory, authHistory, sessions] = await Promise.all([
      client.query(`
        select history_seq::text as "historySeq", event_at as "eventAt", profile_code as "profileCode",
               company_name as "companyName", ceo_name as "ceoName", business_registration_no as "businessRegistrationNo",
               address, tel, fax, website, email, ci_status_code as "ciStatusCode", ci_storage_ref as "ciStorageRef",
               is_active as "isActive", memo, created_by as "createdBy", created_at as "createdAt",
               updated_by as "updatedBy", updated_at as "updatedAt", last_source as "lastSource",
               last_activity as "lastActivity", transaction_id as "transactionId"
          from crm.crm_quote_seller_profile_h
         where seller_profile_id = (select seller_profile_id from crm.crm_quote_seller_profile_m where profile_code = 'default')
         order by history_seq::bigint desc
         limit 8
      `),
      client.query(`
        select history_seq::text as "historySeq", event_at as "eventAt", last_login_at as "lastLoginAt",
               login_fail_count as "loginFailCount", locked_until as "lockedUntil", updated_by as "updatedBy",
               updated_at as "updatedAt", last_source as "lastSource", last_activity as "lastActivity",
               transaction_id as "transactionId"
          from common.cm_user_auth_h
         where user_id = (select user_id from common.cm_user_auth_m where login_id = $1)
         order by history_seq::bigint desc
         limit 12
      `, [process.env.CRM_QUOTE_PARITY_LOGIN_ID ?? 'admin']),
      client.query(`
        select session_id::text as "sessionId", created_at as "createdAt", issued_app as "issuedApp", last_activity as "lastActivity"
          from common.cm_user_session_m
         where user_id = (select user_id from common.cm_user_auth_m where login_id = $2)
           and created_at >= $1::timestamp
         order by created_at
      `, [cutoff, process.env.CRM_QUOTE_PARITY_LOGIN_ID ?? 'admin']),
    ]);
    process.stdout.write(`${JSON.stringify({ sellerHistory: sellerHistory.rows, authHistory: authHistory.rows, sessions: sessions.rows }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

async function recoverStale() {
  const cutoff = process.env.CRM_QUOTE_PARITY_CUTOFF;
  assert.ok(cutoff && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(cutoff), 'CRM_QUOTE_PARITY_CUTOFF must be a local timestamp without an offset');
  const client = new Client({ connectionString: targetDatabaseUrl.toString() });
  await client.connect();
  let uploadedCiPath;
  try {
    const sellerCurrent = await client.query("select seller_profile_id as id, ci_storage_ref as \"ciStorageRef\" from crm.crm_quote_seller_profile_m where profile_code = 'default'");
    assert.equal(sellerCurrent.rowCount, 1);
    const sellerId = sellerCurrent.rows[0].id;
    const storageRef = sellerCurrent.rows[0].ciStorageRef;
    assert.match(storageRef ?? '', /^local:\/\//, 'stale seller profile does not point to a disposable local CI');
    uploadedCiPath = path.resolve(storageRoot, decodeURIComponent(storageRef.slice('local://'.length)));
    assert.ok(isContained(storageRoot, uploadedCiPath), 'stale seller CI path escaped the isolated storage root');

    const [sellerBoundary, authBoundary, sessionRows] = await Promise.all([
      client.query(`
        select min(history_seq)::bigint as "firstNewSeq"
          from crm.crm_quote_seller_profile_h
         where seller_profile_id = $1 and event_at >= $2::timestamp
      `, [sellerId, cutoff]),
      client.query(`
        select min(history_seq)::bigint as "firstNewSeq"
          from common.cm_user_auth_h
         where user_id = (select user_id from common.cm_user_auth_m where login_id = $2)
           and event_at >= $1::timestamp
      `, [cutoff, process.env.CRM_QUOTE_PARITY_LOGIN_ID ?? 'admin']),
      client.query(`
        select session_id::text as id
          from common.cm_user_session_m
         where user_id = (select user_id from common.cm_user_auth_m where login_id = $2)
           and created_at >= $1::timestamp
      `, [cutoff, process.env.CRM_QUOTE_PARITY_LOGIN_ID ?? 'admin']),
    ]);
    const firstSellerSeq = BigInt(sellerBoundary.rows[0].firstNewSeq);
    const firstAuthSeq = BigInt(authBoundary.rows[0].firstNewSeq);
    assert.ok(firstSellerSeq > 1n && firstAuthSeq > 1n, 'stale history boundary was not found');
    const baselineSellerSeq = firstSellerSeq - 1n;
    const baselineAuthSeq = firstAuthSeq - 1n;
    const sessionIds = sessionRows.rows.map((row) => row.id);
    assert.ok(sessionIds.length > 0, 'no stale auth sessions were found at the requested boundary');

    await client.query('begin');
    try {
      await client.query(`
        update crm.crm_quote_seller_profile_m m
           set profile_code = h.profile_code, company_name = h.company_name, ceo_name = h.ceo_name,
               business_registration_no = h.business_registration_no, address = h.address, tel = h.tel,
               fax = h.fax, website = h.website, email = h.email, ci_status_code = h.ci_status_code,
               ci_storage_ref = h.ci_storage_ref, is_active = h.is_active, memo = h.memo,
               created_by = h.created_by, created_at = h.created_at, updated_by = h.updated_by,
               updated_at = h.updated_at, last_source = h.last_source, last_activity = h.last_activity,
               transaction_id = h.transaction_id
          from crm.crm_quote_seller_profile_h h
         where m.seller_profile_id = $1 and h.seller_profile_id = m.seller_profile_id and h.history_seq = $2
      `, [sellerId, baselineSellerSeq.toString()]);
      await client.query('delete from crm.crm_quote_seller_profile_h where seller_profile_id = $1 and history_seq > $2', [sellerId, baselineSellerSeq.toString()]);

      await client.query(`
        update common.cm_user_auth_m m
           set last_login_at = h.last_login_at, login_fail_count = h.login_fail_count, locked_until = h.locked_until,
               updated_by = h.updated_by, updated_at = h.updated_at, last_source = h.last_source,
               last_activity = h.last_activity, transaction_id = h.transaction_id
          from common.cm_user_auth_h h
         where m.user_id = h.user_id and m.login_id = $1 and h.history_seq = $2
      `, [process.env.CRM_QUOTE_PARITY_LOGIN_ID ?? 'admin', baselineAuthSeq.toString()]);
      await client.query(`
        delete from common.cm_user_auth_h
         where user_id = (select user_id from common.cm_user_auth_m where login_id = $1)
           and history_seq > $2
      `, [process.env.CRM_QUOTE_PARITY_LOGIN_ID ?? 'admin', baselineAuthSeq.toString()]);
      await client.query('delete from common.cm_user_session_h where session_id = any($1::uuid[])', [sessionIds]);
      await client.query('delete from common.cm_user_session_m where session_id = any($1::uuid[])', [sessionIds]);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    }

    await fs.rm(uploadedCiPath, { force: true });
    const residue = await client.query(`
      select
        (select max(history_seq)::text from crm.crm_quote_seller_profile_h where seller_profile_id = $1) as "sellerMaxHistorySeq",
        (select max(history_seq)::text from common.cm_user_auth_h where user_id = (select user_id from common.cm_user_auth_m where login_id = $2)) as "authMaxHistorySeq",
        (select count(*)::int from common.cm_user_session_m where session_id = any($3::uuid[])) as sessions,
        (select ci_storage_ref from crm.crm_quote_seller_profile_m where seller_profile_id = $1) as "ciStorageRef"
    `, [sellerId, process.env.CRM_QUOTE_PARITY_LOGIN_ID ?? 'admin', sessionIds]);
    assert.deepEqual(residue.rows[0], {
      sellerMaxHistorySeq: baselineSellerSeq.toString(),
      authMaxHistorySeq: baselineAuthSeq.toString(),
      sessions: 0,
      ciStorageRef: 'assets/images/ci.png',
    });
    await assert.rejects(fs.stat(uploadedCiPath), (error) => error?.code === 'ENOENT');
    process.stdout.write(`${JSON.stringify({
      status: 'PASS_STALE_CLEANED',
      databaseName,
      cutoff,
      restoredSellerHistorySeq: baselineSellerSeq.toString(),
      restoredAuthHistorySeq: baselineAuthSeq.toString(),
      sessionsRemoved: sessionIds.length,
      filesRemaining: 0,
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

if (!['run', 'inspect-stale', 'recover-stale'].includes(action)) throw new Error('Use verify-crm-quote-parity.mjs run|inspect-stale|recover-stale');

const actionPromise = action === 'inspect-stale' ? inspectStale() : action === 'recover-stale' ? recoverStale() : run();
actionPromise.catch((error) => {
  console.error(`CRM quote parity verification failed: ${error.stack || error.message}`);
  process.exitCode = 1;
});
