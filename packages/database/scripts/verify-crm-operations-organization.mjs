import assert from 'node:assert/strict';
import { CrmOperationAttemptService } from '../../../apps/server/dist/modules/crm/operations/operation-attempt.service.js';
import { CrmOperationRetryService } from '../../../apps/server/dist/modules/crm/operations/operation-retry.service.js';
import { CrmDataQualityService } from '../../../apps/server/dist/modules/crm/operations/data-quality.service.js';

export async function verifyCrmOperationsOrganization({ db, access, opportunities, contracts, readerId, readerToken, adminUser, organization, anotherOrganization, pass }) {
  const attempts = new CrmOperationAttemptService(db, access);
  const dataQuality = new CrmDataQualityService(db, access);
  const sourceA = await db.client.crmOpportunity.findFirstOrThrow({ where: { ownerOrganizationId: organization.orgId } });
  const sourceB = await db.client.crmOpportunity.findFirstOrThrow({ where: { ownerOrganizationId: anotherOrganization.orgId } });
  const legacy = await db.client.crmOpportunity.findFirstOrThrow({ where: { ownerOrganizationId: null } });
  for (const source of [sourceA, sourceB, legacy]) {
    await assert.rejects(() => attempts.run({ target: 'dms', action: 'quote-dms-lifecycle', sourceEntityType: 'crm.opportunity', sourceEntityId: source.opportunityCode, requestedBy: adminUser.id, fingerprintInput: { fixture: true }, execute: async () => { throw new Error('isolated test failure'); }, evidence: () => ({}) }));
  }
  const before = await attempts.list({}, readerToken);
  assert.equal(before.totalCount, 2);
  assert.equal(before.failedCount, 2);
  assert.equal(before.unresolvedFailedCount, 2);
  assert.equal(before.items.some(row => row.sourceEntityId === legacy.opportunityCode), false);
  const attemptA = before.items.find(row => row.sourceEntityId === sourceA.opportunityCode);
  const attemptB = before.items.find(row => row.sourceEntityId === sourceB.opportunityCode);
  assert.ok(attemptA && attemptB);
  await attempts.get(attemptB.id, readerToken);
  // The real retry dispatcher must reject before it enters any DMS/file workflow.
  const retry = new CrmOperationRetryService(attempts, opportunities, contracts, undefined, undefined, access);
  await assert.rejects(() => retry.retry(attemptB.id, readerToken), error => error.getStatus?.() === 403);
  assert.equal(await db.client.crmOperationAttempt.count(), 3);
  const quality = await dataQuality.getReport(readerToken);
  assert.equal(JSON.stringify(quality).includes(legacy.opportunityCode), false);
  pass('CRM operation lists/counts and quality diagnostics exclude unapproved sources; retry rechecks source write access');
  return async () => {
    const remaining = await attempts.list({}, readerToken);
    assert.equal(remaining.totalCount, 1);
    assert.equal(remaining.items[0].id, attemptB.id);
    assert.equal(remaining.unresolvedFailedCount, 1);
    await assert.rejects(() => attempts.get(attemptA.id, readerToken), error => error.getStatus?.() === 404);
    await assert.rejects(() => retry.retry(attemptA.id, readerToken), error => error.getStatus?.() === 404);
    pass('CRM revoked organizations disappear from operation counts, direct attempt detail and retry');
  };
}
