import { jest } from '@jest/globals';
import { AccessRequestService } from '../../src/modules/dms/access/access-request.service.js';
import type { SearchResultItem } from '@ssoo/types/dms';

const result: SearchResultItem = {
  id: 'doc', title: 'Document', excerpt: '', path: 'private.md', score: 1,
  isReadable: false, canRequestRead: true,
};

describe('DMS search request lifecycle', () => {
  it.each([
    ['approved', null, null, 'approved'],
    ['approved', new Date('2000-01-01'), null, 'revoked'],
    ['approved', null, new Date('2000-01-01'), 'expired'],
    ['approved', new Date('2000-01-01'), new Date('2000-01-01'), 'revoked'],
    ['pending', null, null, 'pending'],
  ] as const)('reports %s (revokedAt=%s, expiresAt=%s) as %s', async (statusCode, revokedAt, expiresAt, expected) => {
    const request = {
      accessRequestId: 2n, documentId: 1n, statusCode,
      requestMessage: 'Please share', requestedExpiresAt: null,
      respondedAt: null, responseMessage: null, createdAt: new Date('2026-01-01'),
      generatedGrant: { revokedAt, expiresAt },
    };
    const findMany = jest.fn(async () => [request, { ...request, accessRequestId: 1n, statusCode: 'approved' }]);
    const db = { client: {
      dmsDocument: { findMany: async () => [{ documentId: 1n, relativePath: 'private.md' }] },
      dmsDocumentAccessRequest: { findMany },
    } };
    const sync = { ensureRepoControlPlaneSynced: jest.fn(async () => undefined) };
    const service = new AccessRequestService(db as never, {} as never, {} as never,
      {} as never, {} as never, sync as never, {} as never, {} as never);

    const [actual] = await service.attachReadRequestStates({ userId: '7', loginId: 'reader' }, [result]);

    expect(actual.readRequest).toMatchObject({ requestId: '2', status: expected });
    expect(actual.isReadable).toBe(false);
    expect(actual.canRequestRead).toBe(true);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ requesterUserId: 7n }),
      select: expect.objectContaining({ generatedGrant: { select: { expiresAt: true, revokedAt: true } } }),
    }));
  });
});
