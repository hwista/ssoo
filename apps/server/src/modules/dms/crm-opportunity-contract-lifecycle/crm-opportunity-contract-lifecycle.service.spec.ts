import JSZip from 'jszip';
import type { DmsCrmOpportunityContractLifecycleExecutionRequest } from '@ssoo/types/dms';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import type { FileCrudService } from '../file/file-crud.service.js';
import type { StorageReference } from '../storage/storage-adapter.service.js';
import { createDocxTemplateFromText } from '../templates/docx-template-renderer.js';
import type { TemplateService } from '../templates/template.service.js';
import {
  DmsCrmOpportunityContractLifecycleService,
  type DmsCrmOpportunityContractLifecycleStorage,
} from './crm-opportunity-contract-lifecycle.service.js';

const keys = [
  '공급자_회사명', '공급자_대표자', '공급자_사업자번호', '공급자_주소', '공급자_전화',
  '고객사명', '건명', '계약금액', '계약금액_한글', '외부원가', '순이익',
  '계약시작일', '계약종료일', '계약기간', '사업구분', '담당자명', '담당자부서',
  '담당자연락처', '담당자이메일', '수금조건', '작성일', '계약년도',
] as const;

const user: TokenPayload = { userId: '77', loginId: 'sales.kim', userName: '김민준' };

function createRequest(): DmsCrmOpportunityContractLifecycleExecutionRequest {
  return {
    opportunityId: '1',
    opportunityCode: 'crm-opp-001',
    documentTitle: 'LS Electric 스마트 배전반 통합 관제 고도화 계약서',
    fileNameHint: 'LS_Electric_스마트_배전반_원천_템플릿_20260814.docx',
    templateKey: 'crm-opportunity-contract-v1',
    draftPath: 'CRM/LS_Electric/opportunity-contracts/crm-opp-001/draft.md',
    variables: keys.map((key, index) => ({
      key,
      label: key,
      value: index === 0 ? 'SSOO 영업팀' : index === 5 ? 'LS Electric' : `값-${index + 1}`,
      required: true,
      source: index < 5 ? 'seller-profile' : 'opportunity',
    })),
  };
}

async function createService() {
  const uploads: Array<{ fileName: string; content: string | Buffer }> = [];
  const fileCrud = {
    read: async () => ({
      success: true,
      data: {
        content: '# 원천 22개 변수 초안',
        metadata: {
          size: 20,
          createdAt: '2026-08-14T00:00:00.000Z',
          modifiedAt: '2026-08-14T00:00:00.000Z',
          accessedAt: '2026-08-14T00:00:00.000Z',
        },
      },
    }),
    write: async () => ({ success: true, data: { message: 'File saved' } }),
  } as unknown as FileCrudService;
  const templateContent = keys.map((key) => `{${key}}`).join('\n');
  const template = {
    id: 'crm-opportunity-contract-v1',
    name: 'CRM 영업기회 계약서 원천 호환 템플릿',
    scope: 'global' as const,
    kind: 'document' as const,
    content: templateContent,
    ownerId: 'system',
    visibility: 'shared' as const,
    status: 'active' as const,
    sourceType: 'markdown-file' as const,
    originType: 'referenced' as const,
    referenceDocuments: [],
    generation: { source: 'manual' as const, taskKey: 'crm-opportunity-contract-document' },
    updatedAt: '2026-08-14T00:00:00.000Z',
    sourcePath: 'system/crm-opportunity-contract-v1.md',
    docxTemplate: {
      fileName: 'crm-opportunity-contract-v1.docx',
      sourcePath: 'system/crm-opportunity-contract-v1.docx',
      size: 1,
      checksum: 'template-checksum',
      uploadedAt: '2026-08-14T00:00:00.000Z',
      uploadedBy: 'system',
      origin: 'generated' as const,
    },
  };
  const templateBinary = await createDocxTemplateFromText(templateContent);
  const templateService = {
    get: async () => template,
    readDocxBinary: () => templateBinary,
  } as unknown as TemplateService;
  const storage: DmsCrmOpportunityContractLifecycleStorage = {
    upload: (request) => {
      uploads.push({ fileName: request.fileName, content: request.content });
      return {
        storageUri: `local://${encodeURIComponent(request.fileName)}`,
        provider: 'local',
        path: request.fileName,
        name: request.fileName,
        size: Buffer.isBuffer(request.content) ? request.content.length : Buffer.byteLength(request.content),
        versionId: '1',
        etag: 'etag',
        checksum: 'checksum',
        origin: 'manual',
        status: 'published',
      } satisfies StorageReference;
    },
  };
  return {
    service: new DmsCrmOpportunityContractLifecycleService(fileCrud, templateService, storage),
    uploads,
  };
}

describe('DmsCrmOpportunityContractLifecycleService', () => {
  it('renders the exact 22 source variables into a DOCX artifact with the source file-name contract', async () => {
    const { service, uploads } = await createService();
    const result = await service.execute(createRequest(), user);
    const upload = uploads[0];
    expect(upload.fileName).toBe('LS_Electric_스마트_배전반_원천_템플릿_20260814.docx');
    expect(Buffer.isBuffer(upload.content)).toBe(true);
    const zip = await JSZip.loadAsync(upload.content as Buffer);
    const xml = await zip.file('word/document.xml')?.async('string') ?? '';
    expect(xml).toContain('SSOO 영업팀');
    expect(xml).toContain('LS Electric');
    for (const key of keys) {
      expect(xml).not.toContain(`{${key}}`);
    }
    expect(result.artifacts.find((artifact) => artifact.kind === 'word-export')?.storageUri).toMatch(/^local:\/\//);
  });

  it('rejects a variable snapshot that is not exactly the source 22-key denominator', async () => {
    const { service } = await createService();
    const request = createRequest();
    request.variables = request.variables.slice(0, -1);
    await expect(service.execute(request, user)).rejects.toThrow('원천 계약서 변수는 정확히 22개여야 합니다.');
  });
});
