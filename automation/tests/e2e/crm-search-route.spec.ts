import { expect, test } from '@playwright/test';
import { monitorBrowserFailures, restoreLaunchSession } from './support/launch-browser';

const appUrl = 'http://127.0.0.1:3105';
const searchPath = '/ssoo/search';
const firstQuery = 'ERP';
const secondQuery = '스마트팩토리';
const queryPath = (query: string, sourceApp = 'crm') => `${searchPath}?q=${encodeURIComponent(query)}&sourceApp=${sourceApp}`;

test.skip(!process.env.CRM_FORM_ISOLATED_DATABASE?.startsWith('ssoo_crm_ralph_'),
  'requires the isolated CRM launch verification runtime');

for (const width of [1440, 390]) {
  test(`CRM search direct routes preserve queries, filters and tabs at ${width}px`, async ({ page }) => {
    test.setTimeout(150_000);
    const monitor = monitorBrowserFailures(page, { label: 'CRM search route', relevantOrigins: [appUrl, 'http://127.0.0.1:4105'] });
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto(`${appUrl}/login`);
    await page.getByRole('textbox', { name: '아이디', exact: true }).fill('admin');
    await page.getByRole('textbox', { name: '비밀번호', exact: true }).fill('admin123!');
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await expect(page.getByRole('button', { name: '사용자 메뉴', exact: true })).toBeVisible();
    await restoreLaunchSession(page, true);
    const pane = page.locator('[data-ssoo-mdi-pane="true"][aria-hidden="false"]');
    const searchTabs = () => page.evaluate(() => {
      const state = JSON.parse(sessionStorage.getItem('crm-mdi-tabs') ?? '{}').state as { tabs: { id: string; path: string }[] };
      return state.tabs.filter((tab) => tab.path.startsWith('/ssoo/search'));
    });
    const requestFor = (query: string, sourceApp: string | null = 'crm') => page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/api/search' && url.searchParams.get('q') === query
        && url.searchParams.get('sourceApp') === sourceApp;
    });
    const assertResults = async (response: Awaited<ReturnType<typeof requestFor>>, query: string) => {
      expect(response.status()).toBe(200);
      const body = await response.json() as { success: boolean; data: { results: { title: string; sourceApp: string }[] } };
      expect(body.success).toBe(true);
      expect(body.data.results.some((result) => result.title.includes(query) && result.sourceApp === 'crm')).toBe(true);
      await expect(pane.getByRole('navigation', { name: '검색 경로' })).toBeVisible();
      await expect(pane.getByRole('heading', { name: new RegExp(query) }).first()).toBeVisible();
      await expect(pane.getByRole('button', { name: /^CRM/ }).first()).toHaveAttribute('aria-pressed', 'true');
    };
    try {
      let response = requestFor(firstQuery);
      await page.goto(appUrl + queryPath(firstQuery));
      await assertResults(await response, firstQuery);
      await expect(page.getByRole('tab', { name: '통합 검색: ERP', exact: true })).toHaveAttribute('aria-selected', 'true');
      expect(await searchTabs()).toHaveLength(1);
      response = requestFor(firstQuery);
      await page.reload();
      await assertResults(await response, firstQuery);
      expect(await searchTabs()).toHaveLength(1);

      response = requestFor(secondQuery);
      await page.evaluate((path) => history.pushState(null, '', path), queryPath(secondQuery));
      await assertResults(await response, secondQuery);
      expect(await searchTabs()).toHaveLength(2);
      await page.getByRole('tab', { name: '통합 검색: ERP', exact: true }).click();
      await expect(page).toHaveURL(appUrl + queryPath(firstQuery));
      await expect(pane.getByRole('heading', { name: /ERP/ }).first()).toBeVisible();
      await page.goBack();
      await expect(page.getByRole('tab', { name: '통합 검색: 스마트팩토리', exact: true })).toHaveAttribute('aria-selected', 'true');
      await page.goForward();
      await expect(page.getByRole('tab', { name: '통합 검색: ERP', exact: true })).toHaveAttribute('aria-selected', 'true');

      // Changing a source in the URL reuses that query's existing tab and reissues the existing search.
      response = requestFor(firstQuery, 'pms');
      await page.evaluate((path) => history.pushState(null, '', path), queryPath(firstQuery, 'pms'));
      const filtered = await response;
      expect(filtered.status()).toBe(200);
      const filteredBody = await filtered.json();
      expect(filteredBody.data.sourceApp).toBe('pms');
      expect(filteredBody.data.results).toHaveLength(0);
      await expect(page).toHaveURL(appUrl + queryPath(firstQuery, 'pms'));
      await expect(pane.getByText('검색 결과가 없습니다.', { exact: true })).toBeVisible();
      // The existing view lists only facets returned by the server; a zero-result source has no chip.
      await expect(pane.getByRole('button', { name: /^전체/ })).toHaveAttribute('aria-pressed', 'false');
      expect(await searchTabs()).toHaveLength(2);
      response = requestFor(firstQuery);
      await page.evaluate((path) => history.pushState(null, '', path), queryPath(firstQuery));
      await assertResults(await response, firstQuery);

      await page.evaluate((path) => history.pushState(null, '', path), searchPath);
      await expect(pane.getByText('검색어를 입력하면 결과가 표시됩니다.', { exact: true })).toBeVisible();
      await expect(page.getByRole('tab', { name: '통합 검색', exact: true })).toHaveAttribute('aria-selected', 'true');
      const absentQuery = '검색회귀존재하지않음20260914';
      response = requestFor(absentQuery);
      await page.evaluate((path) => history.pushState(null, '', path), queryPath(absentQuery));
      const emptyResponse = await response;
      expect(emptyResponse.status()).toBe(200);
      expect((await emptyResponse.json()).data.results).toHaveLength(0);
      await expect(pane.getByText('검색 결과가 없습니다.', { exact: true })).toBeVisible();

      // Desktop header and direct links use the same query tab, without allocating a duplicate.
      await page.setViewportSize({ width: 1440, height: 1000 });
      const headerSearch = page.getByRole('searchbox', { name: '통합 검색', exact: true });
      await headerSearch.fill(firstQuery);
      await headerSearch.press('Enter');
      await expect(page.getByRole('tab', { name: '통합 검색: ERP', exact: true })).toHaveAttribute('aria-selected', 'true');
      expect(await searchTabs()).toHaveLength(4);
      await expect(pane.getByRole('heading', { name: /ERP/ }).first()).toBeVisible();
      monitor.assertClean();
    } finally {
      await page.goto(`${appUrl}/ssot-icon.svg`);
      await page.evaluate(() => sessionStorage.removeItem('crm-mdi-tabs'));
      await page.close();
    }
  });
}
