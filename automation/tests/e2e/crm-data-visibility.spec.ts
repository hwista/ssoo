import { expect, type Locator, type Page, test } from '@playwright/test';
import type { CrmContractListResponse } from '../../../packages/types/src/crm/contract';
import type { CrmOpportunityListResponse } from '../../../packages/types/src/crm/opportunity';
import { getLaunchAccessToken, monitorBrowserFailures, restoreLaunchSession } from './support/launch-browser';

const appUrl = process.env.CRM_VISIBILITY_APP_URL ?? 'http://127.0.0.1:3105';

async function readLedger<T>(page: Page, path: string): Promise<T> {
  const token = getLaunchAccessToken(page);
  expect(token, 'real authenticated session required').toBeTruthy();
  const response = await page.request.get(`${appUrl}/api/crm/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok(), `${path} HTTP ${response.status()}`).toBeTruthy();
  const body = await response.json() as { success: boolean; data: T };
  expect(body.success).toBe(true);
  return body.data;
}

async function openSurface(page: Page, path: string, surface: string): Promise<Locator> {
  await page.goto(`${appUrl}${path}`);
  const content = page.locator(`[data-source-surface="${surface}"]:visible`);
  await expect(content).toBeVisible();
  return content;
}

async function expectMetric(content: Locator, label: string, text: string) {
  await expect(content.getByText(label, { exact: true }).and(content.locator(':not(th)')).locator('..')).toContainText(text);
}

for (const width of [1440, 390]) {
  test(`ordinary CRM data remains visible with existing business conditions at ${width}px`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const monitor = monitorBrowserFailures(page, { label: 'CRM ordinary data visibility', relevantOrigins: [appUrl] });
    await page.goto(`${appUrl}/login`);
    await page.getByRole('textbox', { name: '아이디', exact: true }).fill(process.env.CRM_VISIBILITY_LOGIN_ID ?? 'admin');
    await page.getByRole('textbox', { name: '비밀번호', exact: true }).fill(process.env.CRM_VISIBILITY_PASSWORD ?? 'admin123!');
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await expect(page.getByRole('banner').getByRole('button', { name: '사용자 메뉴', exact: true })).toBeVisible();
    await restoreLaunchSession(page, true);

    // Read the real ledger. A fixture-only database must not make this regression pass.
    const opportunities = await readLedger<CrmOpportunityListResponse>(page, 'opportunities');
    const contracts = await readLedger<CrmContractListResponse>(page, 'contracts');
    const ordinaryOpportunity = opportunities.items.find((item) => !item.id.startsWith('crm-uiux-opp-'));
    const ordinaryContract = contracts.items.find((item) => !item.code.startsWith('crm-uiux-ct-'));
    expect(ordinaryOpportunity, 'seed must include ordinary opportunity identifiers').toBeTruthy();
    expect(ordinaryContract, 'seed must include ordinary contract codes').toBeTruthy();
    if (!ordinaryOpportunity || !ordinaryContract) throw new Error('ordinary ledger records are required');

    let content = await openSurface(page, '/?sourceSurface=list', 'list');
    await expectMetric(content, '전체 건수', `${opportunities.items.length}건`);
    await expect(content.getByText(`${opportunities.items.length}건 표시 중`, { exact: true })).toBeVisible();

    const search = ordinaryOpportunity.opportunityName;
    const filtered = await readLedger<CrmOpportunityListResponse>(page, `opportunities?search=${encodeURIComponent(search)}`);
    await content.getByRole('searchbox', { name: '고객명, 영업기회명, 담당자 검색', exact: true }).fill(search);
    await expect(page).toHaveURL(/search=/);
    content = page.locator('[data-source-surface="list"]:visible');
    await expectMetric(content, '전체 건수', `${filtered.items.length}건`);
    await expect(content.getByRole('cell', { name: ordinaryOpportunity.opportunityName, exact: true }).first()).toBeVisible();

    content = await openSurface(page, `/?sourceSurface=form&selected=${encodeURIComponent(ordinaryOpportunity.id)}`, 'form');
    await expect.poll(() => content.locator('input').evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value)))
      .toContain(ordinaryOpportunity.opportunityName);

    const confirmedLatest = opportunities.items.filter((item) => item.confirmed && item.isLatest);
    expect(confirmedLatest.some((item) => !item.id.startsWith('crm-uiux-opp-'))).toBe(true);
    const confirmedRevenue = confirmedLatest.reduce((sum, item) => sum + item.revenueLines.reduce((lineSum, line) => lineSum + line.amount, 0), 0);
    content = await openSurface(page, '/?sourceSurface=dashboard', 'dashboard');
    await expectMetric(content, '전체 건수', `${opportunities.items.length}건`);
    await expectMetric(content, '전체 건수', `확정 ${confirmedLatest.length}건`);
    await expectMetric(content, '확정 매출액', `${Math.round(confirmedRevenue).toLocaleString('ko-KR')}원`);

    content = await openSurface(page, '/?sourceSurface=contract-document', 'contract-document');
    await expect(content.locator('input[name="cg-opp"]')).toHaveCount(confirmedLatest.length);
    const expectedCandidates = confirmedLatest.map((item) => `${item.customerName} ${item.opportunityName}`).sort();
    await expect.poll(() => content.locator('input[name="cg-opp"]').evaluateAll((inputs) =>
      inputs.map((input) => input.getAttribute('aria-label')).sort())).toEqual(expectedCandidates);

    content = await openSurface(page, '/contracts?sourceSurface=list', 'contract-list');
    await expectMetric(content, '전체 건수', `${contracts.items.length}건`);
    const contractRevenue = contracts.items.reduce((sum, item) => sum + item.revenueLines.reduce((lineSum, line) => lineSum + line.amount, 0), 0);
    await expectMetric(content, '매출액', `${Math.round(contractRevenue).toLocaleString('ko-KR')}원`);
    await expect(content.getByRole('cell', { name: ordinaryContract.contractName, exact: true }).first()).toBeVisible();

    const contractSearch = ordinaryContract.contractName;
    const filteredContracts = await readLedger<CrmContractListResponse>(page, `contracts?search=${encodeURIComponent(contractSearch)}`);
    await content.getByRole('searchbox', { name: '계약 검색', exact: true }).fill(contractSearch);
    await content.getByRole('searchbox', { name: '계약 검색', exact: true }).press('Enter');
    await expect(page).toHaveURL(/search=/);
    content = page.locator('[data-source-surface="contract-list"]:visible');
    await expectMetric(content, '전체 건수', `${filteredContracts.items.length}건`);

    content = await openSurface(page, `/contracts?sourceSurface=form&selected=${encodeURIComponent(ordinaryContract.id)}`, 'contract-form');
    await expect.poll(() => content.locator('input').evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value)))
      .toContain(ordinaryContract.contractName);

    const confirmedContracts = contracts.items.filter((item) => item.confirmed);
    expect(confirmedContracts.some((item) => !item.code.startsWith('crm-uiux-ct-'))).toBe(true);
    content = await openSurface(page, '/contracts?sourceSurface=billing-actual&view=list', 'billing-actual-list');
    await expect(content.locator('tbody tr')).toHaveCount(confirmedContracts.length);
    for (const item of confirmedContracts) {
      await expect(content.getByRole('cell', { name: item.contractName, exact: true }).first()).toBeVisible();
    }
    monitor.assertClean();
  });
}
