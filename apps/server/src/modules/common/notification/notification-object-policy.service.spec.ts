import type { MessageEvent } from '@nestjs/common';
import type { CommonNotificationItem, CommonNotificationStreamEvent } from '@ssoo/types/common';
import { NotificationObjectPolicyService } from './notification-object-policy.service.js';
import { CommonNotificationService } from './notification.service.js';

const item: CommonNotificationItem = {
  id: '9', recipientUserId: '2', actorUserId: '17', sourceApp: 'dms',
  notificationType: 'dms.document-access-grant.revoked', severity: 'warning',
  title: 'secret-title', message: 'secret-body',
  reference: { type: 'dms.document', id: '8', path: 'secret-path.md' },
  action: { type: 'open-dms-document', payload: { documentId: '8', path: 'secret-path.md', body: 'secret-body' } },
  dedupeKey: 'secret-dedupe', isRead: false, createdAt: '2026-10-02T00:00:00Z',
};
const flush = () => new Promise<void>(resolve => setImmediate(resolve));

function fixture() {
  let readable = true;
  const policy = new NotificationObjectPolicyService();
  policy.register('dms', { canReadNotification: async () => readable, canReadDomainEvent: async () => readable });
  const record = {
    id: 9n, recipientUserId: 2n, actorUserId: 17n, sourceAppCode: 'dms',
    notificationType: item.notificationType, severityCode: 'warning', title: item.title, message: item.message,
    referenceType: item.reference?.type, referenceId: '8', referencePath: 'secret-path.md',
    actionType: item.action?.type, actionPayload: item.action?.payload,
    dedupeKey: item.dedupeKey, isRead: false, readAt: null, archivedAt: null, createdAt: new Date(item.createdAt),
  };
  const db = { client: { commonNotification: {
    findMany: async () => [record], count: async () => 1, findFirst: async () => record,
    update: async ({ data }: { data: { isRead?: boolean } }) => { Object.assign(record, data); return record; },
  } } };
  const admission = { state: async () => ({ status: 'active' }), isPlatformAdmin: async () => false, grants: async () => [{ serviceCode: 'dms' }] };
  const service = new CommonNotificationService(db as never, admission as never, policy);
  return { policy, service, revoke: () => { readable = false; } };
}

describe('Notification object boundary', () => {
  it('retains the original notification and its recovery action while access is valid', async () => {
    const { policy } = fixture();
    await expect(policy.protectItem(item)).resolves.toBe(item);
  });
  it('redacts all object fields after revocation but preserves status, read history and a safe status action', async () => {
    const { policy, revoke } = fixture();
    revoke();
    const result = await policy.protectItem(item);
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(result.reference).toBeUndefined();
    expect(result.actorUserId).toBeUndefined();
    expect(result).toMatchObject({ id: '9', isRead: false, title: '문서 권한 회수', notificationType: item.notificationType,
      action: { type: 'open-dms-settings-section', payload: { section: 'access-requests' } } });
    expect(result.action?.payload).not.toHaveProperty('documentId');
  });
  it('fails closed when the source policy is not registered, without altering other sources', async () => {
    const policy = new NotificationObjectPolicyService();
    expect(JSON.stringify(await policy.protectItem(item))).not.toContain('secret');
    const crm = { ...item, sourceApp: 'crm' as const };
    await expect(policy.protectItem(crm)).resolves.toBe(crm);
  });
  it('retains only the safe SNS legacy notification ID required for read-state synchronization', async () => {
    const policy = new NotificationObjectPolicyService();
    const result = await policy.protectItem({ ...item, sourceApp: 'sns', dedupeKey: 'sns:legacy:19' });
    expect(result.dedupeKey).toBe('sns:legacy:19');
    expect(result.action).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('secret');
    expect((await policy.protectItem({ ...item, sourceApp: 'sns', dedupeKey: 'sns:legacy:19:secret-path' })).dedupeKey).toBeUndefined();
  });
  it('applies current object checks to list and read/unread responses without changing pagination or counts', async () => {
    const { service, revoke } = fixture();
    expect((await service.findAll(2n)).items[0]?.title).toBe('secret-title');
    revoke();
    const list = await service.findAll(2n);
    expect(list).toMatchObject({ total: 1, page: 1, pageSize: 20 });
    expect(JSON.stringify(list)).not.toContain('secret');
    expect(await service.getUnreadCount(2n)).toEqual({ count: 1 });
    const read = await service.markAsRead(9n, 2n);
    expect(read.isRead).toBe(true);
    expect(JSON.stringify(read)).not.toContain('secret');
    const unread = await service.markAsUnread(9n, 2n);
    expect(unread.isRead).toBe(false);
    expect(JSON.stringify(unread)).not.toContain('secret');
  });
  it('rechecks each queued stream event and retains only invalidation signals for revoked readers', async () => {
    const { service, revoke } = fixture();
    const events: MessageEvent[] = [];
    const subscription = service.streamForUser(2n, 'dms').subscribe(event => events.push(event));
    try {
      service.publishCommittedNotifications([item]);
      await flush();
      expect(JSON.stringify(events)).toContain('secret-title');
      events.length = 0;
      service.publishCommittedNotifications([item]);
      revoke(); // Queued delivery must not reuse the permissions from enqueue time.
      service.publishDomainEvent('dms', 'dms.document-access.changed', { path: 'secret-path.md', documentId: '8', title: 'secret-title' });
      await flush();
      expect(JSON.stringify(events)).not.toContain('secret');
      const event = events.find(value => value.type === 'domain-event')?.data as CommonNotificationStreamEvent;
      expect(event.domainEvent).toEqual({ type: 'dms.document-access.changed', payload: {} });
    } finally { subscription.unsubscribe(); }
  });
  it('does not silently translate a database outage into a permission decision', async () => {
    const policy = new NotificationObjectPolicyService();
    policy.register('dms', { canReadNotification: async () => { throw new Error('DB unavailable'); }, canReadDomainEvent: async () => false });
    await expect(policy.protectItem(item)).rejects.toThrow('DB unavailable');
  });
});
