import type { DmsCrmQuoteLifecycleExecutionRequest } from '@ssoo/types/dms';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import type { FileCrudService } from '../file/file-crud.service.js';
import type { StorageReference } from '../storage/storage-adapter.service.js';
import { createDocxTemplateFromText } from '../templates/docx-template-renderer.js';
import type { TemplateService } from '../templates/template.service.js';
import {
  DmsCrmQuoteLifecycleService,
  type DmsCrmQuoteLifecycleStorage,
} from './crm-quote-lifecycle.service.js';

type FileCrudMock = Pick<FileCrudService, 'read' | 'write'> & {
  readCalls: Parameters<FileCrudService['read']>[];
  writeCalls: Parameters<FileCrudService['write']>[];
};

type TemplateServiceMock = Pick<TemplateService, 'get' | 'readDocxBinary'> & {
  getCalls: Parameters<TemplateService['get']>[];
  readDocxBinaryCalls: Parameters<TemplateService['readDocxBinary']>[];
};

type StorageMock = DmsCrmQuoteLifecycleStorage & {
  uploadCalls: Parameters<DmsCrmQuoteLifecycleStorage['upload']>[];
};

function createFileCrudMock(): FileCrudMock {
  const readCalls: Parameters<FileCrudService['read']>[] = [];
  const writeCalls: Parameters<FileCrudService['write']>[] = [];
  return {
    readCalls,
    writeCalls,
    read: async (...args) => {
      readCalls.push(args);
      return {
        success: true,
        data: {
          content: '# CRM 견적서\n\n- 견적번호: Q-crm-opp-001-V3\n- 고객사: LS Electric',
          metadata: {
            size: 64,
            createdAt: '2026-07-10T00:00:00.000Z',
            modifiedAt: '2026-07-10T00:00:00.000Z',
            accessedAt: '2026-07-10T00:00:00.000Z',
          },
        },
      };
    },
    write: async (...args) => {
      writeCalls.push(args);
      return { success: true, data: { message: 'File saved' } };
    },
  };
}

async function createTemplateServiceMock(status: 'active' | 'archived' = 'active'): Promise<TemplateServiceMock> {
  const templateBinary = await createDocxTemplateFromText('# {견적번호} / {{customerName}}');
  const getCalls: Parameters<TemplateService['get']>[] = [];
  const readDocxBinaryCalls: Parameters<TemplateService['readDocxBinary']>[] = [];
  return {
    getCalls,
    readDocxBinaryCalls,
    get: async (...args) => {
      getCalls.push(args);
      return {
        id: 'crm-quote-v1',
        name: 'CRM 견적서 기본 템플릿',
        summary: '',
        tags: [],
        createdAt: '2026-07-10T00:00:00.000Z',
        updatedAt: '2026-07-10T00:00:00.000Z',
        scope: 'global',
        kind: 'document',
        content: '# {{quoteNumber}} 견적서',
        ownerId: 'system',
        visibility: 'shared',
        status,
        sourceType: 'markdown-file',
        originType: 'referenced',
        referenceDocuments: [],
        generation: { source: 'manual' },
        sourcePath: 'system/crm-quote-v1.md',
        docxTemplate: {
          fileName: 'crm-quote-v1.docx',
          sourcePath: 'system/crm-quote-v1.docx',
          size: 1,
          checksum: 'template-checksum',
          uploadedAt: '2026-07-10T00:00:00.000Z',
          uploadedBy: 'system',
          origin: 'generated',
        },
      };
    },
    readDocxBinary: (...args) => {
      readDocxBinaryCalls.push(args);
      return templateBinary;
    },
  };
}

function createStorageMock(): StorageMock {
  const uploadCalls: Parameters<DmsCrmQuoteLifecycleStorage['upload']>[] = [];
  return {
    uploadCalls,
    upload: (request) => {
      uploadCalls.push([request]);
      const size = typeof request.content === 'string'
        ? Buffer.byteLength(request.content)
        : request.content.length;
      const path = `${request.relativePath ?? ''}/${request.fileName}`.replace(/^\/+/, '');
      return {
        storageUri: `local://${encodeURIComponent(path)}`,
        provider: 'local',
        path,
        name: request.fileName,
        size,
        versionId: '1',
        etag: 'etag',
        checksum: `checksum-${request.fileName}`,
        origin: request.origin ?? 'manual',
        status: request.status ?? 'published',
      } satisfies StorageReference;
    },
  };
}

function createRequest(): DmsCrmQuoteLifecycleExecutionRequest {
  return {
    opportunityId: '1',
    opportunityCode: 'crm-opp-001',
    quoteNumber: 'Q-crm-opp-001-V3',
    documentTitle: 'LS Electric 스마트 배전반 통합 관제 고도화 견적서',
    templateKey: 'crm-quote-v1',
    draftPath: 'CRM/LS_Electric/quotes/Q-crm-opp-001-V3/Q-crm-opp-001-V3_quote-draft.md',
    variables: [
      { key: 'quoteNumber', label: '견적번호', value: 'Q-crm-opp-001-V3', required: true, source: 'quote-workflow' },
      { key: 'customerName', label: '고객사', value: 'LS Electric', required: true, source: 'opportunity' },
    ],
    lifecycle: [
      {
        key: 'markdown-draft',
        label: 'CRM markdown 초안',
        owner: 'crm',
        status: 'completed',
        evidenceLabel: 'DMS markdown path',
        evidencePath: 'CRM/LS_Electric/quotes/Q-crm-opp-001-V3/Q-crm-opp-001-V3_quote-draft.md',
        note: 'CRM 초안 저장 완료',
      },
      {
        key: 'template-review',
        label: 'DMS 템플릿 검토',
        owner: 'dms',
        status: 'ready',
        evidenceLabel: 'DMS quote template version',
        evidencePath: 'system/crm-quote-v1.md',
        note: '템플릿 확인',
      },
      {
        key: 'word-export',
        label: 'Word 견적서 산출',
        owner: 'dms',
        status: 'pending',
        evidenceLabel: 'DMS quote DOCX artifact',
        note: 'Word 산출 대기',
      },
      {
        key: 'pdf-export',
        label: 'PDF 견적서 저장',
        owner: 'dms',
        status: 'pending',
        evidenceLabel: 'DMS quote PDF artifact',
        note: 'PDF 저장 대기',
      },
    ],
    memo: '견적 산출 실행',
  };
}

describe('DmsCrmQuoteLifecycleService', () => {
  it('creates CRM quote lifecycle artifacts and returns CRM evidence steps', async () => {
    const fileCrud = createFileCrudMock();
    const templateService = await createTemplateServiceMock();
    const storage = createStorageMock();
    const service = new DmsCrmQuoteLifecycleService(
      fileCrud as unknown as FileCrudService,
      templateService as unknown as TemplateService,
      storage,
    );
    const currentUser: TokenPayload = { userId: '77', loginId: 'sales' };

    const result = await service.execute(createRequest(), currentUser);

    expect(templateService.getCalls).toEqual([['crm-quote-v1', 'global', 'system']]);
    expect(templateService.readDocxBinaryCalls).toHaveLength(1);
    expect(fileCrud.readCalls[0]?.[0]).toBe('CRM/LS_Electric/quotes/Q-crm-opp-001-V3/Q-crm-opp-001-V3_quote-draft.md');
    expect(fileCrud.writeCalls.map((call) => call[0])).toEqual([
      '_generated/crm-quote-lifecycle/Q-crm-opp-001-V3/template-version.md',
      '_generated/crm-quote-lifecycle/Q-crm-opp-001-V3/template-review.md',
    ]);
    expect(storage.uploadCalls.map((call) => call[0].fileName)).toEqual([
      'LS_Electric_스마트_배전반_통합_관제_고도화_견적서.docx',
      'LS_Electric_스마트_배전반_통합_관제_고도화_견적서.pdf',
    ]);
    expect(result.evidenceSteps.map((step) => step.key)).toEqual([
      'template-review',
      'word-export',
      'pdf-export',
    ]);
    expect(result.evidenceSteps).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'template-review', evidencePath: '_generated/crm-quote-lifecycle/Q-crm-opp-001-V3/template-review.md' }),
      expect.objectContaining({ key: 'word-export', evidencePath: expect.stringContaining('.docx') }),
      expect.objectContaining({ key: 'pdf-export', evidencePath: expect.stringContaining('.pdf') }),
    ]));
    expect(result.artifacts).toHaveLength(4);
    expect(result.artifacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'template-version-snapshot', path: '_generated/crm-quote-lifecycle/Q-crm-opp-001-V3/template-version.md' }),
      expect.objectContaining({ kind: 'template-review-record', path: '_generated/crm-quote-lifecycle/Q-crm-opp-001-V3/template-review.md' }),
      expect.objectContaining({ kind: 'word-export', storageUri: expect.stringContaining('.docx') }),
      expect.objectContaining({ kind: 'pdf-export', storageUri: expect.stringContaining('.pdf') }),
    ]));
    expect(result.governance.templateVersion).toMatchObject({
      templateKey: 'crm-quote-v1',
      sourcePath: 'system/crm-quote-v1.docx',
    });
    expect(result.boundaryNotice).toContain('DMS는 CRM 견적 handoff');
  });

  it('rejects blocked quote lifecycle steps before artifact creation', async () => {
    const fileCrud = createFileCrudMock();
    const templateService = await createTemplateServiceMock();
    const storage = createStorageMock();
    const service = new DmsCrmQuoteLifecycleService(
      fileCrud as unknown as FileCrudService,
      templateService as unknown as TemplateService,
      storage,
    );
    const request = createRequest();
    request.lifecycle = request.lifecycle.map((step) => (
      step.key === 'word-export'
        ? { ...step, status: 'blocked', blockingReasons: ['DOCX export policy missing'] }
        : step
    ));

    await expect(service.execute(request, { userId: '77', loginId: 'sales' }))
      .rejects.toThrow('word-export 단계가 차단 상태입니다');
    expect(fileCrud.readCalls).toEqual([]);
    expect(fileCrud.writeCalls).toEqual([]);
    expect(storage.uploadCalls).toEqual([]);
  });

  it('rejects inactive CRM quote templates', async () => {
    const fileCrud = createFileCrudMock();
    const templateService = await createTemplateServiceMock('archived');
    const storage = createStorageMock();
    const service = new DmsCrmQuoteLifecycleService(
      fileCrud as unknown as FileCrudService,
      templateService as unknown as TemplateService,
      storage,
    );

    await expect(service.execute(createRequest(), { userId: '77', loginId: 'sales' }))
      .rejects.toThrow('DMS 시스템 템플릿 crm-quote-v1 상태가 archived입니다');
    expect(templateService.getCalls).toEqual([['crm-quote-v1', 'global', 'system']]);
    expect(fileCrud.readCalls).toEqual([]);
    expect(storage.uploadCalls).toEqual([]);
  });
});
