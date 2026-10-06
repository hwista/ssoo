import { expect, type Browser, type Page, test } from '@playwright/test';

import {
  authenticateStorageState,
  closeRotatingAuthenticatedContext,
  getLaunchAccessToken,
  openRotatingAuthenticatedPage,
  reloadRotatingAuthenticatedPage,
  requireMutableStorageState,
  runLaunchPhase,
  type MutableStorageState,
} from './support/launch-browser';
import { MutationRecovery } from './support/mutation-recovery';

type JsonRecord = Record<string, unknown>;

const dmsUrl = process.env.DMS_GO_LIVE_DMS_URL ?? 'http://127.0.0.1:3003';
const apiUrl = process.env.DMS_GO_LIVE_API_URL ?? 'http://127.0.0.1:4000/api';
const adminLoginId = process.env.DMS_GO_LIVE_ADMIN_LOGIN_ID ?? 'admin';
const adminPassword = process.env.DMS_GO_LIVE_ADMIN_PASSWORD ?? 'admin123!';
const editorLoginId = process.env.DMS_GO_LIVE_EDITOR_LOGIN_ID ?? 'pm.kim';
const editorPassword = process.env.DMS_GO_LIVE_EDITOR_PASSWORD ?? 'user123!';
const mutationMode = process.env.DMS_OPERATIONAL_MUTATIONS === '1';

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);
let adminStorageState: MutableStorageState | undefined;
let editorStorageState: MutableStorageState | undefined;

async function waitForDmsShell(page: Page) {
  await expect(
    page.getByRole('banner').getByRole('searchbox', { name: '통합 검색', exact: true }),
  ).toBeVisible({ timeout: 30_000 });
}

test.beforeAll(async ({ browser }, testInfo) => {
  testInfo.setTimeout(240_000);
  adminStorageState = await authenticateStorageState(browser, {
    appUrl: dmsUrl,
    loginId: adminLoginId,
    password: adminPassword,
    waitUntilReady: waitForDmsShell,
    retryAfterRateLimit: true,
  });
  editorStorageState = await authenticateStorageState(browser, {
    appUrl: dmsUrl,
    loginId: editorLoginId,
    password: editorPassword,
    waitUntilReady: waitForDmsShell,
    retryAfterRateLimit: true,
  });
});

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function requireRecord(value: unknown, label: string): JsonRecord {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  return value;
}

function responseData(value: unknown): unknown {
  return isRecord(value) ? value.data : undefined;
}

async function openDmsPage(
  browser: Browser,
  storageState: MutableStorageState | undefined,
  label: string,
) {
  return openRotatingAuthenticatedPage(browser, {
    appUrl: dmsUrl,
    storageState: requireMutableStorageState(storageState, label),
    waitUntilReady: waitForDmsShell,
    failurePolicy: {
      label,
      relevantOrigins: [dmsUrl, apiUrl],
    },
  });
}

async function dmsApi(
  page: Page,
  method: 'GET' | 'POST',
  path: string,
  body?: JsonRecord,
) {
  const accessToken = getLaunchAccessToken(page) ?? '';
  return page.evaluate(async ({ url, method: requestMethod, requestBody, token }) => {
    const response = await fetch(url, {
      method: requestMethod,
      credentials: 'include',
      headers: {
        ...(requestBody ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(requestBody ? { body: JSON.stringify(requestBody) } : {}),
    });
    const payload = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, payload };
  }, {
    url: `${apiUrl.replace(/\/$/u, '')}/${path.replace(/^\//u, '')}`,
    method,
    requestBody: body,
    token: accessToken,
  });
}

async function expectDmsApiSuccess(page: Page, method: 'GET' | 'POST', path: string, body?: JsonRecord) {
  const result = await dmsApi(page, method, path, body);
  expect(result.ok, `${method} ${path} failed (${result.status}): ${JSON.stringify(result.payload)}`).toBeTruthy();
  return result.payload;
}

async function dmsApiExpectedFailure(page: Page, method: 'GET' | 'POST', path: string, body?: JsonRecord) {
  const token = getLaunchAccessToken(page) ?? '';
  const response = await page.request.fetch(
    `${apiUrl.replace(/\/$/u, '')}/${path.replace(/^\//u, '')}`,
    {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      ...(body ? { data: body } : {}),
    },
  );
  return {
    ok: response.ok(),
    status: response.status(),
    payload: await response.json().catch(() => null) as unknown,
  };
}

async function uploadAttachment(page: Page, fileName: string, provider?: 'local' | 'nas') {
  const accessToken = getLaunchAccessToken(page) ?? '';
  return page.evaluate(async ({ url, uploadName, requestedProvider, token }) => {
    const form = new FormData();
    form.append('file', new File([`launch storage proof ${Date.now()}`], uploadName, { type: 'text/plain' }));
    if (requestedProvider) form.append('provider', requestedProvider);
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const payload = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, payload };
  }, {
    url: `${apiUrl.replace(/\/$/u, '')}/dms/file/upload-attachment`,
    uploadName: fileName,
    requestedProvider: provider,
    token: accessToken,
  });
}

test('DMS operational and personal settings support direct authenticated entry and reload', async ({ browser }) => {
  const { context, page, monitor } = await openDmsPage(browser, adminStorageState, 'DMS settings direct entry');

  try {
    await runLaunchPhase('DMS system settings direct entry and reload', async () => {
      await page.goto(new URL('/settings/system-settings/storage', dmsUrl).toString());
      await expect(page).toHaveURL(/\/settings\/system-settings\/storage(?:$|\?)/u);
      await expect(page.getByText('기본 저장소', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByLabel('Local 저장소 활성화')).toBeVisible();
      await reloadRotatingAuthenticatedPage(page);
      await expect(page.getByLabel('NAS 저장소 활성화')).toBeVisible({ timeout: 30_000 });
    });

    await runLaunchPhase('DMS personal settings direct entry', async () => {
      await page.goto(new URL('/settings/personal-settings/storage-preference', dmsUrl).toString());
      await expect(page).toHaveURL(/\/settings\/personal-settings\/storage-preference(?:$|\?)/u);
      await expect(page.getByLabel('내 기본 저장소')).toBeVisible({ timeout: 30_000 });
    });

    monitor!.assertClean();
  } finally {
    await closeRotatingAuthenticatedContext(context);
  }
});

test('DMS settings persist per user, enforce system authorization, and drive upload storage routing', async ({ browser }) => {
  test.skip(!mutationMode, 'Set DMS_OPERATIONAL_MUTATIONS=1 only for an isolated launch-verification runtime.');

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const { context: adminContext, page: adminPage, monitor: adminMonitor } = await openDmsPage(
    browser,
    adminStorageState,
    'DMS admin settings mutations',
  );
  let originalAdminPreference = 'system-default';
  let originalNasEnabled = false;

  try {
    const recovery = new MutationRecovery();
    await recovery.run(async (mutations) => {
      const settingsPayload = await expectDmsApiSuccess(adminPage, 'GET', '/dms/settings?includeRuntime=true');
      const settings = requireRecord(responseData(settingsPayload), 'admin settings');
      const config = requireRecord(settings.config, 'admin settings config');
      const system = requireRecord(config.system, 'system settings');
      const storage = requireRecord(system.storage, 'system storage');
      const nas = requireRecord(storage.nas, 'NAS settings');
      const personal = requireRecord(config.personal, 'admin personal settings');
      const workspace = requireRecord(personal.workspace, 'admin workspace settings');
      originalAdminPreference = String(workspace.preferredStorageProvider ?? 'system-default');
      originalNasEnabled = nas.enabled === true;
      mutations.defer('restore DMS admin storage settings', async () => {
        const restore = await dmsApi(adminPage, 'POST', '/dms/settings', {
          config: {
            system: { storage: { nas: { enabled: originalNasEnabled } } },
            personal: { workspace: { preferredStorageProvider: originalAdminPreference } },
          },
        });
        expect(restore.ok, JSON.stringify(restore.payload)).toBeTruthy();
        const restoredPayload = await expectDmsApiSuccess(adminPage, 'GET', '/dms/settings?includeRuntime=true');
        const restoredConfig = requireRecord(requireRecord(responseData(restoredPayload), 'restored settings').config, 'restored config');
        const restoredSystem = requireRecord(restoredConfig.system, 'restored system settings');
        const restoredStorage = requireRecord(restoredSystem.storage, 'restored storage settings');
        expect(requireRecord(restoredStorage.nas, 'restored NAS settings').enabled).toBe(originalNasEnabled);
        const restoredPersonal = requireRecord(restoredConfig.personal, 'restored personal settings');
        expect(requireRecord(restoredPersonal.workspace, 'restored workspace').preferredStorageProvider)
          .toBe(originalAdminPreference);
      });

      await expectDmsApiSuccess(adminPage, 'POST', '/dms/settings', {
        config: {
          system: { storage: { nas: { enabled: true } } },
          personal: { workspace: { preferredStorageProvider: 'nas' } },
        },
      });

      const implicitNas = await uploadAttachment(adminPage, `launch-nas-${suffix}.txt`);
      expect(implicitNas.ok, JSON.stringify(implicitNas.payload)).toBeTruthy();
      const implicitNasData = requireRecord(responseData(implicitNas.payload), 'implicit NAS upload');
      expect(implicitNasData.provider).toBe('nas');
      expect(String(implicitNasData.storageUri)).toMatch(/^nas:\/\//u);

      const explicitLocal = await uploadAttachment(adminPage, `launch-local-${suffix}.txt`, 'local');
      expect(explicitLocal.ok, JSON.stringify(explicitLocal.payload)).toBeTruthy();
      const explicitLocalData = requireRecord(responseData(explicitLocal.payload), 'explicit local upload');
      expect(explicitLocalData.provider).toBe('local');
      expect(String(explicitLocalData.storageUri)).toMatch(/^local:\/\//u);

      const persistedPayload = await expectDmsApiSuccess(adminPage, 'GET', '/dms/settings');
      const persistedConfig = requireRecord(requireRecord(responseData(persistedPayload), 'persisted settings').config, 'persisted config');
      const persistedWorkspace = requireRecord(requireRecord(persistedConfig.personal, 'persisted personal').workspace, 'persisted workspace');
      expect(persistedWorkspace.preferredStorageProvider).toBe('nas');
    });
  } finally {
    await closeRotatingAuthenticatedContext(adminContext);
  }

  const { context: editorContext, page: editorPage, monitor: editorMonitor } = await openDmsPage(
    browser,
    editorStorageState,
    'DMS editor settings mutations',
  );
  let originalEditorPreference = 'system-default';

  try {
    const recovery = new MutationRecovery();
    await recovery.run(async (mutations) => {
      const settingsPayload = await expectDmsApiSuccess(editorPage, 'GET', '/dms/settings');
      const settings = requireRecord(responseData(settingsPayload), 'editor settings');
      const config = requireRecord(settings.config, 'editor config');
      expect(config.system).toBeUndefined();
      const personal = requireRecord(config.personal, 'editor personal settings');
      const workspace = requireRecord(personal.workspace, 'editor workspace settings');
      originalEditorPreference = String(workspace.preferredStorageProvider ?? 'system-default');
      mutations.defer('restore DMS editor storage preference', async () => {
        const restore = await dmsApi(editorPage, 'POST', '/dms/settings', {
          config: { personal: { workspace: { preferredStorageProvider: originalEditorPreference } } },
        });
        expect(restore.ok, JSON.stringify(restore.payload)).toBeTruthy();
        const restoredPayload = await expectDmsApiSuccess(editorPage, 'GET', '/dms/settings');
        const restoredConfig = requireRecord(requireRecord(responseData(restoredPayload), 'restored editor settings').config, 'restored editor config');
        const restoredPersonal = requireRecord(restoredConfig.personal, 'restored editor personal settings');
        expect(requireRecord(restoredPersonal.workspace, 'restored editor workspace').preferredStorageProvider)
          .toBe(originalEditorPreference);
      });

      await expectDmsApiSuccess(editorPage, 'POST', '/dms/settings', {
        config: { personal: { workspace: { preferredStorageProvider: 'local' } } },
      });
      const forbiddenSystemUpdate = await dmsApiExpectedFailure(editorPage, 'POST', '/dms/settings', {
        config: { system: { storage: { defaultProvider: 'nas' } } },
      });
      expect(forbiddenSystemUpdate.status).toBe(403);

      const implicitLocal = await uploadAttachment(editorPage, `launch-editor-local-${suffix}.txt`);
      expect(implicitLocal.ok, JSON.stringify(implicitLocal.payload)).toBeTruthy();
      expect(requireRecord(responseData(implicitLocal.payload), 'editor local upload').provider).toBe('local');
    });
  } finally {
    await closeRotatingAuthenticatedContext(editorContext);
  }

  adminMonitor!.assertClean();
  editorMonitor!.assertClean();
});
