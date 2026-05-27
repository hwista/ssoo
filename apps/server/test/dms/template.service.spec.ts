import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { jest } from '@jest/globals';
import type { TokenPayload } from '../../src/modules/common/auth/interfaces/auth.interface.js';
import { configService } from '../../src/modules/dms/runtime/dms-config.service.js';
import { gitService } from '../../src/modules/dms/runtime/git.service.js';
import { TemplateService } from '../../src/modules/dms/templates/template.service.js';

type TemplateRow = {
  templateId: bigint;
  templateKey: string;
  relativePath: string;
  templateScopeCode: string;
  templateKindCode: string;
  ownerRef: string;
  visibilityCode: string;
  templateStatusCode: string;
  sourceTypeCode: string;
  originTypeCode: string | null;
  metadataJson: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

type TemplateCreateData = {
  templateKey: string;
  relativePath: string;
  templateScopeCode: string;
  templateKindCode: string;
  ownerRef: string;
  visibilityCode: string;
  templateStatusCode: string;
  sourceTypeCode: string;
  originTypeCode: string | null;
  metadataJson: Record<string, unknown> | null;
};

function makeRow(input: {
  templateId: bigint;
  templateKey: string;
  relativePath: string;
  templateScopeCode: string;
  ownerRef: string;
  metadataJson?: Record<string, unknown> | null;
  templateKindCode?: string;
}): TemplateRow {
  return {
    templateId: input.templateId,
    templateKey: input.templateKey,
    relativePath: input.relativePath,
    templateScopeCode: input.templateScopeCode,
    templateKindCode: input.templateKindCode ?? 'document',
    ownerRef: input.ownerRef,
    visibilityCode: input.templateScopeCode === 'system' ? 'shared' : 'private',
    templateStatusCode: 'active',
    sourceTypeCode: 'markdown-file',
    originTypeCode: 'generated',
    metadataJson: input.metadataJson ?? {
      id: input.templateKey,
      name: input.templateKey,
      scope: input.templateScopeCode === 'system' ? 'global' : 'personal',
      kind: input.templateKindCode ?? 'document',
      visibility: input.templateScopeCode === 'system' ? 'shared' : 'private',
      status: 'active',
      sourceType: 'markdown-file',
      createdAt: '2026-05-21T00:00:00.000Z',
      updatedAt: '2026-05-21T00:00:00.000Z',
    },
    createdAt: new Date('2026-05-21T00:00:00.000Z'),
    updatedAt: new Date('2026-05-21T00:00:00.000Z'),
  };
}

function makeCreateRow(templateId: bigint, data: TemplateCreateData): TemplateRow {
  return {
    templateId,
    templateKey: data.templateKey,
    relativePath: data.relativePath,
    templateScopeCode: data.templateScopeCode,
    templateKindCode: data.templateKindCode,
    ownerRef: data.ownerRef,
    visibilityCode: data.visibilityCode,
    templateStatusCode: data.templateStatusCode,
    sourceTypeCode: data.sourceTypeCode,
    originTypeCode: data.originTypeCode,
    metadataJson: data.metadataJson,
    createdAt: new Date('2026-05-21T00:00:00.000Z'),
    updatedAt: new Date('2026-05-21T00:00:00.000Z'),
  };
}

const tokenFor = (userId: string, loginId: string): TokenPayload => ({
  userId,
  loginId,
  sessionId: `sess-${userId}`,
} as unknown as TokenPayload);

describe('TemplateService', () => {
  let tempRoot: string;
  let rows: TemplateRow[];
  let nextTemplateId: bigint;
  let templateService: TemplateService;
  let findFirstMock: jest.Mock;
  let findManyMock: jest.Mock;
  let createMock: jest.Mock;
  let updateMock: jest.Mock;
  let deleteMock: jest.Mock;
  let noteMutationMock: jest.Mock;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-template-test-'));
    jest.spyOn(configService, 'getDocDir').mockReturnValue(tempRoot);
    jest.spyOn(gitService, 'inspectPathParity').mockResolvedValue({
      success: true,
      data: {
        remote: 'origin',
        verified: true,
        clean: true,
        workingTreePaths: [],
        localAheadPaths: [],
        remoteAheadPaths: [],
      },
    });

    rows = [
      makeRow({
        templateId: 1n,
        templateKey: 'system-doc-default',
        relativePath: 'system/system-doc-default.md',
        templateScopeCode: 'system',
        ownerRef: 'system',
      }),
      makeRow({
        templateId: 2n,
        templateKey: 'system-folder-default',
        relativePath: 'system/system-folder-default.md',
        templateScopeCode: 'system',
        ownerRef: 'system',
        templateKindCode: 'folder',
      }),
      makeRow({
        templateId: 3n,
        templateKey: 'tpl-6b582033',
        relativePath: 'personal/tpl-6b582033.md',
        templateScopeCode: 'personal',
        ownerRef: '1',
      }),
    ];
    nextTemplateId = 10n;

    findFirstMock = jest.fn(async ({ where }: { where?: Record<string, unknown> }) => {
      if (!where) {
        return null;
      }

      return rows.find((row) => {
        const relativePathMatches = !('relativePath' in where) || row.relativePath === where.relativePath;
        const templateKeyMatches = !('templateKey' in where) || row.templateKey === where.templateKey;
        const scopeMatches = !('templateScopeCode' in where) || row.templateScopeCode === where.templateScopeCode;
        const ownerMatches = !('ownerRef' in where) || row.ownerRef === where.ownerRef;
        return relativePathMatches && templateKeyMatches && scopeMatches && ownerMatches;
      }) ?? null;
    });

    findManyMock = jest.fn(async ({ where }: { where?: Record<string, unknown> }) => rows.filter((row) => {
      if (!where) {
        return true;
      }
      const scopeMatches = !('templateScopeCode' in where) || row.templateScopeCode === where.templateScopeCode;
      const ownerMatches = !('ownerRef' in where) || row.ownerRef === where.ownerRef;
      const activeMatches = !('isActive' in where) || where.isActive === true;
      return scopeMatches && ownerMatches && activeMatches;
    }));

    createMock = jest.fn(async ({ data }: { data: TemplateCreateData }) => {
      const row = makeCreateRow(nextTemplateId, data);
      nextTemplateId += 1n;
      rows.push(row);
      return row;
    });

    updateMock = jest.fn(async ({ where, data }: { where: { templateId: bigint }; data: TemplateCreateData }) => {
      const index = rows.findIndex((row) => row.templateId === where.templateId);
      if (index < 0) {
        throw new Error('row not found');
      }
      const updated = makeCreateRow(where.templateId, data);
      rows[index] = updated;
      return updated;
    });

    deleteMock = jest.fn(async ({ where }: { where: { templateId: bigint } }) => {
      rows = rows.filter((row) => row.templateId !== where.templateId);
      return { templateId: where.templateId };
    });

    noteMutationMock = jest.fn();
    const db = {
      client: {
        dmsTemplate: {
          findFirst: findFirstMock,
          findMany: findManyMock,
          create: createMock,
          update: updateMock,
          delete: deleteMock,
        },
      },
    };

    templateService = new TemplateService(
      db as never,
      { noteMutation: noteMutationMock } as never,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    } catch {
      // noop
    }
  });

  it('maps stored system scope rows to global templates without reseeding duplicate paths', async () => {
    const templates = await templateService.list('1');

    expect(templates.global.map((item) => item.id)).toEqual([
      'system-doc-default',
      'system-folder-default',
    ]);
    expect(templates.personal.map((item) => item.id)).toEqual(['tpl-6b582033']);
    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        templateScopeCode: 'system',
        ownerRef: 'system',
      }),
    }));
    expect(createMock).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        templateKey: 'system-doc-default',
      }),
    }));
    expect(createMock).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        templateKey: 'tpl-6b582033',
      }),
    }));
  });

  it('stores global templates with the system scope code and returns them as global', async () => {
    const item = await templateService.save(
      {
        id: 'ws009-global',
        name: 'WS009 Global Template',
        scope: 'global',
        kind: 'document',
        content: '# Global template',
      },
      '1',
      'admin',
      tokenFor('1', 'admin'),
    );

    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        templateKey: 'ws009-global',
        templateScopeCode: 'system',
        ownerRef: 'system',
        relativePath: 'system/ws009-global.md',
      }),
    }));
    expect(item.scope).toBe('global');
    expect(item.sourcePath).toBe('system/ws009-global.md');
    expect(fs.existsSync(path.join(tempRoot, '_templates/system/ws009-global.md'))).toBe(true);
  });
});
