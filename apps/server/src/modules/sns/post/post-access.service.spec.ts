import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { PostAccessService } from './post-access.service.js';

function fixture() {
  const request = {
    id: 7n, postId: 3n, requesterUserId: 2n, requestedRole: 'read',
    statusCode: 'pending', isActive: true, expiresAt: null,
    post: { id: 3n, authorUserId: 1n, isActive: true },
  };
  const update = jest.fn(async () => ({ count: 1 }));
  const create = jest.fn(async () => request);
  const requests = {
    findFirst: async () => request, updateMany: update,
    findUniqueOrThrow: async () => request, findMany: async () => [], create,
  };
  const tx = { snsPostAccessRequest: requests };
  const db = { client: {
    ...tx, $transaction: async (run: (transaction: typeof tx) => Promise<unknown>) => run(tx),
    snsPost: { findFirst: jest.fn(async (query: { select?: { authorUserId?: boolean } }) => query.select?.authorUserId ? request.post : null) },
  } };
  const admission = { assertService: jest.fn(async () => undefined), isPlatformAdmin: async () => false };
  const access = { hasSystemOverride: async () => false, buildVisiblePostWhere: async () => ({ isActive: true }), assertFeatures: async () => undefined };
  const queue = jest.fn(async () => undefined);
  const publish = jest.fn();
  const service = new PostAccessService(db as never, access as never, admission as never, { queueJob: queue } as never, { publishDomainEvent: publish } as never);
  return { service, request, update, create, admission, queue, publish };
}

const owner = { userId: '1', loginId: 'owner' };
const requester = { userId: '2', loginId: 'requester' };
describe('SNS individual sharing', () => {
  it('does not expose post content in the request surface', async () => {
    const { service } = fixture();
    await expect(service.state(3n, requester)).resolves.toEqual({ postId: 3n, canRead: false, canManage: false, requests: [] });
  });
  it('rejects blank requests and write requests before read access without creating rows', async () => {
    const { service, create } = fixture();
    await expect(service.request(3n, requester, { role: 'read', message: ' ' })).rejects.toThrow();
    await expect(service.request(3n, requester, { role: 'write', message: 'edit' })).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
  it('rejects both self approval and unrelated approvers without writing', async () => {
    const { service, update } = fixture();
    for (const user of [requester, { userId: '4', loginId: 'other' }]) await expect(service.decide(7n, user, { decision: 'approve' })).rejects.toThrow(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });
  it('checks applicant service admission before approving', async () => {
    const { service, admission, update } = fixture();
    admission.assertService.mockImplementation(async (...args: unknown[]) => {
      if (args[0] === 2n) throw new ForbiddenException('SNS revoked');
    });
    await expect(service.decide(7n, owner, { decision: 'approve' })).rejects.toThrow('SNS revoked');
    expect(update).not.toHaveBeenCalled();
  });
  it('rejects expired decisions and detects concurrent decisions', async () => {
    const { service, update } = fixture();
    await expect(service.decide(7n, owner, { decision: 'approve', expiresAt: '2000-01-01T00:00:00Z' })).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
    update.mockResolvedValue({ count: 0 });
    await expect(service.decide(7n, owner, { decision: 'reject' })).rejects.toThrow('다른 요청에서 이미 처리');
  });
  it('allows requester cancellation and rejects subsequent approval', async () => {
    const { service, request, update } = fixture();
    await service.decide(7n, requester, { decision: 'cancel' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ statusCode: 'cancelled' }) }));
    request.statusCode = 'cancelled';
    await expect(service.decide(7n, owner, { decision: 'approve' })).rejects.toThrow('이미 처리된 신청');
  });
  it('rechecks approved status on revocation and does not undo a commit when indexing fails', async () => {
    const { service, request, update, queue, publish } = fixture();
    await expect(service.decide(7n, owner, { decision: 'revoke' })).rejects.toThrow('이미 처리된 신청');
    request.statusCode = 'approved';
    queue.mockRejectedValue(new Error('index offline'));
    await expect(service.decide(7n, owner, { decision: 'revoke' })).resolves.toBe(request);
    expect(publish).toHaveBeenCalledWith('sns', 'sns.post-access.changed', { postId: '3' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ statusCode: 'approved' }), data: expect.objectContaining({ statusCode: 'revoked' }) }));
  });
});
