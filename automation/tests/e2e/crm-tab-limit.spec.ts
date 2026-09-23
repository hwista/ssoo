import { expect, test } from '@playwright/test';
import { monitorBrowserFailures, restoreLaunchSession } from './support/launch-browser';

const appUrl = 'http://127.0.0.1:3105';
const createPath = '/?sourceSurface=form&create=opportunity';
const menus = [
  '영업기회 등록', '대시보드', '영업기회 현황', '계약서 생성', '회사 정보', '견적 설정',
  '계약현황', '계약등록', '계약청구실적', '계약 원장', '계약대비실적(월별)',
  '계약대비실적', '보고 Preview', '사업계획 등록', '사업계획 Preview',
];

test.skip(!process.env.CRM_FORM_ISOLATED_DATABASE?.startsWith('ssoo_crm_ralph_'),
  'requires the isolated CRM launch verification runtime');

for (const width of [1440, 390]) {
  test(`CRM full tabs preserve drafts, repair routes and allow close/retry at ${width}px`, async ({ page }) => {
    test.setTimeout(180_000);
    const monitor = monitorBrowserFailures(page, { label: 'CRM tab limit', relevantOrigins: [appUrl] });
    const writes: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/crm/')
        && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url());
    });
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto(`${appUrl}/login`);
    await page.getByRole('textbox', { name: '아이디', exact: true }).fill('admin');
    await page.getByRole('textbox', { name: '비밀번호', exact: true }).fill('admin123!');
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await expect(page.getByRole('button', { name: '사용자 메뉴', exact: true })).toBeVisible();
    await restoreLaunchSession(page, true);
    const state = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('crm-mdi-tabs') ?? '{}').state as {
      tabs: { id: string; path: string }[]; activeTabId: string;
    });
    const menu = async (name: string) => {
      const mobileOpen = page.getByRole('button', { name: '모바일 메뉴 열기', exact: true });
      if (await mobileOpen.isVisible()) await mobileOpen.click();
      await page.getByRole('button', { name, exact: true }).click();
    };
    const closeMenu = async () => {
      const close = page.getByRole('button', { name: '모바일 메뉴 닫기', exact: true }).first();
      if (await close.isVisible()) await close.click();
    };
    const notice = page.getByRole('alertdialog', { name: '열린 화면 한도' });
    const dismiss = async () => {
      await expect(notice).toBeVisible();
      await expect(notice).toContainText('열린 화면은 최대 16개입니다. 필요한 입력을 저장한 뒤 사용하지 않는 탭을 닫고 다시 선택해 주세요.');
      await notice.getByRole('button', { name: '확인', exact: true }).click();
      await expect(notice).toBeHidden();
    };
    const input = page.locator('[data-source-surface="form"]:visible').getByRole('textbox', { name: '고객명 *', exact: true });
    try {
      for (const [index, name] of menus.entries()) {
        await menu(name);
        await expect.poll(async () => (await state()).tabs.length).toBe(index + 2);
        await closeMenu();
        await page.waitForTimeout(500);
        await expect(notice).toBeHidden();
      }
      await page.getByRole('tab', { name: '영업기회 등록', exact: true }).click();
      await input.fill(`보존할 입력 ${width}`);
      const before = await state();
      await menu('고객/활동');
      await dismiss();
      await closeMenu();
      await expect(page).toHaveURL(appUrl + createPath);
      await expect(input).toHaveValue(`보존할 입력 ${width}`);
      expect((await state()).tabs.map((tab) => tab.id)).toEqual(before.tabs.map((tab) => tab.id));
      expect((await state()).activeTabId).toBe(before.activeTabId);

      // Navigate inside the current document to preserve the draft while exercising route repair.
      await page.evaluate(() => window.history.pushState(null, '', '/customers'));
      await dismiss();
      await expect(page).toHaveURL(appUrl + createPath);
      await expect(input).toHaveValue(`보존할 입력 ${width}`);
      await page.goBack();
      await expect(page).toHaveURL(appUrl + createPath);
      await page.goForward();
      await expect(page).toHaveURL(appUrl + createPath);
      await expect(notice).toBeHidden();
      await expect(input).toHaveValue(`보존할 입력 ${width}`);

      await menu('대시보드');
      await closeMenu();
      await expect(page).toHaveURL(`${appUrl}/?sourceSurface=dashboard`);
      await expect(page.getByRole('tab', { name: '대시보드', exact: true })).toHaveAttribute('aria-selected', 'true');
      await expect(notice).toBeHidden();
      await page.getByRole('tab', { name: '영업기회 등록', exact: true }).click();
      await expect(input).toHaveValue(`보존할 입력 ${width}`);

      // Closing a background tab must not discard or change the active draft.
      const dashboardTab = page.getByRole('tab', { name: '대시보드', exact: true });
      await dashboardTab.hover();
      await dashboardTab.locator('..').getByRole('button').click();
      await expect.poll(async () => (await state()).tabs.length).toBe(15);
      await expect(input).toHaveValue(`보존할 입력 ${width}`);
      await menu('고객/활동');
      await closeMenu();
      await expect(page).toHaveURL(`${appUrl}/customers`);
      await expect(page.getByRole('tab', { name: '고객/활동', exact: true })).toHaveAttribute('aria-selected', 'true');
      await expect.poll(async () => (await state()).tabs.length).toBe(16);
      await expect(notice).toBeHidden();
      await page.getByRole('tab', { name: '영업기회 등록', exact: true }).click();
      await expect(input).toHaveValue(`보존할 입력 ${width}`);

      // A document reload restores tabs, not unsaved form values. Only assert the existing tab contract.
      await page.goto(`${appUrl}/cost-plan`);
      await dismiss();
      await expect(page).toHaveURL(appUrl + createPath);
      expect((await state()).tabs).toHaveLength(16);
      await page.reload();
      await expect(page).toHaveURL(appUrl + createPath);
      await expect(page.getByRole('tab', { name: '영업기회 등록', exact: true })).toHaveAttribute('aria-selected', 'true');
      await expect(notice).toBeHidden();
      expect(writes).toEqual([]);
      monitor.assertClean();
    } finally {
      await page.goto(`${appUrl}/ssot-icon.svg`);
      await page.evaluate(() => sessionStorage.removeItem('crm-mdi-tabs'));
      await page.close();
    }
  });
}
