#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { DMS_GO_LIVE_TRACK_IDS } from './dms-go-live-contract.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFromServer = createRequire(path.join(repoRoot, 'apps', 'server', 'package.json'));
const JSZip = requireFromServer('jszip');
const { definePDFJSModule, extractText: extractPdfTextWithUnpdf, getDocumentProxy } = requireFromServer('unpdf');
const pdfJsModulePath = requireFromServer.resolve('pdfjs-dist/legacy/build/pdf.mjs');
let pdfJsModuleDefined = false;
const argv = process.argv.slice(2);
const options = {
  help: argv.includes('--help'),
  selfTest: argv.includes('--self-test'),
  template: argv.includes('--template'),
  packetPath: readOption('--packet', process.env.CRM_GO_LIVE_SELLER_INPUT_PATH || ''),
  envFile: readOption('--env-file', process.env.CRM_GO_LIVE_ENV_FILE || '.env.production'),
  apiEvidencePath: readOption('--api-evidence', process.env.CRM_GO_LIVE_API_EVIDENCE_PATH || ''),
  dmsEvidencePath: readOption('--dms-evidence', process.env.CRM_GO_LIVE_DMS_EVIDENCE_PATH || ''),
  manifestPath: readOption('--manifest', process.env.CRM_GO_LIVE_BROWSER_MANIFEST_PATH || ''),
  evidencePath: readOption('--evidence', process.env.CRM_GO_LIVE_FINAL_EVIDENCE_PATH || ''),
};

const requiredRuns = Object.freeze([
  { id: 'desktop-1440x1000', width: 1440, height: 1000 },
  { id: 'mobile-390x844', width: 390, height: 844 },
]);

const requiredSurfaces = Object.freeze([
  {
    id: 'crm-quote-settings',
    owner: 'crm',
    pathname: '/quote-settings',
    landmarks: ['견적 설정', '회사 정보'],
  },
  {
    id: 'crm-quote-preview',
    owner: 'crm',
    pathname: '/',
    landmarks: ['견적서 미리보기'],
  },
  {
    id: 'crm-quote-print',
    owner: 'crm-or-popup',
    pathname: '/',
    landmarks: ['견적서', '인쇄 / PDF 저장'],
  },
  {
    id: 'crm-operations',
    owner: 'crm',
    pathname: '/operations',
    landmarks: ['Live 런칭 운영 상태'],
  },
  {
    id: 'admin-readiness',
    owner: 'admin',
    pathname: '/',
    landmarks: ['동시 런칭 운영 상태'],
  },
  {
    id: 'dms-operations',
    owner: 'dms',
    pathname: '/settings/operations/git',
    landmarks: ['DMS 운영 readiness'],
  },
]);

const requiredArtifacts = Object.freeze([
  { id: 'quote-print-pdf', mimeType: 'application/pdf', magic: Buffer.from('%PDF-'), amountsExact: true },
  { id: 'dms-quote-docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', magic: Buffer.from([0x50, 0x4b, 0x03, 0x04]), reopened: true },
  { id: 'dms-quote-pdf', mimeType: 'application/pdf', magic: Buffer.from('%PDF-'), reopened: true },
]);

if (options.help) {
  printUsage();
} else if (options.template) {
  try {
    process.stdout.write(`${JSON.stringify(createBoundTemplate(), null, 2)}\n`);
  } catch (error) {
    fail(`CRM browser evidence template preparation failed: ${sanitizeError(error)}`);
  }
} else if (options.selfTest) {
  await runSelfTest();
  console.log('✓ CRM go-live browser evidence verifier self-test passed');
} else {
  await runCli();
}

async function runCli() {
  const requiredPaths = {
    '--packet': options.packetPath,
    '--api-evidence': options.apiEvidencePath,
    '--dms-evidence': options.dmsEvidencePath,
    '--manifest': options.manifestPath,
    '--evidence': options.evidencePath,
  };
  const missing = Object.entries(requiredPaths).filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    fail(`${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} required`);
    return;
  }

  const envPath = path.resolve(options.envFile);
  const packetPath = path.resolve(options.packetPath);
  const apiEvidencePath = path.resolve(options.apiEvidencePath);
  const dmsEvidencePath = path.resolve(options.dmsEvidencePath);
  const manifestPath = path.resolve(options.manifestPath);
  const evidencePath = path.resolve(options.evidencePath);

  try {
    verifyProductionEnvironment(envPath);
    const env = readEnvFile(envPath);
    const result = await verifyFinalEvidence({
      releaseSha: env.SSOO_RELEASE_SHA || '',
      urls: {
        crm: env.NEXT_PUBLIC_CRM_APP_URL || '',
        admin: env.NEXT_PUBLIC_ADMIN_APP_URL || '',
        dms: env.NEXT_PUBLIC_DMS_APP_URL || '',
      },
      packetPath,
      apiEvidencePath,
      dmsEvidencePath,
      manifestPath,
      now: Date.now(),
    });
    const report = {
      contract: 'CRM-S15-FINAL-GO-LIVE',
      schemaVersion: 1,
      status: 'PASS',
      finalGoLive: true,
      credentialsStored: false,
      completedAt: new Date().toISOString(),
      deploymentId: result.deploymentId,
      releaseSha: result.releaseSha,
      input: result.input,
      api: result.api,
      dms: result.dms,
      browser: result.browser,
      artifacts: result.artifacts,
    };
    writeJson(evidencePath, report);
    console.log(JSON.stringify({
      status: report.status,
      contract: report.contract,
      finalGoLive: true,
      deploymentId: report.deploymentId,
      runCount: report.browser.runs.length,
      surfaceCount: report.browser.runs.reduce((total, run) => total + run.surfaceCount, 0),
      artifactCount: report.artifacts.length,
      evidencePath: path.relative(repoRoot, evidencePath),
      credentialsStored: false,
    }, null, 2));
  } catch (error) {
    const message = sanitizeError(error);
    try {
      writeJson(evidencePath, {
        contract: 'CRM-S15-FINAL-GO-LIVE',
        schemaVersion: 1,
        status: 'FAIL',
        finalGoLive: false,
        credentialsStored: false,
        completedAt: new Date().toISOString(),
        error: message,
      });
    } catch {
      // Preserve the original verification failure when the evidence path is not writable.
    }
    fail(`CRM final go-live evidence verification failed: ${message}`);
  }
}

async function verifyFinalEvidence({ releaseSha, urls, packetPath, apiEvidencePath, dmsEvidencePath, manifestPath, now }) {
  assertCommitSha(releaseSha, 'SSOO_RELEASE_SHA');
  for (const [owner, value] of Object.entries(urls)) validateProductionUrl(value, `${owner} URL`);

  const packetBuffer = readFile(packetPath, 'seller input packet');
  const packet = parseJson(packetBuffer, 'seller input packet');
  validatePacketIdentity(packet);
  const sellerProfileSha256 = hashSellerProfile(packet.sellerProfile);
  const ciSha256 = packet.ciAsset.sha256;

  const apiBuffer = readFile(apiEvidencePath, 'API evidence');
  const apiEvidence = parseJson(apiBuffer, 'API evidence');
  const apiReadiness = validateApiEvidence(apiEvidence, {
    deploymentId: packet.deploymentId,
    releaseSha,
    packetSha256: sha256(packetBuffer),
    ciSha256,
  });

  const dmsBuffer = readFile(dmsEvidencePath, 'DMS final go-live evidence');
  const dmsEvidence = parseJson(dmsBuffer, 'DMS final go-live evidence');
  validateDmsEvidence(dmsEvidence, releaseSha, now);
  const dmsBundle = validateDmsEvidenceBundle(dmsEvidencePath, dmsBuffer, dmsEvidence, now);

  const manifestBuffer = readFile(manifestPath, 'browser manifest');
  const manifest = parseJson(manifestBuffer, 'browser manifest');
  const manifestDir = path.dirname(manifestPath);
  assertNoCredentialFields(manifest);
  assertEqual(manifest.contract, 'CRM-S15-BROWSER-EVIDENCE', 'manifest.contract');
  assertEqual(manifest.schemaVersion, 3, 'manifest.schemaVersion');
  assertEqual(manifest.status, 'PASS', 'manifest.status');
  assertEqual(manifest.synthetic, false, 'manifest.synthetic');
  assertEqual(manifest.sourceEnvironment, 'production', 'manifest.sourceEnvironment');
  assertEqual(manifest.tool, 'playwright-cli', 'manifest.tool');
  assertEqual(manifest.credentialsStored, false, 'manifest.credentialsStored');
  assertEqual(manifest.deploymentId, packet.deploymentId, 'manifest.deploymentId');
  assertEqual(manifest.releaseSha, releaseSha, 'manifest.releaseSha');
  assertEqual(manifest.apiEvidenceSha256, sha256(apiBuffer), 'manifest.apiEvidenceSha256');
  assertEqual(manifest.sellerProfileSha256, sellerProfileSha256, 'manifest.sellerProfileSha256');
  assertEqual(manifest.ciSha256, ciSha256, 'manifest.ciSha256');
  assertText(manifest.runId, 'manifest.runId', 160);
  assertNotPlaceholder(manifest.runId, 'manifest.runId');
  assertText(manifest.browserVersion, 'manifest.browserVersion', 160);
  assertText(manifest.playwrightCliVersion, 'manifest.playwrightCliVersion', 80);
  assertFreshCapture(manifest.capturedAt, apiEvidence.completedAt, now);
  const quoteVerification = validateQuoteVerification(manifest.quoteVerification);

  const usedPaths = new Set();
  const runs = validateRuns(manifest.runs, {
    manifestDir,
    releaseSha,
    urls,
    sellerProfileSha256,
    ciSha256,
    apiCompletedAt: apiEvidence.completedAt,
    now,
    usedPaths,
    sellerProfile: packet.sellerProfile,
    quoteVerification,
    apiReadiness,
  });
  const artifacts = await validateArtifacts(manifest.artifacts, {
    manifestDir,
    sellerProfileSha256,
    ciSha256,
    usedPaths,
    sellerProfile: packet.sellerProfile,
    quoteVerification,
  });

  return {
    deploymentId: packet.deploymentId,
    releaseSha,
    input: {
      packetSha256: sha256(packetBuffer),
      sellerProfileSha256,
      ciSha256,
    },
    api: {
      evidenceSha256: sha256(apiBuffer),
      completedAt: apiEvidence.completedAt,
      checkCount: apiEvidence.checks.length,
      readiness: {
        crmSnapshotId: apiReadiness.crm.snapshotId,
        dmsSnapshotId: apiReadiness.dms.snapshotId,
        status: 'ready',
        blockerCount: 0,
        degradedCount: 0,
      },
    },
    dms: {
      evidenceSha256: sha256(dmsBuffer),
      runId: dmsEvidence.runId,
      finishedAt: dmsEvidence.finishedAt,
      decision: dmsEvidence.decision,
      trackCount: dmsEvidence.tracks.length,
      manifestSha256: dmsBundle.manifestSha256,
      evidenceFileCount: dmsBundle.evidenceFileCount,
    },
    browser: {
      manifestSha256: sha256(manifestBuffer),
      runId: manifest.runId,
      capturedAt: manifest.capturedAt,
      tool: manifest.tool,
      browserVersion: manifest.browserVersion,
      playwrightCliVersion: manifest.playwrightCliVersion,
      quoteVerification: summarizeQuoteVerification(quoteVerification),
      runs,
    },
    artifacts,
  };
}

function validateDmsEvidenceBundle(evidencePath, evidenceBuffer, evidence, now) {
  const root = fs.realpathSync(path.dirname(evidencePath));
  const suppliedEvidencePath = fs.realpathSync(evidencePath);
  const manifestPath = path.join(root, 'manifest.json');
  const manifestBuffer = readFile(manifestPath, 'DMS evidence manifest');
  const manifest = parseJson(manifestBuffer, 'DMS evidence manifest');
  assertObject(manifest, 'DMS evidence manifest');
  assertEqual(manifest.schemaVersion, 1, 'DMS evidence manifest.schemaVersion');
  assertEqual(manifest.runId, evidence.runId, 'DMS evidence manifest.runId');
  assertRecentTimestamp(manifest.generatedAt, now, 'DMS evidence manifest.generatedAt');
  if (!Array.isArray(manifest.files) || manifest.files.length < 1) throw new Error('DMS evidence manifest.files must not be empty');
  const seenPaths = new Set();
  let finalEvidenceMatched = false;
  for (const item of manifest.files) {
    assertObject(item, 'DMS evidence manifest file');
    assertText(item.path, 'DMS evidence manifest file.path', 1_000);
    assertSha256(item.sha256, `DMS evidence manifest file ${item.path}.sha256`);
    const filePath = resolveContainedEvidencePath(root, item.path, `DMS evidence manifest file ${item.path}`);
    if (seenPaths.has(filePath)) throw new Error(`DMS evidence manifest contains a duplicate path: ${item.path}`);
    seenPaths.add(filePath);
    const buffer = readFile(filePath, `DMS evidence file ${item.path}`);
    assertEqual(item.size, buffer.length, `DMS evidence manifest file ${item.path}.size`);
    assertEqual(item.sha256, sha256(buffer), `DMS evidence manifest file ${item.path}.sha256`);
    if (filePath === suppliedEvidencePath) {
      finalEvidenceMatched = true;
      assertEqual(item.sha256, sha256(evidenceBuffer), 'DMS final evidence manifest binding');
    }
  }
  if (!finalEvidenceMatched) throw new Error('DMS evidence manifest does not bind the supplied final-go-evidence file');
  return { manifestSha256: sha256(manifestBuffer), evidenceFileCount: manifest.files.length };
}

function validateDmsEvidence(evidence, releaseSha, now) {
  assertObject(evidence, 'DMS final go-live evidence');
  assertNoCredentialFields(evidence);
  assertEqual(evidence.schemaVersion, 2, 'DMS evidence.schemaVersion');
  assertEqual(evidence.status, 'passed', 'DMS evidence.status');
  assertEqual(evidence.decision, 'GO', 'DMS evidence.decision');
  assertEqual(evidence.releaseSha, releaseSha, 'DMS evidence.releaseSha');
  assertEqual(evidence.head, releaseSha, 'DMS evidence.head');
  assertEqual(evidence.checkpointPhase, 'complete', 'DMS evidence.checkpointPhase');
  assertText(evidence.runId, 'DMS evidence.runId', 160);
  assertSha256(evidence.worktreeFingerprint, 'DMS evidence.worktreeFingerprint');
  assertSha256(evidence.planHash, 'DMS evidence.planHash');
  assertRecentTimestamp(evidence.finishedAt, now, 'DMS evidence.finishedAt');
  if (!Array.isArray(evidence.tracks)) throw new Error('DMS evidence.tracks must be an array');
  assertExactIds(evidence.tracks, DMS_GO_LIVE_TRACK_IDS, 'DMS evidence.tracks');
  for (const track of evidence.tracks) {
    assertEqual(track.status, 'passed', `DMS track ${track.id}.status`);
    if (!Array.isArray(track.steps) || track.steps.length < 1) throw new Error(`DMS track ${track.id} must contain executed steps`);
    for (const step of track.steps) assertEqual(step.status, 'passed', `DMS track ${track.id} step ${step.id}`);
  }
}

function validatePacketIdentity(packet) {
  assertObject(packet, 'packet');
  assertEqual(packet.schemaVersion, 1, 'packet.schemaVersion');
  assertEqual(packet.status, 'approved', 'packet.status');
  assertEqual(packet.environment, 'production', 'packet.environment');
  assertText(packet.deploymentId, 'packet.deploymentId', 120);
  assertNotPlaceholder(packet.deploymentId, 'packet.deploymentId');
  assertObject(packet.sellerProfile, 'packet.sellerProfile');
  for (const field of ['companyName', 'ceoName', 'businessRegistrationNo', 'address', 'tel', 'email']) {
    assertText(packet.sellerProfile[field], `packet.sellerProfile.${field}`, 500);
  }
  assertObject(packet.ciAsset, 'packet.ciAsset');
  assertSha256(packet.ciAsset.sha256, 'packet.ciAsset.sha256');
}

function validateApiEvidence(evidence, expected) {
  assertObject(evidence, 'API evidence');
  assertNoCredentialFields(evidence);
  assertEqual(evidence.contract, 'CRM-S15-GO-LIVE-API', 'API evidence.contract');
  assertEqual(evidence.schemaVersion, 1, 'API evidence.schemaVersion');
  assertEqual(evidence.status, 'PASS_LIVE_API_READY', 'API evidence.status');
  assertEqual(evidence.finalGoLive, false, 'API evidence.finalGoLive');
  assertEqual(evidence.browserRequired, true, 'API evidence.browserRequired');
  assertEqual(evidence.credentialsStored, false, 'API evidence.credentialsStored');
  assertEqual(evidence.deploymentId, expected.deploymentId, 'API evidence.deploymentId');
  assertEqual(evidence.releaseSha, expected.releaseSha, 'API evidence.releaseSha');
  assertEqual(evidence.input?.packetSha256, expected.packetSha256, 'API evidence.input.packetSha256');
  assertEqual(evidence.input?.ciSha256, expected.ciSha256, 'API evidence.input.ciSha256');
  assertIsoDate(evidence.completedAt, 'API evidence.completedAt');
  if (!Array.isArray(evidence.checks)) throw new Error('API evidence.checks must be an array');
  const requiredChecks = [
    'api-health',
    'api-readiness',
    'crm-web',
    'admin-web',
    'dms-web',
    'crm-admin-login',
    'seller-profile-exact',
    'seller-ci-exact',
    'crm-owner-readiness',
    'admin-readiness-bridge',
    'verification-session-logout',
  ];
  assertExactIds(evidence.checks, requiredChecks, 'API evidence.checks', 'kind');
  for (const item of evidence.checks) assertEqual(item.status, 'passed', `API evidence check ${item.kind}`);
  const readiness = validateApiReadiness(evidence.readiness, evidence.completedAt);
  const ownerCheck = evidence.checks.find((item) => item.kind === 'crm-owner-readiness');
  const bridgeCheck = evidence.checks.find((item) => item.kind === 'admin-readiness-bridge');
  assertEqual(ownerCheck.snapshotId, readiness.crm.snapshotId, 'API evidence CRM owner check snapshot identity');
  assertEqual(bridgeCheck.crmSnapshotId, readiness.crm.snapshotId, 'API evidence Admin CRM snapshot identity');
  assertEqual(bridgeCheck.dmsSnapshotId, readiness.dms.snapshotId, 'API evidence Admin DMS snapshot identity');
  return readiness;
}

function validateApiReadiness(value, completedAt) {
  assertObject(value, 'API evidence.readiness');
  const result = {};
  for (const owner of ['crm', 'dms']) {
    const snapshot = value[owner];
    assertObject(snapshot, `API evidence.readiness.${owner}`);
    assertEqual(snapshot.owner, owner, `API evidence.readiness.${owner}.owner`);
    assertText(snapshot.snapshotId, `API evidence.readiness.${owner}.snapshotId`, 300);
    assertNotPlaceholder(snapshot.snapshotId, `API evidence.readiness.${owner}.snapshotId`);
    assertIsoDate(snapshot.checkedAt, `API evidence.readiness.${owner}.checkedAt`);
    assertIsoDate(snapshot.expiresAt, `API evidence.readiness.${owner}.expiresAt`);
    assertText(snapshot.source, `API evidence.readiness.${owner}.source`, 500);
    assertNotPlaceholder(snapshot.source, `API evidence.readiness.${owner}.source`);
    assertEqual(snapshot.status, 'ready', `API evidence.readiness.${owner}.status`);
    assertEqual(snapshot.blockerCount, 0, `API evidence.readiness.${owner}.blockerCount`);
    assertEqual(snapshot.degradedCount, 0, `API evidence.readiness.${owner}.degradedCount`);
    if (!Number.isSafeInteger(snapshot.totalCount) || snapshot.totalCount < 1) {
      throw new Error(`API evidence.readiness.${owner}.totalCount must be a positive safe integer`);
    }
    if (Date.parse(snapshot.checkedAt) > Date.parse(completedAt)) {
      throw new Error(`API evidence.readiness.${owner}.checkedAt must not be later than API evidence.completedAt`);
    }
    if (Date.parse(snapshot.expiresAt) <= Date.parse(completedAt)) {
      throw new Error(`API evidence.readiness.${owner} must be unexpired when API evidence completes`);
    }
    result[owner] = {
      owner,
      snapshotId: snapshot.snapshotId,
      checkedAt: snapshot.checkedAt,
      expiresAt: snapshot.expiresAt,
      source: snapshot.source,
      status: snapshot.status,
      blockerCount: snapshot.blockerCount,
      degradedCount: snapshot.degradedCount,
      totalCount: snapshot.totalCount,
    };
  }
  return result;
}

function validateRuns(runs, context) {
  if (!Array.isArray(runs)) throw new Error('manifest.runs must be an array');
  assertExactIds(runs, requiredRuns.map((run) => run.id), 'manifest.runs');
  const contextIds = new Set();
  return requiredRuns.map((required) => {
    const run = runs.find((candidate) => candidate.id === required.id);
    assertObject(run, `run ${required.id}`);
    assertText(run.contextId, `run ${required.id}.contextId`, 160);
    assertNotPlaceholder(run.contextId, `run ${required.id}.contextId`);
    if (contextIds.has(run.contextId)) throw new Error('desktop and mobile runs must use different fresh browser contexts');
    contextIds.add(run.contextId);
    assertEqual(run.viewport?.width, required.width, `run ${required.id}.viewport.width`);
    assertEqual(run.viewport?.height, required.height, `run ${required.id}.viewport.height`);
    assertEqual(run.freshContext, true, `run ${required.id}.freshContext`);
    assertEqual(run.storageStateReused, false, `run ${required.id}.storageStateReused`);
    assertEqual(run.loggedOut, true, `run ${required.id}.loggedOut`);
    assertEqual(run.sessionStateDeleted, true, `run ${required.id}.sessionStateDeleted`);
    assertEqual(run.releaseSha, context.releaseSha, `run ${required.id}.releaseSha`);
    assertFreshCapture(run.completedAt, context.apiCompletedAt, context.now);
    assertIsoDate(run.startedAt, `run ${required.id}.startedAt`);
    if (Date.parse(run.completedAt) < Date.parse(run.startedAt)) throw new Error(`run ${required.id} completed before it started`);
    validateFailureCounts(run.failureCounts, `run ${required.id}.failureCounts`);
    const consoleLog = validateCliConsoleLog(run.consoleLog, {
      baseDir: context.manifestDir,
      label: `run ${required.id}.consoleLog`,
      usedPaths: context.usedPaths,
    });
    const networkLog = validateCliNetworkLog(run.networkLog, {
      baseDir: context.manifestDir,
      label: `run ${required.id}.networkLog`,
      usedPaths: context.usedPaths,
      requiredOrigins: Object.entries(context.urls).map(([owner, value]) => ({
        owner,
        origin: parseUrl(value, `${owner} URL`).origin,
      })),
      requiredRequests: [{
        label: 'seller CI image',
        origin: parseUrl(context.urls.crm, 'crm URL').origin,
        pathname: '/api/crm/quote-seller-profile/ci',
      }],
    });
    const surfaces = validateSurfaces(run.surfaces, {
      ...context,
      runId: required.id,
      viewport: { width: required.width, height: required.height },
    });
    return {
      id: required.id,
      contextId: run.contextId,
      viewport: { width: required.width, height: required.height },
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      failureCounts: run.failureCounts,
      consoleLogSha256: consoleLog.sha256,
      networkLogSha256: networkLog.sha256,
      surfaceCount: surfaces.length,
      surfaces,
    };
  });
}

function validateCliConsoleLog(descriptor, context) {
  const file = validateFileEvidence(descriptor, {
    baseDir: context.baseDir,
    label: context.label,
    allowedMimeTypes: ['application/json'],
    usedPaths: context.usedPaths,
  });
  const payload = parseJson(file.buffer, context.label);
  if (payload?.isError === true || typeof payload?.result !== 'string') throw new Error(`${context.label} is not a successful Playwright CLI JSON result`);
  if (!/Errors:\s*0[^\n]*Warnings:\s*0/iu.test(payload.result)) {
    throw new Error(`${context.label} must prove zero console errors and warnings`);
  }
  return file;
}

function validateCliNetworkLog(descriptor, context) {
  const file = validateFileEvidence(descriptor, {
    baseDir: context.baseDir,
    label: context.label,
    allowedMimeTypes: ['application/json'],
    usedPaths: context.usedPaths,
  });
  const payload = parseJson(file.buffer, context.label);
  if (payload?.isError === true || typeof payload?.result !== 'string') throw new Error(`${context.label} is not a successful Playwright CLI JSON result`);
  const observedUrls = payload.result.match(/https:\/\/[^\s"'<>]+/giu) ?? [];
  const parsedObservedUrls = observedUrls.flatMap((value) => {
    try {
      return [new URL(value.replace(/[),.;\]}]+$/u, ''))];
    } catch {
      return [];
    }
  });
  const observedOrigins = new Set(parsedObservedUrls.map((value) => value.origin));
  if (observedOrigins.size === 0) throw new Error(`${context.label} must contain observed production HTTPS requests`);
  for (const required of context.requiredOrigins) {
    if (!observedOrigins.has(required.origin)) {
      throw new Error(`${context.label} is missing the ${required.owner} production origin: ${required.origin}`);
    }
  }
  for (const required of context.requiredRequests) {
    if (!parsedObservedUrls.some((value) => value.origin === required.origin && value.pathname === required.pathname)) {
      throw new Error(`${context.label} is missing the production ${required.label} request: ${required.pathname}`);
    }
  }
  const resultWithoutUrls = payload.result.replace(/https:\/\/[^\s"'<>]+/giu, '');
  if (/(?:HTTP|status(?:Code)?)\s*[:='" ]*\s*[45]\d{2}|(?:^|\D)[45]\d{2}(?:\D|$)|request\s*failed|requestfailed|\bFAILED\b|net::ERR_|\bCORS\b|refused/imu.test(resultWithoutUrls)) {
    throw new Error(`${context.label} contains an HTTP or network failure`);
  }
  return file;
}

function validateSurfaces(surfaces, context) {
  if (!Array.isArray(surfaces)) throw new Error(`run ${context.runId}.surfaces must be an array`);
  assertExactIds(surfaces, requiredSurfaces.map((surface) => surface.id), `run ${context.runId}.surfaces`);
  return requiredSurfaces.map((required) => {
    const surface = surfaces.find((candidate) => candidate.id === required.id);
    assertObject(surface, `surface ${required.id}`);
    assertEqual(surface.releaseSha, context.releaseSha, `surface ${required.id}.releaseSha`);
    validateSurfaceUrl(surface.url, required, context.urls);
    if (Object.hasOwn(surface, 'assertions')) {
      throw new Error(`surface ${required.id}.assertions is forbidden; schema 3 derives surface results from evidence content`);
    }

    const snapshot = validateFileEvidence(surface.snapshot, {
      baseDir: context.manifestDir,
      label: `surface ${required.id}.snapshot`,
      allowedMimeTypes: ['text/yaml', 'text/plain'],
      usedPaths: context.usedPaths,
    });
    const snapshotText = snapshot.buffer.toString('utf8');
    for (const landmark of required.landmarks) {
      if (!snapshotText.includes(landmark)) throw new Error(`surface ${required.id} snapshot is missing landmark: ${landmark}`);
    }
    const expectedContent = getSurfaceExpectedContent(required.id, context);
    for (const expected of expectedContent) {
      assertDocumentContains(snapshotText, expected.text, `surface ${required.id} snapshot`, expected.minOccurrences);
    }
    const ciImageObserved = required.id === 'crm-quote-preview' || required.id === 'crm-quote-print';
    if (ciImageObserved) assertSnapshotContainsCiImage(snapshotText, `surface ${required.id} snapshot`);
    const screenshot = validateFileEvidence(surface.screenshot, {
      baseDir: context.manifestDir,
      label: `surface ${required.id}.screenshot`,
      allowedMimeTypes: ['image/png'],
      usedPaths: context.usedPaths,
    });
    validatePngDimensions(screenshot.buffer, context.viewport, `surface ${required.id} screenshot`);
    return {
      id: required.id,
      target: safeTarget(surface.url),
      snapshotSha256: snapshot.sha256,
      screenshotSha256: screenshot.sha256,
      verifiedContentCount: expectedContent.length,
      ciImageObserved,
    };
  });
}

async function validateArtifacts(artifacts, context) {
  if (!Array.isArray(artifacts)) throw new Error('manifest.artifacts must be an array');
  assertExactIds(artifacts, requiredArtifacts.map((artifact) => artifact.id), 'manifest.artifacts');
  const results = [];
  for (const required of requiredArtifacts) {
    const artifact = artifacts.find((candidate) => candidate.id === required.id);
    assertObject(artifact, `artifact ${required.id}`);
    assertEqual(artifact.sellerProfileSha256, context.sellerProfileSha256, `artifact ${required.id}.sellerProfileSha256`);
    assertEqual(artifact.ciSha256, context.ciSha256, `artifact ${required.id}.ciSha256`);
    const file = validateFileEvidence(artifact, {
      baseDir: context.manifestDir,
      label: `artifact ${required.id}`,
      allowedMimeTypes: [required.mimeType],
      usedPaths: context.usedPaths,
    });
    if (!file.buffer.subarray(0, required.magic.length).equals(required.magic)) {
      throw new Error(`artifact ${required.id} has an invalid binary signature`);
    }
    const documentText = required.mimeType === 'application/pdf'
      ? await extractPdfText(file.buffer, `artifact ${required.id}`)
      : await extractDocxText(file.buffer, `artifact ${required.id}`);
    const expectedText = getArtifactExpectedText(required.id, context);
    for (const expected of expectedText) assertDocumentContains(documentText, expected, `artifact ${required.id}`);
    const unresolvedPlaceholderCount = countUnresolvedPlaceholders(documentText);
    if (unresolvedPlaceholderCount !== 0) {
      throw new Error(`artifact ${required.id} contains ${unresolvedPlaceholderCount} unresolved template placeholders`);
    }
    results.push({
      id: required.id,
      mimeType: artifact.mimeType,
      size: file.buffer.length,
      sha256: file.sha256,
      contentVerified: true,
      reopened: true,
      amountsExact: required.amountsExact === true,
      unresolvedPlaceholderCount,
      verifiedTextCount: expectedText.length,
    });
  }
  return results;
}

function validateQuoteVerification(value) {
  assertObject(value, 'manifest.quoteVerification');
  for (const field of ['opportunityId', 'customerName', 'opportunityName', 'ownerName']) {
    assertText(value[field], `manifest.quoteVerification.${field}`, 300);
    assertNotPlaceholder(value[field], `manifest.quoteVerification.${field}`);
  }
  assertEqual(value.currency, 'KRW', 'manifest.quoteVerification.currency');
  assertObject(value.amounts, 'manifest.quoteVerification.amounts');
  for (const field of ['subtotal', 'discount', 'total']) {
    if (!Number.isSafeInteger(value.amounts[field]) || value.amounts[field] < 0) {
      throw new Error(`manifest.quoteVerification.amounts.${field} must be a non-negative safe integer`);
    }
  }
  if (value.amounts.subtotal <= 0 || value.amounts.total <= 0) {
    throw new Error('manifest.quoteVerification subtotal and total must be greater than zero');
  }
  assertEqual(
    value.amounts.subtotal - value.amounts.discount,
    value.amounts.total,
    'manifest.quoteVerification subtotal - discount',
  );
  return {
    opportunityId: value.opportunityId.trim(),
    customerName: value.customerName.trim(),
    opportunityName: value.opportunityName.trim(),
    ownerName: value.ownerName.trim(),
    currency: value.currency,
    amounts: {
      subtotal: value.amounts.subtotal,
      discount: value.amounts.discount,
      total: value.amounts.total,
    },
  };
}

function formatKrwAmount(value) {
  return value.toLocaleString('en-US');
}

function getSurfaceExpectedContent(surfaceId, context) {
  const quote = context.quoteVerification;
  const seller = context.sellerProfile;
  if (surfaceId === 'crm-quote-settings') {
    return [seller.companyName, seller.businessRegistrationNo, '저장소 CI 연결됨', '현재 상태: 설정됨'].map(contentExpectation);
  }
  if (surfaceId === 'crm-quote-preview' || surfaceId === 'crm-quote-print') {
    return [
      seller.companyName,
      quote.customerName,
      quote.opportunityName,
      quote.ownerName,
      formatKrwAmount(quote.amounts.subtotal),
      ...(quote.amounts.discount > 0 ? [formatKrwAmount(quote.amounts.discount)] : []),
      formatKrwAmount(quote.amounts.total),
    ].map(contentExpectation);
  }
  if (surfaceId === 'crm-operations') {
    return [
      '런칭 readiness',
      '준비',
      '0 차단 · 0 주의',
      `snapshot ${context.apiReadiness.crm.snapshotId}`,
      context.apiReadiness.crm.source,
    ].map(contentExpectation);
  }
  if (surfaceId === 'admin-readiness') {
    return [
      contentExpectation('CRM'),
      contentExpectation('DMS'),
      contentExpectation('준비', 2),
      contentExpectation('차단 0 주의 0', 2),
      contentExpectation(`snapshot ${context.apiReadiness.crm.snapshotId}`),
      contentExpectation(context.apiReadiness.crm.source),
      contentExpectation(`snapshot ${context.apiReadiness.dms.snapshotId}`),
      contentExpectation(context.apiReadiness.dms.source),
    ];
  }
  if (surfaceId === 'dms-operations') {
    return [
      contentExpectation('런칭 준비됨'),
      contentExpectation(`snapshot ${context.apiReadiness.dms.snapshotId}`),
      contentExpectation('Ready', context.apiReadiness.dms.totalCount),
    ];
  }
  return [];
}

function contentExpectation(text, minOccurrences = 1) {
  return { text, minOccurrences };
}

function assertSnapshotContainsCiImage(value, label) {
  if (!/(?:^|\s)(?:img|image)\s+["']?CI(?:["']|\s|$)/imu.test(value)) {
    throw new Error(`${label} is missing the accessible CI image`);
  }
}

function getArtifactExpectedText(artifactId, context) {
  const quote = context.quoteVerification;
  const common = [
    context.sellerProfile.companyName,
    quote.customerName,
    quote.opportunityName,
    quote.ownerName,
    formatKrwAmount(quote.amounts.total),
  ];
  if (artifactId === 'quote-print-pdf') {
    return [
      ...common,
      formatKrwAmount(quote.amounts.subtotal),
      ...(quote.amounts.discount > 0 ? [formatKrwAmount(quote.amounts.discount)] : []),
    ];
  }
  return [...common, context.sellerProfile.businessRegistrationNo];
}

function normalizeDocumentText(value) {
  return value.normalize('NFKC').replace(/\s+/gu, '');
}

function assertDocumentContains(actual, expected, label, minOccurrences = 1) {
  const normalizedActual = normalizeDocumentText(actual);
  const normalizedExpected = normalizeDocumentText(String(expected));
  let occurrenceCount = 0;
  let searchOffset = 0;
  while (normalizedExpected && searchOffset <= normalizedActual.length) {
    const index = normalizedActual.indexOf(normalizedExpected, searchOffset);
    if (index === -1) break;
    occurrenceCount += 1;
    searchOffset = index + normalizedExpected.length;
  }
  if (occurrenceCount < minOccurrences) {
    const expectedHash = sha256(Buffer.from(normalizedExpected)).slice(0, 16);
    throw new Error(`${label} is missing verified content hash ${expectedHash} occurrence ${minOccurrences}`);
  }
}

function summarizeQuoteVerification(value) {
  return {
    opportunityIdSha256: sha256(Buffer.from(value.opportunityId)),
    contentSha256: sha256(Buffer.from(JSON.stringify(value))),
    currency: value.currency,
    amountEquationVerified: true,
  };
}

function countUnresolvedPlaceholders(value) {
  return value.match(/\{\{[^{}]+\}\}|\{[^{}]+\}/gu)?.length ?? 0;
}

async function extractDocxText(buffer, label) {
  let zip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error(`${label} could not be reopened as a DOCX ZIP package`);
  }
  const entries = new Map(Object.entries(zip.files));
  for (const required of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml']) {
    if (!entries.has(required)) throw new Error(`${label} is missing required DOCX entry ${required}`);
  }
  const textParts = await Promise.all([...entries.entries()]
    .filter(([entryName]) => /^word\/(?:document|header\d+|footer\d+|footnotes|endnotes)\.xml$/u.test(entryName))
    .map(([, entry]) => entry.async('string')));
  return decodeXmlText(textParts.join('\n'));
}

function decodeXmlText(value) {
  return value
    .replace(/<w:tab\b[^>]*\/>/gu, '\t')
    .replace(/<w:br\b[^>]*\/>/gu, '\n')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'")
    .replace(/&amp;/gu, '&');
}

async function extractPdfText(buffer, label) {
  if (buffer.length < 500 || buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error(`${label} is not a complete PDF binary`);
  }
  if (!/%%EOF\s*$/u.test(buffer.subarray(Math.max(0, buffer.length - 2_048)).toString('latin1'))) {
    throw new Error(`${label} does not have a PDF trailer`);
  }
  if (!pdfJsModuleDefined) {
    await definePDFJSModule(() => import(pathToFileURL(pdfJsModulePath).href));
    pdfJsModuleDefined = true;
  }
  let pdf;
  try {
    pdf = await getDocumentProxy(new Uint8Array(buffer));
    if (!Number.isInteger(pdf.numPages) || pdf.numPages < 1) throw new Error('no pages');
    const { text } = await extractPdfTextWithUnpdf(pdf, { mergePages: true });
    if (typeof text !== 'string' || !text.trim()) throw new Error('no extractable text');
    return text;
  } catch (error) {
    throw new Error(`${label} could not be reopened and text-extracted: ${sanitizeError(error)}`);
  } finally {
    await pdf?.destroy?.().catch(() => undefined);
  }
}

function validatePngDimensions(buffer, viewport, label) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature) || buffer.subarray(12, 16).toString('ascii') !== 'IHDR') {
    throw new Error(`${label} is not a PNG binary with an IHDR chunk`);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width !== viewport.width || height !== viewport.height) {
    throw new Error(`${label} dimensions must equal ${viewport.width}x${viewport.height}, got ${width}x${height}`);
  }
}

function validateFileEvidence(descriptor, { baseDir, label, allowedMimeTypes, usedPaths }) {
  assertObject(descriptor, label);
  assertText(descriptor.path, `${label}.path`, 1_000);
  assertSha256(descriptor.sha256, `${label}.sha256`);
  if (!allowedMimeTypes.includes(descriptor.mimeType)) throw new Error(`${label}.mimeType is unsupported`);
  const filePath = resolveContainedEvidencePath(baseDir, descriptor.path, label);
  if (usedPaths.has(filePath)) throw new Error(`${label}.path reuses another evidence file`);
  usedPaths.add(filePath);
  const buffer = readFile(filePath, label);
  if (buffer.length < 8) throw new Error(`${label} must not be empty`);
  assertEqual(descriptor.size, buffer.length, `${label}.size`);
  const digest = sha256(buffer);
  assertEqual(descriptor.sha256, digest, `${label}.sha256`);
  return { buffer, sha256: digest };
}

function resolveContainedEvidencePath(root, relativePath, label) {
  if (path.isAbsolute(relativePath)) throw new Error(`${label}.path must be relative to its evidence root`);
  const resolvedRoot = fs.realpathSync(root);
  const candidate = path.resolve(resolvedRoot, relativePath);
  if (candidate === resolvedRoot || !candidate.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`${label}.path escapes its evidence root`);
  }
  let realCandidate;
  try {
    realCandidate = fs.realpathSync(candidate);
  } catch {
    throw new Error(`${label} does not exist: ${candidate}`);
  }
  if (!realCandidate.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`${label}.path resolves outside its evidence root`);
  }
  return realCandidate;
}

function validateSurfaceUrl(value, surface, urls) {
  if (surface.owner === 'crm-or-popup' && value === 'about:blank') return;
  const owner = surface.owner === 'crm-or-popup' ? 'crm' : surface.owner;
  const actual = parseUrl(value, `surface ${surface.id}.url`);
  const expected = parseUrl(urls[owner], `${owner} URL`);
  if (actual.origin !== expected.origin) throw new Error(`surface ${surface.id}.url must use the ${owner} production origin`);
  if (actual.pathname !== surface.pathname) throw new Error(`surface ${surface.id}.url must use pathname ${surface.pathname}`);
}

function validateFailureCounts(value, label) {
  assertObject(value, label);
  for (const key of ['consoleErrors', 'consoleWarnings', 'pageErrors', 'requestFailures', 'unexpectedHttpFailures', 'horizontalOverflow']) {
    assertEqual(value[key], 0, `${label}.${key}`);
  }
}

function hashSellerProfile(profile) {
  const normalized = {};
  for (const field of ['companyName', 'ceoName', 'businessRegistrationNo', 'address', 'tel', 'fax', 'website', 'email']) {
    normalized[field] = typeof profile[field] === 'string' ? profile[field].trim() : '';
  }
  return sha256(Buffer.from(JSON.stringify(normalized)));
}

function assertFreshCapture(value, apiCompletedAt, now) {
  assertIsoDate(value, 'capture timestamp');
  assertIsoDate(apiCompletedAt, 'API completedAt');
  const captureTime = Date.parse(value);
  if (captureTime < Date.parse(apiCompletedAt) - 5 * 60_000) throw new Error('browser evidence predates the live API evidence');
  if (captureTime > now + 5 * 60_000) throw new Error('browser evidence timestamp is in the future');
  if (now - captureTime > 24 * 60 * 60_000) throw new Error('browser evidence is older than 24 hours');
}

function assertRecentTimestamp(value, now, label) {
  assertIsoDate(value, label);
  const timestamp = Date.parse(value);
  if (timestamp > now + 5 * 60_000) throw new Error(`${label} is in the future`);
  if (now - timestamp > 24 * 60 * 60_000) throw new Error(`${label} is older than 24 hours`);
}

function verifyProductionEnvironment(envPath) {
  if (!fs.existsSync(envPath)) throw new Error(`production environment file does not exist: ${envPath}`);
  const result = spawnSync(process.execPath, [
    path.join(repoRoot, 'scripts', 'verify-production-compose-env.mjs'),
    '--env-file',
    envPath,
  ], { cwd: repoRoot, encoding: 'utf8', env: process.env, maxBuffer: 10 * 1024 * 1024 });
  if (result.status !== 0) throw new Error('production environment contract failed');
}

function createBoundTemplate() {
  if (!options.packetPath && !options.apiEvidencePath) return createTemplate();
  if (!options.packetPath || !options.apiEvidencePath) {
    throw new Error('--template binding requires both --packet and --api-evidence');
  }
  const packetPath = path.resolve(options.packetPath);
  const apiEvidencePath = path.resolve(options.apiEvidencePath);
  const packetBuffer = readFile(packetPath, 'seller input packet');
  const packet = parseJson(packetBuffer, 'seller input packet');
  validatePacketIdentity(packet);
  const apiBuffer = readFile(apiEvidencePath, 'API evidence');
  const apiEvidence = parseJson(apiBuffer, 'API evidence');
  validateApiEvidence(apiEvidence, {
    deploymentId: packet.deploymentId,
    releaseSha: apiEvidence.releaseSha,
    packetSha256: sha256(packetBuffer),
    ciSha256: packet.ciAsset.sha256,
  });
  assertCommitSha(apiEvidence.releaseSha, 'API evidence.releaseSha');
  for (const owner of ['crm', 'admin', 'dms']) validateProductionUrl(apiEvidence.endpoints?.[owner], `API evidence.endpoints.${owner}`);
  return createTemplate({
    deploymentId: packet.deploymentId,
    releaseSha: apiEvidence.releaseSha,
    apiEvidenceSha256: sha256(apiBuffer),
    sellerProfileSha256: hashSellerProfile(packet.sellerProfile),
    ciSha256: packet.ciAsset.sha256,
    urls: apiEvidence.endpoints,
  });
}

function createTemplate(identity = {}) {
  const deploymentId = identity.deploymentId || 'replace-with-approved-deployment-id';
  const releaseSha = identity.releaseSha || 'replace-with-release-sha';
  const apiEvidenceSha256 = identity.apiEvidenceSha256 || 'replace-with-api-evidence-sha256';
  const sellerProfileSha256 = identity.sellerProfileSha256 || 'replace-with-canonical-seller-profile-sha256';
  const ciSha256 = identity.ciSha256 || 'replace-with-approved-ci-sha256';
  const urls = identity.urls || {};
  const failureCounts = {
    consoleErrors: 0,
    consoleWarnings: 0,
    pageErrors: 0,
    requestFailures: 0,
    unexpectedHttpFailures: 0,
    horizontalOverflow: 0,
  };
  return {
    contract: 'CRM-S15-BROWSER-EVIDENCE',
    schemaVersion: 3,
    status: 'draft',
    synthetic: false,
    sourceEnvironment: 'production',
    tool: 'playwright-cli',
    runId: 'replace-with-run-id',
    deploymentId,
    releaseSha,
    apiEvidenceSha256,
    sellerProfileSha256,
    ciSha256,
    capturedAt: 'replace-with-ISO-date-time',
    credentialsStored: false,
    browserVersion: 'replace-with-browser-version',
    playwrightCliVersion: 'replace-with-playwright-cli-version',
    quoteVerification: {
      opportunityId: 'replace-with-production-opportunity-id',
      customerName: 'replace-with-customer-name',
      opportunityName: 'replace-with-opportunity-name',
      ownerName: 'replace-with-owner-name',
      currency: 'KRW',
      amounts: {
        subtotal: 0,
        discount: 0,
        total: 0,
      },
    },
    runs: requiredRuns.map((run) => ({
      id: run.id,
      contextId: `replace-with-${run.id}-fresh-context-id`,
      viewport: { width: run.width, height: run.height },
      freshContext: true,
      storageStateReused: false,
      loggedOut: true,
      sessionStateDeleted: true,
      releaseSha,
      startedAt: 'replace-with-ISO-date-time',
      completedAt: 'replace-with-ISO-date-time',
      failureCounts,
      consoleLog: { path: 'replace-with-playwright-console.json', sha256: 'replace-with-sha256', size: 0, mimeType: 'application/json' },
      networkLog: { path: 'replace-with-playwright-requests.json', sha256: 'replace-with-sha256', size: 0, mimeType: 'application/json' },
      surfaces: requiredSurfaces.map((surface) => ({
        id: surface.id,
        url: surface.id === 'crm-quote-print' ? 'about:blank' : templateSurfaceUrl(surface, urls),
        releaseSha,
        snapshot: { path: 'replace-with-playwright-snapshot.yml', sha256: 'replace-with-sha256', size: 0, mimeType: 'text/yaml' },
        screenshot: { path: 'replace-with-playwright-screenshot.png', sha256: 'replace-with-sha256', size: 0, mimeType: 'image/png' },
      })),
    })),
    artifacts: requiredArtifacts.map((artifact) => ({
      id: artifact.id,
      path: 'replace-with-downloaded-artifact',
      sha256: 'replace-with-sha256',
      size: 0,
      mimeType: artifact.mimeType,
      sellerProfileSha256,
      ciSha256,
    })),
  };
}

function templateSurfaceUrl(surface, urls) {
  const owner = surface.owner === 'crm-or-popup' ? 'crm' : surface.owner;
  if (!urls[owner]) return 'replace-with-production-url';
  return new URL(surface.pathname, `${urls[owner].replace(/\/$/u, '')}/`).toString();
}

async function runSelfTest() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-crm-browser-evidence-'));
  const outsideEvidencePath = `${tempDir}-outside.yml`;
  try {
    fs.writeFileSync(outsideEvidencePath, 'outside evidence must never be accepted\n');
    const now = Date.now();
    const releaseSha = '1234567890abcdef1234567890abcdef12345678';
    const packet = {
      schemaVersion: 1,
      status: 'approved',
      environment: 'production',
      deploymentId: 'CRM-S15-SELF-TEST',
      sellerProfile: {
        companyName: 'SSOO Corporation',
        ceoName: 'Hong Gil Dong',
        businessRegistrationNo: '123-45-67890',
        address: '1 Sejong-daero, Seoul',
        tel: '02-1234-5678',
        email: 'sales@ssoo.test',
      },
      ciAsset: { sha256: 'a'.repeat(64) },
    };
    const packetPath = path.join(tempDir, 'packet.json');
    writeJson(packetPath, packet);
    const packetBuffer = fs.readFileSync(packetPath);
    const completedAt = new Date(now - 60_000).toISOString();
    const readiness = createSelfTestReadiness(completedAt);
    const apiEvidence = {
      contract: 'CRM-S15-GO-LIVE-API',
      schemaVersion: 1,
      status: 'PASS_LIVE_API_READY',
      finalGoLive: false,
      browserRequired: true,
      credentialsStored: false,
      completedAt,
      deploymentId: packet.deploymentId,
      releaseSha,
      endpoints: { crm: 'https://crm.ssoo.test', admin: 'https://admin.ssoo.test', dms: 'https://dms.ssoo.test' },
      input: { packetSha256: sha256(packetBuffer), ciSha256: packet.ciAsset.sha256 },
      readiness,
      checks: [
        'api-health', 'api-readiness', 'crm-web', 'admin-web', 'dms-web', 'crm-admin-login',
        'seller-profile-exact', 'seller-ci-exact', 'crm-owner-readiness', 'admin-readiness-bridge',
        'verification-session-logout',
      ].map((kind) => ({
        kind,
        status: 'passed',
        ...(kind === 'crm-owner-readiness' ? { snapshotId: readiness.crm.snapshotId } : {}),
        ...(kind === 'admin-readiness-bridge' ? {
          crmSnapshotId: readiness.crm.snapshotId,
          dmsSnapshotId: readiness.dms.snapshotId,
        } : {}),
      })),
    };
    const apiPath = path.join(tempDir, 'api.json');
    writeJson(apiPath, apiEvidence);
    const dmsEvidence = {
      schemaVersion: 2,
      runId: 'dms-s15-self-test',
      status: 'passed',
      decision: 'GO',
      releaseSha,
      head: releaseSha,
      worktreeFingerprint: 'b'.repeat(64),
      planHash: 'c'.repeat(64),
      checkpointPhase: 'complete',
      finishedAt: completedAt,
      tracks: DMS_GO_LIVE_TRACK_IDS.map((id) => ({ id, status: 'passed', steps: [{ id: `${id}-self-test`, status: 'passed' }] })),
    };
    const dmsPath = path.join(tempDir, 'dms-final.json');
    writeJson(dmsPath, dmsEvidence);
    const dmsBuffer = fs.readFileSync(dmsPath);
    writeJson(path.join(tempDir, 'manifest.json'), {
      schemaVersion: 1,
      runId: dmsEvidence.runId,
      generatedAt: completedAt,
      files: [{ path: path.basename(dmsPath), size: dmsBuffer.length, sha256: sha256(dmsBuffer) }],
    });
    const sellerProfileSha256 = hashSellerProfile(packet.sellerProfile);
    const boundTemplate = createTemplate({
      deploymentId: packet.deploymentId,
      releaseSha,
      apiEvidenceSha256: sha256(fs.readFileSync(apiPath)),
      sellerProfileSha256,
      ciSha256: packet.ciAsset.sha256,
      urls: apiEvidence.endpoints,
    });
    if (boundTemplate.deploymentId !== packet.deploymentId || boundTemplate.runs[0].surfaces[0].url !== 'https://crm.ssoo.test/quote-settings') {
      throw new Error('bound browser evidence template did not preserve verified identities and endpoints');
    }
    if ((fs.statSync(apiPath).mode & 0o777) !== 0o600) throw new Error('self-test evidence file mode is not 0600');
    const manifest = await createSelfTestManifest({
      tempDir,
      releaseSha,
      packet,
      apiPath,
      apiReadiness: readiness,
      sellerProfileSha256,
      completedAt,
      now,
    });
    const manifestPath = path.join(tempDir, 'browser.json');
    writeJson(manifestPath, manifest);
    const input = {
      releaseSha,
      urls: { crm: 'https://crm.ssoo.test', admin: 'https://admin.ssoo.test', dms: 'https://dms.ssoo.test' },
      packetPath,
      apiEvidencePath: apiPath,
      dmsEvidencePath: dmsPath,
      manifestPath,
      now,
    };
    const result = await verifyFinalEvidence(input);
    if (result.browser.runs.length !== 2 || result.artifacts.length !== 3) throw new Error('positive fixture count mismatch');

    const negativeFixtures = [
      ['synthetic evidence', { ...manifest, synthetic: true }, 'manifest.synthetic'],
      ['missing mobile run', { ...manifest, runs: manifest.runs.slice(0, 1) }, 'manifest.runs'],
      ['browser failure', mutateManifest(manifest, (copy) => { copy.runs[0].failureCounts.consoleErrors = 1; }), 'consoleErrors'],
      ['artifact CI mismatch', mutateManifest(manifest, (copy) => { copy.artifacts[0].ciSha256 = 'b'.repeat(64); }), 'ciSha256'],
      ['absolute evidence path', mutateManifest(manifest, (copy) => { copy.runs[0].surfaces[0].snapshot.path = path.join(tempDir, copy.runs[0].surfaces[0].snapshot.path); }), 'path must be relative'],
      ['symlink evidence escape', createSymlinkEscapeFixture(manifest, tempDir, outsideEvidencePath), 'resolves outside its evidence root'],
      ['wrong viewport screenshot', createWrongViewportFixture(manifest, tempDir), 'dimensions must equal'],
      ['missing production origin', createMissingOriginFixture(manifest, tempDir), 'missing the dms production origin'],
      ['missing browser CI request', createMissingCiRequestFixture(manifest, tempDir), 'missing the production seller CI image request'],
      ['network HTTP failure', createNetworkFailureFixture(manifest, tempDir), 'contains an HTTP or network failure'],
      ['incoherent quote amounts', mutateManifest(manifest, (copy) => { copy.quoteVerification.amounts.total += 1; }), 'subtotal - discount'],
      ['forged manual assertion', mutateManifest(manifest, (copy) => { copy.runs[0].surfaces[0].assertions = { sellerProfileExact: true }; }), 'assertions is forbidden'],
      ['missing accessible CI image', createMissingCiImageFixture(manifest, tempDir), 'missing the accessible CI image'],
      ['CRM snapshot identity mismatch', createSnapshotIdentityMismatchFixture(manifest, tempDir), 'is missing verified content hash'],
      ['incomplete Admin readiness cards', createIncompleteAdminReadinessFixture(manifest, tempDir), 'occurrence 2'],
      ['unverified artifact content', createWrongArtifactContentFixture(manifest, tempDir), 'is missing verified content'],
    ];
    for (const [label, candidate, expected] of negativeFixtures) {
      writeJson(manifestPath, candidate);
      await assertRejects(() => verifyFinalEvidence(input), expected, label);
    }
    writeJson(manifestPath, manifest);
    writeJson(dmsPath, { ...dmsEvidence, decision: 'NO_GO' });
    await assertRejects(() => verifyFinalEvidence(input), 'DMS evidence.decision', 'DMS NO_GO evidence');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.rmSync(outsideEvidencePath, { force: true });
  }
}

function createSelfTestReadiness(completedAt) {
  const checkedAt = new Date(Date.parse(completedAt) - 10_000).toISOString();
  const expiresAt = new Date(Date.parse(completedAt) + 5 * 60_000).toISOString();
  return {
    crm: {
      owner: 'crm',
      snapshotId: 'crm-s15-self-test-snapshot',
      checkedAt,
      expiresAt,
      source: 'crm-live-readiness',
      status: 'ready',
      blockerCount: 0,
      degradedCount: 0,
      totalCount: 5,
    },
    dms: {
      owner: 'dms',
      snapshotId: 'dms-s15-self-test-snapshot',
      checkedAt,
      expiresAt,
      source: 'dms-runtime-readiness',
      status: 'ready',
      blockerCount: 0,
      degradedCount: 0,
      totalCount: 5,
    },
  };
}

async function createSelfTestManifest({ tempDir, releaseSha, packet, apiPath, apiReadiness, sellerProfileSha256, completedAt, now }) {
  const capturedAt = new Date(now - 30_000).toISOString();
  const failureCounts = {
    consoleErrors: 0,
    consoleWarnings: 0,
    pageErrors: 0,
    requestFailures: 0,
    unexpectedHttpFailures: 0,
    horizontalOverflow: 0,
  };
  const quoteVerification = {
    opportunityId: 'crm-live-opportunity-001',
    customerName: 'Example Customer',
    opportunityName: 'Production CRM Launch',
    ownerName: 'Sales Owner',
    currency: 'KRW',
    amounts: { subtotal: 162_000_000, discount: 5_000_000, total: 157_000_000 },
  };
  const runs = requiredRuns.map((run, runIndex) => ({
    id: run.id,
    contextId: `self-test-context-${runIndex}`,
    viewport: { width: run.width, height: run.height },
    freshContext: true,
    storageStateReused: false,
    loggedOut: true,
    sessionStateDeleted: true,
    releaseSha,
    startedAt: completedAt,
    completedAt: capturedAt,
    failureCounts,
    ...createSelfTestCliLogs(tempDir, runIndex),
    surfaces: requiredSurfaces.map((surface, surfaceIndex) => {
      const prefix = `${runIndex}-${surfaceIndex}-${surface.id}`;
      const snapshotPath = path.join(tempDir, `${prefix}.yml`);
      const screenshotPath = path.join(tempDir, `${prefix}.png`);
      fs.writeFileSync(snapshotPath, `${[
        ...surface.landmarks,
        ...getSurfaceExpectedContent(surface.id, {
          sellerProfile: packet.sellerProfile,
          quoteVerification,
          apiReadiness,
        }).flatMap((item) => Array(item.minOccurrences).fill(item.text)),
        ...((surface.id === 'crm-quote-preview' || surface.id === 'crm-quote-print') ? ['img "CI"'] : []),
      ].join('\n')}\n`);
      fs.writeFileSync(screenshotPath, createPngFixture(run.width, run.height, prefix));
      const urlByOwner = {
        crm: `https://crm.ssoo.test${surface.pathname}`,
        admin: `https://admin.ssoo.test${surface.pathname}`,
        dms: `https://dms.ssoo.test${surface.pathname}`,
        'crm-or-popup': 'about:blank',
      };
      return {
        id: surface.id,
        url: urlByOwner[surface.owner],
        releaseSha,
        snapshot: describeFile(tempDir, snapshotPath, 'text/yaml'),
        screenshot: describeFile(tempDir, screenshotPath, 'image/png'),
      };
    }),
  }));
  const artifacts = await Promise.all(requiredArtifacts.map(async (artifact) => {
    const filePath = path.join(tempDir, artifact.id);
    const expectedText = getArtifactExpectedText(artifact.id, { sellerProfile: packet.sellerProfile, quoteVerification });
    fs.writeFileSync(filePath, artifact.mimeType === 'application/pdf'
      ? createPdfFixture(expectedText.join(' | '))
      : await createDocxFixture(expectedText.join(' | ')));
    return {
      id: artifact.id,
      ...describeFile(tempDir, filePath, artifact.mimeType),
      sellerProfileSha256,
      ciSha256: packet.ciAsset.sha256,
    };
  }));
  return {
    contract: 'CRM-S15-BROWSER-EVIDENCE',
    schemaVersion: 3,
    status: 'PASS',
    synthetic: false,
    sourceEnvironment: 'production',
    tool: 'playwright-cli',
    runId: 'crm-s15-self-test',
    deploymentId: packet.deploymentId,
    releaseSha,
    apiEvidenceSha256: sha256(fs.readFileSync(apiPath)),
    sellerProfileSha256,
    ciSha256: packet.ciAsset.sha256,
    capturedAt,
    credentialsStored: false,
    browserVersion: 'Chromium self-test',
    playwrightCliVersion: '0.1.18-self-test',
    quoteVerification,
    runs,
    artifacts,
  };
}

function createSelfTestCliLogs(tempDir, runIndex) {
  const consolePath = path.join(tempDir, `${runIndex}-console.json`);
  const networkPath = path.join(tempDir, `${runIndex}-requests.json`);
  fs.writeFileSync(consolePath, `${JSON.stringify({ result: 'Total messages: 0 (Errors: 0, Warnings: 0)\n' })}\n`);
  fs.writeFileSync(networkPath, `${JSON.stringify({ result: 'GET https://crm.ssoo.test/ 200\nGET https://crm.ssoo.test/api/crm/quote-seller-profile/ci 200\nGET https://admin.ssoo.test/ 200\nGET https://dms.ssoo.test/ 200\n' })}\n`);
  return {
    consoleLog: describeFile(tempDir, consolePath, 'application/json'),
    networkLog: describeFile(tempDir, networkPath, 'application/json'),
  };
}

function describeFile(baseDir, filePath, mimeType) {
  const buffer = fs.readFileSync(filePath);
  return { path: path.relative(baseDir, filePath), sha256: sha256(buffer), size: buffer.length, mimeType };
}

function createWrongViewportFixture(manifest, tempDir) {
  return mutateManifest(manifest, (copy) => {
    const filePath = path.join(tempDir, 'wrong-viewport.png');
    fs.writeFileSync(filePath, createPngFixture(1, 1, 'wrong-viewport'));
    copy.runs[0].surfaces[0].screenshot = describeFile(tempDir, filePath, 'image/png');
  });
}

function createSymlinkEscapeFixture(manifest, tempDir, outsideEvidencePath) {
  return mutateManifest(manifest, (copy) => {
    const linkPath = path.join(tempDir, 'outside-evidence-link.yml');
    fs.symlinkSync(outsideEvidencePath, linkPath);
    copy.runs[0].surfaces[0].snapshot = describeFile(tempDir, linkPath, 'text/yaml');
  });
}

function createMissingOriginFixture(manifest, tempDir) {
  return mutateManifest(manifest, (copy) => {
    const filePath = path.join(tempDir, 'missing-dms-origin.json');
    fs.writeFileSync(filePath, `${JSON.stringify({
      result: 'GET https://crm.ssoo.test/ 200\nGET https://admin.ssoo.test/ 200\n',
    })}\n`);
    copy.runs[0].networkLog = describeFile(tempDir, filePath, 'application/json');
  });
}

function createMissingCiRequestFixture(manifest, tempDir) {
  return mutateManifest(manifest, (copy) => {
    const filePath = path.join(tempDir, 'missing-ci-request.json');
    fs.writeFileSync(filePath, `${JSON.stringify({
      result: 'GET https://crm.ssoo.test/ 200\nGET https://admin.ssoo.test/ 200\nGET https://dms.ssoo.test/ 200\n',
    })}\n`);
    copy.runs[0].networkLog = describeFile(tempDir, filePath, 'application/json');
  });
}

function createNetworkFailureFixture(manifest, tempDir) {
  return mutateManifest(manifest, (copy) => {
    const filePath = path.join(tempDir, 'http-failure.json');
    fs.writeFileSync(filePath, `${JSON.stringify({
      result: 'GET https://crm.ssoo.test/ 200\nGET https://crm.ssoo.test/api/crm/quote-seller-profile/ci 200\nGET https://admin.ssoo.test/ 200\nGET https://dms.ssoo.test/api/readiness 500\n',
    })}\n`);
    copy.runs[0].networkLog = describeFile(tempDir, filePath, 'application/json');
  });
}

function createMissingCiImageFixture(manifest, tempDir) {
  return mutateManifest(manifest, (copy) => {
    replaceSurfaceSnapshot(copy, tempDir, 'crm-quote-preview', 'img "CI"', 'CI image omitted', 'missing-ci-image.yml');
  });
}

function createIncompleteAdminReadinessFixture(manifest, tempDir) {
  return mutateManifest(manifest, (copy) => {
    replaceSurfaceSnapshot(copy, tempDir, 'admin-readiness', '차단 0 주의 0', 'readiness metrics omitted', 'incomplete-admin-readiness.yml');
  });
}

function createSnapshotIdentityMismatchFixture(manifest, tempDir) {
  return mutateManifest(manifest, (copy) => {
    replaceSurfaceSnapshot(
      copy,
      tempDir,
      'crm-operations',
      'crm-s15-self-test-snapshot',
      'different-crm-snapshot',
      'crm-snapshot-mismatch.yml',
    );
  });
}

function replaceSurfaceSnapshot(manifest, tempDir, surfaceId, search, replacement, fileName) {
  const surface = manifest.runs[0].surfaces.find((candidate) => candidate.id === surfaceId);
  const originalPath = path.join(tempDir, surface.snapshot.path);
  const filePath = path.join(tempDir, fileName);
  fs.writeFileSync(filePath, fs.readFileSync(originalPath, 'utf8').replace(search, replacement));
  surface.snapshot = describeFile(tempDir, filePath, 'text/yaml');
}

function createWrongArtifactContentFixture(manifest, tempDir) {
  return mutateManifest(manifest, (copy) => {
    const filePath = path.join(tempDir, 'wrong-artifact-content.pdf');
    fs.writeFileSync(filePath, createPdfFixture('Structurally valid but unrelated document content'));
    copy.artifacts[0] = {
      ...copy.artifacts[0],
      ...describeFile(tempDir, filePath, 'application/pdf'),
    };
  });
}

function createPngFixture(width, height, label) {
  const buffer = Buffer.alloc(32 + Buffer.byteLength(label));
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer.write(label, 32, 'utf8');
  return buffer;
}

function createPdfFixture(text) {
  const escaped = text.replace(/([()\\])/gu, '\\$1');
  const stream = `BT /F1 10 Tf 36 720 Td (${escaped}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'ascii');
}

async function createDocxFixture(text) {
  const escaped = text
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&apos;');
  const zip = new JSZip();
  zip.file('[Content_Types].xml', Buffer.from(
    '<?xml version="1.0" encoding="UTF-8"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    + '</Types>',
  ));
  zip.file('_rels/.rels', Buffer.from(
    '<?xml version="1.0" encoding="UTF-8"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
    + '</Relationships>',
  ));
  zip.file('word/document.xml', Buffer.from(
    '<?xml version="1.0" encoding="UTF-8"?>'
    + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    + `<w:body><w:p><w:r><w:t>${escaped}</w:t></w:r></w:p></w:body></w:document>`,
  ));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function mutateManifest(value, mutate) {
  const copy = structuredClone(value);
  mutate(copy);
  return copy;
}

async function assertRejects(callback, expectedMessage, label) {
  try {
    await callback();
  } catch (error) {
    const message = sanitizeError(error);
    if (message.includes(expectedMessage)) return;
    throw new Error(`${label} failed with an unexpected error: ${message}`);
  }
  throw new Error(`${label} did not fail`);
}

function assertExactIds(items, required, label, key = 'id') {
  const ids = items.map((item) => item?.[key]);
  if (new Set(ids).size !== ids.length) throw new Error(`${label} contains duplicate IDs`);
  const missing = required.filter((id) => !ids.includes(id));
  const unexpected = ids.filter((id) => !required.includes(id));
  if (missing.length || unexpected.length) {
    throw new Error(`${label} mismatch; missing=${missing.join(',') || 'none'}, unexpected=${unexpected.join(',') || 'none'}`);
  }
}

function assertNoCredentialFields(value, location = 'evidence') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoCredentialFields(item, `${location}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'credentialsStored') {
      assertEqual(child, false, `${location}.credentialsStored`);
      continue;
    }
    if (/(password|secret|token|credential|api[_-]?key|connection[_-]?string)/iu.test(key)) {
      throw new Error(`${location}.${key} is forbidden in evidence`);
    }
    assertNoCredentialFields(child, `${location}.${key}`);
  }
}

function readEnvFile(filePath) {
  const result = {};
  fs.readFileSync(filePath, 'utf8').split(/\r?\n/u).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;
    const match = line.replace(/^export\s+/u, '').match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u);
    if (!match) return;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/u, '').trimEnd();
    }
    result[match[1]] = value;
  });
  return result;
}

function validateProductionUrl(value, label) {
  const parsed = parseUrl(value, label);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error(`${label} must be credential-free HTTPS`);
  if (/^(localhost|127\.0\.0\.1|::1)$/u.test(parsed.hostname)) throw new Error(`${label} must be a non-local production URL`);
}

function parseUrl(value, label) {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute URL`);
  }
}

function readFile(filePath, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) throw new Error(`${label} does not exist: ${filePath}`);
  return fs.readFileSync(filePath);
}

function parseJson(buffer, label) {
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

function readOption(name, fallback) {
  const inline = argv.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = argv.indexOf(name);
  if (index < 0) return fallback;
  if (!argv[index + 1] || argv[index + 1].startsWith('--')) throw new Error(`${name} requires a value`);
  return argv[index + 1];
}

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
}

function assertText(value, label, maxLength) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  if (value.trim().length > maxLength) throw new Error(`${label} must be at most ${maxLength} characters`);
}

function assertNotPlaceholder(value, label) {
  if (/(change[-_ ]?me|replace[-_ ]?with|example\.invalid|todo|샘플|미설정)/iu.test(value)) {
    throw new Error(`${label} must not contain a placeholder value`);
  }
}

function assertIsoDate(value, label) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new Error(`${label} must be an ISO date-time`);
}

function assertSha256(value, label) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/u.test(value)) throw new Error(`${label} must be a lowercase SHA-256 digest`);
}

function assertCommitSha(value, label) {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/u.test(value)) throw new Error(`${label} must be a lowercase 40-character commit SHA`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label} must equal ${expected}`);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeTarget(value) {
  if (value === 'about:blank') return value;
  const parsed = parseUrl(value, 'surface URL');
  parsed.username = '';
  parsed.password = '';
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/u, '');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

function sanitizeError(error) {
  return (error instanceof Error ? error.message : String(error))
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+/giu, 'Bearer [REDACTED]')
    .replace(/(password|secret|token|credential|api[_-]?key)=([^\s&]+)/giu, '$1=[REDACTED]');
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

function printUsage() {
  console.log(`Usage: node scripts/verify-crm-go-live-browser-evidence.mjs [options]

Options:
  --template                 Print a draft browser manifest; bind identities when packet/API evidence are supplied
  --packet <path>            Approved seller/CI input packet
  --env-file <path>          Production environment file (default: .env.production)
  --api-evidence <path>      PASS_LIVE_API_READY evidence from verify:crm-go-live
  --dms-evidence <path>      Same-release DMS five-track FINAL GO evidence
  --manifest <path>          Production desktop/mobile browser and artifact manifest
  --evidence <path>          Write sanitized final go-live evidence
  --self-test                Run isolated positive and fail-closed negative fixtures
  --help                     Show this help

Only this verifier may emit CRM-S15-FINAL-GO-LIVE status PASS. It performs no
production mutation and never reads or stores login credentials.`);
}
