import fs from 'fs';
import os from 'os';
import path from 'path';
import { jest } from '@jest/globals';
import { DocumentHydrationService } from '../../src/modules/dms/runtime/document-hydration.service.js';
import { configService } from '../../src/modules/dms/runtime/dms-config.service.js';

describe('DocumentHydrationService', () => {
  let tempRoot: string;
  let docDir: string;
  let templateDir: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-hydration-test-'));
    docDir = path.join(tempRoot, 'documents');
    templateDir = path.join(docDir, '_templates');
    fs.mkdirSync(templateDir, { recursive: true });
    jest.spyOn(configService, 'getDocDir').mockReturnValue(docDir);
    jest.spyOn(configService, 'getTemplateDir').mockReturnValue(templateDir);
    jest.spyOn(configService, 'getGitBootstrapRemoteUrl').mockReturnValue('http://example.invalid/repo.git');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('does not mark control-plane documents missing when bootstrap repo is unavailable and the runtime root is not a git repository', async () => {
    const updateMany = jest.fn<() => Promise<unknown>>().mockResolvedValue({ count: 0 });
    const db = {
      client: {
        user: {
          findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue({ id: 1n }),
        },
        dmsDocument: {
          findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
            { relativePath: 'docs/a.md' },
            { relativePath: 'docs/b.md' },
          ]),
          updateMany,
          create: jest.fn(),
        },
        dmsDocumentGrant: { create: jest.fn() },
        dmsDocumentSourceFile: { create: jest.fn() },
        dmsDocumentComment: { create: jest.fn() },
        dmsTemplate: {
          findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
          create: jest.fn(),
        },
      },
    } as unknown as ConstructorParameters<typeof DocumentHydrationService>[0];

    const result = await new DocumentHydrationService(db).hydrateFromDisk();

    expect(result.documentsMissing).toBe(0);
    expect(updateMany).not.toHaveBeenCalled();
  });
});
