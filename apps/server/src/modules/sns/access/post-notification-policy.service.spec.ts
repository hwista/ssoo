import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { CommonNotificationItem } from '@ssoo/types/common';
import { NotificationObjectPolicyService } from '../../common/notification/notification-object-policy.service.js';
import { PostNotificationPolicyService } from './post-notification-policy.service.js';

const item: CommonNotificationItem = { id: '1', recipientUserId: '2', sourceApp: 'sns', notificationType: 'comment', severity: 'info', title: 'private',
  isRead: false, createdAt: '2026-10-02T00:00:00Z', reference: { type: 'post', id: '7' } };
function fixture() {
  const policies = new NotificationObjectPolicyService();
  const readable = jest.fn(async () => ({}));
  const features = jest.fn(async () => undefined);
  const comment = jest.fn(async () => ({ postId: 7n }));
  const policy = new PostNotificationPolicyService({ client: { snsComment: { findFirst: comment } } } as never, policies,
    { assertReadablePost: readable, assertFeatures: features } as never);
  policy.onModuleInit();
  return { policy, policies, readable, features, comment };
}
describe('SNS notification source authorization', () => {
  it('rechecks the normal post policy for grant, organization, expiry and deletion decisions', async () => {
    const { policy, readable, features } = fixture();
    await expect(policy.canReadNotification(item)).resolves.toBe(true);
    expect(readable).toHaveBeenCalledWith({ userId: '2', loginId: '' }, 7n);
    readable.mockRejectedValue(new NotFoundException());
    await expect(policy.canReadNotification(item)).resolves.toBe(false);
    features.mockRejectedValue(new ForbiddenException());
    await expect(policy.canReadNotification(item)).resolves.toBe(false);
  });
  it('resolves comment references to their current parent post before showing comment text', async () => {
    const { policy, readable, comment } = fixture();
    await expect(policy.canReadNotification({ ...item, reference: { type: 'comment', id: '12' } })).resolves.toBe(true);
    expect(comment).toHaveBeenCalledWith({ where: { id: 12n, isActive: true }, select: { postId: true } });
    expect(readable).toHaveBeenCalledWith(expect.anything(), 7n);
    comment.mockResolvedValueOnce(null as never);
    await expect(policy.canReadNotification({ ...item, reference: { type: 'comment', id: '12' } })).resolves.toBe(false);
  });
  it('preserves profile/follow notices and rejects malformed post identifiers', async () => {
    const { policy, readable } = fixture();
    await expect(policy.canReadNotification({ ...item, reference: { type: 'profile', id: '8' } })).resolves.toBe(true);
    for (const id of ['-1', '0', '9223372036854775808', 'wrong']) await expect(policy.canReadNotification({ ...item, reference: { type: 'post', id } })).resolves.toBe(false);
    expect(readable).not.toHaveBeenCalled();
    await expect(policy.canReadNotification({ ...item, reference: { type: 'profile', id: '8' }, action: { type: 'open-sns-reference', payload: { postId: 'wrong' } } })).resolves.toBe(false);
    await expect(policy.canReadDomainEvent(2n, { type: 'sns.follow.changed', payload: { postId: 'wrong' } })).resolves.toBe(false);
    await expect(policy.canReadDomainEvent(2n, { type: 'sns.follow.changed', payload: { userId: '8' } })).resolves.toBe(true);
  });
  it('redacts revoked sharing events while retaining the refresh signal', async () => {
    const { policies, readable } = fixture();
    readable.mockRejectedValue(new NotFoundException());
    const result = await policies.protectEvent(2n, { type: 'domain-event', sourceApp: 'sns', emittedAt: '', domainEvent: { type: 'sns.post-access.changed', payload: { postId: '7', title: 'private' } } });
    expect(result.domainEvent).toEqual({ type: 'sns.post-access.changed', payload: {} });
  });
});
