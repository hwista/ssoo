import { expect, test } from '@playwright/test';
import { monitorBrowserFailures, restoreLaunchSession } from './support/launch-browser';

test.skip(!process.env.CRM_FORM_ISOLATED_DATABASE?.startsWith('ssoo_crm_ralph_'),
  'requires the isolated launch verification runtime');

for (const [app, port] of [['admin', 3110], ['pms', 3111], ['sns', 3100], ['dms', 3113]] as const) {
  test(`${app} search keeps results accessible and preserves panel controls`, async ({ page }) => {
    test.setTimeout(150_000);
    const origin = `http://127.0.0.1:${port}`;
    const monitor = monitorBrowserFailures(page, { label: `${app} search panel`, relevantOrigins: [origin, 'http://127.0.0.1:4105'] });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(origin + '/login');
    await page.getByRole('textbox', { name: '아이디', exact: true }).fill('admin');
    await page.getByRole('textbox', { name: '비밀번호', exact: true }).fill('admin123!');
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    const header = page.getByRole('searchbox', { name: '통합 검색', exact: true });
    await expect(header).toBeVisible();
    await restoreLaunchSession(page, true);
    const pane = page.locator('[data-ssoo-mdi-pane="true"][aria-hidden="false"]');
    const panel = pane.locator('[data-ssoo-content-page-slot="sidecar"]');
    const heading = pane.getByRole('heading', { name: /ERP/ }).first();
    const assertUncovered = async () => {
      await expect(heading).toBeVisible();
      await heading.scrollIntoViewIfNeeded();
      await expect.poll(() => heading.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(rect.left + 10, rect.top + 10));
      })).toBe(true);
    };
    const headerSearch = async (query: string) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await header.fill(query);
      await header.press('Enter');
    };
    try {
      // Keep the actual shell search entry, including DMS's root-owned search tab.
      await headerSearch('ERP');
      await assertUncovered();
      await expect(panel).toBeVisible();
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
        await expect(panel).toHaveCount(0);
        await assertUncovered();
        await pane.getByRole('button', { name: '패널 펼치기', exact: true }).click();
        await expect(panel.getByText('사용 팁', { exact: true })).toBeVisible();
        await expect(panel.getByText('검색 기록', { exact: true })).toBeVisible();
        await pane.getByRole('button', { name: '패널 접기', exact: true }).click();
        await expect(panel).toHaveCount(0);
        await assertUncovered();
      }
      await pane.getByRole('button', { name: /^CRM/ }).first().click();
      await expect(pane.getByRole('button', { name: /^CRM/ }).first()).toHaveAttribute('aria-pressed', 'true');
      await assertUncovered();
      await page.goto(origin + '/ssoo/search?q=ERP&sourceApp=crm');
      await assertUncovered();
      await expect(panel).toHaveCount(0);
      await page.reload();
      await assertUncovered();
      await expect(panel).toHaveCount(0);
      for (const [query, message] of [
        ['', '검색어를 입력하면 결과가 표시됩니다.'],
        ['검색회귀존재하지않음20260914', '검색 결과가 없습니다.'],
      ]) {
        await headerSearch(query);
        await expect(pane.getByText(message, { exact: true })).toBeVisible();
        await page.setViewportSize({ width: 390, height: 844 });
        await expect(panel).toHaveCount(0);
      }
      await headerSearch('ERP');
      await assertUncovered();
      if (await pane.getByRole('button', { name: '패널 펼치기', exact: true }).isVisible()) {
        await pane.getByRole('button', { name: '패널 펼치기', exact: true }).click();
      }
      for (let cycle = 0; cycle < 2; cycle++) {
        await page.setViewportSize({ width: 390, height: 844 });
        await expect(panel).toHaveCount(0);
        await assertUncovered();
        await pane.getByRole('button', { name: '패널 펼치기', exact: true }).click();
        await expect(panel).toBeVisible();
        await page.setViewportSize({ width: 1920, height: 1080 });
        await expect(panel).toBeVisible();
        await assertUncovered();
      }
      if (app === 'dms') {
        // The original root-owned search keeps its results on an empty header submission.
        await page.goto(origin + '/');
        await headerSearch('ERP');
        await assertUncovered();
        await headerSearch('');
        await assertUncovered();
        await expect(page).toHaveURL(origin + '/');
      }
      monitor.assertClean();
    } finally {
      await page.close();
    }
  });
}
