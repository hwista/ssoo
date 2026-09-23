import { expect, test } from '@playwright/test';
import { monitorBrowserFailures, restoreLaunchSession } from './support/launch-browser';

test.skip(!process.env.CRM_FORM_ISOLATED_DATABASE?.startsWith('ssoo_crm_ralph_'),
  'requires the isolated CRM launch verification runtime');

test('CRM search prioritizes results in narrow workspaces and preserves panel controls', async ({ page }) => {
  test.setTimeout(120_000);
  const origin = 'http://127.0.0.1:3105';
  const monitor = monitorBrowserFailures(page, { label: 'CRM search panel', relevantOrigins: [origin, 'http://127.0.0.1:4105'] });
  await page.goto(origin + '/login');
  await page.getByRole('textbox', { name: '아이디', exact: true }).fill('admin');
  await page.getByRole('textbox', { name: '비밀번호', exact: true }).fill('admin123!');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('button', { name: '사용자 메뉴', exact: true })).toBeVisible();
  await restoreLaunchSession(page, true);
  const pane = page.locator('[data-ssoo-mdi-pane="true"][aria-hidden="false"]');
  const panel = pane.locator('[data-ssoo-content-page-slot="sidecar"]');
  const heading = pane.getByRole('heading', { name: /ERP/ }).first();
  const assertUncovered = async () => {
    await heading.scrollIntoViewIfNeeded();
    await expect.poll(() => heading.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(rect.left + 10, rect.top + 10));
    })).toBe(true);
  };
  try {
    for (const width of [1920, 1440, 390]) {
      await page.goto(origin + '/ssot-icon.svg');
      await page.evaluate(() => sessionStorage.removeItem('crm-mdi-tabs'));
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
      await page.goto(origin + '/ssoo/search?q=ERP&sourceApp=crm');
      await expect(heading).toBeVisible();
      if (width === 1920) {
        await expect(panel).toBeVisible();
      } else {
        await expect(panel).toHaveCount(0);
        await page.reload();
        await expect(heading).toBeVisible();
        await expect(panel).toHaveCount(0);
      }
      await assertUncovered();
      if (width === 1920) await pane.getByRole('button', { name: '패널 접기', exact: true }).click();
      await pane.getByRole('button', { name: '패널 펼치기', exact: true }).click();
      await expect(panel.getByText('사용 팁', { exact: true })).toBeVisible();
      await expect(panel.getByText('검색 기록', { exact: true })).toBeVisible();
      await pane.getByRole('button', { name: '패널 접기', exact: true }).click();
      await expect(panel).toHaveCount(0);
      await assertUncovered();
      await pane.getByRole('button', { name: /^전체/ }).click();
      await expect(pane.getByRole('button', { name: /^전체/ })).toHaveAttribute('aria-pressed', 'true');
      await assertUncovered();
      for (const path of ['/ssoo/search', '/ssoo/search?q=검색회귀존재하지않음20260914&sourceApp=crm']) {
        await page.evaluate((url) => history.pushState(null, '', url), path);
        await expect(pane.getByText(path.includes('?') ? '검색 결과가 없습니다.' : '검색어를 입력하면 결과가 표시됩니다.', { exact: true })).toBeVisible();
        if (width !== 1920) await expect(panel).toHaveCount(0);
      }
    }
    await page.setViewportSize({ width: 1920, height: 1080 });
    const header = page.getByRole('searchbox', { name: '통합 검색', exact: true });
    await header.fill('ERP');
    await header.press('Enter');
    await expect(heading).toBeVisible();
    if (await pane.getByRole('button', { name: '패널 펼치기', exact: true }).isVisible()) {
      await pane.getByRole('button', { name: '패널 펼치기', exact: true }).click();
    }
    for (let cycle = 0; cycle < 3; cycle++) {
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(panel).toHaveCount(0);
      await assertUncovered();
      await pane.getByRole('button', { name: '패널 펼치기', exact: true }).click();
      await expect(panel).toBeVisible();
      await page.setViewportSize({ width: 1920, height: 1080 });
      await expect(panel).toBeVisible();
      await assertUncovered();
    }
    monitor.assertClean();
  } finally {
    await page.goto(origin + '/ssot-icon.svg');
    await page.evaluate(() => sessionStorage.removeItem('crm-mdi-tabs'));
    await page.close();
  }
});
