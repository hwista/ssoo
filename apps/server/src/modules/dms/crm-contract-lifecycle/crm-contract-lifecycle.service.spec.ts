import {
  DEFAULT_DMS_CRM_CONTRACT_APPROVAL_ROUTE_POLICY,
  DEFAULT_DMS_CRM_CONTRACT_EXPORT_POLICY,
} from '@ssoo/types';
import type { DmsCrmContractLifecycleExecutionRequest } from '@ssoo/types/dms';
import type { DatabaseService } from '../../../database/database.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import type { FileCrudService } from '../file/file-crud.service.js';
import { configService } from '../runtime/dms-config.service.js';
import type { StorageReference } from '../storage/storage-adapter.service.js';
import { createDocxTemplateFromText } from '../templates/docx-template-renderer.js';
import type { TemplateService } from '../templates/template.service.js';
import {
  DmsCrmContractLifecycleService,
  type DmsCrmContractLifecycleStorage,
} from './crm-contract-lifecycle.service.js';

type FileCrudMock = Pick<FileCrudService, 'read' | 'write'> & {
  readCalls: Parameters<FileCrudService['read']>[];
  writeCalls: Parameters<FileCrudService['write']>[];
};

type TemplateServiceMock = Pick<TemplateService, 'get' | 'readDocxBinary'> & {
  getCalls: Parameters<TemplateService['get']>[];
  readDocxBinaryCalls: Parameters<TemplateService['readDocxBinary']>[];
};

type StorageMock = DmsCrmContractLifecycleStorage & {
  uploadCalls: Parameters<DmsCrmContractLifecycleStorage['upload']>[];
};

type DatabaseMock = Pick<DatabaseService, 'client'> & {
  userFindFirstCalls: unknown[];
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
          content: '# CRM 계약서\n\n- 계약번호: CRM-CT-001\n- 고객사: LS MnM',
          metadata: {
            size: 32,
            createdAt: '2026-07-09T00:00:00.000Z',
            modifiedAt: '2026-07-09T00:00:00.000Z',
            accessedAt: '2026-07-09T00:00:00.000Z',
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
  const templateBinary = await createDocxTemplateFromText('# {계약번호} / {{customerName}}');
  const getCalls: Parameters<TemplateService['get']>[] = [];
  const readDocxBinaryCalls: Parameters<TemplateService['readDocxBinary']>[] = [];
  return {
    getCalls,
    readDocxBinaryCalls,
    get: async (...args) => {
      getCalls.push(args);
      return {
        id: 'crm-contract-v1',
        name: 'CRM 계약서 기본 템플릿',
        summary: '',
        tags: [],
        createdAt: '2026-07-09T00:00:00.000Z',
        updatedAt: '2026-07-09T00:00:00.000Z',
        scope: 'global',
        kind: 'document',
        content: '# {{contractName}} 계약서',
        ownerId: 'system',
        visibility: 'shared',
        status,
        sourceType: 'markdown-file',
        originType: 'referenced',
        referenceDocuments: [],
        generation: { source: 'manual' },
        sourcePath: 'system/crm-contract-v1.md',
        docxTemplate: {
          fileName: 'crm-contract-v1.docx',
          sourcePath: 'system/crm-contract-v1.docx',
          size: 1,
          checksum: 'template-checksum',
          uploadedAt: '2026-07-09T00:00:00.000Z',
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
  const uploadCalls: Parameters<DmsCrmContractLifecycleStorage['upload']>[] = [];
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

function createDatabaseMock(): DatabaseMock {
  const userFindFirstCalls: unknown[] = [];
  return {
    userFindFirstCalls,
    client: {
      user: {
        findFirst: async (args: unknown) => {
          userFindFirstCalls.push(args);
          return {
            id: 77n,
            userName: 'sales',
            displayName: 'sales',
            email: 'sales@ssoo.example.com',
            departmentCode: 'SALES',
            positionCode: 'LEAD',
            authAccount: {
              loginId: 'sales',
            },
            organizationRelations: [
              {
                organization: {
                  orgId: 700n,
                  orgCode: 'SALES-OPS',
                  orgName: 'Sales Operations',
                  scope: 'internal',
                },
              },
            ],
          };
        },
      },
    } as unknown as DatabaseService['client'],
  };
}

function createRequest(): DmsCrmContractLifecycleExecutionRequest {
  return {
    contractId: '10',
    contractCode: 'CRM-CT-001',
    documentTitle: 'LS MnM 설비 계약서',
    templateKey: 'crm-contract-v1',
    draftPath: 'crm/contracts/CRM-CT-001.md',
    variables: [
      { key: 'contractCode', label: '계약번호', value: 'CRM-CT-001', required: true, source: 'contract' },
      { key: 'customerName', label: '고객사', value: 'LS MnM', required: true, source: 'contract' },
    ],
    attachments: [
      {
        key: 'billing-plan',
        label: '청구계획 별첨',
        status: 'ready',
        evidenceLabel: 'CRM billing rows',
        evidencePath: 'CRM-CT-001#billing-plan:2',
        note: '청구계획 2건',
      },
    ],
    lifecycle: [
      {
        key: 'markdown-draft',
        label: 'CRM markdown 초안',
        owner: 'crm',
        status: 'completed',
        evidenceLabel: 'DMS markdown path',
        evidencePath: 'crm/contracts/CRM-CT-001.md',
        note: 'CRM 초안 저장 완료',
      },
      {
        key: 'template-review',
        label: 'DMS 템플릿 검토',
        owner: 'dms',
        status: 'ready',
        evidenceLabel: 'DMS template version',
        evidencePath: 'system/crm-contract-v1.md',
        note: '템플릿 확인',
      },
      {
        key: 'attachment-confirmation',
        label: 'DMS 첨부 확인',
        owner: 'dms',
        status: 'ready',
        evidenceLabel: 'DMS attachment refs',
        evidencePath: 'CRM-CT-001#billing-plan:2',
        note: '첨부 확인',
      },
      {
        key: 'word-export',
        label: 'Word 산출',
        owner: 'dms',
        status: 'pending',
        evidenceLabel: 'DMS Word export artifact',
        note: 'Word 산출 대기',
      },
      {
        key: 'pdf-export',
        label: 'PDF 저장',
        owner: 'dms',
        status: 'pending',
        evidenceLabel: 'DMS PDF export artifact',
        note: 'PDF 저장 대기',
      },
      {
        key: 'approval',
        label: 'DMS 승인',
        owner: 'dms',
        status: 'pending',
        evidenceLabel: 'DMS approval record',
        note: '승인 대기',
      },
    ],
    memo: 'DMS 실행 테스트',
  };
}

async function resetContractLifecyclePolicies() {
  await configService.updateConfig({
    crmContractApprovalRoute: {
      ...DEFAULT_DMS_CRM_CONTRACT_APPROVAL_ROUTE_POLICY,
      requiredRoles: [...DEFAULT_DMS_CRM_CONTRACT_APPROVAL_ROUTE_POLICY.requiredRoles],
    },
    crmContractExportPolicy: {
      ...DEFAULT_DMS_CRM_CONTRACT_EXPORT_POLICY,
    },
  });
}

describe('DmsCrmContractLifecycleService', () => {
  beforeEach(async () => {
    await resetContractLifecyclePolicies();
  });

  afterEach(async () => {
    await resetContractLifecyclePolicies();
  });

  it('creates CRM contract lifecycle artifacts and returns CRM evidence steps', async () => {
    const fileCrud = createFileCrudMock();
    const db = createDatabaseMock();
    const templateService = await createTemplateServiceMock();
    const storage = createStorageMock();
    const service = new DmsCrmContractLifecycleService(
      fileCrud as unknown as FileCrudService,
      templateService as unknown as TemplateService,
      db as unknown as DatabaseService,
      storage,
    );
    const currentUser: TokenPayload = { userId: '77', loginId: 'sales' };

    const result = await service.execute(createRequest(), currentUser);

    expect(templateService.getCalls).toEqual([['crm-contract-v1', 'global', 'system']]);
    expect(templateService.readDocxBinaryCalls).toHaveLength(1);
    expect(db.userFindFirstCalls).toHaveLength(1);
    expect(fileCrud.readCalls[0]?.[0]).toBe('crm/contracts/CRM-CT-001.md');
    expect(fileCrud.writeCalls.map((call) => call[0])).toEqual([
      '_generated/crm-contract-lifecycle/global/CRM-CT-001/export-policy.md',
      '_generated/crm-contract-lifecycle/global/CRM-CT-001/template-version.md',
      '_generated/crm-contract-lifecycle/global/CRM-CT-001/template-change-review.md',
      '_generated/crm-contract-lifecycle/global/CRM-CT-001/template-change-request-ledger.md',
      '_generated/crm-contract-lifecycle/global/CRM-CT-001/template-review.md',
      '_generated/crm-contract-lifecycle/global/CRM-CT-001/attachment-confirmation.md',
      '_generated/crm-contract-lifecycle/global/CRM-CT-001/attachment-finalization-ledger.md',
      '_generated/crm-contract-lifecycle/global/CRM-CT-001/approval.md',
      '_generated/crm-contract-lifecycle/global/CRM-CT-001/approval-route.md',
      '_generated/crm-contract-lifecycle/global/CRM-CT-001/approval-workflow.md',
      '_generated/crm-contract-lifecycle/global/CRM-CT-001/approval-route-ledger.md',
    ]);
    expect(storage.uploadCalls.map((call) => call[0].fileName)).toEqual([
      'LS_MnM_설비_계약서.docx',
      'LS_MnM_설비_계약서.pdf',
    ]);
    expect(storage.uploadCalls.map((call) => call[0].relativePath)).toEqual([
      '_assets/crm-contract-lifecycle/global/CRM-CT-001',
      '_assets/crm-contract-lifecycle/global/CRM-CT-001',
    ]);
    expect(result.evidenceSteps.map((step) => step.key)).toEqual([
      'template-review',
      'attachment-confirmation',
      'word-export',
      'pdf-export',
      'approval',
    ]);
    expect(result.evidenceSteps).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'attachment-confirmation', evidencePath: '_generated/crm-contract-lifecycle/global/CRM-CT-001/attachment-finalization-ledger.md' }),
      expect.objectContaining({ key: 'word-export', evidencePath: expect.stringContaining('.docx') }),
      expect.objectContaining({ key: 'pdf-export', evidencePath: expect.stringContaining('.pdf') }),
      expect.objectContaining({ key: 'approval', evidencePath: '_generated/crm-contract-lifecycle/global/CRM-CT-001/approval-workflow.md' }),
    ]));
    expect(result.artifacts).toHaveLength(13);
    expect(result.artifacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'export-policy-record', path: '_generated/crm-contract-lifecycle/global/CRM-CT-001/export-policy.md' }),
      expect.objectContaining({ kind: 'template-version-snapshot', path: '_generated/crm-contract-lifecycle/global/CRM-CT-001/template-version.md' }),
      expect.objectContaining({ kind: 'template-change-review-record', path: '_generated/crm-contract-lifecycle/global/CRM-CT-001/template-change-review.md' }),
      expect.objectContaining({ kind: 'template-change-request-ledger', path: '_generated/crm-contract-lifecycle/global/CRM-CT-001/template-change-request-ledger.md' }),
      expect.objectContaining({ kind: 'attachment-finalization-ledger', path: '_generated/crm-contract-lifecycle/global/CRM-CT-001/attachment-finalization-ledger.md' }),
      expect.objectContaining({ kind: 'approval-route-record', path: '_generated/crm-contract-lifecycle/global/CRM-CT-001/approval-route.md' }),
      expect.objectContaining({ kind: 'approval-workflow-record', path: '_generated/crm-contract-lifecycle/global/CRM-CT-001/approval-workflow.md' }),
      expect.objectContaining({ kind: 'approval-route-ledger', path: '_generated/crm-contract-lifecycle/global/CRM-CT-001/approval-route-ledger.md' }),
    ]));
    expect(result.governance.templateVersion).toMatchObject({
      templateKey: 'crm-contract-v1',
      sourcePath: 'system/crm-contract-v1.docx',
    });
    expect(result.governance.exportPolicy).toMatchObject({
      policyKey: 'dms-crm-contract-export-standard',
      policyVersion: 'dms-crm-contract-export-standard@2026-07-10',
      organizationScope: 'global',
      resolvedRecordPath: '_generated/crm-contract-lifecycle/global/CRM-CT-001',
      resolvedArtifactPath: '_assets/crm-contract-lifecycle/global/CRM-CT-001',
    });
    expect(result.governance.approvalActors.map((actor) => actor.role)).toEqual([
      'template-owner',
      'contract-approver',
    ]);
    expect(result.governance.approvalRoute).toMatchObject({
      routeKey: 'dms-crm-contract-standard',
      policyVersion: 'dms-crm-contract-standard@2026-07-09',
      requiredRoles: ['template-owner', 'contract-approver'],
      directorySyncStatus: 'synced',
      directorySource: 'common.cm_user_m + common.cm_user_org_r + common.cm_organization_m',
      externalDirectorySynced: true,
      resolvedActors: expect.arrayContaining([
        expect.objectContaining({
          role: 'contract-approver',
          userId: '77',
          organizationCode: 'SALES-OPS',
          organizationName: 'Sales Operations',
        }),
      ]),
    });
    expect(result.governance.approvalRouteLedger).toMatchObject({
      ledgerId: 'crm-contract-approval-route:CRM-CT-001:dms-crm-contract-standard:dms-crm-contract-standard@2026-07-09',
      syncStatus: 'synced',
      routeKey: 'dms-crm-contract-standard',
      policyVersion: 'dms-crm-contract-standard@2026-07-09',
      syncedActorCount: 2,
      directorySyncStatus: 'synced',
      routeRecordPath: '_generated/crm-contract-lifecycle/global/CRM-CT-001/approval-route.md',
      workflowRecordPath: '_generated/crm-contract-lifecycle/global/CRM-CT-001/approval-workflow.md',
    });
    expect(result.governance.attachmentFinalizationLedger).toMatchObject({
      ledgerId: expect.stringContaining('crm-contract-attachment-finalization:CRM-CT-001:'),
      status: 'finalized',
      attachmentCount: 1,
      finalizedAttachmentCount: 1,
      deferredAttachmentCount: 0,
      attachmentRecordPath: '_generated/crm-contract-lifecycle/global/CRM-CT-001/attachment-confirmation.md',
      items: [
        expect.objectContaining({
          key: 'billing-plan',
          finalizationStatus: 'finalized',
          evidencePath: 'CRM-CT-001#billing-plan:2',
        }),
      ],
    });
    expect(result.governance.templateChangeReview).toMatchObject({
      status: 'not-required',
      reviewerLoginId: 'sales',
      evidenceLabel: 'DMS active template reuse review',
    });
    expect(result.governance.templateChangeRequestLedger).toMatchObject({
      status: 'closed-without-change',
      changeRequestRequired: false,
      templateKey: 'crm-contract-v1',
      requestedByLoginId: 'sales',
      reviewStatus: 'not-required',
    });
    expect(result.boundaryNotice).toContain('DMS는 CRM 계약 handoff');
  });

  it('uses DMS settings approval route policy when building governance evidence', async () => {
    await configService.updateConfig({
      crmContractApprovalRoute: {
        routeKey: 'enterprise-contract-route',
        routeName: 'Enterprise contract approval route',
        policyVersion: 'enterprise-contract-route@2026-07-10',
        organizationScope: 'sales-ops',
        requiredRoles: ['template-owner', 'legal-reviewer', 'contract-approver'],
      },
    });
    const fileCrud = createFileCrudMock();
    const db = createDatabaseMock();
    const templateService = await createTemplateServiceMock();
    const storage = createStorageMock();
    const service = new DmsCrmContractLifecycleService(
      fileCrud as unknown as FileCrudService,
      templateService as unknown as TemplateService,
      db as unknown as DatabaseService,
      storage,
    );

    const result = await service.execute(createRequest(), { userId: '77', loginId: 'sales' });

    expect(result.governance.approvalActors.map((actor) => actor.role)).toEqual([
      'template-owner',
      'legal-reviewer',
      'contract-approver',
    ]);
    expect(result.governance.approvalRoute).toMatchObject({
      routeKey: 'enterprise-contract-route',
      routeName: 'Enterprise contract approval route',
      policyVersion: 'enterprise-contract-route@2026-07-10',
      organizationScope: 'sales-ops',
      requiredRoles: ['template-owner', 'legal-reviewer', 'contract-approver'],
      directorySyncStatus: 'synced',
      resolvedActors: expect.arrayContaining([
        expect.objectContaining({ role: 'legal-reviewer', userId: '77' }),
        expect.objectContaining({ role: 'contract-approver', userId: '77' }),
      ]),
    });
    expect(result.governance.approvalRouteLedger).toMatchObject({
      ledgerId: 'crm-contract-approval-route:CRM-CT-001:enterprise-contract-route:enterprise-contract-route@2026-07-10',
      routeKey: 'enterprise-contract-route',
      policyVersion: 'enterprise-contract-route@2026-07-10',
      organizationScope: 'sales-ops',
      requiredRoles: ['template-owner', 'legal-reviewer', 'contract-approver'],
      syncedActorCount: 3,
    });
    expect(db.userFindFirstCalls).toHaveLength(1);
  });

  it('uses DMS settings export policy when resolving organization-scoped artifact paths', async () => {
    await configService.updateConfig({
      crmContractExportPolicy: {
        policyKey: 'sales-ops-contract-export',
        policyVersion: 'sales-ops-contract-export@2026-07-10',
        organizationScope: 'sales-ops',
        markdownRecordRootPath: '_generated/crm-contract-lifecycle/organizations',
        storageArtifactRootPath: '_assets/crm-contract-lifecycle/organizations',
      },
    });
    const fileCrud = createFileCrudMock();
    const db = createDatabaseMock();
    const templateService = await createTemplateServiceMock();
    const storage = createStorageMock();
    const service = new DmsCrmContractLifecycleService(
      fileCrud as unknown as FileCrudService,
      templateService as unknown as TemplateService,
      db as unknown as DatabaseService,
      storage,
    );

    const result = await service.execute(createRequest(), { userId: '77', loginId: 'sales' });

    expect(fileCrud.writeCalls[0]?.[0]).toBe(
      '_generated/crm-contract-lifecycle/organizations/sales-ops/CRM-CT-001/export-policy.md',
    );
    expect(fileCrud.writeCalls.map((call) => call[0])).toEqual(expect.arrayContaining([
      '_generated/crm-contract-lifecycle/organizations/sales-ops/CRM-CT-001/template-version.md',
      '_generated/crm-contract-lifecycle/organizations/sales-ops/CRM-CT-001/approval-route-ledger.md',
    ]));
    expect(storage.uploadCalls.map((call) => call[0].relativePath)).toEqual([
      '_assets/crm-contract-lifecycle/organizations/sales-ops/CRM-CT-001',
      '_assets/crm-contract-lifecycle/organizations/sales-ops/CRM-CT-001',
    ]);
    expect(result.governance.exportPolicy).toMatchObject({
      policyKey: 'sales-ops-contract-export',
      policyVersion: 'sales-ops-contract-export@2026-07-10',
      organizationScope: 'sales-ops',
      markdownRecordRootPath: '_generated/crm-contract-lifecycle/organizations',
      storageArtifactRootPath: '_assets/crm-contract-lifecycle/organizations',
      resolvedRecordPath: '_generated/crm-contract-lifecycle/organizations/sales-ops/CRM-CT-001',
      resolvedArtifactPath: '_assets/crm-contract-lifecycle/organizations/sales-ops/CRM-CT-001',
    });
    expect(result.artifacts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'export-policy-record',
        path: '_generated/crm-contract-lifecycle/organizations/sales-ops/CRM-CT-001/export-policy.md',
      }),
      expect.objectContaining({
        kind: 'word-export',
        path: '_assets/crm-contract-lifecycle/organizations/sales-ops/CRM-CT-001/LS_MnM_설비_계약서.docx',
      }),
      expect.objectContaining({
        kind: 'pdf-export',
        path: '_assets/crm-contract-lifecycle/organizations/sales-ops/CRM-CT-001/LS_MnM_설비_계약서.pdf',
      }),
    ]));
  });

  it('rejects blocked attachments before artifact creation', async () => {
    const fileCrud = createFileCrudMock();
    const db = createDatabaseMock();
    const templateService = await createTemplateServiceMock();
    const storage = createStorageMock();
    const service = new DmsCrmContractLifecycleService(
      fileCrud as unknown as FileCrudService,
      templateService as unknown as TemplateService,
      db as unknown as DatabaseService,
      storage,
    );
    const request = createRequest();
    request.attachments = [{
      ...request.attachments[0]!,
      status: 'blocked',
      note: '첨부 evidence 없음',
    }];

    await expect(service.execute(request, { userId: '77', loginId: 'sales' }))
      .rejects.toThrow('DMS 첨부 확인을 진행할 수 없습니다');
    expect(fileCrud.readCalls).toEqual([]);
    expect(fileCrud.writeCalls).toEqual([]);
    expect(storage.uploadCalls).toEqual([]);
  });

  it('rejects inactive CRM contract templates', async () => {
    const fileCrud = createFileCrudMock();
    const db = createDatabaseMock();
    const templateService = await createTemplateServiceMock('archived');
    const storage = createStorageMock();
    const service = new DmsCrmContractLifecycleService(
      fileCrud as unknown as FileCrudService,
      templateService as unknown as TemplateService,
      db as unknown as DatabaseService,
      storage,
    );

    await expect(service.execute(createRequest(), { userId: '77', loginId: 'sales' }))
      .rejects.toThrow('DMS 시스템 템플릿 crm-contract-v1 상태가 archived입니다');
    expect(templateService.getCalls).toEqual([['crm-contract-v1', 'global', 'system']]);
    expect(fileCrud.readCalls).toEqual([]);
    expect(storage.uploadCalls).toEqual([]);
  });
});
