import assert from 'node:assert/strict';
import { verifyCrmPlanningOrganization } from './verify-crm-planning-organization.mjs';
import { verifyCrmOperationsOrganization } from './verify-crm-operations-organization.mjs';
import { CrmAccessService } from '../../../apps/server/dist/modules/crm/access/access.service.js';
import { OpportunityService } from '../../../apps/server/dist/modules/crm/opportunity/opportunity.service.js';
import { CustomerService } from '../../../apps/server/dist/modules/crm/customer/customer.service.js';
import { ContractService } from '../../../apps/server/dist/modules/crm/contract/contract.service.js';

// Invoked only by verify-onboarding against its disposable, seeded database.
export async function verifyCrmOrganization({ db, admission, onboarding, foundation, readerId, readerToken, adminUser, organization, anotherOrganization, pass }) {
  for (const [org, roleCode] of [[organization, 'manager'], [anotherOrganization, 'viewer']]) {
    const request = await onboarding.create(readerId, { kind: 'service', organizationId: String(org.orgId), serviceCode: 'crm', message: 'CRM 조직 범위 검증' });
    await onboarding.decide(BigInt(request.id), adminUser.id, { decision: 'approve', roleCode, message: '검증 승인' });
  }
  const access = new CrmAccessService(db, foundation);
  const opportunities = new OpportunityService(db, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, admission, access);
  const customers = new CustomerService(db, undefined, admission, access);
  const contracts = new ContractService(db, undefined, undefined, undefined, undefined, undefined, undefined, admission, access);
  const a = String(organization.orgId), b = String(anotherOrganization.orgId);
  const opportunityInput = {
    ownerOrganizationId: a, customerName: '조직 검증 고객', opportunityName: '조직 검증 영업기회', ownerName: '다른 조직 조회자', ownerUserId: String(readerId),
    businessType: 'SI', industryLine: '그룹', region: 'domestic', status: 'proposal', priority: 'medium',
    revenueLines: [{ category: 'product', label: '검증 상품', quantity: 1, unitPrice: 10000 }], costLines: [],
  };
  await assert.rejects(() => opportunities.createOpportunity({ ...opportunityInput, ownerOrganizationId: b }, readerId));
  const opportunity = await opportunities.createOpportunity(opportunityInput, readerId);
  assert.equal(opportunity.ownerOrganizationId, a);
  await opportunities.updateOpportunity(opportunity.id, { ...opportunityInput, ownerUserId: String(adminUser.id) }, readerId);
  assert.equal((await opportunities.getOpportunity(opportunity.id)).ownerOrganizationId, a);
  await assert.rejects(() => opportunities.updateOpportunity(opportunity.id, { ...opportunityInput, ownerOrganizationId: b }, readerId));
  await opportunities.confirmOpportunity(opportunity.id);
  const version = await opportunities.addOpportunityVersion(opportunity.id);
  assert.equal(version.ownerOrganizationId, a);
  const stored = await db.client.crmOpportunity.findUniqueOrThrow({ where: { opportunityCode: opportunity.id } });
  assert.equal((await db.client.crmOpportunityHistory.findFirstOrThrow({ where: { opportunityId: stored.id }, orderBy: { historySeq: 'desc' } })).ownerOrganizationId, organization.orgId);
  pass('CRM creates require approved write organizations; responsibility changes and versions preserve organization and history');

  const customerInput = { ownerOrganizationId: a, customerName: '조직 검증 고객', ownerName: '담당자', ownerUserId: String(readerId), industryLine: '그룹', region: 'domestic', nextAction: '검증' };
  const customer = await customers.createCustomer({ ...customerInput, sourceOpportunityId: String(stored.id) }, readerId);
  assert.equal(customer.ownerOrganizationId, a);
  const contractInput = { ...opportunityInput, contractName: '조직 검증 계약', contractStartDate: '2026-10-01', contractEndDate: '2026-10-31', sourceOpportunityId: opportunity.id };
  const contract = await contracts.createContract(contractInput, readerId);
  assert.equal(contract.ownerOrganizationId, a);
  const storedContract = await db.client.crmContract.findUniqueOrThrow({ where: { contractCode: contract.code } });
  assert.equal((await db.client.crmContractHistory.findFirstOrThrow({ where: { contractId: storedContract.id } })).ownerOrganizationId, organization.orgId);
  await assert.rejects(() => contracts.createContract({ ...contractInput, ownerOrganizationId: b }, adminUser.id));
  const other = await opportunities.createOpportunity({ ...opportunityInput, ownerOrganizationId: b }, adminUser.id);
  const otherStored = await db.client.crmOpportunity.findUniqueOrThrow({ where: { opportunityCode: other.id } });
  await assert.rejects(() => customers.addActivity(customer.id, { type: 'call', status: 'done', subject: '교차 조직 연결', occurredAt: '2026-10-01', ownerName: '담당자', summary: '검증', sourceOpportunityId: String(otherStored.id) }, readerId));
  pass('CRM contracts inherit source organization; customer/activity cross-organization links are rejected');

  assert.equal((await access.getOpportunityAccess(other.id, readerToken)).features.canViewOpportunity, true);
  assert.equal((await access.getOpportunityAccess(other.id, readerToken)).features.canEditOpportunity, false);
  const legacy = await db.client.crmOpportunity.findFirstOrThrow({ where: { isActive: true, ownerOrganizationId: null } });
  assert.equal((await access.getOpportunityAccess(legacy.opportunityCode, readerToken)).features.canViewOpportunity, false);
  assert.equal((await opportunities.listResponse({}, readerToken)).items.some(row => !row.ownerOrganizationId), false);
  assert.equal((await customers.listResponse({}, readerToken)).items.some(row => !row.ownerOrganizationId), false);
  assert.equal((await contracts.listResponse({}, readerToken)).items.some(row => !row.ownerOrganizationId), false);
  await access.assertContractCapability(readerToken, 'canWriteContract', contract.code);
  const verifyRevokedPlanning = await verifyCrmPlanningOrganization({ db, access, foundation, opportunities, contracts, readerId, readerToken, adminUser, organization, anotherOrganization, pass });
  const verifyRevokedOperations = await verifyCrmOperationsOrganization({ db, access, opportunities, contracts, readerId, readerToken, adminUser, organization, anotherOrganization, pass });
  const grant = (await admission.grants(readerId)).find(row => row.serviceCode === 'crm' && row.orgId === organization.orgId);
  await onboarding.revokeGrant(grant.id, adminUser.id);
  await verifyRevokedPlanning();
  await verifyRevokedOperations();
  assert.equal((await access.getOpportunityAccess(opportunity.id, readerToken)).features.canViewOpportunity, false);
  assert.equal((await access.getCustomerAccess(customer.id, readerToken)).features.canViewCustomer, false);
  await assert.rejects(() => access.assertContractCapability(readerToken, 'canReadContract', contract.code));
  assert.equal((await opportunities.listResponse({}, readerToken)).items.some(row => row.ownerOrganizationId === a), false);
  assert.equal((await contracts.listResponse({}, readerToken)).items.some(row => row.ownerOrganizationId === a), false);
  pass('CRM lists/details exclude legacy unassigned records; per-organization viewer and revoked grants override ownership');
}
