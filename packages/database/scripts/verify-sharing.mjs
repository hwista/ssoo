import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Called only inside verify-onboarding's newly created disposable database.
export async function verifySharing({ db, admission, onboarding, foundation, users, adminUser, organization, anotherOrganization, repoRoot, pass }) {
  const module = async (name) => import(path.join(repoRoot, 'apps/server/dist/modules', name));
  const { AccessService: SnsAccess } = await module('sns/access/access.service.js');
  const { PostAccessService } = await module('sns/post/post-access.service.js');
  const { PostService } = await module('sns/post/post.service.js');
  const { AccessService: DmsAccess } = await module('dms/access/access.service.js');
  const { DocumentVisibilityService } = await module('dms/access/document-visibility.service.js');
  const { DocumentControlPlaneService } = await module('dms/access/document-control-plane.service.js');
  const { DocumentProjectionService } = await module('dms/access/document-projection.service.js');
  const { DocumentRecordService } = await module('dms/access/document-record.service.js');
  const { DocumentAclService } = await module('dms/access/document-acl.service.js');
  const { FileCrudService } = await module('dms/file/file-crud.service.js');
  const { configService } = await module('dms/runtime/dms-config.service.js');
  const approve = { decision: 'approve', roleCode: 'user', message: '격리 공유 검증' };
  const createUser = async (name, org) => {
    const row = await users.create({ loginId: `sharing-${name}`, password: 'TestOnly123!x', userName: `공유 검증 ${name}`, email: `sharing-${name}@example.test`, roleCode: 'user' }, adminUser.id);
    const id = BigInt(row.id);
    for (const request of [{ kind: 'membership', organizationId: org.orgId.toString() }, ...['dms', 'sns'].map(serviceCode => ({ kind: 'service', serviceCode, organizationId: org.orgId.toString() }))]) {
      const created = await onboarding.create(id, { ...request, message: '공유 격리 검증' });
      await onboarding.decide(BigInt(created.id), adminUser.id, approve);
    }
    return { userId: row.id.toString(), loginId: `sharing-${name}` };
  };
  const owner = await createUser('owner', organization);
  const colleague = await createUser('colleague', organization);
  const outsider = await createUser('requester', anotherOrganization);
  const access = new SnsAccess(db, foundation, admission);
  const queue = { queueJob: async () => undefined };
  const sharing = new PostAccessService(db, access, admission, queue, { publishDomainEvent() {} });
  const posts = new PostService(db, access, { publishDomainEvent() {} }, queue);
  const orgPost = await posts.create({ content: '조직 A 게시물', visibilityScopeCode: 'organization', targetOrgId: organization.orgId.toString() }, owner);
  await access.assertReadablePost(colleague, orgPost.id);
  await assert.rejects(() => access.assertReadablePost(outsider, orgPost.id));
  await assert.rejects(() => posts.create({ content: '잘못된 조직', visibilityScopeCode: 'organization', targetOrgId: anotherOrganization.orgId.toString() }, owner));
  const publicPost = await posts.create({ content: '플랫폼 전체 공개', visibilityScopeCode: 'public' }, owner);
  await access.assertReadablePost(outsider, publicPost.id);
  const privatePost = await posts.create({ content: '비공개 원문', visibilityScopeCode: 'self' }, owner);
  const state = await sharing.state(privatePost.id, outsider);
  assert.deepEqual(Object.keys(state).sort(), ['canManage', 'canRead', 'postId', 'requests']);
  assert.equal(state.canRead, false);
  assert.equal(state.requests.length, 0);
  const request = await sharing.request(privatePost.id, outsider, { role: 'read', message: '검토 요청' });
  await assert.rejects(() => sharing.request(privatePost.id, outsider, { role: 'read', message: '중복' }));
  await assert.rejects(() => sharing.decide(request.id, outsider, { decision: 'approve' }));
  await assert.rejects(() => sharing.decide(request.id, colleague, { decision: 'approve' }));
  const decisions = await Promise.allSettled([sharing.decide(request.id, owner, { decision: 'approve' }), sharing.decide(request.id, owner, { decision: 'approve' })]);
  assert.equal(decisions.filter(result => result.status === 'fulfilled').length, 1);
  await access.assertReadablePost(outsider, privatePost.id);
  assert.equal((await db.client.snsPost.findUniqueOrThrow({ where: { id: privatePost.id } })).visibilityScopeCode, 'self');
  assert.equal(await db.client.snsPostAccessRequestHistory.count({ where: { id: request.id, statusCode: 'approved' } }), 1);
  pass('SNS explicit organization/public/private boundaries and owner-only concurrent sharing approval preserve base visibility and history');

  const writeRequest = await sharing.request(privatePost.id, outsider, { role: 'write', message: '공동 수정' });
  await sharing.decide(writeRequest.id, owner, { decision: 'approve' });
  await posts.update(privatePost.id, { content: '공동 수정 본문' }, outsider);
  await assert.rejects(() => posts.update(privatePost.id, { visibilityScopeCode: 'public' }, outsider));
  await assert.rejects(() => posts.softDelete(privatePost.id, outsider));
  await sharing.decide(writeRequest.id, owner, { decision: 'revoke' });
  await assert.rejects(() => access.assertReadablePost(outsider, privatePost.id));
  const expiring = await sharing.request(privatePost.id, outsider, { role: 'read', message: '만료 검증' });
  await sharing.decide(expiring.id, owner, { decision: 'approve', expiresAt: new Date(Date.now() + 60000).toISOString() });
  await db.client.snsPostAccessRequest.update({ where: { id: expiring.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  await assert.rejects(() => access.assertReadablePost(outsider, privatePost.id));
  const cancelled = await sharing.request(privatePost.id, outsider, { role: 'read', message: '철회 검증' });
  await sharing.decide(cancelled.id, outsider, { decision: 'cancel' });
  await assert.rejects(() => sharing.decide(cancelled.id, owner, { decision: 'approve' }));
  const revokedServiceRequest = await sharing.request(privatePost.id, outsider, { role: 'read', message: '서비스 회수 검증' });
  await sharing.decide(revokedServiceRequest.id, owner, { decision: 'approve' });
  const serviceGrant = (await admission.grants(BigInt(outsider.userId))).find(grant => grant.serviceCode === 'sns');
  await onboarding.revokeGrant(serviceGrant.id, adminUser.id);
  await assert.rejects(() => access.assertReadablePost(outsider, privatePost.id));
  const reapply = await onboarding.create(BigInt(outsider.userId), { kind: 'service', serviceCode: 'sns', organizationId: anotherOrganization.orgId.toString(), message: '브라우저 검증 재승인' });
  await onboarding.decide(BigInt(reapply.id), adminUser.id, approve);
  await sharing.decide(revokedServiceRequest.id, owner, { decision: 'revoke' });
  const followersPost = await posts.create({ content: '팔로워 공개 유지', visibilityScopeCode: 'followers' }, owner);
  await assert.rejects(() => access.assertReadablePost(outsider, followersPost.id));
  await db.client.snsFollow.create({ data: { followerUserId: BigInt(outsider.userId), followingUserId: BigInt(owner.userId) } });
  await access.assertReadablePost(outsider, followersPost.id);
  pass('SNS write grants cannot rescope/delete; revoke, expiry, cancellation and service revocation deny reads while followers remain supported');

  const dmsAccess = new DmsAccess(foundation, admission);
  const visibility = new DocumentVisibilityService(admission);
  const control = new DocumentControlPlaneService(db);
  const projection = new DocumentProjectionService(db);
  const records = new DocumentRecordService(db, projection);
  const acl = new DocumentAclService(control);
  const files = new FileCrudService(acl, control);
  for (const user of [owner, colleague, outsider]) await dmsAccess.assertFeatures(user, ['canReadDocuments']);
  assert.deepEqual(await visibility.resolve(owner, { scope: 'organization', targetOrgId: organization.orgId.toString() }), { scope: 'organization', targetOrgId: organization.orgId.toString() });
  await assert.rejects(() => visibility.resolve(owner, { scope: 'organization', targetOrgId: anotherOrganization.orgId.toString() }));
  for (const scope of ['self', 'public']) assert.deepEqual(await visibility.resolve(owner, { scope, targetOrgId: organization.orgId.toString() }), { scope });
  const originalRoot = configService.getDocDir;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-sharing-docs-'));
  configService.getDocDir = () => root;
  try {
    const documentPath = 'business/contract.md';
    const result = await files.write(documentPath, '# 업무 문서\n조직 문서 본문', owner, { businessOrganizationId: organization.orgId.toString() });
    assert.equal(result.success, true);
    const record = await records.ensureDocumentRecord(documentPath, result.data.metadata);
    await control.refreshProjectedMetadataByRelativePath(documentPath);
    const saved = await db.client.dmsDocument.findUniqueOrThrow({ where: { documentId: record.documentId } });
    assert.equal(saved.ownerUserId, BigInt(owner.userId));
    assert.equal(saved.visibilityScope, 'organization');
    assert.equal(saved.targetOrgId, organization.orgId);
    const absolute = path.join(root, documentPath);
    assert.equal(acl.isReadableAbsolutePath(colleague, absolute), true);
    assert.equal(acl.isReadableAbsolutePath(outsider, absolute), false);
    const regenerated = await files.write(documentPath, '# 업무 문서\n재생성', owner, { businessOrganizationId: organization.orgId.toString() });
    assert.equal(regenerated.success, true);
    assert.equal(regenerated.data.metadata.ownerId, owner.userId);
    assert.equal((await files.write(documentPath, '잘못된 조직 덮어쓰기', owner, { businessOrganizationId: anotherOrganization.orgId.toString() })).success, false);
    await db.client.dmsDocument.update({ where: { documentId: record.documentId }, data: { targetOrgId: null } });
    await control.refreshProjectedMetadataByRelativePath(documentPath);
    assert.equal(acl.isReadableAbsolutePath(colleague, absolute), false);
  } finally {
    configService.getDocDir = originalRoot;
    fs.rmSync(root, { recursive: true, force: true });
  }
  pass('DMS approved organization selection and real business-document writes preserve individual ownership, organization visibility and regeneration boundaries');
  return { owner, colleague, requester: outsider, privatePostId: privatePost.id.toString(), organizationId: organization.orgId.toString(), otherOrganizationId: anotherOrganization.orgId.toString() };
}
