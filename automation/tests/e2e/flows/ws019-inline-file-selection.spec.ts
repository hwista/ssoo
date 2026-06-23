import { expect, type Browser, type BrowserContext, type Page, type Response, type Route, test } from '@playwright/test';

type HttpMethod = 'GET' | 'POST' | 'DELETE';
type JsonObject = Record<string, unknown>;
type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

interface LaunchUser {
  loginId: string;
  password: string;
}

const WS019_USER: LaunchUser = { loginId: 'admin', password: 'admin123!' };
const DMS_BASE_URL = `http://127.0.0.1:${process.env.PLAYWRIGHT_DMS_PORT ?? '3003'}`;

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null;
}

function isCollaborationPostForPath(response: Response, path: string, mode?: 'view' | 'edit'): boolean {
  if (response.request().method() !== 'POST') {
    return false;
  }

  try {
    if (new URL(response.url()).pathname !== '/api/collaboration') {
      return false;
    }
    const payload = response.request().postDataJSON() as JsonObject;
    return payload.path === path && (!mode || payload.mode === mode);
  } catch {
    return false;
  }
}

async function waitForDmsShell(page: Page) {
  await expect(page.getByPlaceholder('문서·지식 검색...')).toBeVisible({ timeout: 15_000 });
}

async function login(page: Page, loginId: string, password: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto(`${DMS_BASE_URL}/login`);
    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
    await page.getByLabel('아이디').fill(loginId);
    await page.getByLabel('비밀번호').fill(password);
    await page.getByRole('button', { name: '로그인' }).click();

    try {
      await waitForDmsShell(page);
      return;
    } catch (error) {
      const rateLimited = await page.getByText(/Too Many Requests|ThrottlerException/).isVisible().catch(() => false);
      if (rateLimited && attempt === 0) {
        await page.waitForTimeout(61_000);
        continue;
      }
      throw error;
    }
  }
}

async function authenticate(browser: Browser, user: LaunchUser): Promise<StorageState> {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await login(page, user.loginId, user.password);
    return await context.storageState();
  } finally {
    await context.close();
  }
}

function requireStorageState(state: StorageState | undefined): StorageState {
  if (!state) {
    throw new Error('auth state is not initialized');
  }
  return state;
}

async function newAuthenticatedPage(
  browser: Browser,
  storageState: StorageState,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();
  await page.goto(`${DMS_BASE_URL}/`);
  await waitForDmsShell(page);
  return { context, page };
}

function resolvePageRequestUrl(page: Page, url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const currentUrl = page.url();
  if (!/^https?:\/\//i.test(currentUrl)) {
    throw new Error(`cannot resolve ${url} before page navigation`);
  }

  return new URL(url, currentUrl).toString();
}

function parseAccessToken(rawAuth: string | undefined): string | undefined {
  if (!rawAuth) return undefined;

  try {
    const parsed = JSON.parse(rawAuth) as { state?: { accessToken?: unknown } };
    const token = parsed.state?.accessToken;
    return typeof token === 'string' && token.trim().length > 0 ? token : undefined;
  } catch {
    return undefined;
  }
}

async function readAccessToken(page: Page): Promise<string | undefined> {
  const currentUrl = page.url();
  if (!/^https?:\/\//i.test(currentUrl)) {
    return undefined;
  }

  const currentOrigin = new URL(currentUrl).origin;
  const storageState = await page.context().storageState();
  const rawAuth = storageState.origins
    .find((origin) => origin.origin === currentOrigin)
    ?.localStorage.find((item) => item.name === 'ssoo-auth')
    ?.value;

  return parseAccessToken(rawAuth);
}

async function apiRequest(
  page: Page,
  method: HttpMethod,
  url: string,
  body?: JsonObject,
): Promise<unknown> {
  const resolvedUrl = resolvePageRequestUrl(page, url);
  const headers: Record<string, string> = body ? { 'Content-Type': 'application/json' } : {};
  const accessToken = await readAccessToken(page);
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await page.context().request.fetch(resolvedUrl, {
    method,
    headers,
    ...(body ? { data: body } : {}),
    timeout: 15_000,
  });
  const contentType = response.headers()['content-type'] ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  expect(
    response.ok(),
    `${method} ${url} failed with ${response.status()}: ${JSON.stringify(payload)}`,
  ).toBeTruthy();

  return payload;
}

async function apiRequestOptional(
  page: Page,
  method: HttpMethod,
  url: string,
  body?: JsonObject,
): Promise<void> {
  try {
    await apiRequest(page, method, url, body);
  } catch {
    // cleanup best-effort
  }
}

async function createMarkdownDocument(page: Page, path: string, title: string, content: string) {
  await apiRequest(page, 'POST', '/api/content', {
    path,
    content,
    metadata: {
      title,
      summary: 'WS-019 inline file selection regression test document.',
      tags: ['ws019', 'playwright'],
      sourceLinks: [],
      bodyLinks: [],
      sourceFiles: [],
      comments: [],
      referenceFiles: [],
      acl: {
        owners: [],
        editors: [],
        viewers: [],
      },
      grants: [],
      visibility: {
        scope: 'self',
      },
      ownerLoginId: WS019_USER.loginId,
      author: WS019_USER.loginId,
      lastModifiedBy: WS019_USER.loginId,
    },
  });
}

async function openDocumentTab(page: Page, path: string, title: string, ownerUserId = '1') {
  const collaborationReady = page.waitForResponse(
    (response) => isCollaborationPostForPath(response, path, 'view'),
    { timeout: 20_000 },
  );

  await page.evaluate(({ nextOwnerUserId, nextPath, nextTitle }) => {
    const now = new Date().toISOString();
    const tabId = `file-${encodeURIComponent(nextPath)}`;
    sessionStorage.setItem('dms-tab-store', JSON.stringify({
      state: {
        tabs: [
          {
            id: 'home',
            title: '홈',
            path: '/home',
            icon: 'Home',
            isEditing: false,
            closable: false,
            openedAt: now,
            lastActiveAt: now,
          },
          {
            id: tabId,
            title: nextTitle,
            path: `/doc/${encodeURIComponent(nextPath)}`,
            icon: 'FileText',
            isEditing: false,
            reloadSeq: 0,
            closable: true,
            openedAt: now,
            lastActiveAt: now,
          },
        ],
        activeTabId: tabId,
        ownerUserId: nextOwnerUserId,
      },
      version: 0,
    }));
  }, { nextOwnerUserId: ownerUserId, nextPath: path, nextTitle: title });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForDmsShell(page);
  await expect(page.getByRole('button', { name: title })).toBeVisible({ timeout: 30_000 });
  await collaborationReady;
}

async function enterDocumentEditMode(page: Page, path: string) {
  const editButton = page.getByRole('button', { name: '편집', exact: true });
  await expect(editButton).toBeVisible({ timeout: 10_000 });
  await expect(editButton).toBeEnabled();

  await Promise.all([
    page.waitForResponse(
      (response) => isCollaborationPostForPath(response, path, 'edit'),
      { timeout: 10_000 },
    ),
    editButton.click(),
  ]);

  await expect(page.getByRole('button', { name: /편집종료|작성취소/ })).toBeVisible({ timeout: 10_000 });
}

test.describe('WS-019 inline file selection lifecycle', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  let adminStorageState: StorageState | undefined;

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(240_000);
    adminStorageState = await authenticate(browser, WS019_USER);
  });

  /**
   * 테스트 케이스 ID: TC-DMS-AI-REF-01
   * 우선순위: P1
   *
   * @description 인라인 assistant의 파일 선택이 extract-text 완료 전에도 즉시 보이고, extracting 동안 적용이 막히며, AI 실패 후에도 파일 chip과 오류 메시지가 유지되는지 검증한다.
   * @precondition admin 계정으로 로그인 가능한 Playwright DMS stack이 기동되어 있어야 한다.
   * @input 편집 가능한 문서 1건, inline markdown reference fixture, 지연된 `/api/file/extract-text`, 실패하는 `/api/doc-assist`
   * @expected 선택 직후 chip 표시 + `분석 중` 상태, extracting 동안 `적용` 비활성화, 추출 완료 후 `적용` 활성화, AI 실패 메시지 표시 후에도 선택 파일 chip 유지
   */
  test('shows selected files immediately, blocks apply during extraction, and preserves chip on AI failure', async ({ browser }) => {
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const documentPath = `ws019/inline-file-selection-${suffix}.md`;
    const title = `WS019 Inline ${suffix}`;
    const { context, page } = await newAuthenticatedPage(browser, requireStorageState(adminStorageState));
    let protectedAuthLifecycleChecks = 0;

    let releaseExtraction!: () => void;
    const extractionGate = new Promise<void>((resolve) => {
      releaseExtraction = resolve;
    });

    await page.route('**/api/file/extract-text', async (route) => {
      await extractionGate;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          textContent: '# 참조 문서\n\n선택 직후 visible state를 검증하기 위한 fixture 본문입니다.',
        }),
      });
    });

    await page.route('**/api/doc-assist', async (route) => {
      const body = route.request().postDataJSON() as JsonObject;
      if (body.stream === false) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'AI 작성에 실패했습니다.' }),
        });
        return;
      }
      await route.continue();
    });

    try {
      await createMarkdownDocument(page, documentPath, title, '# WS-019 테스트 문서\n\n인라인 파일 선택 회귀 검증용 본문입니다.');
      await openDocumentTab(page, documentPath, title);
      await enterDocumentEditMode(page, documentPath);

      const composerInput = page.getByPlaceholder(/AI와 함께 문서를 작성하세요/);
      const composerForm = page.locator('form', { has: composerInput });
      const composerFooter = page.locator('footer').filter({ has: composerInput });
      await composerInput.fill('이 파일을 바탕으로 요약해줘');

      await composerForm.getByRole('button', { name: '컨텍스트 첨부' }).click();
      const attachMenu = page.locator('[data-assistant-dropdown="true"]');
      await expect(attachMenu).toBeVisible();
      const fileChooserPromise = page.waitForEvent('filechooser');
      await attachMenu.getByRole('button', { name: '파일 선택' }).click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles({
        name: 'inline-ref.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from('# Inline Ref\n\n선택 직후 chip이 보여야 합니다.\n', 'utf8'),
      });
      const interceptLifecycleAuthCheck = async (route: Route) => {
        protectedAuthLifecycleChecks += 1;
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      };
      await page.route('**/api/auth/me', interceptLifecycleAuthCheck);
      await page.route('**/api/auth/session', interceptLifecycleAuthCheck);
      await page.evaluate(() => {
        window.dispatchEvent(new Event('focus'));
      });
      await page.waitForTimeout(300);
      expect(protectedAuthLifecycleChecks).toBe(0);
      await page.unroute('**/api/auth/me', interceptLifecycleAuthCheck);
      await page.unroute('**/api/auth/session', interceptLifecycleAuthCheck);
      await expect(attachMenu).toBeHidden();
      const applyButton = composerForm.getByRole('button', { name: '적용' });

      await expect(page.getByText('파일: inline-ref.md')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('분석 중')).toBeVisible();
      await expect(applyButton).toBeDisabled();

      releaseExtraction();

      await expect(page.getByText('분석 중')).toHaveCount(0, { timeout: 10_000 });
      await expect(applyButton).toBeEnabled({ timeout: 10_000 });

      await applyButton.click();

      await expect(composerFooter.getByText(/AI 작성에 실패했습니다/)).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('파일: inline-ref.md')).toBeVisible();
    } finally {
      await apiRequestOptional(page, 'DELETE', '/api/content', { path: documentPath });
      await context.close();
    }
  });
});
