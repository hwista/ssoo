import { expect, test } from '@playwright/test';
import { monitorBrowserFailures, restoreLaunchSession } from './support/launch-browser';

test.skip(!process.env.CRM_FORM_ISOLATED_DATABASE?.startsWith('ssoo_crm_ralph_'),
  'requires the isolated launch verification runtime');

const searchPath = (query: string, source = 'crm') => `/ssoo/search?q=${encodeURIComponent(query)}&sourceApp=${source}`;

for (const [app, port] of [['pms', 3111], ['dms', 3113]] as const) {
  for (const width of [1920, 390]) {
    test(`${app} direct search restores login, query, filter and history at ${width}px`, async ({ page }) => {
      test.setTimeout(150_000);
      const origin = `http://127.0.0.1:${port}`;
      const monitor = monitorBrowserFailures(page, { label: `${app} search entry`, relevantOrigins: [origin, 'http://127.0.0.1:4105'] });
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
      await page.goto(origin + searchPath('ERP'));
      await expect(page.getByRole('textbox', { name: '아이디', exact: true })).toBeVisible();
      expect(new URL(page.url()).searchParams.get('returnTo')).toBe(searchPath('ERP'));
      await page.getByRole('textbox', { name: '아이디', exact: true }).fill('admin');
      await page.getByRole('textbox', { name: '비밀번호', exact: true }).fill('admin123!');
      await page.getByRole('button', { name: '로그인', exact: true }).click();
      const pane = page.locator('[data-ssoo-mdi-pane="true"][aria-hidden="false"]');
      const result = async (query: string) => {
        await expect(pane.getByRole('navigation', { name: '검색 경로' })).toBeVisible();
        await expect(pane.getByRole('heading', { name: new RegExp(query) }).first()).toBeVisible();
        await expect(pane.getByRole('button', { name: /^CRM/ }).first()).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByRole('tab', { name: `통합 검색: ${query}`, exact: true })).toHaveAttribute('aria-selected', 'true');
      };
      const navigate = async (path: string) => {
        await page.evaluate((next) => history.pushState(null, '', next), path);
        await expect(page).toHaveURL(origin + path);
      };
      const tabs = () => page.evaluate((key) => {
        const state = JSON.parse(sessionStorage.getItem(key) ?? '{}').state as { tabs: { path?: string }[] };
        return state.tabs.filter((tab) => tab.path?.startsWith('/ssoo/search')).length;
      }, app === 'pms' ? 'ssoo-tabs' : 'dms-tab-store');
      try {
        await expect(page).toHaveURL(origin + searchPath('ERP'));
        await result('ERP');
        await restoreLaunchSession(page, true);
        await page.reload();
        await result('ERP');
        expect(await tabs()).toBe(1);

        await navigate(searchPath('스마트팩토리'));
        await result('스마트팩토리');
        await page.goBack();
        await expect(page).toHaveURL(origin + searchPath('ERP'));
        await result('ERP');
        await page.goForward();
        await result('스마트팩토리');
        await navigate(searchPath('ERP'));
        await result('ERP');
        const countBeforeReuse = await tabs();
        await page.goto(origin + searchPath('ERP', 'pms'));
        await expect(pane.getByText('검색 결과가 없습니다.', { exact: true })).toBeVisible();
        await expect(pane.getByRole('button', { name: /^전체/ })).toHaveAttribute('aria-pressed', 'false');
        expect(await tabs()).toBe(countBeforeReuse);
        await navigate(searchPath('ERP'));
        await result('ERP');

        // A manual facet change is preserved by the next native reload as well.
        await pane.getByRole('button', { name: /^전체/ }).click();
        await expect.poll(() => new URL(page.url()).searchParams.has('sourceApp')).toBe(false);
        await expect(pane.getByRole('button', { name: /^전체/ })).toHaveAttribute('aria-pressed', 'true');
        await page.reload();
        await expect(pane.getByRole('button', { name: /^전체/ })).toHaveAttribute('aria-pressed', 'true');
        await expect(pane.getByRole('heading', { name: /ERP/ }).first()).toBeVisible();

        await navigate('/ssoo/search');
        await expect(pane.getByText('검색어를 입력하면 결과가 표시됩니다.', { exact: true })).toBeVisible();
        await navigate(searchPath('검색회귀존재하지않음20260914'));
        await expect(pane.getByText('검색 결과가 없습니다.', { exact: true })).toBeVisible();
        await page.setViewportSize({ width: 1920, height: 1080 });
        const header = page.getByRole('searchbox', { name: '통합 검색', exact: true });
        await header.fill('ERP');
        await header.press('Enter');
        await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('ERP');
        await page.reload();
        await expect(pane.getByRole('heading', { name: /ERP/ }).first()).toBeVisible();
        await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
        if (width === 390) await expect(pane.locator('[data-ssoo-content-page-slot="sidecar"]')).toHaveCount(0);
        monitor.assertClean();
      } finally {
        await page.close();
      }
    });
  }
}

test('PMS root reload preserves the same owner and clears foreign or unowned saved tabs', async ({ page }) => {
  test.setTimeout(120_000);
  const origin = 'http://127.0.0.1:3111';
  const monitor = monitorBrowserFailures(page, { label: 'PMS saved search scope', relevantOrigins: [origin, 'http://127.0.0.1:4105'] });
  await page.goto(origin + '/login');
  await page.getByRole('textbox', { name: '아이디', exact: true }).fill('admin');
  await page.getByRole('textbox', { name: '비밀번호', exact: true }).fill('admin123!');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  const header = page.getByRole('searchbox', { name: '통합 검색', exact: true });
  await expect(header).toBeVisible();
  await restoreLaunchSession(page, true);
  const pane = page.locator('[data-ssoo-mdi-pane="true"][aria-hidden="false"]');
  try {
    await header.fill('ERP');
    await header.press('Enter');
    await expect(pane.getByRole('heading', { name: /ERP/ }).first()).toBeVisible();
    await pane.getByRole('button', { name: /^CRM/ }).first().click();
    await expect(page).toHaveURL(origin + '/');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.getByRole('tab', { name: '통합 검색: ERP', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(pane.getByRole('heading', { name: /ERP/ }).first()).toBeVisible();
    await expect(pane.getByRole('button', { name: /^CRM/ }).first()).toHaveAttribute('aria-pressed', 'true');

    for (const owner of ['different-user', null]) {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await header.fill('ERP');
      await header.press('Enter');
      await expect(pane.getByRole('heading', { name: /ERP/ }).first()).toBeVisible();
      await page.evaluate((ownerUserId) => {
        const saved = JSON.parse(sessionStorage.getItem('ssoo-tabs') ?? '{}');
        saved.state.ownerUserId = ownerUserId;
        sessionStorage.setItem('ssoo-tabs', JSON.stringify(saved));
      }, owner);
      await page.reload();
      await expect(header).toBeVisible();
      await expect(page.getByRole('tab', { name: '통합 검색: ERP', exact: true })).toHaveCount(0);
    }

    await header.fill('ERP');
    await header.press('Enter');
    await expect(pane.getByRole('heading', { name: /ERP/ }).first()).toBeVisible();
    await page.getByRole('button', { name: '사용자 메뉴', exact: true }).click();
    await page.getByRole('menuitem', { name: '로그아웃', exact: true }).click();
    await expect(page.getByRole('textbox', { name: '아이디', exact: true })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('ssoo-tabs') ?? '{}').state.tabs.filter((tab: { closable: boolean }) => tab.closable).length)).toBe(0);
    monitor.assertClean();
  } finally {
    await page.close();
  }
});
