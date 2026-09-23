import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { validate } from 'class-validator';
import type { DatabaseService } from '../../../database/database.service.js';
import type { CommonNotificationService } from '../../common/notification/notification.service.js';
import type { ProjectAccessService } from '../project/project-access.service.js';
import type { AccessFoundationService } from '../../common/access/access-foundation.service.js';
import { PmsSettingsService, DEFAULT_PMS_SETTINGS } from './settings.service.js';
import { UpdatePmsSettingsDto } from './settings.controller.js';
import { PmsWorkNotificationService } from './work-notification.service.js';

function fixture() {
  const user = { id: 2n, userName: '멤버', displayName: null, authAccount: { loginId: 'member', lockedUntil: null as Date | null } };
  const tx = {
    user: { findFirst: jest.fn(async () => user as typeof user | null) },
    projectMember: { findFirst: jest.fn(async () => ({ userId: 2n }) as { userId: bigint } | null) },
    pmsUserSettings: { findUnique: jest.fn(async () => ({ ...DEFAULT_PMS_SETTINGS })) },
    $queryRaw: jest.fn<(...args: unknown[]) => Promise<unknown[]>>(async () => []),
  };
  const db = { client: tx } as unknown as DatabaseService;
  const settings = new PmsSettingsService(db);
  const notifications = { createInTransaction: jest.fn(async () => ({ id: '7' })), publishCommittedNotifications: jest.fn() };
  const access = { assertProjectCapability: jest.fn(async () => ({})) };
  const service = new PmsWorkNotificationService(db, settings,
    notifications as unknown as CommonNotificationService, access as unknown as ProjectAccessService,
    { getUserOrganizationIds: async () => [] } as unknown as AccessFoundationService);
  const input = { projectId: 42n, actorUserId: 1n, recipients: [1n, 2n, 2n, null], kind: 'task-assignment' as const, referenceId: 10n, title: '작업' };
  return { tx, settings, notifications, access, service, input, user, client: tx as unknown as DatabaseService['client'] };
}

describe('PMS work notification recipient policy', () => {
  it('excludes actor, null and duplicates and publishes only explicitly after commit', async () => {
    const f = fixture();
    const items = await f.service.create(f.client, f.input);
    expect(items).toHaveLength(1);
    expect(f.notifications.createInTransaction).toHaveBeenCalledTimes(1);
    expect(f.notifications.publishCommittedNotifications).not.toHaveBeenCalled();
    f.service.publish(items);
    expect(f.notifications.publishCommittedNotifications).toHaveBeenCalledWith(items);
  });

  it('suppresses only the disabled notification kind', async () => {
    const f = fixture();
    f.tx.pmsUserSettings.findUnique.mockResolvedValue({ ...DEFAULT_PMS_SETTINGS, notifyTaskAssignment: false });
    expect(await f.service.create(f.client, f.input)).toEqual([]);
    expect(await f.service.create(f.client, { ...f.input, kind: 'issue-update' })).toHaveLength(1);
  });

  it('excludes inactive accounts and recipients whose project access was revoked', async () => {
    const f = fixture();
    f.tx.user.findFirst.mockResolvedValueOnce(null);
    expect(await f.service.create(f.client, f.input)).toEqual([]);
    f.access.assertProjectCapability.mockRejectedValueOnce(new ForbiddenException());
    expect(await f.service.create(f.client, f.input)).toEqual([]);
  });

  it('rejects inactive membership and locked accounts when assigning', async () => {
    const f = fixture();
    f.tx.projectMember.findFirst.mockResolvedValueOnce(null);
    await expect(f.service.assertAssignee(f.client, 42n, 2n)).rejects.toThrow('활성 멤버');
    f.user.authAccount.lockedUntil = new Date(Date.now() + 60_000);
    await expect(f.service.assertAssignee(f.client, 42n, 2n)).rejects.toThrow('활성 멤버');
  });

  it('does not hide infrastructure or notification storage failures', async () => {
    const f = fixture();
    f.access.assertProjectCapability.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(f.service.create(f.client, f.input)).rejects.toThrow('database unavailable');
    f.notifications.createInTransaction.mockRejectedValueOnce(new Error('notification write failed'));
    await expect(f.service.create(f.client, f.input)).rejects.toThrow('notification write failed');
  });

  it('locks multiple preferences in stable bigint order', async () => {
    const f = fixture();
    await f.service.create(f.client, { ...f.input, recipients: [9n, 2n] });
    expect(f.tx.$queryRaw.mock.calls.map((call) => call[1])).toEqual(['pms-settings:2', 'pms-settings:9']);
    expect(f.notifications.createInTransaction.mock.calls).toHaveLength(2);
  });
});

describe('PMS settings input', () => {
  it('rejects null booleans, strings and unsupported project views', async () => {
    for (const patch of [{ showCompletedTasks: null }, { notifyIssueUpdate: 'false' }, { defaultProjectView: 'calendar' }]) {
      expect((await validate(Object.assign(new UpdatePmsSettingsDto(), patch))).length).toBeGreaterThan(0);
    }
  });
  it('accepts independent patches including false', async () => {
    expect(await validate(Object.assign(new UpdatePmsSettingsDto(), { notifyTaskAssignment: false }))).toEqual([]);
    expect(await validate(Object.assign(new UpdatePmsSettingsDto(), { defaultProjectView: 'timeline' }))).toEqual([]);
  });
});
