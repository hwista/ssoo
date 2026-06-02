import { expect, type Browser, type BrowserContext, type Page, type Response, test } from '@playwright/test';

type HttpMethod = 'GET' | 'POST' | 'DELETE' | 'PATCH';
type JsonObject = Record<string, unknown>;
type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

interface LaunchUser {
  loginId: string;
  password: string;
}

const LAUNCH_USERS = {
  admin: { loginId: 'admin', password: 'admin123!' },
  viewer: { loginId: 'viewer.han', password: 'user123!' },
  editor: { loginId: 'pm.kim', password: 'user123!' },
} satisfies Record<string, LaunchUser>;

interface BrowserApiResult {
  ok: boolean;
  status: number;
  body: unknown;
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function recordArray(value: unknown, label: string): JsonObject[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value.filter(isRecord);
}

function getRecords(value: unknown, key: string): JsonObject[] {
  if (!isRecord(value)) return [];
  return recordArray(value[key], key);
}

function findByPath(value: unknown, path: string): JsonObject | undefined {
  return recordArray(value, 'items').find((item) => item.path === path);
}

function findSearchResult(value: unknown, path: string): JsonObject | undefined {
  return getRecords(value, 'results').find((item) => item.path === path);
}

function getRequestId(value: unknown): string {
  if (!isRecord(value)) {
    throw new Error('request response must be an object');
  }
  return asString(value.requestId, 'requestId');
}

async function waitForPendingRequestId(page: Page, path: string): Promise<string> {
  let matchedRequestId = '';

  await expect.poll(async () => {
    try {
      const requests = await apiRequest(page, 'GET', '/api/access/requests/inbox?status=pending');
      const request = findByPath(requests, path);
      if (!isRecord(request) || request.status !== 'pending') {
        return '';
      }
      matchedRequestId = getRequestId(request);
      return matchedRequestId;
    } catch {
      return '';
    }
  }, {
    message: 'pending access request should appear in owner inbox',
    timeout: 20_000,
  }).not.toBe('');

  return matchedRequestId;
}

function getDocumentId(value: unknown): string {
  const documentId = isRecord(value) ? value.documentId : undefined;
  return asString(documentId, 'documentId');
}

function getCurrentUserId(value: unknown): string {
  const userId = isRecord(value) ? value.userId : undefined;
  return asString(userId, 'userId');
}

function getGrantId(value: unknown): string {
  const grantId = isRecord(value) ? value.grantId : undefined;
  return asString(grantId, 'grantId');
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

function getComment(value: unknown): JsonObject {
  if (!isRecord(value) || !isRecord(value.comment)) {
    throw new Error('comment response must include a comment object');
  }
  return value.comment;
}

function getCommentId(value: unknown): string {
  return asString(getComment(value).id, 'comment.id');
}

function findCommentById(value: unknown, commentId: string): JsonObject | undefined {
  return getRecords(value, 'comments').find((comment) => comment.id === commentId);
}

function assertLockedFilePayload(value: unknown, secret: string) {
  expect(isRecord(value) ? value.lockedPreview : undefined).toEqual(
    expect.objectContaining({ isLocked: true, canRequestRead: true }),
  );
  expect(isRecord(value) ? value.content : undefined).toContain('열람 권한 요청이 필요합니다.');
  expect(isRecord(value) ? value.content : undefined).not.toContain(secret);
}

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  return errors;
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
  const result = {
    ok: response.ok(),
    status: response.status(),
    body: payload,
  } satisfies BrowserApiResult;

  expect(
    result.ok,
    `${method} ${url} failed with ${result.status}: ${JSON.stringify(result.body)}`,
  ).toBeTruthy();
  return result.body;
}

async function apiRequestOptional(
  page: Page,
  method: HttpMethod,
  url: string,
  body?: JsonObject,
): Promise<BrowserApiResult> {
  let resolvedUrl: string;
  try {
    resolvedUrl = resolvePageRequestUrl(page, url);
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: error instanceof Error ? error.message : 'page is not ready',
    };
  }

  try {
    const headers: Record<string, string> = body ? { 'Content-Type': 'application/json' } : {};
    const accessToken = await readAccessToken(page);
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    const response = await page.context().request.fetch(resolvedUrl, {
      method,
      headers,
      ...(body ? { data: body } : {}),
      timeout: 5_000,
    });
    const contentType = response.headers()['content-type'] ?? '';
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => '');
    return {
      ok: response.ok(),
      status: response.status(),
      body: payload,
    } satisfies BrowserApiResult;
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: error instanceof Error ? error.message : 'request failed',
    } satisfies BrowserApiResult;
  }
}

async function waitForDmsShell(page: Page) {
  await expect(page.getByPlaceholder('찾고 싶은 내용을 자유롭게 물어보세요!')).toBeVisible({ timeout: 15_000 });
}

async function login(page: Page, loginId: string, password: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto('/login');
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

function requireStorageState(state: StorageState | undefined, label: string): StorageState {
  if (!state) {
    throw new Error(`${label} auth state is not initialized`);
  }
  return state;
}

async function newAuthenticatedPage(
  browser: Browser,
  storageState: StorageState,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();
  await page.goto('/');
  await waitForDmsShell(page);
  return { context, page };
}

async function createLaunchDocument(page: Page, path: string, title: string, content: string) {
  await apiRequest(page, 'POST', '/api/content', {
    path,
    content,
    metadata: {
      title,
      summary: '런칭 브라우저 스모크용 임시 문서입니다.',
      tags: ['launch-smoke'],
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
      ownerLoginId: 'admin',
      author: 'admin',
      lastModifiedBy: 'admin',
    },
  });
}

async function createPrivateLaunchDocument(page: Page, path: string, title: string, secret: string) {
  await createLaunchDocument(
    page,
    path,
    title,
    [`# ${title}`, '', secret, '', '런칭 브라우저 스모크용 임시 문서입니다.'].join('\n'),
  );
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
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 30_000 });
  await collaborationReady;
}

async function openDocumentTabs(
  page: Page,
  documents: Array<{ path: string; title: string }>,
  activePath: string,
  ownerUserId = '1',
) {
  const collaborationReady = documents.map((document) => page.waitForResponse(
    (response) => isCollaborationPostForPath(response, document.path, 'view'),
    { timeout: 20_000 },
  ));
  await page.evaluate(({ ownerUserId: nextOwnerUserId, documents: nextDocuments, activePath: nextActivePath }) => {
    const now = new Date().toISOString();
    const tabs = [
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
      ...nextDocuments.map((document) => ({
        id: `file-${encodeURIComponent(document.path)}`,
        title: document.title,
        path: `/doc/${encodeURIComponent(document.path)}`,
        icon: 'FileText',
        isEditing: false,
        reloadSeq: 0,
        closable: true,
        openedAt: now,
        lastActiveAt: document.path === nextActivePath ? now : new Date(Date.now() - 1000).toISOString(),
      })),
    ];
    sessionStorage.setItem('dms-tab-store', JSON.stringify({
      state: {
        tabs,
        activeTabId: `file-${encodeURIComponent(nextActivePath)}`,
        ownerUserId: nextOwnerUserId,
      },
      version: 0,
    }));
  }, { ownerUserId, documents, activePath });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForDmsShell(page);
  const activeDocument = documents.find((document) => document.path === activePath);
  if (!activeDocument) {
    throw new Error(`active document is missing from test tabs: ${activePath}`);
  }
  await expect(page.getByRole('heading', { name: activeDocument.title })).toBeVisible({ timeout: 30_000 });
  await Promise.all(collaborationReady);
}

async function expectDocumentEditBlockedBySoftLock(page: Page) {
  await expect(page.getByRole('button', { name: '편집', exact: true })).toHaveCount(0, { timeout: 2_500 });
  await expect(page.getByRole('button', { name: '해제 요청' })).toBeVisible({ timeout: 2_500 });
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

async function appendLineAndSaveDocument(page: Page, path: string, line: string) {
  await enterDocumentEditMode(page, path);
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+End');
  await page.keyboard.insertText(`\n\n${line}`);

  const saveButton = page.getByRole('button', { name: '저장', exact: true });
  const saveResponse = page.waitForResponse((response) => {
    if (response.request().method() !== 'POST') return false;
    try {
      if (new URL(response.url()).pathname !== '/api/file') return false;
      const payload = response.request().postDataJSON() as JsonObject;
      return payload.action === 'write' && payload.path === path;
    } catch {
      return false;
    }
  }, { timeout: 15_000 });
  await expect(saveButton).toBeEnabled({ timeout: 10_000 });
  await saveButton.click();
  expect((await saveResponse).ok(), `save response should succeed for ${path}`).toBeTruthy();
}

async function waitForUnreadableSearchResult(page: Page, query: string, path: string) {
  await expect.poll(async () => {
    try {
      const body = await apiRequest(page, 'POST', '/api/search', {
        query,
        contextMode: 'deep',
        activeDocPath: path,
      });
      const result = findSearchResult(body, path);
      return result?.isReadable === false
        && result.totalSnippetCount === 0
        && Array.isArray(result.snippets)
        && result.snippets.length === 0;
    } catch {
      return false;
    }
  }, {
    message: 'unreadable search result should be indexed and redacted',
    timeout: 45_000,
  }).toBe(true);
}

test.describe('DMS launch browser smoke', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120_000);
  let adminStorageState: StorageState | undefined;
  let viewerStorageState: StorageState | undefined;
  let editorStorageState: StorageState | undefined;

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(240_000);
    adminStorageState = await authenticate(browser, LAUNCH_USERS.admin);
    viewerStorageState = await authenticate(browser, LAUNCH_USERS.viewer);
    editorStorageState = await authenticate(browser, LAUNCH_USERS.editor);
  });

  test('covers locked search, access approval, hard refresh, and comments', async ({ browser }) => {
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const documentPath = `launch-smoke/browser-${suffix}.md`;
    const title = `런칭 브라우저 검증 ${suffix}`;
    const secret = `launch-secret-${suffix}`;
    const commentText = `런칭 댓글 검증 ${suffix}`;
    const { context: adminContext, page: adminPage } = await newAuthenticatedPage(
      browser,
      requireStorageState(adminStorageState, 'admin'),
    );
    const { context: viewerContext, page: viewerPage } = await newAuthenticatedPage(
      browser,
      requireStorageState(viewerStorageState, 'viewer'),
    );
    const viewerErrors = collectPageErrors(viewerPage);

    try {
      await createPrivateLaunchDocument(adminPage, documentPath, title, secret);

      await waitForUnreadableSearchResult(viewerPage, title, documentPath);

      await viewerPage.getByPlaceholder('찾고 싶은 내용을 자유롭게 물어보세요!').fill(title);
      await viewerPage.getByPlaceholder('찾고 싶은 내용을 자유롭게 물어보세요!').press('Enter');
      await expect(viewerPage.getByText(title).first()).toBeVisible({ timeout: 30_000 });
      await expect(viewerPage.getByText(/권한 때문에 제외된 문서/)).toBeVisible();
      await viewerPage.getByRole('button', { name: new RegExp(title) }).click();

      await expect(viewerPage.getByText('현 문서는 열람 권한 요청이 필요합니다.')).toBeVisible({ timeout: 30_000 });
      await expect(viewerPage.getByText(secret)).toHaveCount(0);
      await viewerPage.getByRole('button', { name: '권한 요청' }).click();
      await expect(viewerPage.getByRole('dialog', { name: '권한 요청' })).toBeVisible();
      await viewerPage.getByLabel('요청 메모').fill('런칭 직전 브라우저 권한 요청 검증입니다.');
      await viewerPage.getByRole('button', { name: '요청 보내기' }).click();
      await expect(viewerPage.getByText('권한 요청을 보냈습니다.')).toBeVisible();
      const requestId = await waitForPendingRequestId(adminPage, documentPath);

      const approvedRequest = await apiRequest(
        adminPage,
        'POST',
        `/api/access/requests/${encodeURIComponent(requestId)}/approve`,
        {
          grantRole: 'read',
          responseMessage: '런칭 브라우저 스모크 승인입니다.',
        },
      );
      expect(isRecord(approvedRequest) ? approvedRequest.status : undefined).toBe('approved');

      await viewerPage.reload({ waitUntil: 'domcontentloaded' });
      await expect(viewerPage.getByText(secret)).toBeVisible({ timeout: 30_000 });
      await expect(viewerPage.getByText('현 문서는 열람 권한 요청이 필요합니다.')).toHaveCount(0);
      expect(viewerErrors).toEqual([]);

      const createdComment = await apiRequest(viewerPage, 'POST', '/api/comments', {
        path: documentPath,
        content: commentText,
      });
      const commentId = getCommentId(createdComment);
      const comments = await apiRequest(
        viewerPage,
        'GET',
        `/api/comments?path=${encodeURIComponent(documentPath)}`,
      );
      expect(getRecords(comments, 'comments').some((comment) => comment.content === commentText)).toBe(true);

      const deletedComment = await apiRequest(
        viewerPage,
        'DELETE',
        `/api/comments/${encodeURIComponent(commentId)}?path=${encodeURIComponent(documentPath)}`,
      );
      expect(findCommentById(deletedComment, commentId)?.deletedAt).toEqual(expect.any(String));

      const restoredComment = await apiRequest(
        viewerPage,
        'PATCH',
        `/api/comments/${encodeURIComponent(commentId)}/restore`,
        { path: documentPath },
      );
      expect(findCommentById(restoredComment, commentId)?.deletedAt).toBeUndefined();
      expect(findCommentById(restoredComment, commentId)?.content).toBe(commentText);
    } finally {
      await apiRequestOptional(adminPage, 'DELETE', '/api/content', { path: documentPath });
      await adminContext.close();
      await viewerContext.close();
    }
  });

  test('covers access rejection and grant revocation redaction', async ({ browser }) => {
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const documentPath = `launch-smoke/access-${suffix}.md`;
    const title = `런칭 권한 회수 검증 ${suffix}`;
    const secret = `launch-access-secret-${suffix}`;
    const { context: adminContext, page: adminPage } = await newAuthenticatedPage(
      browser,
      requireStorageState(adminStorageState, 'admin'),
    );
    const { context: viewerContext, page: viewerPage } = await newAuthenticatedPage(
      browser,
      requireStorageState(viewerStorageState, 'viewer'),
    );

    try {
      await createPrivateLaunchDocument(adminPage, documentPath, title, secret);

      const request = await apiRequest(viewerPage, 'POST', '/api/access/requests', {
        path: documentPath,
        requestedRole: 'read',
        requestMessage: '런칭 직전 권한 거절 검증입니다.',
      });
      expect(isRecord(request) ? request.status : undefined).toBe('pending');
      const requestId = await waitForPendingRequestId(adminPage, documentPath);

      const rejectedRequest = await apiRequest(
        adminPage,
        'POST',
        `/api/access/requests/${encodeURIComponent(requestId)}/reject`,
        { responseMessage: '런칭 브라우저 스모크 거절입니다.' },
      );
      expect(isRecord(rejectedRequest) ? rejectedRequest.status : undefined).toBe('rejected');
      const rejectedRequests = await apiRequest(
        viewerPage,
        'GET',
        `/api/access/requests/me?status=rejected&path=${encodeURIComponent(documentPath)}`,
      );
      expect(findByPath(rejectedRequests, documentPath)?.status).toBe('rejected');

      const manageableDocuments = await apiRequest(adminPage, 'GET', '/api/access/documents/manageable');
      const managedDocument = findByPath(manageableDocuments, documentPath);
      const documentId = getDocumentId(managedDocument);
      const viewerUserId = getCurrentUserId(await apiRequest(viewerPage, 'POST', '/api/auth/me'));
      const directGrant = await apiRequest(adminPage, 'POST', '/api/access/grants', {
        documentId,
        principalUserId: viewerUserId,
        role: 'read',
      });
      const grantId = getGrantId(directGrant);

      const readableFile = await apiRequest(
        viewerPage,
        'GET',
        `/api/file?path=${encodeURIComponent(documentPath)}`,
      );
      expect(isRecord(readableFile) ? readableFile.content : undefined).toContain(secret);

      const revokedGrant = await apiRequest(
        adminPage,
        'DELETE',
        `/api/access/documents/${encodeURIComponent(documentId)}/grants/${encodeURIComponent(grantId)}`,
      );
      expect(getGrantId(revokedGrant)).toBe(grantId);

      const lockedFile = await apiRequest(
        viewerPage,
        'GET',
        `/api/file?path=${encodeURIComponent(documentPath)}`,
      );
      assertLockedFilePayload(lockedFile, secret);
    } finally {
      await apiRequestOptional(adminPage, 'DELETE', '/api/content', { path: documentPath });
      await adminContext.close();
      await viewerContext.close();
    }
  });

  test('covers internal and external document link routing', async ({ browser }) => {
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const sourcePath = `launch-smoke/link-source-${suffix}.md`;
    const targetPath = `launch-smoke/link-target-${suffix}.md`;
    const sourceTitle = `런칭 링크 검증 ${suffix}`;
    const targetTitle = `런칭 내부 링크 대상 ${suffix}`;
    const targetSecret = `launch-link-target-${suffix}`;
    const targetFileName = targetPath.split('/').pop() ?? targetPath;
    const externalUrl = 'https://example.com/ssoo-launch-smoke';
    const { context: adminContext, page: adminPage } = await newAuthenticatedPage(
      browser,
      requireStorageState(adminStorageState, 'admin'),
    );

    try {
      await createLaunchDocument(
        adminPage,
        targetPath,
        targetTitle,
        [`# ${targetTitle}`, '', targetSecret].join('\n'),
      );
      await createLaunchDocument(
        adminPage,
        sourcePath,
        sourceTitle,
        [
          `# ${sourceTitle}`,
          '',
          `[내부 문서](${targetFileName})`,
          '',
          `[외부 링크](${externalUrl})`,
        ].join('\n'),
      );

      const adminUserId = getCurrentUserId(await apiRequest(adminPage, 'POST', '/api/auth/me'));
      await openDocumentTab(adminPage, sourcePath, sourceTitle, adminUserId);
      await expect(adminPage.getByRole('link', { name: '내부 문서' })).toBeVisible({ timeout: 30_000 });

      await adminPage.evaluate(() => {
        const launchWindow = window as Window & { __dmsLaunchOpenedUrls?: string[] };
        launchWindow.__dmsLaunchOpenedUrls = [];
        window.open = (url?: string | URL) => {
          launchWindow.__dmsLaunchOpenedUrls?.push(String(url ?? ''));
          return null;
        };
      });
      await adminPage.getByRole('link', { name: '외부 링크' }).click();
      await expect.poll(async () => adminPage.evaluate(() => {
        const launchWindow = window as Window & { __dmsLaunchOpenedUrls?: string[] };
        return launchWindow.__dmsLaunchOpenedUrls ?? [];
      }), {
        message: 'external link should be routed through window.open',
        timeout: 5_000,
      }).toContain(externalUrl);

      await adminPage.getByRole('link', { name: '내부 문서' }).click();
      await expect(adminPage.getByText(targetSecret)).toBeVisible({ timeout: 30_000 });
    } finally {
      await apiRequestOptional(adminPage, 'DELETE', '/api/content', { path: sourcePath });
      await apiRequestOptional(adminPage, 'DELETE', '/api/content', { path: targetPath });
      await adminContext.close();
    }
  });

  test('covers soft lock takeover with two signed-in browser sessions', async ({ browser }) => {
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const documentPath = `launch-smoke/lock-${suffix}.md`;
    const title = `런칭 잠금 검증 ${suffix}`;
    const secret = `launch-lock-secret-${suffix}`;
    const { context: adminContext, page: adminPage } = await newAuthenticatedPage(
      browser,
      requireStorageState(adminStorageState, 'admin'),
    );
    const { context: editorContext, page: editorPage } = await newAuthenticatedPage(
      browser,
      requireStorageState(editorStorageState, 'editor'),
    );
    const ownerSessionId = `launch-owner-${suffix}`;
    const rejectedRequesterSessionId = `launch-requester-rejected-${suffix}`;
    const requesterSessionId = `launch-requester-${suffix}`;

    try {
      await createPrivateLaunchDocument(adminPage, documentPath, title, secret);
      const manageableDocuments = await apiRequest(adminPage, 'GET', '/api/access/documents/manageable');
      const managedDocument = findByPath(manageableDocuments, documentPath);
      const documentId = getDocumentId(managedDocument);
      const editorUserId = getCurrentUserId(await apiRequest(editorPage, 'POST', '/api/auth/me'));
      await apiRequest(adminPage, 'POST', '/api/access/grants', {
        documentId,
        principalUserId: editorUserId,
        role: 'write',
      });

      await apiRequest(adminPage, 'POST', '/api/collaboration', {
        path: documentPath,
        mode: 'edit',
        sessionId: ownerSessionId,
      });
      const rejectedTakeover = await apiRequest(editorPage, 'POST', '/api/collaboration/takeover', {
        path: documentPath,
        sessionId: rejectedRequesterSessionId,
      });
      expect(isRecord(rejectedTakeover) ? rejectedTakeover.status : undefined).toBe('requested');
      const rejectedRequest = isRecord(rejectedTakeover) && isRecord(rejectedTakeover.request)
        ? rejectedTakeover.request
        : undefined;
      const rejectedRequestId = asString(rejectedRequest?.requestId, 'rejected takeover requestId');
      const rejectedResponse = await apiRequest(adminPage, 'POST', '/api/collaboration/takeover/respond', {
        requestId: rejectedRequestId,
        approved: false,
      });
      expect(isRecord(rejectedResponse) ? rejectedResponse.status : undefined).toBe('rejected');

      const takeover = await apiRequest(editorPage, 'POST', '/api/collaboration/takeover', {
        path: documentPath,
        sessionId: requesterSessionId,
      });
      expect(isRecord(takeover) ? takeover.status : undefined).toBe('requested');
      const takeoverRequest = isRecord(takeover) && isRecord(takeover.request) ? takeover.request : undefined;
      const takeoverRequestId = asString(takeoverRequest?.requestId, 'takeover requestId');
      const pending = await apiRequest(
        adminPage,
        'GET',
        `/api/collaboration/takeover/pending?path=${encodeURIComponent(documentPath)}`,
      );
      const ownerRequest = isRecord(pending) && isRecord(pending.ownerRequest) ? pending.ownerRequest : undefined;
      expect(ownerRequest?.requestId).toBe(takeoverRequestId);
      const takeoverResponse = await apiRequest(adminPage, 'POST', '/api/collaboration/takeover/respond', {
        requestId: takeoverRequestId,
        approved: true,
      });
      expect(isRecord(takeoverResponse) ? takeoverResponse.status : undefined).toBe('approved');
    } finally {
      await apiRequestOptional(adminPage, 'DELETE', '/api/collaboration', {
        path: documentPath,
        sessionId: `launch-owner-${suffix}`,
      });
      await apiRequestOptional(editorPage, 'DELETE', '/api/collaboration', {
        path: documentPath,
        sessionId: `launch-requester-rejected-${suffix}`,
      });
      await apiRequestOptional(editorPage, 'DELETE', '/api/collaboration', {
        path: documentPath,
        sessionId: `launch-requester-${suffix}`,
      });
      await apiRequestOptional(adminPage, 'DELETE', '/api/content', { path: documentPath });
      await adminContext.close();
      await editorContext.close();
    }
  });

  test('keeps the editing browser stable when a lock release request arrives', async ({ browser }) => {
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const documentPath = `launch-smoke/lock-request-ui-${suffix}.md`;
    const title = `런칭 잠금 요청 UI 검증 ${suffix}`;
    const { context: adminContext, page: adminPage } = await newAuthenticatedPage(
      browser,
      requireStorageState(adminStorageState, 'admin'),
    );
    const { context: editorContext, page: editorPage } = await newAuthenticatedPage(
      browser,
      requireStorageState(editorStorageState, 'editor'),
    );
    const adminErrors = collectPageErrors(adminPage);
    const adminConsoleErrors: string[] = [];
    adminPage.on('console', (message) => {
      if (message.type() === 'error') {
        adminConsoleErrors.push(message.text());
      }
    });

    try {
      const adminUserId = getCurrentUserId(await apiRequest(adminPage, 'POST', '/api/auth/me'));
      const editorUserId = getCurrentUserId(await apiRequest(editorPage, 'POST', '/api/auth/me'));
      await createPrivateLaunchDocument(adminPage, documentPath, title, `launch-lock-request-secret-${suffix}`);
      const manageableDocuments = await apiRequest(adminPage, 'GET', '/api/access/documents/manageable');
      const managedDocument = findByPath(manageableDocuments, documentPath);
      const documentId = getDocumentId(managedDocument);
      await apiRequest(adminPage, 'POST', '/api/access/grants', {
        documentId,
        principalUserId: editorUserId,
        role: 'write',
      });

      await openDocumentTab(adminPage, documentPath, title, adminUserId);
      await openDocumentTab(editorPage, documentPath, title, editorUserId);
      await enterDocumentEditMode(adminPage, documentPath);
      await expectDocumentEditBlockedBySoftLock(editorPage);

      await editorPage.getByRole('button', { name: '해제 요청' }).click();
      await expect(editorPage.getByRole('alertdialog', { name: '편집 잠금 해제 요청' })).toBeVisible({ timeout: 10_000 });
      await editorPage.getByRole('button', { name: '요청' }).click();

      const ownerDialogOrCrash = await Promise.race([
        adminPage.getByRole('alertdialog', { name: '편집 잠금 요청' }).waitFor({ state: 'visible', timeout: 10_000 }).then(() => 'dialog' as const),
        adminPage.getByText('Application error:').waitFor({ state: 'visible', timeout: 10_000 }).then(() => 'app-error' as const),
      ]);
      expect(
        ownerDialogOrCrash,
        [
          'owner page should show the takeover request dialog instead of crashing',
          `pageErrors=${adminErrors.join(' | ') || '(none)'}`,
          `consoleErrors=${adminConsoleErrors.join(' | ') || '(none)'}`,
        ].join('\n'),
      ).toBe('dialog');
      await expect(adminPage.getByText('Application error:')).toHaveCount(0);
      expect(adminErrors).toEqual([]);

      const ownerRequestDialog = adminPage.getByRole('alertdialog', { name: '편집 잠금 요청' });
      await adminPage.getByRole('button', { name: '계속 편집' }).click();
      await expect(ownerRequestDialog).toBeHidden({ timeout: 3_000 });
      await adminPage.waitForTimeout(800);
      await expect(ownerRequestDialog).toBeHidden();
      await expect(editorPage.getByRole('button', { name: '해제 요청' })).toBeVisible({ timeout: 10_000 });
    } finally {
      await apiRequestOptional(adminPage, 'DELETE', '/api/content', { path: documentPath });
      await adminContext.close();
      await editorContext.close();
    }
  });

  test('saves owner draft before approving a lock release request', async ({ browser }) => {
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const documentPath = `launch-smoke/lock-request-approve-${suffix}.md`;
    const title = `런칭 잠금 허용 저장 검증 ${suffix}`;
    const unsavedLine = `잠금 허용 전 저장 검증 ${suffix}`;
    const requesterLine = `잠금 이전 후 요청자 저장 검증 ${suffix}`;
    const { context: adminContext, page: adminPage } = await newAuthenticatedPage(
      browser,
      requireStorageState(adminStorageState, 'admin'),
    );
    const { context: editorContext, page: editorPage } = await newAuthenticatedPage(
      browser,
      requireStorageState(editorStorageState, 'editor'),
    );
    const adminErrors = collectPageErrors(adminPage);

    try {
      const adminUserId = getCurrentUserId(await apiRequest(adminPage, 'POST', '/api/auth/me'));
      const editorUserId = getCurrentUserId(await apiRequest(editorPage, 'POST', '/api/auth/me'));
      await createPrivateLaunchDocument(adminPage, documentPath, title, `launch-lock-approve-secret-${suffix}`);
      const manageableDocuments = await apiRequest(adminPage, 'GET', '/api/access/documents/manageable');
      const managedDocument = findByPath(manageableDocuments, documentPath);
      const documentId = getDocumentId(managedDocument);
      await apiRequest(adminPage, 'POST', '/api/access/grants', {
        documentId,
        principalUserId: editorUserId,
        role: 'write',
      });

      await openDocumentTab(adminPage, documentPath, title, adminUserId);
      await openDocumentTab(editorPage, documentPath, title, editorUserId);
      await enterDocumentEditMode(adminPage, documentPath);
      await adminPage.locator('.cm-content').click();
      await adminPage.keyboard.press('Control+End');
      await adminPage.keyboard.insertText(`\n\n${unsavedLine}`);
      await expect.poll(async () => adminPage.locator('.cm-content').textContent(), {
        message: 'owner draft should contain unsaved text before approval',
        timeout: 5_000,
      }).toContain(unsavedLine);
      await expectDocumentEditBlockedBySoftLock(editorPage);

      await editorPage.getByRole('button', { name: '해제 요청' }).click();
      await expect(editorPage.getByRole('alertdialog', { name: '편집 잠금 해제 요청' })).toBeVisible({ timeout: 10_000 });
      await editorPage.getByRole('button', { name: '요청' }).click();

      await expect(adminPage.getByRole('alertdialog', { name: '변경사항 저장 후 잠금 허용' })).toBeVisible({ timeout: 10_000 });
      await expect(adminPage.getByRole('alertdialog', { name: '편집 잠금 요청' })).toHaveCount(0);
      const takeoverResponse = adminPage.waitForResponse(
        (response) => new URL(response.url()).pathname === '/api/collaboration/takeover/respond',
        { timeout: 20_000 },
      );
      await adminPage.getByRole('button', { name: '저장 후 허용' }).click();
      const takeoverResponseResult = await takeoverResponse;
      expect(takeoverResponseResult.ok(), 'lock takeover approval response should succeed').toBeTruthy();

      await expect(adminPage.getByText('Application error:')).toHaveCount(0);
      expect(adminErrors).toEqual([]);
      await expect(editorPage.getByRole('button', { name: /편집종료|작성취소/ })).toBeVisible({ timeout: 15_000 });
      await expect(adminPage.getByRole('button', { name: '해제 요청' })).toBeVisible({ timeout: 15_000 });
      await expect.poll(async () => editorPage.locator('.cm-content').textContent(), {
        message: 'requester editor should reload owner saved draft before editing',
        timeout: 10_000,
      }).toContain(unsavedLine);

      await editorPage.locator('.cm-content').click();
      await editorPage.keyboard.press('Control+End');
      await editorPage.keyboard.insertText(`\n\n${requesterLine}`);
      const saveButton = editorPage.getByRole('button', { name: '저장', exact: true });
      const requesterSaveResponse = editorPage.waitForResponse((response) => {
        if (response.request().method() !== 'POST') return false;
        try {
          if (new URL(response.url()).pathname !== '/api/file') return false;
          const payload = response.request().postDataJSON() as JsonObject;
          return payload.action === 'write' && payload.path === documentPath;
        } catch {
          return false;
        }
      }, { timeout: 15_000 });
      await expect(saveButton).toBeEnabled({ timeout: 10_000 });
      await saveButton.click();
      expect((await requesterSaveResponse).ok(), 'requester follow-up save should succeed').toBeTruthy();
      await expect.poll(async () => {
        const loaded = await apiRequest(adminPage, 'GET', `/api/content?path=${encodeURIComponent(documentPath)}`);
        return isRecord(loaded) ? String(loaded.content ?? '') : '';
      }, {
        message: 'requester save should preserve owner draft after lock approval',
        timeout: 15_000,
      }).toContain(unsavedLine);
      const finalContent = await apiRequest(adminPage, 'GET', `/api/content?path=${encodeURIComponent(documentPath)}`);
      const finalText = isRecord(finalContent) ? String(finalContent.content ?? '') : '';
      expect(finalText).toContain(requesterLine);
    } finally {
      await apiRequestOptional(adminPage, 'DELETE', '/api/content', { path: documentPath });
      await adminContext.close();
      await editorContext.close();
    }
  });

  test('blocks every other writable browser when any user enters edit mode', async ({ browser }) => {
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const ownerFirstPath = `launch-smoke/lock-owner-first-${suffix}.md`;
    const editorFirstPath = `launch-smoke/lock-editor-first-${suffix}.md`;
    const ownerFirstTitle = `런칭 소유자 잠금 검증 ${suffix}`;
    const editorFirstTitle = `런칭 편집자 잠금 검증 ${suffix}`;
    const { context: adminContext, page: adminPage } = await newAuthenticatedPage(
      browser,
      requireStorageState(adminStorageState, 'admin'),
    );
    const { context: editorContext, page: editorPage } = await newAuthenticatedPage(
      browser,
      requireStorageState(editorStorageState, 'editor'),
    );

    try {
      const adminUserId = getCurrentUserId(await apiRequest(adminPage, 'POST', '/api/auth/me'));
      const editorUserId = getCurrentUserId(await apiRequest(editorPage, 'POST', '/api/auth/me'));
      for (const [documentPath, title] of [
        [ownerFirstPath, ownerFirstTitle],
        [editorFirstPath, editorFirstTitle],
      ] as const) {
        await createPrivateLaunchDocument(adminPage, documentPath, title, `launch-lock-block-secret-${suffix}`);
        const manageableDocuments = await apiRequest(adminPage, 'GET', '/api/access/documents/manageable');
        const managedDocument = findByPath(manageableDocuments, documentPath);
        const documentId = getDocumentId(managedDocument);
        await apiRequest(adminPage, 'POST', '/api/access/grants', {
          documentId,
          principalUserId: editorUserId,
          role: 'write',
        });
      }

      await openDocumentTab(adminPage, ownerFirstPath, ownerFirstTitle, adminUserId);
      await openDocumentTab(editorPage, ownerFirstPath, ownerFirstTitle, editorUserId);
      await enterDocumentEditMode(adminPage, ownerFirstPath);
      await expectDocumentEditBlockedBySoftLock(editorPage);

      await openDocumentTab(adminPage, editorFirstPath, editorFirstTitle, adminUserId);
      await openDocumentTab(editorPage, editorFirstPath, editorFirstTitle, editorUserId);
      await enterDocumentEditMode(editorPage, editorFirstPath);
      await expectDocumentEditBlockedBySoftLock(adminPage);
    } finally {
      await apiRequestOptional(adminPage, 'DELETE', '/api/content', { path: ownerFirstPath });
      await apiRequestOptional(adminPage, 'DELETE', '/api/content', { path: editorFirstPath });
      await adminContext.close();
      await editorContext.close();
    }
  });

  test('lets a writable non-owner save document content without metadata flush failure', async ({ browser }) => {
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const documentPath = `launch-smoke/editor-content-save-${suffix}.md`;
    const title = `런칭 편집자 본문 저장 검증 ${suffix}`;
    const editorLine = `편집 권한자 본문 저장 검증 ${suffix} https://example.com/${suffix}`;
    const { context: adminContext, page: adminPage } = await newAuthenticatedPage(
      browser,
      requireStorageState(adminStorageState, 'admin'),
    );
    const { context: editorContext, page: editorPage } = await newAuthenticatedPage(
      browser,
      requireStorageState(editorStorageState, 'editor'),
    );
    const editorErrors = collectPageErrors(editorPage);

    try {
      const editorUserId = getCurrentUserId(await apiRequest(editorPage, 'POST', '/api/auth/me'));
      await createPrivateLaunchDocument(adminPage, documentPath, title, `launch-editor-content-secret-${suffix}`);
      const manageableDocuments = await apiRequest(adminPage, 'GET', '/api/access/documents/manageable');
      const managedDocument = findByPath(manageableDocuments, documentPath);
      const documentId = getDocumentId(managedDocument);
      await apiRequest(adminPage, 'POST', '/api/access/grants', {
        documentId,
        principalUserId: editorUserId,
        role: 'write',
      });

      await openDocumentTab(editorPage, documentPath, title, editorUserId);
      await enterDocumentEditMode(editorPage, documentPath);
      await editorPage.locator('.cm-content').click();
      await editorPage.keyboard.press('Control+End');
      await editorPage.keyboard.insertText(`\n\n${editorLine}`);

      const saveButton = editorPage.getByRole('button', { name: '저장', exact: true });
      const saveResponse = editorPage.waitForResponse((response) => {
        if (response.request().method() !== 'POST') return false;
        try {
          if (new URL(response.url()).pathname !== '/api/file') return false;
          const payload = response.request().postDataJSON() as JsonObject;
          return payload.action === 'write' && payload.path === documentPath;
        } catch {
          return false;
        }
      }, { timeout: 15_000 });
      await expect(saveButton).toBeEnabled({ timeout: 10_000 });
      await saveButton.click();
      expect((await saveResponse).ok(), 'editor content save should succeed').toBeTruthy();
      await expect(editorPage.getByText('메타데이터 플러시 실패')).toHaveCount(0);
      await expect(editorPage.getByText('문서 소유자만 수행할 수 있는 작업입니다')).toHaveCount(0);
      expect(editorErrors).toEqual([]);
      await expect.poll(async () => {
        const loaded = await apiRequest(adminPage, 'GET', `/api/content?path=${encodeURIComponent(documentPath)}`);
        return isRecord(loaded) ? String(loaded.content ?? '') : '';
      }, {
        message: 'writable non-owner content save should be persisted',
        timeout: 15_000,
      }).toContain(editorLine);
    } finally {
      await apiRequestOptional(adminPage, 'DELETE', '/api/content', { path: documentPath });
      await adminContext.close();
      await editorContext.close();
    }
  });

  test('refreshes only the active document surface after another user saves', async ({ browser }) => {
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const activePath = `launch-smoke/active-refresh-${suffix}.md`;
    const inactivePath = `launch-smoke/inactive-refresh-${suffix}.md`;
    const activeTitle = `런칭 활성 문서 갱신 검증 ${suffix}`;
    const inactiveTitle = `런칭 비활성 문서 갱신 검증 ${suffix}`;
    const activeLine = `활성 문서 자동 갱신 검증 ${suffix}`;
    const inactiveLine = `비활성 문서 토스트 억제 검증 ${suffix}`;
    const { context: adminContext, page: adminPage } = await newAuthenticatedPage(
      browser,
      requireStorageState(adminStorageState, 'admin'),
    );
    const { context: editorContext, page: editorPage } = await newAuthenticatedPage(
      browser,
      requireStorageState(editorStorageState, 'editor'),
    );
    const adminErrors = collectPageErrors(adminPage);

    try {
      const adminUserId = getCurrentUserId(await apiRequest(adminPage, 'POST', '/api/auth/me'));
      const editorUserId = getCurrentUserId(await apiRequest(editorPage, 'POST', '/api/auth/me'));
      for (const [documentPath, title] of [
        [activePath, activeTitle],
        [inactivePath, inactiveTitle],
      ] as const) {
        await createPrivateLaunchDocument(adminPage, documentPath, title, `launch-active-refresh-secret-${suffix}`);
        const manageableDocuments = await apiRequest(adminPage, 'GET', '/api/access/documents/manageable');
        const managedDocument = findByPath(manageableDocuments, documentPath);
        const documentId = getDocumentId(managedDocument);
        await apiRequest(adminPage, 'POST', '/api/access/grants', {
          documentId,
          principalUserId: editorUserId,
          role: 'write',
        });
      }

      await openDocumentTabs(
        adminPage,
        [
          { path: activePath, title: activeTitle },
          { path: inactivePath, title: inactiveTitle },
        ],
        activePath,
        adminUserId,
      );

      await openDocumentTab(editorPage, inactivePath, inactiveTitle, editorUserId);
      await appendLineAndSaveDocument(editorPage, inactivePath, inactiveLine);
      await adminPage.waitForTimeout(1000);
      await expect(adminPage.getByText('이 문서를 수정했습니다.')).toHaveCount(0);

      await openDocumentTab(editorPage, activePath, activeTitle, editorUserId);
      await appendLineAndSaveDocument(editorPage, activePath, activeLine);
      await expect(adminPage.getByText('이 문서를 수정했습니다.')).toBeVisible({ timeout: 7_000 });
      await expect(adminPage.getByText(activeLine)).toBeVisible({ timeout: 10_000 });
      expect(adminErrors).toEqual([]);
    } finally {
      await apiRequestOptional(adminPage, 'DELETE', '/api/content', { path: activePath });
      await apiRequestOptional(adminPage, 'DELETE', '/api/content', { path: inactivePath });
      await adminContext.close();
      await editorContext.close();
    }
  });
});
