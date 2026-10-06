import type { MessageEvent } from '@nestjs/common';
import type { DatabaseService } from '../../../database/database.service.js';
import type { PlatformAdmissionService } from '../onboarding/platform-admission.service.js';
import { CommonNotificationService } from './notification.service.js';

function fixture() {
  let active = true;
  let granted = true;
  const queries: { where: { sourceAppCode: { in: string[] } } }[] = [];
  const recordQuery = async (args: (typeof queries)[number]) => { queries.push(args); return []; };
  const db = { client: { commonNotification: {
    findMany: recordQuery,
    count: async (args: (typeof queries)[number]) => { queries.push(args); return 0; },
    findFirst: async (args: (typeof queries)[number]) => { queries.push(args); return null; },
  } } } as unknown as DatabaseService;
  const admission = {
    state: async () => ({ status: active ? 'active' : 'suspended' }),
    isPlatformAdmin: async () => false,
    grants: async () => granted ? [{ serviceCode: 'sns' }] : [],
  } as unknown as PlatformAdmissionService;
  return { service: new CommonNotificationService(db, admission), queries,
    revoke: () => { granted = false; }, suspend: () => { active = false; } };
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('Notification app admission', () => {
  it('applies the same approved-source filter to list and unread counts', async () => {
    const { service, queries } = fixture();
    await service.findAll(1n);
    await service.getUnreadCount(1n);
    expect(queries).toHaveLength(3);
    for (const query of queries) expect(query.where.sourceAppCode.in).toEqual(['system', 'sns']);
    await service.findAll(1n, { sourceApp: 'crm' });
    expect(queries.at(-1)?.where.sourceAppCode.in).toEqual([]);
  });

  it('does not expose a revoked notification through read/unread mutation responses', async () => {
    const { service, revoke, queries } = fixture();
    revoke();
    await expect(service.markAsRead(20n, 1n, 'sns')).rejects.toThrow('not found');
    await expect(service.markAsUnread(20n, 1n, 'sns')).rejects.toThrow('not found');
    for (const query of queries) expect(query.where.sourceAppCode.in).toEqual([]);
  });

  it('rechecks service revocation and suspension for an already open event stream', async () => {
    const { service, revoke, suspend } = fixture();
    const events: MessageEvent[] = [];
    const subscription = service.streamForUser(1n).subscribe((event) => events.push(event));
    try {
      service.publishDomainEvent('sns', 'permitted', { title: 'visible' });
      service.publishDomainEvent('crm', 'restricted', { title: 'secret' });
      await flush();
      expect(events.filter((event) => event.type === 'domain-event')).toHaveLength(1);
      revoke();
      service.publishDomainEvent('sns', 'revoked', { title: 'secret' });
      await flush();
      expect(events.filter((event) => event.type === 'domain-event')).toHaveLength(1);
      suspend();
      service.publishDomainEvent('system', 'suspended', { title: 'secret' });
      await flush();
      expect(JSON.stringify(events)).not.toContain('secret');
    } finally { subscription.unsubscribe(); }
  });
});
