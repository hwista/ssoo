import assert from 'node:assert/strict';
import { BusinessPlanService } from '../../../apps/server/dist/modules/crm/business-plan/business-plan.service.js';
import { ReportsService } from '../../../apps/server/dist/modules/crm/reports/reports.service.js';
import { CostPlanService } from '../../../apps/server/dist/modules/crm/cost-plan/cost-plan.service.js';
import { ProjectHandoffContractService } from '../../../apps/server/dist/modules/pms/project/project-handoff-contract.service.js';
import { ProjectAccessService } from '../../../apps/server/dist/modules/pms/project/project-access.service.js';

// Real SQL, permissions and histories, exclusively in verify-onboarding's disposable database.
export async function verifyCrmPlanningOrganization({ db, access, foundation, opportunities, contracts, readerId, readerToken, adminUser, organization, anotherOrganization, pass }) {
  const plans = new BusinessPlanService(opportunities, contracts, db, access);
  const reports = new ReportsService(opportunities, contracts, db, access);
  const costs = new CostPlanService(opportunities, contracts, db, undefined, undefined, access);
  const admin = { userId: String(adminUser.id), loginId: adminUser.loginId };
  const a = String(organization.orgId), b = String(anotherOrganization.orgId);
  const forbidden = error => error.getStatus?.() === 403;
  const months = amount => Array.from({ length: 12 }, (_, i) => i === 0 ? amount : 0);
  for (const [ownerOrganizationId, amount] of [[a, 11000], [b, 99000]]) {
    await opportunities.createOpportunity({ ownerOrganizationId, customerName: '계획 조직 검증', opportunityName: `조직 ${ownerOrganizationId} 계획 원천`, ownerName: '동일 담당자', ownerUserId: String(readerId), businessType: 'SI', industryLine: '그룹', region: 'domestic', status: 'proposal', priority: 'medium', expectedStartDate: '2026-10-01', expectedEndDate: '2026-12-31', revenueLines: [{ category: 'product', label: '동일 품목', quantity: 1, unitPrice: amount }], costLines: [] }, adminUser.id);
  }
  await assert.rejects(() => plans.getPreview({ baseYear: 2026 }, readerToken), error => error.getStatus?.() === 400);
  const planA = await plans.createPlanSnapshot({ baseYear: 2026, ownerOrganizationId: a }, readerId);
  const planB = await plans.createPlanSnapshot({ baseYear: 2026, ownerOrganizationId: b }, adminUser.id);
  assert.equal(planA.ownerOrganizationId, a);
  assert.equal(planB.ownerOrganizationId, b);
  assert.equal(planA.version, 1);
  assert.equal(planB.version, 1);
  assert.equal(planA.planCandidateAmountTotal, 11000);
  assert.equal(planB.planCandidateAmountTotal, 99000);
  assert.deepEqual((await plans.listPlans({ ownerOrganizationId: a }, readerToken)).items.map(row => row.id), [planA.id]);
  await plans.confirmPlan(planA.id, readerId);
  await assert.rejects(() => plans.confirmPlan(planB.id, readerId), forbidden);
  await assert.rejects(() => plans.deletePlan(planB.id, readerId), forbidden);
  const version = await plans.createPlanVersion(planA.id, readerId);
  assert.equal(version.version, 2);
  assert.equal(version.ownerOrganizationId, a);
  const history = await db.client.crmBusinessPlanHistory.findFirstOrThrow({ where: { businessPlanId: BigInt(version.id) } });
  assert.equal(history.ownerOrganizationId, organization.orgId);
  await plans.updatePlanRow(version.id, version.rows[0].rowCode, {
    businessType: 'SI', industryLine: '그룹', ownerName: '동일 담당자', region: 'domestic', businessName: '차년도 이월 검증',
    monthlyRevenueAmounts: months(11000), monthlyExternalCostAmounts: months(0),
    nextYearRevenueAmount: 500, nextYearExternalCostAmount: 0, followingYearRevenueAmount: 0, followingYearExternalCostAmount: 0,
  }, readerId);
  await plans.confirmPlan(version.id, readerId);
  const carried = await plans.createCarryForwardSnapshot({ baseYear: 2027, sourceBaseYear: 2026, ownerOrganizationId: a }, readerId);
  assert.equal(carried.ownerOrganizationId, a);
  pass('CRM plan snapshots, versions, history and carry-forward keep organization; viewer cannot confirm/delete another organization');

  const actual = { year: 2026, businessType: 'SI', industryLine: '그룹', ownerName: '동일 담당자', region: 'domestic', wbsCode: 'SAME-WBS', monthlyRevenueAmounts: months(123), monthlyCostAmounts: months(45) };
  await plans.savePerformanceActualInput({ ...actual, ownerOrganizationId: a }, readerId);
  await plans.savePerformanceActualInput({ ...actual, ownerOrganizationId: b, monthlyRevenueAmounts: months(999) }, adminUser.id);
  const storedActuals = await db.client.crmBusinessPlanPerformanceActual.findMany({ where: { ownerOrganizationId: { in: [organization.orgId, anotherOrganization.orgId] } } });
  assert.equal(storedActuals.length, 2);
  assert.equal(storedActuals.find(row => row.ownerOrganizationId === organization.orgId).revenueAmountTotal, 123n);
  await assert.rejects(() => plans.savePerformanceActualInput({ ...actual, ownerOrganizationId: b }, readerId), forbidden);

  const costInput = { targetYear: 2026, businessType: 'SI', industryLine: '그룹', ownerName: '동일 담당자', region: 'domestic', wbsCode: 'SAME-WBS', monthlyPlanAmounts: months(100), monthlyActualAmounts: months(150) };
  const costA = await costs.saveInternalMonthlyInput({ ...costInput, ownerOrganizationId: a }, readerId);
  const costB = await costs.saveInternalMonthlyInput({ ...costInput, ownerOrganizationId: b, monthlyActualAmounts: months(900) }, adminUser.id);
  assert.notEqual(costA.input.id, costB.input.id);
  await costs.confirmInternalMonthlyInput(costA.input.id, readerId);
  await assert.rejects(() => costs.confirmInternalMonthlyInput(costB.input.id, readerId), forbidden);
  await costs.confirmInternalMonthlyInput(costB.input.id, adminUser.id);
  await costs.saveAmsVendorWbsMapping({ ...costInput, ownerOrganizationId: a, vendorName: '동일 공급업체' }, readerId);
  await costs.saveAmsVendorWbsMapping({ ...costInput, ownerOrganizationId: b, vendorName: '동일 공급업체' }, adminUser.id);
  const externalA = await costs.saveAmsExternalMonthlyInput({ ...costInput, ownerOrganizationId: a, vendorName: '동일 공급업체' }, readerId);
  const externalB = await costs.saveAmsExternalMonthlyInput({ ...costInput, ownerOrganizationId: b, vendorName: '동일 공급업체', monthlyActualAmounts: months(900) }, adminUser.id);
  assert.notEqual(externalA.input.id, externalB.input.id);
  await costs.confirmAmsExternalMonthlyInput(externalA.input.id, readerId);
  await assert.rejects(() => costs.confirmAmsExternalMonthlyInput(externalB.input.id, readerId), forbidden);
  const scopedCost = await costs.getPreview({ year: 2026, ownerOrganizationId: a }, readerToken);
  assert.equal(scopedCost.summary.internalCostActualInputTotal, 150);
  assert.equal(scopedCost.summary.amsExternalCostActualInputTotal, 150);
  const performanceA = await plans.getPerformancePreview({ year: 2026, ownerOrganizationId: a }, readerToken);
  assert.equal(performanceA.months.reduce((sum, row) => sum + row.actualRevenueAmount, 0), 123);
  pass('CRM identical actual/cost/WBS input keys coexist per organization and performance excludes other organizations');

  const reportA = await reports.confirmReport({ year: 2026, search: '계획 조직 검증', ownerOrganizationId: a }, readerId);
  const reportB = await reports.confirmReport({ year: 2026, search: '계획 조직 검증', ownerOrganizationId: b }, adminUser.id);
  assert.equal(reportA.confirmation.pipelineRevenueTotal, 11000);
  assert.equal(reportB.confirmation.pipelineRevenueTotal, 99000);
  await reports.confirmReport({ year: 2026, search: '계획 조직 검증', ownerOrganizationId: a }, readerId);
  assert.equal((await db.client.crmReportConfirmation.findUniqueOrThrow({ where: { id: BigInt(reportB.confirmation.id) } })).isActive, true);
  assert.equal((await reports.getPreview({ year: 2026, search: '계획 조직 검증', ownerOrganizationId: b }, readerToken)).summary.latestConfirmation.id, reportB.confirmation.id);
  await assert.rejects(() => reports.confirmReport({ year: 2026, search: '계획 조직 검증', ownerOrganizationId: b }, readerId), forbidden);
  await assert.rejects(() => reports.reopenReportConfirmation(reportB.confirmation.id, readerId), forbidden);
  pass('CRM report totals, saved snapshots and replace/reopen operations remain in their organization');

  const handoffA = await costs.createAccountingPaymentHandoff({ year: 2026, ownerOrganizationId: a }, readerId);
  const handoffB = await costs.createAccountingPaymentHandoff({ year: 2026, ownerOrganizationId: b }, adminUser.id);
  assert.equal(handoffA.handoff.ownerOrganizationId, a);
  assert.equal(handoffA.preview.settlementAmountTotal, 300);
  assert.equal(handoffB.preview.settlementAmountTotal, 900);
  await assert.rejects(() => costs.executeAccountingPayment(handoffB.handoff.id, { mode: 'demo' }, readerId), forbidden);
  const execution = await costs.executeAccountingPayment(handoffA.handoff.id, { mode: 'demo' }, readerId);
  const savedHandoffs = await db.client.crmCostPlanAccountingHandoff.findMany({ where: { ownerOrganizationId: organization.orgId } });
  assert.equal(savedHandoffs.length, 2);
  assert.equal(execution.externalExecution.settlementAmountTotal, 300);
  assert.equal((await costs.getAccountingPaymentPreview({ year: 2026, ownerOrganizationId: b }, readerToken)).latestHandoff.id, handoffB.handoff.id);
  pass('CRM accounting handoff and execution evidence inherit organization and reject viewer execution before side effects');

  const gridItems = ['labor', 'other', 'dept_adj', 'svc', 'dept_common'].map(itemCode => ({ itemCode, monthlyPlanAmounts: months(10), monthlyActualAmounts: months(20) }));
  await costs.saveInternalSourceGrid({ targetYear: 2026, ownerOrganizationId: a, items: gridItems }, readerId);
  await costs.saveInternalSourceGrid({ targetYear: 2026, ownerOrganizationId: b, items: gridItems }, adminUser.id);
  assert.equal(await db.client.crmCostPlanInternalItemMonthly.count({ where: { ownerOrganizationId: { in: [organization.orgId, anotherOrganization.orgId] } } }), 10);
  const vendorA = await costs.createAmsSourceVendor({ targetYear: 2026, ownerOrganizationId: a, vendorName: 'A 전용업체' }, readerId);
  const vendorB = await costs.createAmsSourceVendor({ targetYear: 2026, ownerOrganizationId: b, vendorName: 'B 전용업체' }, adminUser.id);
  const vendorAId = vendorA.workspace.vendors[0].id, vendorBId = vendorB.workspace.vendors[0].id;
  assert.equal(vendorA.workspace.vendors.length, 1);
  assert.equal(vendorB.workspace.vendors.length, 1);
  await assert.rejects(() => costs.deleteAmsSourceVendor(vendorBId, 2026, readerId), forbidden);
  await assert.rejects(() => costs.saveAmsSourceVendorWbs(vendorBId, { targetYear: 2026, wbsCodes: [] }, readerId), forbidden);
  const input = { customerName: '인계 조직 검증', contractName: '정본 계약 인계', ownerName: '동일 담당자', ownerUserId: String(readerId), businessType: 'SI', industryLine: '그룹', region: 'domestic', contractStartDate: '2026-10-01', contractEndDate: '2026-10-31', revenueLines: [{ category: 'product', label: '검증 상품', quantity: 1, unitPrice: 10000 }], costLines: [], billingPlan: [{ billingYm: '2026/10', revenueAmount: 10000, externalCostAmount: 0 }] };
  const contractA = await contracts.createContract({ ...input, ownerOrganizationId: a, wbsCode: 'A-ONLY-WBS' }, readerId);
  const contractB = await contracts.createContract({ ...input, ownerOrganizationId: b, wbsCode: 'B-ONLY-WBS' }, adminUser.id);
  await contracts.confirmContract(contractA.id, readerId);
  await contracts.confirmContract(contractB.id, adminUser.id);
  await assert.rejects(() => costs.saveAmsSourceVendorWbs(vendorAId, { targetYear: 2026, wbsCodes: ['B-ONLY-WBS'] }, readerId), error => error.getStatus?.() === 400);
  const mapped = await costs.saveAmsSourceVendorWbs(vendorAId, { targetYear: 2026, wbsCodes: ['A-ONLY-WBS'] }, readerId);
  assert.deepEqual(mapped.workspace.eligibleWbs.map(row => row.wbsCode), ['A-ONLY-WBS']);
  const sourceCosts = await costs.saveAmsSourceExternalCost({ targetYear: 2026, ownerOrganizationId: a, rows: [{ vendorId: vendorAId, wbsCode: 'A-ONLY-WBS', monthlyPlanAmounts: months(200), monthlyActualAmounts: months(300) }] }, readerId);
  assert.equal(sourceCosts.workspace.externalCostRows[0].actualAmountTotal, 300);
  await costs.deleteAmsSourceVendor(vendorAId, 2026, readerId);
  pass('CRM source-compatible internal grid, AMS vendors, WBS links and external cost child rows are organization scoped');

  const projects = await db.client.project.findMany({ where: { ownerOrganizationId: { in: [organization.orgId, anotherOrganization.orgId] }, isActive: true } });
  const projectA = projects.find(row => row.ownerOrganizationId === organization.orgId);
  const projectB = projects.find(row => row.ownerOrganizationId === anotherOrganization.orgId);
  assert.ok(projectA && projectB);
  // Earlier PMS tests changed the responsible user; restore this fixture's owner
  // so the success case has object edit permission as well as app admission.
  await db.client.project.update({ where: { id: projectA.id }, data: { currentOwnerUserId: readerId } });
  const handoff = new ProjectHandoffContractService(db, access, contracts, new ProjectAccessService(db, foundation));
  const preview = await contracts.getPmsHandoffPreview(contractA.id);
  const beforePms = await db.client.projectContract.count();
  await assert.rejects(() => handoff.applyCrmContractHandoffSnapshot(projectB.id, { preview }, readerId), forbidden);
  await assert.rejects(() => handoff.applyCrmContractHandoffSnapshot(projectB.id, { preview }, adminUser.id), error => error.getStatus?.() === 400);
  await assert.rejects(() => handoff.applyCrmContractHandoffSnapshot(projectA.id, { preview: { ...preview, contractName: '변조된 스냅샷' } }, readerId), error => error.getStatus?.() === 409);
  assert.equal(await db.client.projectContract.count(), beforePms);
  const applied = await handoff.applyCrmContractHandoffSnapshot(projectA.id, { preview }, readerId);
  assert.equal(applied.contract.totalAmount, 10000n);
  assert.equal(applied.projectId, projectA.id);
  pass('CRM to PMS handoff requires both app permissions and the same organization; stale/forged snapshots cannot write');

  return async () => {
    for (const operation of [
      () => plans.listPlans({ ownerOrganizationId: a }, readerToken),
      () => plans.reopenPlan(planA.id, readerId),
      () => reports.getPreview({ ownerOrganizationId: a }, readerToken),
      () => reports.reopenReportConfirmation(reportA.confirmation.id, readerId),
      () => costs.getPreview({ ownerOrganizationId: a }, readerToken),
      () => costs.reopenInternalMonthlyInput(costA.input.id, readerId),
      () => costs.getAccountingPaymentPreview({ ownerOrganizationId: a }, readerToken),
    ]) await assert.rejects(operation, forbidden);
    pass('CRM organization grant revocation invalidates aggregate reads, saved plans/reports and cost workflows');
  };
}
