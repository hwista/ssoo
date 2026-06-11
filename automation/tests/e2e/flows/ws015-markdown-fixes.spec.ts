import { expect, type Browser, type BrowserContext, type Page, type Response, test } from '@playwright/test';

type HttpMethod = 'GET' | 'POST' | 'DELETE';
type JsonObject = Record<string, unknown>;
type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

interface LaunchUser {
  loginId: string;
  password: string;
}

const WS015_USER: LaunchUser = { loginId: 'admin', password: 'admin123!' };
const DMS_BASE_URL = `http://127.0.0.1:${process.env.PLAYWRIGHT_DMS_PORT ?? '3003'}`;

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }

  return value;
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
  await expect(page.getByPlaceholder('찾고 싶은 내용을 자유롭게 물어보세요!')).toBeVisible({ timeout: 15_000 });
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
      summary: 'WS-015 markdown regression test document.',
      tags: ['ws015', 'playwright'],
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
      ownerLoginId: WS015_USER.loginId,
      author: WS015_USER.loginId,
      lastModifiedBy: WS015_USER.loginId,
    },
  });
}

async function openDocumentTab(page: Page, path: string, title: string, ownerUserId = '1') {
  const collaborationReady = page.waitForResponse(
    (response) => isCollaborationPostForPath(response, path, 'view'),
    { timeout: 20_000 },
  );
  await page.evaluate(({ ownerUserId: nextOwnerUserId, path: nextPath, title: nextTitle }) => {
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
  }, { ownerUserId, path, title });
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

async function waitForFileWriteResponse(page: Page, path: string) {
  return page.waitForResponse((response) => {
    if (response.request().method() !== 'POST') return false;
    try {
      if (new URL(response.url()).pathname !== '/api/file') return false;
      const payload = response.request().postDataJSON() as JsonObject;
      return payload.action === 'write' && payload.path === path;
    } catch {
      return false;
    }
  }, { timeout: 15_000 });
}

async function readDocumentContent(page: Page, path: string): Promise<string> {
  const body = await apiRequest(page, 'GET', `/api/content?path=${encodeURIComponent(path)}`);
  return asString(isRecord(body) ? body.content : undefined, 'content');
}

const markdownFixture = [
  '# **굵은 제목** [링크](https://example.com)',
  '## *기울임* ~~취소~~ `코드`',
  '',
  '==형광==',
  '',
  '`==코드==`',
  '',
  '- [ ] 첫 번째 작업',
  '- [x] 두 번째 작업',
  '',
  '```md',
  '- [ ] 코드 블록 작업',
  '==코드 블록 형광==',
  '```',
].join('\n');

test.describe('WS-015 markdown regressions', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  let adminStorageState: StorageState | undefined;

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(240_000);
    adminStorageState = await authenticate(browser, WS015_USER);
  });

  /**
   * 테스트 케이스 ID: TC-DMS-MD-01
   * 우선순위: P1
   *
   * @description viewer/read mode에서 highlight, heading inline markdown, task checkbox 저장이 정상 동작하는지 검증한다.
   * @precondition admin 계정으로 로그인 가능한 Playwright DMS stack이 기동되어 있어야 한다.
   * @input WS-015 회귀용 markdown fixture 문서
   * @expected highlight는 <mark>로 보이고, heading 내부 inline markdown semantics가 유지되며, viewer checkbox 클릭이 markdown 원문에 저장된다.
   */
  test('renders viewer markdown semantics and persists task checkbox toggles', async ({ browser }) => {
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const documentPath = `ws015/markdown-viewer-${suffix}.md`;
    const title = `WS015 Viewer ${suffix}`;
    const { context, page } = await newAuthenticatedPage(browser, requireStorageState(adminStorageState));

    try {
      await createMarkdownDocument(page, documentPath, title, markdownFixture);
      await openDocumentTab(page, documentPath, title);

      await expect(page.locator('article mark.md-highlight', { hasText: '형광' })).toHaveCount(1);
      await expect(page.locator('article h1 strong', { hasText: '굵은 제목' })).toHaveCount(1);
      await expect(page.locator('article h1 a', { hasText: '링크' })).toHaveCount(1);
      await expect(page.locator('article h2 em', { hasText: '기울임' })).toHaveCount(1);
      await expect(page.locator('article h2 del', { hasText: '취소' })).toHaveCount(1);
      await expect(page.locator('article h2 code', { hasText: '코드' })).toHaveCount(1);
      await expect(page.locator('article code mark.md-highlight')).toHaveCount(0);
      await expect(page.locator('article code', { hasText: '==코드==' })).toHaveCount(1);

      const firstTaskCheckbox = page.locator('article input[type="checkbox"][data-task-index="0"]');
      await expect(firstTaskCheckbox).not.toBeChecked();
      await Promise.all([
        waitForFileWriteResponse(page, documentPath),
        firstTaskCheckbox.click(),
      ]);
      await expect(page.locator('article input[type="checkbox"][data-task-index="0"]')).toBeChecked();

      const savedContent = await readDocumentContent(page, documentPath);
      expect(savedContent).toContain('- [x] 첫 번째 작업');
      expect(savedContent).toContain('- [ ] 코드 블록 작업');

      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitForDmsShell(page);
      await expect(page.getByRole('button', { name: title })).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('article input[type="checkbox"][data-task-index="0"]')).toBeChecked();
    } finally {
      await apiRequestOptional(page, 'DELETE', '/api/content', { path: documentPath });
      await context.close();
    }
  });

  /**
   * 테스트 케이스 ID: TC-DMS-MD-02
   * 우선순위: P1
   *
   * @description block editor에서 highlight 문법이 decoration으로 보이고 inline code / fenced code는 제외되는지 검증한다.
   * @precondition admin 계정으로 로그인 가능한 Playwright DMS stack이 기동되어 있어야 한다.
   * @input WS-015 회귀용 markdown fixture 문서
   * @expected editor에는 일반 highlight 한 건만 decoration 되고 inline code 및 fenced code 내부 `==...==`는 decoration 되지 않는다.
   */
  test('shows highlight decoration in the block editor without touching code spans or fences', async ({ browser }) => {
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const documentPath = `ws015/markdown-editor-${suffix}.md`;
    const title = `WS015 Editor ${suffix}`;
    const { context, page } = await newAuthenticatedPage(browser, requireStorageState(adminStorageState));

    try {
      await createMarkdownDocument(page, documentPath, title, markdownFixture);
      await openDocumentTab(page, documentPath, title);
      await enterDocumentEditMode(page, documentPath);

      await expect(page.locator('.cm-mdHighlight')).toHaveCount(1);
      await expect(page.locator('.cm-mdHighlight').first()).toContainText('==형광==');
      await expect(page.locator('.cm-mdHighlight', { hasText: '==코드==' })).toHaveCount(0);
      await expect(page.locator('.cm-mdHighlight', { hasText: '==코드 블록 형광==' })).toHaveCount(0);
    } finally {
      await apiRequestOptional(page, 'DELETE', '/api/content', { path: documentPath });
      await context.close();
    }
  });
});
