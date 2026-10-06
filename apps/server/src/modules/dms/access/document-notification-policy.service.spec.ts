import { ForbiddenException } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { CommonNotificationItem } from '@ssoo/types/common';
import { DocumentNotificationPolicyService } from './document-notification-policy.service.js';
import { NotificationObjectPolicyService } from '../../common/notification/notification-object-policy.service.js';
import { DocumentAclService } from './document-acl.service.js';

const item: CommonNotificationItem = { id: '1', recipientUserId: '2', sourceApp: 'dms', notificationType: 'dms.document-access-grant.created',
  severity: 'info', title: 'private', isRead: false, createdAt: '2026-10-02T00:00:00Z', reference: { type: 'dms.document', id: '7', path: 'old.md' } };

function fixture() {
  let visibility: 'self' | 'organization' | 'public' = 'organization';
  let allowedOrganizations = ['13'];
  let granted = true;
  let expiresAt: string | undefined;
  const policies = new NotificationObjectPolicyService();
  const findDocument = jest.fn(async () => ({ relativePath: 'current.md' }));
  const assertFeatures = jest.fn(async (user: object) => { Object.assign(user, { dmsOrganizationIds: allowedOrganizations }); });
  const metadata = () => ({ ownerId: '1', visibility: { scope: visibility, targetOrgId: '13' }, grants: granted ? [{ principalType: 'user', principalId: '2', role: 'read', expiresAt }] : [] });
  const refresh = jest.fn(async () => metadata());
  const db = { client: { user: { findFirst: async () => ({ authAccount: { loginId: 'reader', accountStatusCode: 'active' } }) },
    dmsDocument: { findFirst: findDocument }, dmsDocumentAccessRequest: { findUnique: async () => ({ documentId: 7n }) } } };
  const policy = new DocumentNotificationPolicyService(db as never, policies, { assertFeatures } as never,
    new DocumentAclService({} as never), { refreshProjectedMetadataByRelativePath: refresh } as never);
  policy.onModuleInit();
  return { policy, policies, findDocument, assertFeatures, refresh,
    privateDocument: () => { visibility = 'self'; }, revoke: () => { granted = false; allowedOrganizations = []; },
    expire: () => { expiresAt = '2000-01-01T00:00:00Z'; } };
}

describe('DMS notification source authorization', () => {
  it('uses the current canonical document path and the same ACL as document reads', async () => {
    const { policy, refresh, findDocument, revoke } = fixture();
    await expect(policy.canReadNotification(item)).resolves.toBe(true);
    expect(findDocument).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ documentId: 7n, isActive: true }) }));
    expect(refresh).toHaveBeenCalledWith('current.md');
    revoke();
    await expect(policy.canReadNotification(item)).resolves.toBe(false);
  });
  it('handles expired per-user grants and current service permission separately', async () => {
    const { policy, privateDocument, expire, assertFeatures } = fixture();
    privateDocument();
    await expect(policy.canReadNotification(item)).resolves.toBe(true);
    expire();
    await expect(policy.canReadNotification(item)).resolves.toBe(false);
    assertFeatures.mockRejectedValue(new ForbiddenException('service revoked'));
    await expect(policy.canReadNotification(item)).resolves.toBe(false);
  });
  it('resolves request IDs to their document and denies missing metadata instead of legacy-open fallback', async () => {
    const { policy, findDocument, refresh } = fixture();
    await policy.canReadNotification({ ...item, reference: { type: 'dms.document-access-request', id: '19' } });
    expect(findDocument).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ documentId: 7n }) }));
    refresh.mockResolvedValueOnce(null as never);
    await expect(policy.canReadNotification(item)).resolves.toBe(false);
  });
  it('redacts document comment events after permission revocation through the registered policy', async () => {
    const { policies, revoke } = fixture();
    revoke();
    const event = await policies.protectEvent(2n, { type: 'domain-event', sourceApp: 'dms', emittedAt: '',
      domainEvent: { type: 'dms.document-comment.changed', payload: { documentId: '7', path: 'private.md', actorUserName: 'private actor' } } });
    expect(event.domainEvent?.payload).toEqual({});
  });
});
