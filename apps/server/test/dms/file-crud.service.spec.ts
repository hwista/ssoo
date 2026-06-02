import fs from 'fs';
import os from 'os';
import path from 'path';
import { ForbiddenException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { configService } from '../../src/modules/dms/runtime/dms-config.service.js';
import { FileCrudService } from '../../src/modules/dms/file/file-crud.service.js';
import type { TokenPayload } from '../../src/modules/common/auth/interfaces/auth.interface.js';

const currentUser: TokenPayload = {
  userId: '1001',
  loginId: 'requester',
  email: 'requester@example.com',
  name: 'Requester',
  roles: [],
};

describe('FileCrudService locked preview', () => {
  let rootDir: string;
  let service: FileCrudService;

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-file-preview-'));
    jest.spyOn(configService, 'getDocDir').mockReturnValue(rootDir);

    const documentAclService = {
      assertCanReadAbsolutePath: jest.fn(() => {
        throw new ForbiddenException('문서를 읽을 권한이 없습니다.');
      }),
      describeSearchResultAccess: jest.fn(() => ({
        owner: 'owner@example.com',
        visibilityScope: 'private',
        isReadable: false,
        canRequestRead: true,
      })),
    };
    const documentControlPlaneService = {
      getProjectedMetadataByRelativePath: jest.fn(async () => ({
        id: 'locked-doc',
        title: '잠긴 문서',
        path: 'locked/secret.md',
        contentType: 'document',
        createdAt: '2026-05-20T00:00:00.000Z',
        updatedAt: '2026-05-20T00:00:00.000Z',
        acl: { owners: ['owner'], editors: [], viewers: [] },
      })),
    };

    service = new FileCrudService(
      documentAclService as never,
      documentControlPlaneService as never,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  it('returns a locked notice without source markdown when a markdown document is not readable', async () => {
    const absolutePath = path.join(rootDir, 'locked', 'secret.md');
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    const fullContent = [
      '# 잠긴 문서',
      '',
      '첫 번째 원문 줄입니다.',
      '두 번째 원문 줄입니다.',
      '절대 내려가면 안 되는 비밀 줄입니다.',
    ].join('\n');
    fs.writeFileSync(absolutePath, fullContent, 'utf-8');

    const result = await service.read('locked/secret.md', currentUser);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.lockedPreview?.isLocked).toBe(true);
    expect(result.data.lockedPreview?.canRequestRead).toBe(true);
    expect(result.data.content).toContain('열람 권한 요청이 필요합니다.');
    expect(result.data.content).not.toContain('첫 번째 원문 줄입니다.');
    expect(result.data.content).not.toContain('절대 내려가면 안 되는 비밀 줄입니다.');
    expect(result.data.content.length).toBeLessThan(fullContent.length);
    expect(result.data.lockedPreview?.preview).toBe(result.data.content);
    expect(result.data.lockedPreview?.truncated).toBe(true);
    expect(result.data.metadata.document).toBeUndefined();
  });

  it('keeps non-markdown unreadable files forbidden instead of exposing a preview', async () => {
    const absolutePath = path.join(rootDir, 'locked', 'secret.pdf');
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, 'binary-ish content', 'utf-8');

    const result = await service.read('locked/secret.pdf', currentUser);

    expect(result).toEqual({
      success: false,
      error: '문서를 읽을 권한이 없습니다.',
      status: 403,
    });
  });
});
