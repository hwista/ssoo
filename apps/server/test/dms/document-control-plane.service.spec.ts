import { jest } from '@jest/globals';
import { DocumentControlPlaneService } from '../../src/modules/dms/access/document-control-plane.service.js';
import { configService } from '../../src/modules/dms/runtime/dms-config.service.js';

describe('DocumentControlPlaneService', () => {
  it('excludes missing and deleted control-plane records from active document lists', async () => {
    const findMany = jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]);
    const db = {
      client: {
        dmsDocument: {
          findMany,
        },
      },
    } as unknown as ConstructorParameters<typeof DocumentControlPlaneService>[0];
    const service = new DocumentControlPlaneService(db);

    await service.listActiveDocuments();

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        isActive: true,
        documentStatusCode: 'active',
        syncStatusCode: {
          notIn: ['missing', 'deleted'],
        },
      },
    }));
  });

  it('excludes hidden verification documents from user-visible document lists', async () => {
    const findMany = jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
      { relativePath: 'launch-smoke/a.md' },
      { relativePath: 'docs/a.md' },
    ]);
    jest.spyOn(configService, 'isUserSurfaceHiddenPath')
      .mockImplementation((pathValue: string) => pathValue.startsWith('launch-smoke/'));
    const db = {
      client: {
        dmsDocument: {
          findMany,
        },
      },
    } as unknown as ConstructorParameters<typeof DocumentControlPlaneService>[0];
    const service = new DocumentControlPlaneService(db);

    await expect(service.listUserVisibleActiveDocuments()).resolves.toEqual([
      { relativePath: 'docs/a.md' },
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});
