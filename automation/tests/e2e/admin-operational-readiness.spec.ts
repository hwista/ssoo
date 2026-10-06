import { expect, type Browser, type Page, test } from '@playwright/test';

import {
  authenticateStorageState,
  closeRotatingAuthenticatedContext,
  getLaunchAccessToken,
  openRotatingAuthenticatedPage,
  requireMutableStorageState,
  runLaunchPhase,
  type MutableStorageState,
} from './support/launch-browser';
import { MutationRecovery } from './support/mutation-recovery';

type JsonRecord = Record<string, unknown>;

const adminUrl = process.env.DMS_GO_LIVE_ADMIN_URL ?? 'http://127.0.0.1:3000';
const apiUrl = process.env.DMS_GO_LIVE_API_URL ?? 'http://127.0.0.1:4000/api';
const loginId = process.env.DMS_GO_LIVE_ADMIN_LOGIN_ID ?? 'admin';
const password = process.env.DMS_GO_LIVE_ADMIN_PASSWORD ?? 'admin123!';
const mutationMode = process.env.ADMIN_OPERATIONAL_MUTATIONS === '1';

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);
let adminStorageState: MutableStorageState | undefined;

async function waitForAdminDashboard(page: Page) {
  await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible({ timeout: 30_000 });
}

test.beforeAll(async ({ browser }, testInfo) => {
  testInfo.setTimeout(180_000);
  adminStorageState = await authenticateStorageState(browser, {
    appUrl: adminUrl,
    loginId,
    password,
    waitUntilReady: waitForAdminDashboard,
    retryAfterRateLimit: true,
  });
});

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function responseData(value: unknown): unknown {
  return isRecord(value) ? value.data : undefined;
}

function requireRecord(value: unknown, label: string): JsonRecord {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  return value;
}

function requireArray(value: unknown, label: string): JsonRecord[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.filter(isRecord);
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a string`);
  return value;
}

async function openAdminPage(browser: Browser) {
  return openRotatingAuthenticatedPage(browser, {
    appUrl: adminUrl,
    storageState: requireMutableStorageState(adminStorageState, 'Admin launch'),
    waitUntilReady: waitForAdminDashboard,
    failurePolicy: {
      label: 'Admin operational browser',
      relevantOrigins: [adminUrl, apiUrl],
    },
  });
}

async function adminApi(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: JsonRecord,
) {
  const accessToken = getLaunchAccessToken(page) ?? '';
  const result = await page.evaluate(async ({ url, method: requestMethod, requestBody, token }) => {
    const response = await fetch(url, {
      method: requestMethod,
      credentials: 'include',
      headers: {
        ...(requestBody ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(requestBody ? { body: JSON.stringify(requestBody) } : {}),
    });
    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => '');
    return { ok: response.ok, status: response.status, payload };
  }, {
    url: `${apiUrl.replace(/\/$/u, '')}/${path.replace(/^\//u, '')}`,
    method,
    requestBody: body,
    token: accessToken,
  });

  return result;
}

async function expectAdminApiSuccess(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: JsonRecord,
) {
  const result = await adminApi(page, method, path, body);
  expect(result.ok, `${method} ${path} failed (${result.status}): ${JSON.stringify(result.payload)}`).toBeTruthy();
  return result.payload;
}

async function adminApiExpectedFailure(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: JsonRecord,
) {
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

test('Admin operational surfaces support navigation and direct route entry', async ({ browser }) => {
  const { context, page, monitor } = await openAdminPage(browser);

  try {
    await runLaunchPhase('Admin direct operational routes', async () => {
      const surfaces: Array<{ path: string; verify: () => Promise<void> }> = [
        { path: '/users', verify: () => expect(page.getByRole('button', { name: '사용자 추가' })).toBeVisible() },
        { path: '/organizations', verify: () => expect(page.getByRole('button', { name: '조직 추가' })).toBeVisible() },
        { path: '/codes', verify: () => expect(page.getByRole('heading', { name: '공통코드 관리' })).toBeVisible() },
        { path: '/roles', verify: () => expect(page.getByRole('button', { name: '역할 권한 편집' }).last()).toBeVisible() },
        { path: '/auth', verify: () => expect(page.getByRole('heading', { name: '로그인 설정' })).toBeVisible() },
        { path: '/ai-operations', verify: () => expect(page.getByRole('heading', { name: 'Provider 준비 상태' })).toBeVisible() },
      ];

      for (const surface of surfaces) {
        await page.goto(new URL(surface.path, adminUrl).toString());
        await expect(page).toHaveURL(new RegExp(`${surface.path.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}(?:$|\\?)`));
        await surface.verify();
      }
    });

    monitor!.assertClean();
  } finally {
    await closeRotatingAuthenticatedContext(context);
  }
});

test('Admin account, auth, organization, permission, audit, and email delivery operations persist and recover', async ({ browser }) => {
  test.skip(!mutationMode, 'Set ADMIN_OPERATIONAL_MUTATIONS=1 only for an isolated launch-verification database.');

  const { context, page, monitor } = await openAdminPage(browser);
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  let createdUserId: string | null = null;
  let parentOrgId: string | null = null;
  let childOrgId: string | null = null;
  let originalViewerPermissions: string[] | null = null;
  let originalAuthSettings: JsonRecord | null = null;

  try {
    const recovery = new MutationRecovery();
    await recovery.run(async (mutations) => {
    const authSettingsPayload = await expectAdminApiSuccess(page, 'GET', '/auth/admin/settings');
    originalAuthSettings = requireRecord(responseData(authSettingsPayload), 'auth settings');
    mutations.defer('restore Admin auth settings', async () => {
      const restore = await adminApi(page, 'PUT', '/auth/admin/settings', {
        resetCodeTtlMinutes: originalAuthSettings!.resetCodeTtlMinutes,
      });
      expect(restore.ok, JSON.stringify(restore.payload)).toBeTruthy();
      const restoredPayload = await expectAdminApiSuccess(page, 'GET', '/auth/admin/settings');
      expect(requireRecord(responseData(restoredPayload), 'restored auth settings').resetCodeTtlMinutes)
        .toBe(originalAuthSettings!.resetCodeTtlMinutes);
    });
    const originalTtl = Number(originalAuthSettings.resetCodeTtlMinutes);
    const nextTtl = originalTtl === 15 ? 16 : 15;
    const changedSettings = await expectAdminApiSuccess(page, 'PUT', '/auth/admin/settings', {
      resetCodeTtlMinutes: nextTtl,
    });
    expect(requireRecord(responseData(changedSettings), 'changed auth settings').resetCodeTtlMinutes).toBe(nextTtl);

    const unsupportedSignup = await adminApiExpectedFailure(page, 'PUT', '/auth/admin/settings', { selfSignupEnabled: true });
    expect(unsupportedSignup.status).toBe(400);
    const lockout = await adminApiExpectedFailure(page, 'PUT', '/auth/admin/settings', { passwordLoginEnabled: false });
    expect(lockout.status).toBe(400);

    const userPayload = await expectAdminApiSuccess(page, 'POST', '/users', {
      loginId: `launch.ops.${suffix}`,
      password: 'Launch1234!',
      userName: `Launch Ops ${suffix}`,
      displayName: `Launch Ops ${suffix}`,
      email: `launch.ops.${suffix}@example.com`,
      roleCode: 'viewer',
      primaryAffiliationType: 'internal',
    });
    const user = requireRecord(responseData(userPayload), 'created user');
    createdUserId = requireString(user.id, 'created user id');
    mutations.defer('deactivate launch verification user', async () => {
      const beforeCleanup = await expectAdminApiSuccess(page, 'GET', `/auth/admin/users/${createdUserId}/account`);
      if (requireRecord(responseData(beforeCleanup), 'user account before cleanup').isActive === true) {
        const cleanup = await adminApi(page, 'DELETE', `/users/${createdUserId}`);
        expect(cleanup.ok, JSON.stringify(cleanup.payload)).toBeTruthy();
      }
      const afterCleanup = await expectAdminApiSuccess(page, 'GET', `/auth/admin/users/${createdUserId}/account`);
      expect(requireRecord(responseData(afterCleanup), 'cleaned user account').isActive).toBe(false);
    });

    const accountPayload = await expectAdminApiSuccess(page, 'GET', `/auth/admin/users/${createdUserId}/account`);
    expect(requireRecord(responseData(accountPayload), 'account snapshot').isActive).toBe(true);

    await expectAdminApiSuccess(page, 'POST', `/auth/admin/users/${createdUserId}/password-reset`);
    await expect.poll(async () => {
      const deliveryPayload = await expectAdminApiSuccess(page, 'GET', '/auth/admin/email-delivery/status');
      const delivery = requireRecord(responseData(deliveryPayload), 'email delivery');
      return requireArray(delivery.recent, 'recent email delivery')
        .some((message) => message.templateCode === 'auth.password-reset' && message.statusCode === 'sent');
    }, { timeout: 20_000, message: 'password reset outbox should reach SMTP sent state' }).toBe(true);

    await expectAdminApiSuccess(page, 'POST', `/auth/admin/users/${createdUserId}/sessions/revoke`, {
      reason: 'launch-operational-proof',
    });
    await expectAdminApiSuccess(page, 'POST', `/auth/admin/users/${createdUserId}/unlock`);
    await expectAdminApiSuccess(page, 'DELETE', `/users/${createdUserId}`);
    const inactiveAccount = await expectAdminApiSuccess(page, 'GET', `/auth/admin/users/${createdUserId}/account`);
    expect(requireRecord(responseData(inactiveAccount), 'inactive account').isActive).toBe(false);
    await expectAdminApiSuccess(page, 'POST', `/users/${createdUserId}/reactivate`);

    const parentPayload = await expectAdminApiSuccess(page, 'POST', '/organizations', {
      orgCode: `LP${suffix.replace(/\D/gu, '').slice(-8)}P`,
      orgName: `Launch Parent ${suffix}`,
      orgType: 'department',
      scope: 'internal',
      levelType: 'department',
    });
    parentOrgId = requireString(requireRecord(responseData(parentPayload), 'parent org').orgId, 'parent org id');
    mutations.defer('remove launch parent organization', async () => {
      const cleanup = await adminApi(page, 'DELETE', `/organizations/${parentOrgId}`);
      expect(cleanup.ok, JSON.stringify(cleanup.payload)).toBeTruthy();
    });
    const childPayload = await expectAdminApiSuccess(page, 'POST', '/organizations', {
      orgCode: `LP${suffix.replace(/\D/gu, '').slice(-8)}C`,
      orgName: `Launch Child ${suffix}`,
      orgType: 'team',
      scope: 'internal',
      levelType: 'team',
      parentOrgId,
    });
    childOrgId = requireString(requireRecord(responseData(childPayload), 'child org').orgId, 'child org id');
    mutations.defer('remove launch child organization', async () => {
      const cleanup = await adminApi(page, 'DELETE', `/organizations/${childOrgId}`);
      expect(cleanup.ok, JSON.stringify(cleanup.payload)).toBeTruthy();
    });

    const cycle = await adminApiExpectedFailure(page, 'PUT', `/organizations/${parentOrgId}`, { parentOrgId: childOrgId });
    expect(cycle.status).toBe(400);
    const activeChildGuard = await adminApiExpectedFailure(page, 'DELETE', `/organizations/${parentOrgId}`);
    expect(activeChildGuard.status).toBe(409);

    const rolesPayload = await expectAdminApiSuccess(page, 'GET', '/access/ops/roles');
    const roles = requireArray(responseData(rolesPayload), 'roles');
    const viewerRole = roles.find((role) => role.roleCode === 'viewer');
    if (!viewerRole) throw new Error('viewer role is missing');
    originalViewerPermissions = Array.isArray(viewerRole.permissionCodes)
      ? viewerRole.permissionCodes.filter((value): value is string => typeof value === 'string')
      : [];
    mutations.defer('restore viewer permissions', async () => {
      const restore = await adminApi(page, 'PUT', '/access/ops/roles/viewer/permissions', {
        permissionCodes: originalViewerPermissions!,
      });
      expect(restore.ok, JSON.stringify(restore.payload)).toBeTruthy();
      const restoredRolesPayload = await expectAdminApiSuccess(page, 'GET', '/access/ops/roles');
      const restoredViewer = requireArray(responseData(restoredRolesPayload), 'restored roles')
        .find((role) => role.roleCode === 'viewer');
      expect(restoredViewer).toBeTruthy();
      const restoredPermissions = Array.isArray(restoredViewer?.permissionCodes)
        ? restoredViewer.permissionCodes.filter((value): value is string => typeof value === 'string').sort()
        : [];
      expect(restoredPermissions).toEqual([...originalViewerPermissions!].sort());
    });
    const catalogPayload = await expectAdminApiSuccess(page, 'GET', '/access/ops/catalog');
    const catalog = requireRecord(responseData(catalogPayload), 'permission catalog');
    const availablePermissions = requireArray(catalog.groups, 'permission groups')
      .flatMap((group) => requireArray(group.items, 'permission items'))
      .map((item) => item.permissionCode)
      .filter((value): value is string => typeof value === 'string');
    const addedPermission = availablePermissions.find((code) => !originalViewerPermissions!.includes(code));
    if (!addedPermission) throw new Error('no permission is available for the viewer grant mutation proof');
    await expectAdminApiSuccess(page, 'PUT', '/access/ops/roles/viewer/permissions', {
      permissionCodes: [...originalViewerPermissions, addedPermission],
    });

    const inspectPayload = await expectAdminApiSuccess(page, 'GET', `/access/ops/inspect?userId=${createdUserId}`);
    expect(requireRecord(responseData(inspectPayload), 'access inspect').subject).toBeTruthy();
    const auditPayload = await expectAdminApiSuccess(page, 'GET', '/access/ops/audit?limit=100');
    const categories = new Set(requireArray(responseData(auditPayload), 'audit events').map((event) => event.category));
    expect(categories.has('user')).toBe(true);
    expect(categories.has('organization')).toBe(true);
    expect(categories.has('role-permission')).toBe(true);
    });

    monitor!.assertClean();
  } finally {
    await closeRotatingAuthenticatedContext(context);
  }
});
