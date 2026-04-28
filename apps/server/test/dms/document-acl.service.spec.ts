import path from 'path';
import { jest } from '@jest/globals';
import type { TokenPayload } from '../../src/modules/common/auth/interfaces/auth.interface.js';
import { DocumentAclService } from '../../src/modules/dms/access/document-acl.service.js';
import { configService } from '../../src/modules/dms/runtime/dms-config.service.js';
import type { DocumentMetadata } from '@ssoo/types/dms';

const ROOT = '/tmp/dms-acl-test-root';

function makeUser(overrides: Partial<TokenPayload> = {}): TokenPayload {
  return {
    userId: 'u-1',
    loginId: 'alice',
    userName: 'Alice',
    sessionId: 's-1',
    organizationIds: ['org-1'],
    teamIds: [],
    groupIds: [],
    type: 'access',
    ...overrides,
  } as TokenPayload;
}

function makeMetadata(partial: Partial<DocumentMetadata> & Record<string, unknown> = {}): DocumentMetadata {
  return {
    relativePath: 'sample.md',
    title: 'sample',
    acl: { owners: [], editors: [], viewers: [] },
    grants: [],
    ...partial,
  } as DocumentMetadata;
}

describe('DocumentAclService', () => {
  let getCachedMetadataMock: jest.Mock;
  let service: DocumentAclService;

  beforeAll(() => {
    jest.spyOn(configService, 'getDocDir').mockReturnValue(ROOT);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    getCachedMetadataMock = jest.fn();
    const fakeControlPlane = {
      getCachedMetadataByRelativePath: getCachedMetadataMock,
    } as unknown as ConstructorParameters<typeof DocumentAclService>[0];
    service = new DocumentAclService(fakeControlPlane);
  });

  describe('buildOwnerAcl', () => {
    it('uses userId when present', () => {
      const acl = service.buildOwnerAcl(makeUser({ userId: 'u-42', loginId: 'alice' }));
      expect(acl).toEqual({ owners: ['u-42'], editors: [], viewers: [] });
    });

    it('falls back to loginId when userId is empty', () => {
      const acl = service.buildOwnerAcl(makeUser({ userId: '', loginId: 'bob' }));
      expect(acl).toEqual({ owners: ['bob'], editors: [], viewers: [] });
    });

    it('returns empty owners when both are blank', () => {
      const acl = service.buildOwnerAcl(makeUser({ userId: '   ', loginId: ' ' }));
      expect(acl).toEqual({ owners: [], editors: [], viewers: [] });
    });
  });

  describe('describeSearchResultAccess (visibility + ownership)', () => {
    const ABS = path.join(ROOT, 'docs', 'a.md');

    it('treats document with no metadata as legacy-open (readable by anyone)', () => {
      getCachedMetadataMock.mockReturnValue(null);
      const result = service.describeSearchResultAccess(makeUser(), ABS);
      expect(result.isReadable).toBe(true);
      expect(result.canRequestRead).toBe(false);
    });

    it('grants owner full access via ownerId', () => {
      getCachedMetadataMock.mockReturnValue(makeMetadata({
        ownerId: 'u-1',
        visibility: { scope: 'self' },
      }));
      const result = service.describeSearchResultAccess(makeUser({ userId: 'u-1' }), ABS);
      expect(result.isReadable).toBe(true);
    });

    it('blocks non-owner with self visibility', () => {
      getCachedMetadataMock.mockReturnValue(makeMetadata({
        ownerId: 'u-99',
        visibility: { scope: 'self' },
      }));
      const result = service.describeSearchResultAccess(makeUser({ userId: 'u-1' }), ABS);
      expect(result.isReadable).toBe(false);
      expect(result.canRequestRead).toBe(true);
    });

    it('allows organization visibility for users with any org membership when no targetOrgId', () => {
      getCachedMetadataMock.mockReturnValue(makeMetadata({
        ownerId: 'u-99',
        visibility: { scope: 'organization' },
      }));
      const result = service.describeSearchResultAccess(
        makeUser({ userId: 'u-1', organizationIds: ['org-1'] }),
        ABS,
      );
      expect(result.isReadable).toBe(true);
    });

    it('blocks organization visibility for users without matching targetOrgId', () => {
      getCachedMetadataMock.mockReturnValue(makeMetadata({
        ownerId: 'u-99',
        visibility: { scope: 'organization', targetOrgId: 'org-VIP' },
      }));
      const result = service.describeSearchResultAccess(
        makeUser({ userId: 'u-1', organizationIds: ['org-1'] }),
        ABS,
      );
      expect(result.isReadable).toBe(false);
    });

    it('allows organization visibility when user belongs to targetOrgId', () => {
      getCachedMetadataMock.mockReturnValue(makeMetadata({
        ownerId: 'u-99',
        visibility: { scope: 'organization', targetOrgId: 'org-1' },
      }));
      const result = service.describeSearchResultAccess(
        makeUser({ userId: 'u-1', organizationIds: ['org-1', 'org-2'] }),
        ABS,
      );
      expect(result.isReadable).toBe(true);
    });

    it('allows public visibility for any user', () => {
      getCachedMetadataMock.mockReturnValue(makeMetadata({
        ownerId: 'u-99',
        visibility: { scope: 'public' },
      }));
      const result = service.describeSearchResultAccess(
        makeUser({ userId: 'u-1', organizationIds: [] }),
        ABS,
      );
      expect(result.isReadable).toBe(true);
    });

    it('honors per-user grant with read role', () => {
      getCachedMetadataMock.mockReturnValue(makeMetadata({
        ownerId: 'u-99',
        visibility: { scope: 'self' },
        grants: [{ principalId: 'u-1', principalType: 'user', role: 'read' }],
      }));
      const result = service.describeSearchResultAccess(makeUser({ userId: 'u-1' }), ABS);
      expect(result.isReadable).toBe(true);
    });

    it('drops expired grants', () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      getCachedMetadataMock.mockReturnValue(makeMetadata({
        ownerId: 'u-99',
        visibility: { scope: 'self' },
        grants: [{ principalId: 'u-1', principalType: 'user', role: 'manage', expiresAt: past }],
      }));
      const result = service.describeSearchResultAccess(makeUser({ userId: 'u-1' }), ABS);
      expect(result.isReadable).toBe(false);
    });

    it('matches organization grant via user.organizationIds', () => {
      getCachedMetadataMock.mockReturnValue(makeMetadata({
        ownerId: 'u-99',
        visibility: { scope: 'self' },
        grants: [{ principalId: 'org-1', principalType: 'organization', role: 'write' }],
      }));
      const result = service.describeSearchResultAccess(
        makeUser({ userId: 'u-1', organizationIds: ['org-1'] }),
        ABS,
      );
      expect(result.isReadable).toBe(true);
    });
  });

  describe('filterFileTree', () => {
    it('hides files the user cannot read and prunes empty directories', () => {
      getCachedMetadataMock.mockImplementation((rel: string) => {
        if (rel === 'pub/visible.md') {
          return makeMetadata({ visibility: { scope: 'public' }, ownerId: 'u-99' });
        }
        if (rel === 'priv/hidden.md') {
          return makeMetadata({ visibility: { scope: 'self' }, ownerId: 'u-99' });
        }
        return null;
      });

      const tree = [
        {
          type: 'directory' as const,
          name: 'pub',
          path: 'pub',
          children: [{ type: 'file' as const, name: 'visible.md', path: 'pub/visible.md', title: 'V' }],
        },
        {
          type: 'directory' as const,
          name: 'priv',
          path: 'priv',
          children: [{ type: 'file' as const, name: 'hidden.md', path: 'priv/hidden.md', title: 'H' }],
        },
      ];

      const filtered = service.filterFileTree(makeUser({ userId: 'u-1' }), tree);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('pub');
      expect(filtered.find((n) => n.name === 'priv')).toBeUndefined();
    });
  });
});
