import {
  expect,
  type Browser,
  type BrowserContext,
  type Page,
  type Response,
  test,
} from '@playwright/test';

export type MutableStorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

export interface BrowserFailurePolicy {
  label: string;
  relevantOrigins: string[];
  allowHttpFailure?: (input: {
    method: string;
    path: string;
    status: number;
  }) => boolean;
}

export interface BrowserFailureMonitor {
  failures: string[];
  assertClean: () => void;
}

export interface InteractiveLoginOptions {
  appUrl: string;
  loginId: string;
  password: string;
  waitUntilReady: (page: Page) => Promise<void>;
  loginPath?: string;
  retryAfterRateLimit?: boolean;
}

export interface RotatingPageOptions {
  appUrl: string;
  storageState: MutableStorageState;
  waitUntilReady: (page: Page) => Promise<void>;
  onPageCreated?: (page: Page) => void;
  failurePolicy?: BrowserFailurePolicy;
  retryAfterRateLimit?: boolean;
}

const accessTokens = new WeakMap<Page, string>();
const rotatingStorageStates = new WeakMap<BrowserContext, MutableStorageState>();

function safeUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isRelevantUrl(url: string, origins: Set<string>): boolean {
  const parsed = safeUrl(url);
  return parsed !== null && origins.has(parsed.origin);
}

function defaultAllowedHttpFailure(method: string, path: string, status: number): boolean {
  if (method !== 'POST') return false;
  if (status === 401 && path === '/api/auth/session') return true;
  return status === 429 && (path === '/api/auth/login' || path === '/api/auth/session');
}

export function monitorBrowserFailures(
  page: Page,
  policy: BrowserFailurePolicy,
): BrowserFailureMonitor {
  const failures: string[] = [];
  const origins = new Set(policy.relevantOrigins.map((value) => new URL(value).origin));
  const allowedResourceConsoleErrors = new Map<number, number>();

  const resourceConsoleStatus = (failure: string): number | null => {
    const match = failure.match(
      /^console\.error: Failed to load resource: the server responded with a status of (\d{3})/u,
    );
    return match ? Number(match[1]) : null;
  };

  const consumeAllowedResourceConsoleError = (status: number): boolean => {
    const remaining = allowedResourceConsoleErrors.get(status) ?? 0;
    if (remaining <= 0) return false;
    allowedResourceConsoleErrors.set(status, remaining - 1);
    return true;
  };

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      const failure = `console.${message.type()}: ${message.text()}`;
      const status = resourceConsoleStatus(failure);
      if (status !== null && consumeAllowedResourceConsoleError(status)) return;
      failures.push(failure);
    }
  });
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    if (!isRelevantUrl(request.url(), origins)) return;
    const errorText = request.failure()?.errorText ?? 'unknown request failure';
    if (errorText.includes('ERR_ABORTED')) return;
    const parsed = new URL(request.url());
    failures.push(`requestfailed ${request.method()} ${parsed.pathname}: ${errorText}`);
  });
  page.on('response', (response) => {
    if (!isRelevantUrl(response.url(), origins)) return;
    const status = response.status();
    if (status < 500 && status !== 401 && status !== 403 && status !== 429) return;
    const parsed = new URL(response.url());
    const input = {
      method: response.request().method(),
      path: parsed.pathname,
      status,
    };
    if (policy.allowHttpFailure?.(input) || defaultAllowedHttpFailure(input.method, input.path, input.status)) {
      const existingConsoleIndex = failures.findIndex((failure) => resourceConsoleStatus(failure) === status);
      if (existingConsoleIndex >= 0) {
        failures.splice(existingConsoleIndex, 1);
      } else {
        allowedResourceConsoleErrors.set(status, (allowedResourceConsoleErrors.get(status) ?? 0) + 1);
      }
      return;
    }
    failures.push(`HTTP ${status}: ${input.method} ${parsed.pathname}`);
  });

  return {
    failures,
    assertClean: () => {
      const remainingAllowedResourceErrors = new Map(allowedResourceConsoleErrors);
      const unexpected = failures.filter((failure) => {
        const status = resourceConsoleStatus(failure);
        if (status !== null) {
          const remaining = remainingAllowedResourceErrors.get(status) ?? 0;
          if (remaining > 0) {
            remainingAllowedResourceErrors.set(status, remaining - 1);
            return false;
          }
        }
        return true;
      });
      expect(unexpected, `${policy.label}\n${unexpected.join('\n')}`).toEqual([]);
    },
  };
}

export function getLaunchAccessToken(page: Page): string | undefined {
  return accessTokens.get(page);
}

export function setLaunchAccessToken(page: Page, token: string): void {
  if (!token.trim()) throw new Error('launch access token must be a non-empty string');
  accessTokens.set(page, token);
}

export async function captureRestoredAccessToken(page: Page, response: Response): Promise<void> {
  expect(response.ok(), 'application session restore should succeed').toBeTruthy();
  const session = await response.json().catch(() => null) as Record<string, unknown> | null;
  const token = session?.accessToken;
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('restored API access token must be a non-empty string');
  }
  setLaunchAccessToken(page, token);
}

export async function restoreLaunchSession(page: Page, retryAfterRateLimit = false): Promise<string> {
  const attempts = retryAfterRateLimit ? 2 : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const session = await page.evaluate(async () => {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-SSOO-CSRF': '1' },
        body: '{}',
      });
      const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
      return { ok: response.ok, status: response.status, payload };
    });
    if (session.status === 429 && attempt + 1 < attempts) {
      await page.waitForTimeout(61_000);
      continue;
    }
    expect(session.ok, `session restore failed (${session.status})`).toBeTruthy();
    const token = session.payload?.accessToken;
    if (typeof token !== 'string' || !token.trim()) {
      throw new Error('restored API access token must be a non-empty string');
    }
    setLaunchAccessToken(page, token);
    return token;
  }
  throw new Error('session restore attempts exhausted');
}

export async function interactiveLogin(page: Page, options: InteractiveLoginOptions): Promise<void> {
  const loginUrl = new URL(options.loginPath ?? '/login', options.appUrl).toString();
  const attempts = options.retryAfterRateLimit ? 2 : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await page.goto(loginUrl);
    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
    await page.getByLabel('아이디', { exact: true }).fill(options.loginId);
    await page.getByLabel('비밀번호', { exact: true }).fill(options.password);
    await page.getByRole('button', { name: '로그인' }).click();
    try {
      await options.waitUntilReady(page);
      return;
    } catch (error) {
      const rateLimited = await page.getByText(/Too Many Requests|ThrottlerException/).isVisible().catch(() => false);
      if (rateLimited && attempt + 1 < attempts) {
        await page.waitForTimeout(61_000);
        continue;
      }
      throw error;
    }
  }
}

export async function loginAndRestoreSession(
  page: Page,
  options: InteractiveLoginOptions,
): Promise<void> {
  await interactiveLogin(page, options);
  await restoreLaunchSession(page, options.retryAfterRateLimit);
}

export async function authenticateStorageState(
  browser: Browser,
  options: InteractiveLoginOptions,
): Promise<MutableStorageState> {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await interactiveLogin(page, options);
    return await context.storageState();
  } finally {
    await context.close();
  }
}

export function requireMutableStorageState(
  state: MutableStorageState | undefined,
  label: string,
): MutableStorageState {
  if (!state) throw new Error(`${label} auth state is not initialized`);
  return state;
}

export async function closeRotatingAuthenticatedContext(context: BrowserContext): Promise<void> {
  const storageState = rotatingStorageStates.get(context);
  const browser = context.browser();
  const hasOpenPages = context.pages().length > 0;
  if (storageState && browser?.isConnected() && hasOpenPages) {
    Object.assign(storageState, await context.storageState());
  }
  rotatingStorageStates.delete(context);
  if (browser?.isConnected() && hasOpenPages) {
    await context.close();
  }
}

export async function reloadRotatingAuthenticatedPage(page: Page): Promise<void> {
  const targetUrl = page.url();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const sessionRestored = page.waitForResponse((response) => {
      const parsed = safeUrl(response.url());
      return response.request().method() === 'POST' && parsed?.pathname === '/api/auth/session';
    }, { timeout: 20_000 });
    if (attempt === 0) {
      await page.reload({ waitUntil: 'domcontentloaded' });
    } else {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    }
    const response = await sessionRestored;
    if (response.status() === 429 && attempt === 0) {
      await page.waitForTimeout(61_000);
      continue;
    }
    await captureRestoredAccessToken(page, response);
    return;
  }
  throw new Error('hard reload session restore attempts exhausted');
}

export async function openRotatingAuthenticatedPage(
  browser: Browser,
  options: RotatingPageOptions,
): Promise<{
  context: BrowserContext;
  page: Page;
  monitor?: BrowserFailureMonitor;
}> {
  const context = await browser.newContext({ storageState: options.storageState });
  rotatingStorageStates.set(context, options.storageState);
  const page = await context.newPage();
  options.onPageCreated?.(page);
  const monitor = options.failurePolicy ? monitorBrowserFailures(page, options.failurePolicy) : undefined;
  const attempts = options.retryAfterRateLimit === false ? 1 : 2;
  let sessionCaptured = false;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const sessionRestored = page.waitForResponse((response) => {
      const parsed = safeUrl(response.url());
      return response.request().method() === 'POST' && parsed?.pathname === '/api/auth/session';
    }, { timeout: 20_000 });
    await page.goto(new URL('/', options.appUrl).toString());
    const response = await sessionRestored;
    if (response.status() === 429 && attempt + 1 < attempts) {
      await page.waitForTimeout(61_000);
      continue;
    }
    await captureRestoredAccessToken(page, response);
    sessionCaptured = true;
    break;
  }
  if (!sessionCaptured) throw new Error('application session restore attempts exhausted');
  await options.waitUntilReady(page);

  // Refresh-cookie rotation is a product security invariant. Carry the rotated HttpOnly
  // cookie into the next serial context instead of replaying the original cookie.
  Object.assign(options.storageState, await context.storageState());
  return { context, page, monitor };
}

export async function runLaunchPhase<T>(label: string, action: () => Promise<T>): Promise<T> {
  test.info().annotations.push({ type: 'launch-phase', description: label });
  try {
    return await action();
  } catch (error) {
    throw new Error(`[launch-phase:${label}] ${error instanceof Error ? error.message : String(error)}`, {
      cause: error,
    });
  }
}
