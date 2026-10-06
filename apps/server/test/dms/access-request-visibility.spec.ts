import { jest } from '@jest/globals';
import { AccessRequestService } from '../../src/modules/dms/access/access-request.service.js';
import { extractTargetOrgId, extractVisibilityScope } from '../../src/modules/dms/access/access-request.util.js';

describe('DMS visibility survives canonical metadata reconciliation', () => {
  it.each(['organization', 'self', 'public'] as const)('persists %s in both access columns and canonical metadata', async (scope) => {
    const record = {
      documentId: 1n, ownerUserId: 7n, relativePath: 'private.md',
      visibilityScope: scope, targetOrgId: scope === 'organization' ? 13n : null,
      // Simulates an earlier column-only update that left stale metadata behind.
      metadataJson: { title: 'Keep title', ownerId: '7', visibility: { scope: 'organization', targetOrgId: '99' } },
    };
    const update = jest.fn(async () => record);
    const clearCache = jest.fn();
    const publish = jest.fn();
    const visibility = { scope, ...(scope === 'organization' ? { targetOrgId: '13' } : {}) };
    const db = { client: { dmsDocument: { findUnique: async () => record, update } } };
    const service = new AccessRequestService(db as never, {} as never,
      { clearCachedMetadataByRelativePath: clearCache } as never,
      {} as never, {} as never, {} as never,
      { publishDomainEvent: publish } as never,
      { resolve: async () => visibility } as never);

    await service.updateDocumentVisibility({ userId: '7', loginId: 'owner' }, '1', scope, visibility.targetOrgId);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      visibilityScope: scope, targetOrgId: scope === 'organization' ? 13n : null,
      metadataJson: { title: 'Keep title', ownerId: '7', visibility },
    }) }));
    const data = (update.mock.calls[0] as unknown as [{ data: { metadataJson: Record<string, unknown> } }])[0].data;
    // Reconciliation derives these columns from metadata, so it must reproduce the selected scope.
    expect(extractVisibilityScope(data.metadataJson)).toBe(scope);
    expect(extractTargetOrgId(data.metadataJson)).toBe(scope === 'organization' ? 13n : null);
    expect(clearCache).toHaveBeenCalledWith('private.md');
    expect(publish).toHaveBeenCalledWith('dms', 'dms.document-access.changed', expect.objectContaining({ reason: 'visibility' }));
  });
});
