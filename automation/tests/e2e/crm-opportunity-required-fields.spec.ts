import { expect, test } from '@playwright/test';
import type { CrmOpportunityListResponse } from '../../../packages/types/src/crm/opportunity';
import { getLaunchAccessToken, monitorBrowserFailures, restoreLaunchSession } from './support/launch-browser';

const appUrl = 'http://127.0.0.1:3105';

// This mutation suite is opt-in and targets the separately provisioned CRM runtime.
test.skip(!process.env.CRM_FORM_ISOLATED_DATABASE?.startsWith('ssoo_crm_ralph_'),
  'requires the launch verification database, never the ordinary local app');

for (const width of [1440, 390]) {
  test(`basic opportunity required fields save and remain locked when confirmed at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    let expectValidationError = false;
    const httpFailures: string[] = [];
    let saveRequests = 0;
    const monitor = monitorBrowserFailures(page, {
      label: 'CRM basic opportunity required fields',
      relevantOrigins: [appUrl],
    });
    page.on('response', (response) => {
      const path = new URL(response.url()).pathname;
      if (path.startsWith('/api/crm/') && response.status() >= 400
        && !(expectValidationError && path === '/api/crm/opportunities'
          && response.request().method() === 'POST' && response.status() === 400)) {
        httpFailures.push(`${response.status()} ${path}`);
      }
    });
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/crm/opportunities' && request.method() === 'POST') saveRequests += 1;
    });
    await page.goto(`${appUrl}/login`);
    await page.getByRole('textbox', { name: '아이디', exact: true }).fill('admin');
    await page.getByRole('textbox', { name: '비밀번호', exact: true }).fill('admin123!');
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await expect(page.getByRole('button', { name: '사용자 메뉴', exact: true })).toBeVisible();
    await restoreLaunchSession(page, true);
    const request = page.request;
    const headers = () => ({ Authorization: `Bearer ${getLaunchAccessToken(page)}` });
    const readLedger = async () => {
      const response = await request.get(`${appUrl}/api/crm/opportunities`, { headers: headers() });
      expect(response.ok()).toBe(true);
      const body = await response.json() as { success: boolean; data: CrmOpportunityListResponse };
      expect(body.success).toBe(true);
      return body.data.items;
    };
    const before = await readLedger();
    const locked = before.find((item) => item.confirmed && item.isLatest);
    expect(locked, 'confirmed opportunity required for read-only regression').toBeTruthy();
    if (!locked) throw new Error('confirmed opportunity missing');
    let createdId: string | undefined;
    const name = `승인12-${width}-${Date.now()}`;
    try {
      await page.goto(`${appUrl}/?sourceSurface=form&create=opportunity`);
      const form = page.locator('[data-source-surface="form"]:visible');
      const group = form.getByRole('combobox', { name: '계열구분 *', exact: true });
      const nextAction = form.getByRole('textbox', { name: '다음 행동 *', exact: true });
      await expect(nextAction).toBeVisible();
      await expect(nextAction).toHaveAttribute('required', '');
      await expect(group).toHaveAttribute('required', '');
      await expect(nextAction).toHaveValue('');
      await expect(group).toHaveValue('');
      expect(await nextAction.evaluate((element) => {
        const endDate = element.closest('form')?.querySelector('input[id$="-expected-end"]');
        return endDate != null && Boolean(endDate.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
      })).toBe(true);
      await form.getByRole('textbox', { name: '고객명 *', exact: true }).fill('승인12 검증 전용 고객');
      await form.getByRole('textbox', { name: '영업기회명 *', exact: true }).fill(name);
      const owner = form.locator('select').filter({ has: page.locator('option', { hasText: 'Admin · @admin' }) });
      await expect(owner.locator('option').filter({ hasText: 'Admin · @admin' })).toHaveCount(1);
      await owner.selectOption({ label: 'Admin · @admin · admin@company.com · ADMIN' });
      await form.getByRole('combobox', { name: '사업구분 *', exact: true }).selectOption({ label: 'SI' });

      // Missing required values are blocked by the same native form validation used by existing fields.
      await nextAction.fill('고객 미팅 준비');
      await form.getByRole('button', { name: '저장', exact: true }).click();
      await expect(group).toBeFocused();
      expect(saveRequests).toBe(0);
      await group.selectOption({ label: '대외' });
      await nextAction.fill('');
      await form.getByRole('button', { name: '저장', exact: true }).click();
      await expect(nextAction).toBeFocused();
      expect(saveRequests).toBe(0);

      // Whitespace still reaches the unchanged server validation; preserve its error and user input.
      await nextAction.fill('   ');
      expectValidationError = true;
      const rejectedResponse = page.waitForResponse((response) => response.url().endsWith('/api/crm/opportunities')
        && response.request().method() === 'POST');
      await form.getByRole('button', { name: '저장', exact: true }).click();
      const rejected = await rejectedResponse;
      expect(rejected.status()).toBe(400);
      await expect(form.getByText('다음 행동은 필수입니다.', { exact: true })).toBeVisible();
      await expect(form.getByRole('textbox', { name: '영업기회명 *', exact: true })).toHaveValue(name);
      await expect(nextAction).toHaveValue('   ');
      // Account for the single console resource error from the explicitly asserted 400 response.
      const expectedConsoleError = 'console.error: Failed to load resource: the server responded with a status of 400 (Bad Request)';
      await expect.poll(() => monitor.failures.filter((failure) => failure === expectedConsoleError).length).toBe(1);
      monitor.failures.splice(monitor.failures.indexOf(expectedConsoleError), 1);
      expectValidationError = false;

      await nextAction.fill('고객 미팅 준비');
      const createdResponse = page.waitForResponse((response) => response.url().endsWith('/api/crm/opportunities')
        && response.request().method() === 'POST');
      await form.getByRole('button', { name: '저장', exact: true }).click();
      const created = await createdResponse;
      const body = await created.json();
      createdId = body.data?.id;
      expect(created.status()).toBe(201);
      expect(body.success).toBe(true);
      expect(createdId).toMatch(/^crm-opp-/);
      expect(body.data.nextAction).toBe('고객 미팅 준비');
      await expect(page).toHaveURL(new RegExp(`selected=${createdId}`));

      await page.goto(`${appUrl}/?sourceSurface=form&selected=${createdId}`);
      await expect(nextAction).toBeEditable();
      await expect(nextAction).toHaveValue('고객 미팅 준비');
      await form.getByText('다음 행동 *', { exact: true }).click();
      await expect(nextAction).toBeFocused();
      await form.getByText('계열구분 *', { exact: true }).click();
      await expect(group).toBeFocused();
      await nextAction.fill('견적 제출 일정 확인');
      const updatedResponse = page.waitForResponse((response) => response.url().endsWith(`/api/crm/opportunities/${createdId}`)
        && response.request().method() === 'PUT');
      await form.getByRole('button', { name: '저장', exact: true }).click();
      const updated = await updatedResponse;
      expect(updated.status()).toBe(200);
      expect((await updated.json()).data.nextAction).toBe('견적 제출 일정 확인');
      await page.goto(`${appUrl}/?sourceSurface=form&selected=${createdId}`);
      await expect(nextAction).toHaveValue('견적 제출 일정 확인');
      expect((await readLedger()).find((item) => item.id === createdId)?.nextAction).toBe('견적 제출 일정 확인');

      // Keep create and edit tabs mounted together: labels must never point into the other pane.
      await page.goto(`${appUrl}/?sourceSurface=form&create=opportunity`);
      const createTab = page.getByRole('tab', { name: '영업기회 등록', exact: true });
      const editTab = page.getByRole('tab', { name: '영업기회 조회', exact: true });
      const draftCustomer = `미저장 고객 ${width}`;
      const editedCustomer = `수정 고객 ${width}`;
      await form.getByRole('textbox', { name: '고객명 *', exact: true }).fill(draftCustomer);
      await editTab.click();
      await form.getByRole('textbox', { name: '고객명 *', exact: true }).fill(editedCustomer);
      for (const tab of [createTab, editTab]) {
        await tab.click();
        const labels = form.locator('label[for]');
        await expect(labels).toHaveCount(9);
        for (const label of await labels.all()) {
          expect(await label.evaluate((element) => {
            const control = (element as HTMLLabelElement).control as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
            return control !== null && control.closest('form') === element.closest('form')
              && control.labels?.length === 1;
          }), 'label belongs to exactly one input in the active form').toBe(true);
          await label.click();
          expect(await label.evaluate((element) => (element as HTMLLabelElement).control === document.activeElement)).toBe(true);
        }
        for (const resizedWidth of [width === 390 ? 1440 : 390, width]) {
          await page.setViewportSize({ width: resizedWidth, height: resizedWidth === 390 ? 844 : 1000 });
          await expect(form.getByRole('textbox', { name: '고객명 *', exact: true }))
            .toHaveValue(tab === createTab ? draftCustomer : editedCustomer);
        }
      }
      const ids = await page.locator('[data-source-surface="form"] [id]').evaluateAll((elements) => elements.map((element) => element.id));
      expect(new Set(ids).size, 'all mounted opportunity form IDs are unique').toBe(ids.length);
      const editedResponse = page.waitForResponse((response) => response.url().endsWith(`/api/crm/opportunities/${createdId}`)
        && response.request().method() === 'PUT');
      await form.getByRole('button', { name: '저장', exact: true }).click();
      expect((await editedResponse).status()).toBe(200);
      expect((await readLedger()).find((item) => item.id === createdId)?.customerName).toBe(editedCustomer);
      await createTab.click();
      await expect(form.getByRole('textbox', { name: '고객명 *', exact: true })).toHaveValue(draftCustomer);

      await page.goto(`${appUrl}/?sourceSurface=form&selected=${locked.id}`);
      await expect(nextAction).toHaveValue(locked.nextAction);
      await expect(nextAction).toBeDisabled();
      await expect(group).toBeDisabled();
      await expect(form.getByRole('button', { name: '저장', exact: true })).toHaveCount(0);
      expect(httpFailures).toEqual([]);
      monitor.assertClean();
    } finally {
      // Close tabs before deleting our item, so retained tabs cannot requery a deleted fixture.
      const cleanupHeaders = headers();
      await page.close();
      if (createdId) {
        const deleted = await request.delete(`${appUrl}/api/crm/opportunities/${createdId}`, { headers: cleanupHeaders });
        expect(deleted.status(), 'owned opportunity cleanup').toBe(200);
      }
      const after = await readLedger();
      expect(after.map((item) => item.id).sort(), 'active ledger restored after the test')
        .toEqual(before.map((item) => item.id).sort());
    }
  });
}
