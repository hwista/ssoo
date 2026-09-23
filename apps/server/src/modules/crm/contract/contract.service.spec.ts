import type { AccessRequestService } from '../../dms/access/access-request.service.js';
import { BadRequestException } from '@nestjs/common';
import type { CrmQuoteSellerProfile } from '@ssoo/types/crm';
import type { DatabaseService } from '../../../database/database.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import type { DmsCrmContractLifecycleService } from '../../dms/crm-contract-lifecycle/crm-contract-lifecycle.service.js';
import type { FileCrudService } from '../../dms/file/file-crud.service.js';
import type { TemplateService } from '../../dms/templates/template.service.js';
import type { QuoteSettingsService } from '../quote-settings/quote-settings.service.js';
import { ContractService } from './contract.service.js';

type QueryRawMock = ((...args: unknown[]) => Promise<unknown>) & {
  mockResolvedValueOnce: (value: unknown) => QueryRawMock;
  calls: unknown[][];
};

type ExecuteRawMock = ((...args: unknown[]) => Promise<number>) & {
  calls: unknown[][];
};

type FileCrudWriteResult = Awaited<ReturnType<FileCrudService['write']>>;
type FileCrudWriteMock = ((...args: Parameters<FileCrudService['write']>) => ReturnType<FileCrudService['write']>) & {
  calls: Parameters<FileCrudService['write']>[];
};
type FileCrudResolveFilePathMock = FileCrudService['resolveFilePath'] & {
  calls: Parameters<FileCrudService['resolveFilePath']>[];
};
type TemplateGetMock = ((...args: Parameters<TemplateService['get']>) => ReturnType<TemplateService['get']>) & {
  calls: Parameters<TemplateService['get']>[];
};
type DmsCrmContractLifecycleExecuteMock = ((
  ...args: Parameters<DmsCrmContractLifecycleService['execute']>
) => ReturnType<DmsCrmContractLifecycleService['execute']>) & {
  calls: Parameters<DmsCrmContractLifecycleService['execute']>[];
};

interface QueryMock {
  $queryRaw: QueryRawMock;
  $executeRaw: ExecuteRawMock;
  client: {
    $transaction: <T>(callback: (tx: QueryMock) => Promise<T>) => Promise<T>;
  };
}

function createQueryRawMock(): QueryRawMock {
  const values: unknown[] = [];
  const queryRaw = (async (...args: unknown[]) => {
    queryRaw.calls.push(args);
    return values.shift() ?? [];
  }) as QueryRawMock;
  queryRaw.calls = [];
  queryRaw.mockResolvedValueOnce = (value: unknown) => {
    values.push(value);
    return queryRaw;
  };
  return queryRaw;
}

function createExecuteRawMock(): ExecuteRawMock {
  const executeRaw = (async (...args: unknown[]) => {
    executeRaw.calls.push(args);
    return 1;
  }) as ExecuteRawMock;
  executeRaw.calls = [];
  return executeRaw;
}

function createDbMock(): QueryMock {
  const db = {
    $queryRaw: createQueryRawMock(),
    $executeRaw: createExecuteRawMock(),
  } as QueryMock;
  db.client = {
    $transaction: async <T>(callback: (tx: QueryMock) => Promise<T>) => callback(db),
  };
  return {
    ...db,
  };
}

function createQuoteSettingsMock(
  profile: CrmQuoteSellerProfile = {
    id: 'seller-default',
    profileCode: 'default',
    companyName: 'SSOO 영업팀',
    ciStatus: 'dms-planned',
    updatedAt: '2026-07-07T00:00:00.000Z',
  },
): Pick<QuoteSettingsService, 'getSellerProfile' | 'toSellerInfoStatus'> {
  return {
    getSellerProfile: async () => profile,
    toSellerInfoStatus: (candidate) => {
      if (!candidate || candidate.ciStatus === 'not-configured') {
        return 'not-configured';
      }
      if (candidate.ciStatus === 'dms-planned') {
        return 'dms-ci-planned';
      }
      return 'configured';
    },
  };
}

function createFileCrudMock(
  result: FileCrudWriteResult = { success: true, data: { message: 'File saved' } },
): Pick<FileCrudService, 'write' | 'resolveFilePath'> & { write: FileCrudWriteMock; resolveFilePath: FileCrudResolveFilePathMock } {
  const calls: Parameters<FileCrudService['write']>[] = [];
  const write = (async (...args: Parameters<FileCrudService['write']>) => {
    calls.push(args);
    return result;
  }) as FileCrudWriteMock;
  write.calls = calls;
  const resolveCalls: Parameters<FileCrudService['resolveFilePath']>[] = [];
  const resolveFilePath = ((filePath: string) => {
    resolveCalls.push([filePath]);
    return {
      targetPath: process.cwd(),
      valid: true,
      safeRelPath: filePath.replace(/^\/+/, ''),
    };
  }) as FileCrudResolveFilePathMock;
  resolveFilePath.calls = resolveCalls;
  return { write, resolveFilePath };
}

function createTemplateServiceMock(
  template: Awaited<ReturnType<TemplateService['get']>> = {
    id: 'crm-contract-v1',
    name: 'CRM 계약서 기본 템플릿',
    summary: '',
    tags: [],
    createdAt: '2026-07-09T00:00:00.000Z',
    updatedAt: '2026-07-09T00:00:00.000Z',
    scope: 'global',
    kind: 'document',
    content: '# {{contractTitle}}',
    ownerId: 'system',
    visibility: 'shared',
    status: 'active',
    sourceType: 'markdown-file',
    sourcePath: 'system/crm-contract-v1.md',
    originType: 'referenced',
    referenceDocuments: [],
    generation: { source: 'manual', taskKey: 'crm-contract-document' },
    docxTemplate: {
      fileName: 'crm-contract-v1.docx',
      sourcePath: 'system/crm-contract-v1.docx',
      size: 2048,
      checksum: 'b'.repeat(64),
      uploadedAt: '2026-07-09T00:00:00.000Z',
      uploadedBy: 'system',
      origin: 'generated',
    },
  },
): Pick<TemplateService, 'get' | 'list'> & { get: TemplateGetMock } {
  const calls: Parameters<TemplateService['get']>[] = [];
  const get = (async (...args: Parameters<TemplateService['get']>) => {
    calls.push(args);
    return template;
  }) as TemplateGetMock;
  get.calls = calls;
  return {
    get,
    list: async () => ({ global: template ? [template] : [], personal: [] }),
  };
}

function createDmsCrmContractLifecycleMock(): Pick<DmsCrmContractLifecycleService, 'execute'> & {
  execute: DmsCrmContractLifecycleExecuteMock;
} {
  const calls: Parameters<DmsCrmContractLifecycleService['execute']>[] = [];
  const execute = (async (...args: Parameters<DmsCrmContractLifecycleService['execute']>) => {
    calls.push(args);
    return {
      contractId: args[0].contractId,
      contractCode: args[0].contractCode,
      templateKey: args[0].templateKey,
      executedAt: '2026-07-09T15:00:00.000Z',
      governance: {
        templateVersion: {
          templateKey: args[0].templateKey,
          templateName: 'CRM 계약서 기본 템플릿',
          status: 'active',
          sourcePath: 'system/crm-contract-v1.md',
          versionId: `${args[0].templateKey}@2026-07-09T00:00:00.000Z`,
          capturedAt: '2026-07-09T15:00:00.000Z',
        },
        approvalActors: [
          {
            sequence: 1,
            role: 'template-owner',
            loginId: 'system',
            displayName: 'DMS Template Owner',
            status: 'approved',
            approvedAt: '2026-07-09T15:00:00.000Z',
            evidenceLabel: 'DMS active template version confirmed',
            note: 'DMS 시스템 템플릿 registry의 active 버전을 승인 기준으로 고정했습니다.',
          },
          {
            sequence: 2,
            role: 'contract-approver',
            loginId: 'sales',
            displayName: 'sales',
            status: 'approved',
            approvedAt: '2026-07-09T15:00:00.000Z',
            evidenceLabel: 'CRM contract handoff execution approver',
            note: 'DMS 산출 실행 요청자가 계약서 산출물과 CRM handoff evidence 반영을 승인했습니다.',
          },
        ],
        approvalRoute: {
          routeKey: 'dms-crm-contract-standard',
          routeName: 'DMS CRM contract standard approval route',
          policyVersion: 'dms-crm-contract-standard@2026-07-09',
          organizationScope: 'global',
          requiredRoles: ['template-owner', 'contract-approver'],
          externalDirectorySynced: true,
          directorySyncStatus: 'synced',
          directorySource: 'common.cm_user_m + common.cm_user_org_r + common.cm_organization_m',
          directorySyncedAt: '2026-07-09T15:00:00.000Z',
          resolvedActors: [
            {
              role: 'template-owner',
              loginId: 'system',
              displayName: 'DMS Template Owner',
              directorySource: 'dms-system-policy',
            },
            {
              role: 'contract-approver',
              loginId: 'sales',
              displayName: 'sales',
              directorySource: 'common.cm_user_m + common.cm_user_org_r + common.cm_organization_m',
              userId: '77',
              userName: 'sales',
              email: 'sales@ssoo.example.com',
              departmentCode: 'SALES',
              positionCode: 'LEAD',
              organizationId: '700',
              organizationCode: 'SALES-OPS',
              organizationName: 'Sales Operations',
              organizationScope: 'internal',
            },
          ],
          resolvedAt: '2026-07-09T15:00:00.000Z',
        },
        approvalRouteLedger: {
          ledgerId: `crm-contract-approval-route:${args[0].contractCode}:dms-crm-contract-standard:dms-crm-contract-standard@2026-07-09`,
          syncStatus: 'synced',
          routeKey: 'dms-crm-contract-standard',
          policyVersion: 'dms-crm-contract-standard@2026-07-09',
          organizationScope: 'global',
          requiredRoles: ['template-owner', 'contract-approver'],
          syncedActorCount: 2,
          syncedAt: '2026-07-09T15:00:00.000Z',
          directorySyncStatus: 'synced',
          directorySource: 'common.cm_user_m + common.cm_user_org_r + common.cm_organization_m',
          routeRecordPath: '_generated/crm-contract-lifecycle/crm-ct-doc/approval-route.md',
          workflowRecordPath: '_generated/crm-contract-lifecycle/crm-ct-doc/approval-workflow.md',
          evidenceLabel: 'DMS approval route ledger synchronized',
          resolvedActors: [
            {
              role: 'template-owner',
              loginId: 'system',
              displayName: 'DMS Template Owner',
              directorySource: 'dms-system-policy',
            },
            {
              role: 'contract-approver',
              loginId: 'sales',
              displayName: 'sales',
              directorySource: 'common.cm_user_m + common.cm_user_org_r + common.cm_organization_m',
              userId: '77',
              userName: 'sales',
              email: 'sales@ssoo.example.com',
              departmentCode: 'SALES',
              positionCode: 'LEAD',
              organizationId: '700',
              organizationCode: 'SALES-OPS',
              organizationName: 'Sales Operations',
              organizationScope: 'internal',
            },
          ],
        },
        attachmentFinalizationLedger: {
          ledgerId: `crm-contract-attachment-finalization:${args[0].contractCode}:2026-07-09T15:00:00.000Z`,
          status: 'finalized',
          attachmentCount: args[0].attachments.length,
          finalizedAttachmentCount: args[0].attachments.length,
          deferredAttachmentCount: 0,
          finalizedAt: '2026-07-09T15:00:00.000Z',
          attachmentRecordPath: '_generated/crm-contract-lifecycle/crm-ct-doc/attachment-confirmation.md',
          evidenceLabel: 'DMS attachment finalization ledger finalized',
          items: args[0].attachments.map((attachment) => ({
            key: attachment.key,
            label: attachment.label,
            sourceStatus: attachment.status,
            finalizationStatus: 'finalized',
            finalized: true,
            evidenceLabel: attachment.evidenceLabel,
            evidencePath: attachment.evidencePath,
            note: attachment.note,
            finalizedAt: '2026-07-09T15:00:00.000Z',
          })),
          boundaryNotice: 'DMS attachment finalization evidence',
        },
        templateChangeReview: {
          status: 'not-required',
          reason: `CRM handoff가 DMS active 템플릿 ${args[0].templateKey}@2026-07-09T00:00:00.000Z를 그대로 사용해 템플릿 변경 승인이 필요하지 않습니다.`,
          reviewedAt: '2026-07-09T15:00:00.000Z',
          reviewerLoginId: 'sales',
          evidenceLabel: 'DMS active template reuse review',
        },
        templateChangeRequestLedger: {
          ledgerId: `crm-contract-template-change:${args[0].contractCode}:${args[0].templateKey}@2026-07-09T00:00:00.000Z`,
          status: 'closed-without-change',
          changeRequestRequired: false,
          templateKey: args[0].templateKey,
          templateVersionId: `${args[0].templateKey}@2026-07-09T00:00:00.000Z`,
          requestedByLoginId: 'sales',
          requestedAt: '2026-07-09T15:00:00.000Z',
          reviewedAt: '2026-07-09T15:00:00.000Z',
          reviewStatus: 'not-required',
          evidenceLabel: 'DMS template change request ledger closed without change',
          reason: `CRM handoff가 DMS active 템플릿 ${args[0].templateKey}@2026-07-09T00:00:00.000Z를 그대로 사용해 템플릿 변경 승인이 필요하지 않습니다.`,
          sourcePath: 'system/crm-contract-v1.md',
        },
        boundaryNotice: 'DMS governance evidence',
      },
      artifacts: [
        {
          kind: 'template-version-snapshot',
          label: 'DMS template version snapshot',
          path: '_generated/crm-contract-lifecycle/crm-ct-doc/template-version.md',
        },
        {
          kind: 'template-change-review-record',
          label: 'DMS template change review record',
          path: '_generated/crm-contract-lifecycle/crm-ct-doc/template-change-review.md',
        },
        {
          kind: 'template-change-request-ledger',
          label: 'DMS template change request ledger',
          path: '_generated/crm-contract-lifecycle/crm-ct-doc/template-change-request-ledger.md',
        },
        {
          kind: 'template-review-record',
          label: 'DMS template review record',
          path: '_generated/crm-contract-lifecycle/crm-ct-doc/template-review.md',
        },
        {
          kind: 'attachment-confirmation-record',
          label: 'DMS attachment confirmation record',
          path: '_generated/crm-contract-lifecycle/crm-ct-doc/attachment-confirmation.md',
        },
        {
          kind: 'attachment-finalization-ledger',
          label: 'DMS attachment finalization ledger',
          path: '_generated/crm-contract-lifecycle/crm-ct-doc/attachment-finalization-ledger.md',
        },
        {
          kind: 'word-export',
          label: 'DMS Word DOCX artifact',
          path: '_assets/crm-contract-lifecycle/crm-ct-doc/crm-ct-doc.docx',
          storageUri: 'local://crm-ct-doc.docx',
        },
        {
          kind: 'pdf-export',
          label: 'DMS PDF artifact',
          path: '_assets/crm-contract-lifecycle/crm-ct-doc/crm-ct-doc.pdf',
          storageUri: 'local://crm-ct-doc.pdf',
        },
        {
          kind: 'approval-record',
          label: 'DMS approval record',
          path: '_generated/crm-contract-lifecycle/crm-ct-doc/approval.md',
        },
        {
          kind: 'approval-route-record',
          label: 'DMS approval route policy record',
          path: '_generated/crm-contract-lifecycle/crm-ct-doc/approval-route.md',
        },
        {
          kind: 'approval-workflow-record',
          label: 'DMS approval workflow record',
          path: '_generated/crm-contract-lifecycle/crm-ct-doc/approval-workflow.md',
        },
        {
          kind: 'approval-route-ledger',
          label: 'DMS approval route ledger sync record',
          path: '_generated/crm-contract-lifecycle/crm-ct-doc/approval-route-ledger.md',
        },
      ],
      evidenceSteps: [
        {
          key: 'template-review',
          evidenceLabel: 'DMS template review record',
          evidencePath: '_generated/crm-contract-lifecycle/crm-ct-doc/template-review.md',
          note: 'DMS 템플릿 검토 기록을 생성했습니다.',
        },
        {
          key: 'attachment-confirmation',
          evidenceLabel: 'DMS attachment finalization ledger',
          evidencePath: '_generated/crm-contract-lifecycle/crm-ct-doc/attachment-finalization-ledger.md',
          note: 'DMS 첨부 확정 원장을 생성했습니다.',
        },
        {
          key: 'word-export',
          evidenceLabel: 'DMS Word DOCX artifact',
          evidencePath: 'local://crm-ct-doc.docx',
          note: 'DMS Word artifact를 생성했습니다.',
        },
        {
          key: 'pdf-export',
          evidenceLabel: 'DMS PDF artifact',
          evidencePath: 'local://crm-ct-doc.pdf',
          note: 'DMS PDF artifact를 생성했습니다.',
        },
        {
          key: 'approval',
          evidenceLabel: 'DMS approval workflow record',
          evidencePath: '_generated/crm-contract-lifecycle/crm-ct-doc/approval-workflow.md',
          note: 'DMS 다자 승인 workflow evidence를 생성했습니다.',
        },
      ],
      boundaryNotice: 'DMS lifecycle boundary',
      nextAction: 'DMS artifact 검토',
    };
  }) as DmsCrmContractLifecycleExecuteMock;
  execute.calls = calls;
  return { execute };
}

function createDmsHandoffRow(overrides: Partial<{
  id: bigint;
  contractId: bigint;
  contractCode: string;
  documentTypeCode: string;
  documentTitle: string;
  templateKey: string;
  folderHint: string;
  fileNameHint: string;
  draftPath: string;
  statusCode: string;
  documentSnapshot: unknown;
  variablesSnapshot: unknown;
  attachmentsSnapshot: unknown;
  memo: string | null;
  savedBy: bigint | null;
  savedAt: Date;
}> = {}) {
  return {
    id: 501n,
    contractId: 10n,
    contractCode: 'crm-ct-doc',
    documentTypeCode: 'contract',
    documentTitle: 'LS ITC 데이터 플랫폼 구축 계약 계약서',
    templateKey: 'crm-contract-v1',
    folderHint: '/CRM/LS_ITC/crm-ct-doc',
    fileNameHint: 'crm-ct-doc_LS_ITC_데이터_플랫폼_구축_계약.docx',
    draftPath: 'CRM/LS_ITC/crm-ct-doc/crm-ct-doc_데이터_플랫폼_구축_계약_contract-draft.md',
    statusCode: 'draft-created',
    documentSnapshot: {
      contractId: 'crm-ct-doc',
      contractCode: 'crm-ct-doc',
      documentType: 'contract',
      documentTitle: 'LS ITC 데이터 플랫폼 구축 계약 계약서',
      templateKey: 'crm-contract-v1',
      lifecycle: [
        {
          key: 'markdown-draft',
          label: 'CRM markdown 초안',
          owner: 'crm',
          status: 'completed',
          evidenceLabel: 'DMS markdown path',
          evidencePath: 'CRM/LS_ITC/crm-ct-doc/crm-ct-doc_데이터_플랫폼_구축_계약_contract-draft.md',
          note: 'CRM 계약 원장 기준 markdown 초안이 DMS working tree에 저장되었습니다.',
        },
        {
          key: 'template-review',
          label: 'DMS 템플릿 검토',
          owner: 'dms',
          status: 'ready',
          evidenceLabel: 'DMS template version',
          evidencePath: 'system/crm-contract-v1.md',
          note: 'DMS 템플릿 registry에서 계약서 템플릿을 확인합니다.',
        },
        {
          key: 'attachment-confirmation',
          label: 'DMS 첨부 확인',
          owner: 'dms',
          status: 'ready',
          evidenceLabel: 'DMS attachment refs',
          evidencePath: 'dms://ci/ssoo.png, crm-ct-doc#billing-plan:2',
          note: 'DMS가 CI, 청구계획 별첨, 추가 증빙 첨부를 확인합니다.',
        },
        {
          key: 'word-export',
          label: 'Word 산출',
          owner: 'dms',
          status: 'pending',
          evidenceLabel: 'DMS Word export artifact',
          note: 'Word 파일 생성은 DMS export runtime에서 수행하고 CRM은 결과 파일을 만들지 않습니다.',
        },
        {
          key: 'pdf-export',
          label: 'PDF 저장',
          owner: 'dms',
          status: 'pending',
          evidenceLabel: 'DMS PDF export artifact',
          note: 'PDF 저장은 DMS export runtime에서 수행하고 CRM은 결과 파일을 만들지 않습니다.',
        },
        {
          key: 'approval',
          label: 'DMS 승인',
          owner: 'dms',
          status: 'pending',
          evidenceLabel: 'DMS approval record',
          note: '계약서 검토 확정과 승인 이력은 DMS 문서 lifecycle에서 소유합니다.',
        },
      ],
    },
    variablesSnapshot: [
      { key: 'contractCode', label: '계약번호', value: 'crm-ct-doc', required: true, source: 'contract' },
    ],
    attachmentsSnapshot: [
      {
        key: 'seller-ci',
        label: '공급자 CI',
        status: 'ready',
        evidenceLabel: 'DMS CI storage ref',
        evidencePath: 'dms://ci/ssoo.png',
        note: 'DMS 문서 렌더링 시 사용할 CI 참조가 준비되어 있습니다.',
      },
      {
        key: 'billing-plan',
        label: '청구계획 별첨',
        status: 'ready',
        evidenceLabel: 'CRM billing plan rows',
        evidencePath: 'crm-ct-doc#billing-plan:2',
        note: '2건의 청구계획을 문서 변수 후보로 전달합니다.',
      },
    ],
    memo: '계약서 초안 확인 요청',
    savedBy: 77n,
    savedAt: new Date('2026-07-09T12:00:00.000Z'),
    ...overrides,
  };
}

function createService(
  db: QueryMock,
  quoteSettingsService: Pick<QuoteSettingsService, 'getSellerProfile' | 'toSellerInfoStatus'> = createQuoteSettingsMock(),
  fileCrudService: Pick<FileCrudService, 'write' | 'resolveFilePath'> = createFileCrudMock(),
  templateService?: Pick<TemplateService, 'get' | 'list'>,
  dmsCrmContractLifecycleService?: Pick<DmsCrmContractLifecycleService, 'execute'>,
) {
  return new ContractService(
    db as unknown as DatabaseService,
    quoteSettingsService as QuoteSettingsService,
    fileCrudService as FileCrudService | undefined,
    templateService as TemplateService | undefined,
    dmsCrmContractLifecycleService as DmsCrmContractLifecycleService | undefined,
    undefined,
    { syncDocumentProjection: async () => undefined } as unknown as AccessRequestService,
  );
}

describe('ContractService', () => {
  it('maps CRM contract ledger rows into list response summaries', async () => {
    const db = createDbMock();
    db.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 1n,
          contractCode: 'crm-ct-001',
          sourceOpportunityId: 3n,
          sourceOpportunityCode: 'crm-opp-003',
          customerName: 'LS MnM',
          contractName: '설비 예방정비 모바일 업무화 본계약',
          ownerName: '이현우',
          businessType: '업무 시스템',
          industryLine: '설비/정비',
          regionCode: 'domestic',
          statusCode: 'active',
          confirmed: true,
          contractStartDate: new Date('2026-07-15T00:00:00.000Z'),
          contractEndDate: new Date('2026-11-30T00:00:00.000Z'),
          wbsCode: 'WBS-CRM-2026-001',
          paymentTermCode: '계약즉시',
          revenueSubtotal: 520000000n,
          specialDiscountTypeCode: 'amount',
          specialDiscountValue: null,
          specialDiscountAmount: 0n,
          revenueTotal: 520000000n,
          costTotal: 361000000n,
          externalCostTotal: 63000000n,
          pmsHandoffStatusCode: 'planned',
          dmsLinkStatusCode: 'planned',
          adminBoundaryCode: 'shared-admin',
          nextAction: '청구계획 확인 후 PMS 실행 인계 후보 생성',
          updatedAt: new Date('2026-07-06T00:00:00.000Z'),
        },
        {
          id: 2n,
          contractCode: 'crm-ct-002',
          sourceOpportunityId: null,
          sourceOpportunityCode: 'crm-opp-001',
          customerName: 'LS Electric',
          contractName: '스마트 배전반 통합 관제 고도화 계약 후보',
          ownerName: '김민준',
          businessType: 'SI 구축',
          industryLine: '전력/제조',
          regionCode: 'domestic',
          statusCode: 'review',
          confirmed: false,
          contractStartDate: new Date('2026-08-01T00:00:00.000Z'),
          contractEndDate: new Date('2027-01-31T00:00:00.000Z'),
          wbsCode: 'WBS-CRM-2026-002',
          paymentTermCode: 'NET30',
          revenueSubtotal: 840000000n,
          specialDiscountTypeCode: 'amount',
          specialDiscountValue: 20000000,
          specialDiscountAmount: 20000000n,
          revenueTotal: 820000000n,
          costTotal: 592000000n,
          externalCostTotal: 244000000n,
          pmsHandoffStatusCode: 'planned',
          dmsLinkStatusCode: 'planned',
          adminBoundaryCode: 'shared-admin',
          nextAction: '계약 확정 전 고객사 조건과 청구계획 자동분할 검토',
          updatedAt: new Date('2026-07-06T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          contractId: 1n,
          id: 11n,
          lineCode: 'ct-rev-001-1',
          lineKindCode: 'revenue',
          categoryCode: 'service',
          lineLabel: '모바일 업무 구축',
          quantity: 4,
          unitPrice: 130000000n,
          amount: 520000000n,
          marginRate: null,
          truncUnit: 0n,
          department: '모바일센터',
          memberName: '앱 구축팀',
          grade: 'Senior',
          serviceTypeCode: 'internal',
          revenueLinked: false,
          linkedCostLineCode: null,
          revenueUnitPrice: null,
          sortOrder: 10,
        },
        {
          contractId: 1n,
          id: 12n,
          lineCode: 'ct-cost-001-1',
          lineKindCode: 'cost',
          categoryCode: 'external-cost',
          lineLabel: '모바일 단말 검증',
          quantity: 1,
          unitPrice: 63000000n,
          amount: 63000000n,
          marginRate: null,
          truncUnit: 0n,
          department: 'QA 파트너',
          memberName: '단말 검증',
          grade: 'Partner',
          serviceTypeCode: 'external',
          revenueLinked: false,
          linkedCostLineCode: null,
          revenueUnitPrice: null,
          sortOrder: 20,
        },
      ])
      .mockResolvedValueOnce([
        {
          contractId: 1n,
          id: 21n,
          billingYm: '2026/07',
          revenueAmount: 130000000n,
          externalCostAmount: 15750000n,
          sortOrder: 10,
        },
      ]);
    const service = createService(db);

    const result = await service.listResponse({ search: 'MnM', status: 'active', sort: 'revenue-desc' });

    expect(result.summary.totalCount).toBe(2);
    expect(result.summary.filteredCount).toBe(1);
    expect(result.summary.activeCount).toBe(1);
    expect(result.summary.totalRevenue).toBe(520000000);
    expect(result.summary.totalExternalCost).toBe(63000000);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('crm-ct-001');
    expect(result.items[0]?.revenueLines[0]?.label).toBe('모바일 업무 구축');
    expect(result.items[0]?.billingPlan[0]?.billingYm).toBe('2026/07');
  });

  it('builds billing split preview with final remainder row', () => {
    const service = createService(createDbMock());

    const result = service.previewBillingSplit({
      startDate: '2026-08-01',
      endDate: '2027-01-31',
      totalRevenue: 820000000,
      totalExternalCost: 244000000,
      target: 'both',
      periodMonths: 2,
      truncUnit: 1000,
      includeLastMonth: true,
    });

    expect(result.lines.map((line) => line.billingYm)).toEqual(['2026/08', '2026/10', '2026/12', '2027/01']);
    expect(result.summary.splitRevenueTotal).toBe(820000000);
    expect(result.summary.splitExternalCostTotal).toBe(244000000);
    expect(result.summary.revenueDelta).toBe(0);
    expect(result.lines.at(-1)?.isRemainderRow).toBe(true);
  });

  it('rejects invalid billing date ranges', () => {
    const service = createService(createDbMock());

    expect(() => service.previewBillingSplit({
      startDate: '2026-12-01',
      endDate: '2026-07-01',
      totalRevenue: 1000,
      totalExternalCost: 0,
    })).toThrow(BadRequestException);
  });

  it('returns contract billing actuals with plan achievement summary', async () => {
    const db = createDbMock();
    db.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 10n,
          code: 'crm-ct-new',
          sourceOpportunityId: null,
          sourceOpportunityCode: null,
          confirmed: true,
          wbsCode: 'WBS-CRM-NEW',
          revenueTotal: 200000000n,
          externalCostTotal: 60000000n,
        },
      ])
      .mockResolvedValueOnce([
        {
          contractId: 10n,
          id: 201n,
          billingYm: '2026/09',
          revenueAmount: 100000000n,
          externalCostAmount: 30000000n,
          sortOrder: 10,
        },
        {
          contractId: 10n,
          id: 202n,
          billingYm: '2026/10',
          revenueAmount: 100000000n,
          externalCostAmount: 30000000n,
          sortOrder: 20,
        },
      ])
      .mockResolvedValueOnce([
        {
          contractId: 10n,
          id: 301n,
          billingYm: '2026/09',
          revenueAmount: 100000000n,
          externalCostAmount: 25000000n,
          sortOrder: 10,
        },
      ]);
    const service = createService(db);

    const result = await service.getBillingActual('crm-ct-new');

    expect(result.contractId).toBe('crm-ct-new');
    expect(result.planLines).toHaveLength(2);
    expect(result.actualLines).toHaveLength(1);
    expect(result.summary.planRevenueTotal).toBe(200000000);
    expect(result.summary.actualRevenueTotal).toBe(100000000);
    expect(result.summary.revenueDelta).toBe(-100000000);
    expect(result.summary.revenueAchievementRate).toBe(50);
    expect(result.summary.externalCostAchievementRate).toBe(41.67);
  });

  it('builds a read-only PMS handoff preview from a confirmed contract snapshot', async () => {
    const db = createDbMock();
    db.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 10n,
          contractCode: 'crm-ct-new',
          sourceOpportunityId: 77n,
          sourceOpportunityCode: 'crm-opp-077',
          customerName: 'LS ITC',
          contractName: 'PMS 인계 후보 검증',
          ownerName: '김민준',
          businessType: 'SI 구축',
          industryLine: '전력/제조',
          regionCode: 'domestic',
          statusCode: 'active',
          confirmed: true,
          contractStartDate: new Date('2026-09-01T00:00:00.000Z'),
          contractEndDate: new Date('2026-10-31T00:00:00.000Z'),
          wbsCode: 'WBS-CRM-NEW',
          paymentTermCode: 'NET30',
          revenueSubtotal: 200000000n,
          specialDiscountTypeCode: 'amount',
          specialDiscountValue: null,
          specialDiscountAmount: 0n,
          revenueTotal: 200000000n,
          costTotal: 60000000n,
          externalCostTotal: 60000000n,
          pmsHandoffStatusCode: 'planned',
          dmsLinkStatusCode: 'planned',
          adminBoundaryCode: 'shared-admin',
          nextAction: 'PMS 인계 후보 확인',
          updatedAt: new Date('2026-07-06T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          contractId: 10n,
          id: 101n,
          lineCode: 'revenue-001',
          lineKindCode: 'revenue',
          categoryCode: 'service',
          lineLabel: '구축 서비스',
          quantity: 2,
          unitPrice: 100000000n,
          amount: 200000000n,
          marginRate: null,
          truncUnit: 0n,
          department: 'DX센터',
          memberName: '구축팀',
          grade: 'Senior',
          serviceTypeCode: 'internal',
          revenueLinked: false,
          linkedCostLineCode: null,
          revenueUnitPrice: null,
          sortOrder: 10,
        },
      ])
      .mockResolvedValueOnce([
        {
          contractId: 10n,
          id: 201n,
          billingYm: '2026/09',
          revenueAmount: 100000000n,
          externalCostAmount: 30000000n,
          sortOrder: 10,
        },
        {
          contractId: 10n,
          id: 202n,
          billingYm: '2026/10',
          revenueAmount: 100000000n,
          externalCostAmount: 30000000n,
          sortOrder: 20,
        },
      ])
      .mockResolvedValueOnce([]);
    const service = createService(db);

    const result = await service.getPmsHandoffPreview('crm-ct-new');

    expect(result).toMatchObject({
      contractId: 'crm-ct-new',
      contractCode: 'crm-ct-new',
      sourceOpportunityId: '77',
      sourceOpportunityCode: 'crm-opp-077',
      confirmed: true,
      readiness: 'ready',
      handoffStatus: 'planned',
      blockedReasons: [],
      financials: {
        revenueTotal: 200000000,
        externalCostTotal: 60000000,
        billingPlanCount: 2,
        billingRevenueTotal: 200000000,
        billingExternalCostTotal: 60000000,
      },
    });
    expect(result.boundaryNotice).toContain('PMS');
    expect(result.revenueLines).toHaveLength(1);
    expect(result.billingPlan).toHaveLength(2);
  });

  it('builds a read-only DMS contract document packet without generating files', async () => {
    const db = createDbMock();
    db.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 10n,
          contractCode: 'crm-ct-doc',
          sourceOpportunityId: 77n,
          sourceOpportunityCode: 'crm-opp-077',
          customerName: 'LS ITC',
          contractName: 'DMS 문서 패킷 검증',
          ownerName: '김민준',
          businessType: 'SI 구축',
          industryLine: '전력/제조',
          regionCode: 'domestic',
          statusCode: 'active',
          confirmed: true,
          contractStartDate: new Date('2026-09-01T00:00:00.000Z'),
          contractEndDate: new Date('2026-10-31T00:00:00.000Z'),
          wbsCode: 'WBS-CRM-DOC',
          paymentTermCode: 'NET30',
          revenueSubtotal: 200000000n,
          specialDiscountTypeCode: 'amount',
          specialDiscountValue: null,
          specialDiscountAmount: 0n,
          revenueTotal: 200000000n,
          costTotal: 60000000n,
          externalCostTotal: 60000000n,
          pmsHandoffStatusCode: 'planned',
          dmsLinkStatusCode: 'planned',
          adminBoundaryCode: 'shared-admin',
          nextAction: 'DMS 문서 패킷 확인',
          updatedAt: new Date('2026-07-06T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          contractId: 10n,
          id: 101n,
          lineCode: 'revenue-001',
          lineKindCode: 'revenue',
          categoryCode: 'service',
          lineLabel: '구축 서비스',
          quantity: 2,
          unitPrice: 100000000n,
          amount: 200000000n,
          marginRate: null,
          truncUnit: 0n,
          department: 'DX센터',
          memberName: '구축팀',
          grade: 'Senior',
          serviceTypeCode: 'internal',
          revenueLinked: false,
          linkedCostLineCode: null,
          revenueUnitPrice: null,
          sortOrder: 10,
        },
      ])
      .mockResolvedValueOnce([
        {
          contractId: 10n,
          id: 201n,
          billingYm: '2026/09',
          revenueAmount: 100000000n,
          externalCostAmount: 30000000n,
          sortOrder: 10,
        },
        {
          contractId: 10n,
          id: 202n,
          billingYm: '2026/10',
          revenueAmount: 100000000n,
          externalCostAmount: 30000000n,
          sortOrder: 20,
        },
      ])
      .mockResolvedValueOnce([]);
    const fileCrud = createFileCrudMock();
    const service = createService(db, createQuoteSettingsMock({
      id: 'seller-1',
      profileCode: 'default',
      companyName: 'SSOO 주식회사',
      ceoName: '홍길동',
      businessRegistrationNo: '123-45-67890',
      address: '서울특별시 중구 세종대로 1',
      tel: '02-0000-0000',
      email: 'sales@ssoo.example.com',
      ciStatus: 'configured',
      ciStorageRef: 'dms://ci/ssoo.png',
      updatedAt: '2026-07-07T00:00:00.000Z',
    }), fileCrud);

    const result = await service.getDmsDocumentPreview('crm-ct-doc');

    expect(result).toMatchObject({
      contractId: 'crm-ct-doc',
      contractCode: 'crm-ct-doc',
      sourceOpportunityCode: 'crm-opp-077',
      documentType: 'contract',
      templateKey: 'crm-contract-v1',
      readOnly: true,
      confirmed: true,
      readiness: 'ready',
      dmsLinkStatus: 'planned',
      sellerName: 'SSOO 주식회사',
      sellerInfoStatus: 'configured',
      blockedReasons: [],
    });
    expect(result.unavailableActions).toEqual([]);
    expect(result.boundaryNotice).toContain('DMS');
    expect(result.fileNameHint).toContain('crm-ct-doc');
    expect(result.draftPathHint).toBe('CRM/LS_ITC/crm-ct-doc/crm-ct-doc_DMS_문서_패킷_검증_contract-draft.md');
    expect(result.savedDraftPath).toBeUndefined();
    expect(result.latestHandoff).toBeNull();
    expect(result.variables).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'contractCode', value: 'crm-ct-doc', source: 'contract' }),
      expect.objectContaining({ key: 'sellerBusinessRegistrationNo', value: '123-45-67890', source: 'seller-profile' }),
      expect.objectContaining({ key: 'billingPlanCount', value: '2건', source: 'billing-plan' }),
    ]));
    expect(result.attachments).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'seller-ci', status: 'ready', evidencePath: 'dms://ci/ssoo.png', referenceStatus: 'verified' }),
      expect.objectContaining({ key: 'billing-plan', status: 'ready', evidencePath: 'crm-ct-doc#billing-plan:2' }),
    ]));
    expect(fileCrud.resolveFilePath.calls).toEqual([['ci/ssoo.png']]);
    expect(result.lifecycle).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'markdown-draft',
        owner: 'crm',
        status: 'ready',
        evidencePath: result.draftPathHint,
      }),
      expect.objectContaining({ key: 'template-review', owner: 'dms', status: 'blocked' }),
      expect.objectContaining({ key: 'word-export', owner: 'dms', status: 'blocked' }),
      expect.objectContaining({ key: 'pdf-export', owner: 'dms', status: 'blocked' }),
      expect.objectContaining({ key: 'approval', owner: 'dms', status: 'blocked' }),
    ]));
  });

  it('creates a DMS markdown draft from a ready contract document packet', async () => {
    const db = createDbMock();
    db.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 10n,
          contractCode: 'crm-ct-doc',
          sourceOpportunityId: 77n,
          sourceOpportunityCode: 'crm-opp-077',
          customerName: 'LS ITC',
          contractName: '데이터 플랫폼 구축 계약',
          ownerName: '김민준',
          businessType: 'SI 구축',
          industryLine: '전력/제조',
          regionCode: 'domestic',
          statusCode: 'active',
          confirmed: true,
          contractStartDate: new Date('2026-09-01T00:00:00.000Z'),
          contractEndDate: new Date('2026-10-31T00:00:00.000Z'),
          wbsCode: 'WBS-CRM-DOC',
          paymentTermCode: 'NET30',
          revenueSubtotal: 200000000n,
          specialDiscountTypeCode: 'amount',
          specialDiscountValue: null,
          specialDiscountAmount: 0n,
          revenueTotal: 200000000n,
          costTotal: 60000000n,
          externalCostTotal: 60000000n,
          pmsHandoffStatusCode: 'planned',
          dmsLinkStatusCode: 'planned',
          adminBoundaryCode: 'shared-admin',
          nextAction: 'DMS 문서 패킷 확인',
          updatedAt: new Date('2026-07-06T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          contractId: 10n,
          id: 101n,
          lineCode: 'revenue-001',
          lineKindCode: 'revenue',
          categoryCode: 'service',
          lineLabel: '구축 서비스',
          quantity: 2,
          unitPrice: 100000000n,
          amount: 200000000n,
          marginRate: null,
          truncUnit: 0n,
          department: 'DX센터',
          memberName: '구축팀',
          grade: 'Senior',
          serviceTypeCode: 'internal',
          revenueLinked: false,
          linkedCostLineCode: null,
          revenueUnitPrice: null,
          sortOrder: 10,
        },
      ])
      .mockResolvedValueOnce([
        {
          contractId: 10n,
          id: 201n,
          billingYm: '2026/09',
          revenueAmount: 100000000n,
          externalCostAmount: 30000000n,
          sortOrder: 10,
        },
        {
          contractId: 10n,
          id: 202n,
          billingYm: '2026/10',
          revenueAmount: 100000000n,
          externalCostAmount: 30000000n,
          sortOrder: 20,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([createDmsHandoffRow()]);
    const fileCrud = createFileCrudMock();
    const service = createService(
      db,
      createQuoteSettingsMock({
        id: 'seller-1',
        profileCode: 'default',
        companyName: 'SSOO 주식회사',
        ceoName: '홍길동',
        businessRegistrationNo: '123-45-67890',
        address: '서울특별시 중구 세종대로 1',
        tel: '02-0000-0000',
        email: 'sales@ssoo.example.com',
        ciStatus: 'configured',
        ciStorageRef: 'dms://ci/ssoo.png',
        updatedAt: '2026-07-07T00:00:00.000Z',
      }),
      fileCrud,
    );
    const currentUser: TokenPayload = { userId: '77', loginId: 'sales' };

    const result = await service.createDmsDocumentDraft('crm-ct-doc', { memo: '계약서 초안 확인 요청' }, currentUser);

    expect(result).toMatchObject({
      contractId: 'crm-ct-doc',
      contractCode: 'crm-ct-doc',
      templateKey: 'crm-contract-v1',
      dmsLinkStatus: 'draft-created',
    });
    expect(result.savedPath).toBe('CRM/LS_ITC/crm-ct-doc/crm-ct-doc_데이터_플랫폼_구축_계약_contract-draft.md');
    expect(result.preview.dmsLinkStatus).toBe('draft-created');
    expect(result.preview.draftPathHint).toBe(result.savedPath);
    expect(result.preview.savedDraftPath).toBe(result.savedPath);
    expect(result.preview.latestHandoff).toMatchObject({
      id: '501',
      status: 'draft-created',
      draftPath: result.savedPath,
      memo: '계약서 초안 확인 요청',
    });
    expect(result.handoff).toMatchObject({
      id: '501',
      contractCode: 'crm-ct-doc',
      draftPath: result.savedPath,
      status: 'draft-created',
    });
    expect(result.preview.lifecycle).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'markdown-draft',
        owner: 'crm',
        status: 'completed',
        evidencePath: result.savedPath,
      }),
      expect.objectContaining({ key: 'template-review', owner: 'dms', status: 'pending' }),
      expect.objectContaining({
        key: 'attachment-confirmation',
        owner: 'dms',
        status: 'ready',
        evidencePath: 'dms://ci/ssoo.png, crm-ct-doc#billing-plan:2',
      }),
      expect.objectContaining({ key: 'word-export', owner: 'dms', status: 'pending' }),
      expect.objectContaining({ key: 'pdf-export', owner: 'dms', status: 'pending' }),
      expect.objectContaining({ key: 'approval', owner: 'dms', status: 'pending' }),
    ]));
    expect(result.handoff.lifecycleSnapshot).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'markdown-draft',
        owner: 'crm',
        status: 'completed',
        evidencePath: result.savedPath,
      }),
      expect.objectContaining({ key: 'word-export', owner: 'dms', status: 'pending' }),
    ]));
    expect(result.handoff.variablesSnapshot).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'contractCode', value: 'crm-ct-doc' }),
    ]));
    expect(result.handoff.attachmentsSnapshot).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'seller-ci', evidencePath: 'dms://ci/ssoo.png' }),
      expect.objectContaining({ key: 'billing-plan', evidencePath: 'crm-ct-doc#billing-plan:2' }),
    ]));
    expect(result.preview.unavailableActions).toEqual([]);
    expect(fileCrud.write.calls).toHaveLength(1);
    expect(fileCrud.write.calls[0]?.[0]).toBe(result.savedPath);
    expect(fileCrud.write.calls[0]?.[1]).toContain('# LS ITC 데이터 플랫폼 구축 계약 계약서');
    expect(fileCrud.write.calls[0]?.[1]).toContain('## DMS 문서 lifecycle');
    expect(fileCrud.write.calls[0]?.[1]).toContain('계약서 초안 확인 요청');
    expect(fileCrud.write.calls[0]?.[2]).toBe(currentUser);
    expect(db.$executeRaw.calls).toHaveLength(2);
    expect(Array.from(db.$executeRaw.calls[0]?.[0] as TemplateStringsArray).join('')).toContain('dms-handoff-replaced');
    expect(Array.from(db.$executeRaw.calls[1]?.[0] as TemplateStringsArray).join('')).toContain('dms-draft-create');
  });

  it('marks the DMS template review step ready when the CRM contract template exists in DMS registry', async () => {
    const db = createDbMock();
    db.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 10n,
          contractCode: 'crm-ct-doc',
          sourceOpportunityId: 77n,
          sourceOpportunityCode: 'crm-opp-077',
          customerName: 'LS ITC',
          contractName: '데이터 플랫폼 구축 계약',
          ownerName: '김민준',
          businessType: 'SI 구축',
          industryLine: '전력/제조',
          regionCode: 'domestic',
          statusCode: 'active',
          confirmed: true,
          contractStartDate: new Date('2026-09-01T00:00:00.000Z'),
          contractEndDate: new Date('2026-10-31T00:00:00.000Z'),
          wbsCode: 'WBS-CRM-DOC',
          paymentTermCode: 'NET30',
          revenueSubtotal: 200000000n,
          specialDiscountTypeCode: 'amount',
          specialDiscountValue: null,
          specialDiscountAmount: 0n,
          revenueTotal: 200000000n,
          costTotal: 60000000n,
          externalCostTotal: 60000000n,
          pmsHandoffStatusCode: 'planned',
          dmsLinkStatusCode: 'draft-created',
          adminBoundaryCode: 'shared-admin',
          nextAction: 'DMS 문서 패킷 확인',
          updatedAt: new Date('2026-07-06T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          contractId: 10n,
          id: 201n,
          billingYm: '2026/09',
          revenueAmount: 200000000n,
          externalCostAmount: 60000000n,
          sortOrder: 10,
        },
      ])
      .mockResolvedValueOnce([
        createDmsHandoffRow({
          draftPath: 'CRM/LS_ITC/crm-ct-doc/crm-ct-doc_데이터_플랫폼_구축_계약_contract-draft.md',
        }),
      ]);
    const templateService = createTemplateServiceMock();
    const service = createService(
      db,
      createQuoteSettingsMock({
        id: 'seller-1',
        profileCode: 'default',
        companyName: 'SSOO 주식회사',
        ceoName: '홍길동',
        businessRegistrationNo: '123-45-67890',
        address: '서울특별시 중구 세종대로 1',
        tel: '02-0000-0000',
        email: 'sales@ssoo.example.com',
        ciStatus: 'configured',
        ciStorageRef: 'dms://ci/ssoo.png',
        updatedAt: '2026-07-07T00:00:00.000Z',
      }),
      undefined,
      templateService,
    );

    const result = await service.getDmsDocumentPreview('crm-ct-doc');

    expect(templateService.get.calls).toEqual([['crm-contract-v1', 'global', 'system']]);
    expect(result.savedDraftPath).toBe('CRM/LS_ITC/crm-ct-doc/crm-ct-doc_데이터_플랫폼_구축_계약_contract-draft.md');
    expect(result.lifecycle).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'template-review',
        owner: 'dms',
        status: 'ready',
        evidencePath: 'system/crm-contract-v1.md',
      }),
      expect.objectContaining({ key: 'word-export', owner: 'dms', status: 'pending' }),
    ]));
  });

  it('records DMS execution evidence on the active document handoff snapshot', async () => {
    const db = createDbMock();
    const baseHandoff = createDmsHandoffRow();
    const baseDocumentSnapshot = baseHandoff.documentSnapshot as {
      lifecycle: Array<Record<string, unknown>>;
    };
    const completedLifecycle = [
      ...baseDocumentSnapshot.lifecycle.slice(0, 3),
      {
        key: 'word-export',
        label: 'Word 산출',
        owner: 'dms',
        status: 'completed',
        evidenceLabel: 'DMS Word export artifact',
        evidencePath: 'dms://contracts/crm-ct-doc.docx',
        note: 'DMS export runtime에서 Word 파일을 생성했습니다.',
      },
      {
        key: 'pdf-export',
        label: 'PDF 저장',
        owner: 'dms',
        status: 'completed',
        evidenceLabel: 'DMS PDF export artifact',
        evidencePath: 'dms://contracts/crm-ct-doc.pdf',
        note: 'DMS export runtime에서 PDF 파일을 저장했습니다.',
      },
      {
        key: 'approval',
        label: 'DMS 승인',
        owner: 'dms',
        status: 'completed',
        evidenceLabel: 'DMS approval record',
        evidencePath: 'dms-approval://crm-ct-doc/approved',
        note: 'DMS 검토 승인 이력이 확인되었습니다.',
      },
    ];
    db.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 10n,
          contractCode: 'crm-ct-doc',
          sourceOpportunityId: 77n,
          sourceOpportunityCode: 'crm-opp-077',
          customerName: 'LS ITC',
          contractName: '데이터 플랫폼 구축 계약',
          ownerName: '김민준',
          businessType: 'SI 구축',
          industryLine: '전력/제조',
          regionCode: 'domestic',
          statusCode: 'active',
          confirmed: true,
          contractStartDate: new Date('2026-09-01T00:00:00.000Z'),
          contractEndDate: new Date('2026-10-31T00:00:00.000Z'),
          wbsCode: 'WBS-CRM-DOC',
          paymentTermCode: 'NET30',
          revenueSubtotal: 200000000n,
          specialDiscountTypeCode: 'amount',
          specialDiscountValue: null,
          specialDiscountAmount: 0n,
          revenueTotal: 200000000n,
          costTotal: 60000000n,
          externalCostTotal: 60000000n,
          pmsHandoffStatusCode: 'planned',
          dmsLinkStatusCode: 'draft-created',
          adminBoundaryCode: 'shared-admin',
          nextAction: 'DMS 문서 패킷 확인',
          updatedAt: new Date('2026-07-06T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          contractId: 10n,
          id: 201n,
          billingYm: '2026/09',
          revenueAmount: 200000000n,
          externalCostAmount: 60000000n,
          sortOrder: 10,
        },
      ])
      .mockResolvedValueOnce([createDmsHandoffRow()])
      .mockResolvedValueOnce([
        createDmsHandoffRow({
          id: 502n,
          statusCode: 'execution-evidence-updated',
          documentSnapshot: {
            ...baseDocumentSnapshot,
            lifecycle: completedLifecycle,
          },
          memo: 'DMS export/approval evidence',
        }),
      ]);
    const service = createService(
      db,
      createQuoteSettingsMock({
        id: 'seller-1',
        profileCode: 'default',
        companyName: 'SSOO 주식회사',
        ceoName: '홍길동',
        businessRegistrationNo: '123-45-67890',
        address: '서울특별시 중구 세종대로 1',
        tel: '02-0000-0000',
        email: 'sales@ssoo.example.com',
        ciStatus: 'configured',
        ciStorageRef: 'dms://ci/ssoo.png',
        updatedAt: '2026-07-07T00:00:00.000Z',
      }),
      undefined,
      createTemplateServiceMock(),
    );
    const currentUser: TokenPayload = { userId: '77', loginId: 'sales' };

    const result = await service.recordDmsDocumentExecutionEvidence(
      'crm-ct-doc',
      {
        steps: [
          {
            key: 'word-export',
            evidencePath: 'dms://contracts/crm-ct-doc.docx',
            note: 'DMS export runtime에서 Word 파일을 생성했습니다.',
          },
          {
            key: 'pdf-export',
            evidencePath: 'dms://contracts/crm-ct-doc.pdf',
            note: 'DMS export runtime에서 PDF 파일을 저장했습니다.',
          },
          {
            key: 'approval',
            evidencePath: 'dms-approval://crm-ct-doc/approved',
            note: 'DMS 검토 승인 이력이 확인되었습니다.',
          },
        ],
        memo: 'DMS export/approval evidence',
      },
      currentUser,
    );

    expect(result.appliedStepKeys).toEqual(['word-export', 'pdf-export', 'approval']);
    expect(result.handoff).toMatchObject({
      id: '502',
      status: 'execution-evidence-updated',
      memo: 'DMS export/approval evidence',
    });
    expect(result.handoff.lifecycleSnapshot).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'word-export', status: 'completed', evidencePath: 'dms://contracts/crm-ct-doc.docx' }),
      expect.objectContaining({ key: 'pdf-export', status: 'completed', evidencePath: 'dms://contracts/crm-ct-doc.pdf' }),
      expect.objectContaining({ key: 'approval', status: 'completed', evidencePath: 'dms-approval://crm-ct-doc/approved' }),
    ]));
    expect(result.preview.latestHandoff).toMatchObject({
      id: '502',
      status: 'execution-evidence-updated',
    });
    expect(result.preview.lifecycle).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'word-export', status: 'completed', evidencePath: 'dms://contracts/crm-ct-doc.docx' }),
      expect.objectContaining({ key: 'pdf-export', status: 'completed', evidencePath: 'dms://contracts/crm-ct-doc.pdf' }),
      expect.objectContaining({ key: 'approval', status: 'completed', evidencePath: 'dms-approval://crm-ct-doc/approved' }),
    ]));
    expect(db.$executeRaw.calls).toHaveLength(2);
    expect(Array.from(db.$executeRaw.calls[0]?.[0] as TemplateStringsArray).join('')).toContain('dms-execution-evidence-replaced');
    expect(Array.from(db.$executeRaw.calls[1]?.[0] as TemplateStringsArray).join('')).toContain('dms-execution-evidence-update');
    expect(Array.from(db.$queryRaw.calls[4]?.[0] as TemplateStringsArray).join('')).toContain('execution-evidence-updated');
  });

  it('executes DMS lifecycle artifacts and records the returned evidence on the active handoff', async () => {
    const db = createDbMock();
    const baseHandoff = createDmsHandoffRow();
    const baseDocumentSnapshot = baseHandoff.documentSnapshot as {
      lifecycle: Array<Record<string, unknown>>;
    };
    const completedLifecycle = baseDocumentSnapshot.lifecycle.map((step) => {
      if (step.key === 'markdown-draft') {
        return step;
      }
      const key = String(step.key);
      return {
        ...step,
        status: 'completed',
        evidencePath: key === 'word-export'
          ? 'local://crm-ct-doc.docx'
          : key === 'pdf-export'
            ? 'local://crm-ct-doc.pdf'
            : key === 'approval'
              ? '_generated/crm-contract-lifecycle/crm-ct-doc/approval-workflow.md'
              : key === 'attachment-confirmation'
                ? '_generated/crm-contract-lifecycle/crm-ct-doc/attachment-finalization-ledger.md'
                : `_generated/crm-contract-lifecycle/crm-ct-doc/${key}.md`,
      };
    });
    const contractRow = {
      id: 10n,
      contractCode: 'crm-ct-doc',
      sourceOpportunityId: 77n,
      sourceOpportunityCode: 'crm-opp-077',
      customerName: 'LS ITC',
      contractName: '데이터 플랫폼 구축 계약',
      ownerName: '김민준',
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      regionCode: 'domestic',
      statusCode: 'active',
      confirmed: true,
      contractStartDate: new Date('2026-09-01T00:00:00.000Z'),
      contractEndDate: new Date('2026-10-31T00:00:00.000Z'),
      wbsCode: 'WBS-CRM-DOC',
      paymentTermCode: 'NET30',
      revenueSubtotal: 200000000n,
      specialDiscountTypeCode: 'amount',
      specialDiscountValue: null,
      specialDiscountAmount: 0n,
      revenueTotal: 200000000n,
      costTotal: 60000000n,
      externalCostTotal: 60000000n,
      pmsHandoffStatusCode: 'planned',
      dmsLinkStatusCode: 'draft-created',
      adminBoundaryCode: 'shared-admin',
      nextAction: 'DMS 문서 패킷 확인',
      updatedAt: new Date('2026-07-06T00:00:00.000Z'),
    };
    const billingRow = {
      contractId: 10n,
      id: 201n,
      billingYm: '2026/09',
      revenueAmount: 200000000n,
      externalCostAmount: 60000000n,
      sortOrder: 10,
    };
    db.$queryRaw
      .mockResolvedValueOnce([contractRow])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([billingRow])
      .mockResolvedValueOnce([baseHandoff])
      .mockResolvedValueOnce([contractRow])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([billingRow])
      .mockResolvedValueOnce([baseHandoff])
      .mockResolvedValueOnce([
        createDmsHandoffRow({
          id: 503n,
          statusCode: 'execution-evidence-updated',
          documentSnapshot: {
            ...baseDocumentSnapshot,
            lifecycle: completedLifecycle,
          },
          memo: 'DMS lifecycle artifact execution',
        }),
      ]);
    const dmsLifecycle = createDmsCrmContractLifecycleMock();
    const service = createService(
      db,
      createQuoteSettingsMock(),
      undefined,
      createTemplateServiceMock(),
      dmsLifecycle,
    );
    const currentUser: TokenPayload = { userId: '77', loginId: 'sales' };

    const result = await service.executeDmsDocumentLifecycle(
      'crm-ct-doc',
      { memo: 'DMS lifecycle artifact execution' },
      currentUser,
    );

    expect(dmsLifecycle.execute.calls).toHaveLength(1);
    expect(dmsLifecycle.execute.calls[0]?.[0]).toMatchObject({
      contractId: 'crm-ct-doc',
      contractCode: 'crm-ct-doc',
      templateKey: 'crm-contract-v1',
      draftPath: baseHandoff.draftPath,
      memo: 'DMS lifecycle artifact execution',
    });
    expect(dmsLifecycle.execute.calls[0]?.[0].lifecycle).toEqual(baseDocumentSnapshot.lifecycle);
    expect(result.appliedStepKeys).toEqual([
      'template-review',
      'attachment-confirmation',
      'word-export',
      'pdf-export',
      'approval',
    ]);
    expect(result.handoff).toMatchObject({
      id: '503',
      status: 'execution-evidence-updated',
      memo: 'DMS lifecycle artifact execution',
    });
    expect(result.dmsExecution.artifacts).toHaveLength(12);
    expect(result.dmsExecution.artifacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'template-version-snapshot', path: '_generated/crm-contract-lifecycle/crm-ct-doc/template-version.md' }),
      expect.objectContaining({ kind: 'template-change-review-record', path: '_generated/crm-contract-lifecycle/crm-ct-doc/template-change-review.md' }),
      expect.objectContaining({ kind: 'template-change-request-ledger', path: '_generated/crm-contract-lifecycle/crm-ct-doc/template-change-request-ledger.md' }),
      expect.objectContaining({ kind: 'attachment-finalization-ledger', path: '_generated/crm-contract-lifecycle/crm-ct-doc/attachment-finalization-ledger.md' }),
      expect.objectContaining({ kind: 'approval-route-record', path: '_generated/crm-contract-lifecycle/crm-ct-doc/approval-route.md' }),
      expect.objectContaining({ kind: 'approval-workflow-record', path: '_generated/crm-contract-lifecycle/crm-ct-doc/approval-workflow.md' }),
      expect.objectContaining({ kind: 'approval-route-ledger', path: '_generated/crm-contract-lifecycle/crm-ct-doc/approval-route-ledger.md' }),
    ]));
    expect(result.dmsExecution.governance.templateVersion.sourcePath).toBe('system/crm-contract-v1.md');
    expect(result.dmsExecution.governance.approvalRoute).toMatchObject({
      routeKey: 'dms-crm-contract-standard',
      policyVersion: 'dms-crm-contract-standard@2026-07-09',
      directorySyncStatus: 'synced',
      externalDirectorySynced: true,
      resolvedActors: expect.arrayContaining([
        expect.objectContaining({
          role: 'contract-approver',
          organizationCode: 'SALES-OPS',
        }),
      ]),
    });
    expect(result.dmsExecution.governance.approvalRouteLedger).toMatchObject({
      ledgerId: 'crm-contract-approval-route:crm-ct-doc:dms-crm-contract-standard:dms-crm-contract-standard@2026-07-09',
      syncStatus: 'synced',
      syncedActorCount: 2,
      directorySyncStatus: 'synced',
      routeRecordPath: '_generated/crm-contract-lifecycle/crm-ct-doc/approval-route.md',
      workflowRecordPath: '_generated/crm-contract-lifecycle/crm-ct-doc/approval-workflow.md',
    });
    expect(result.dmsExecution.governance.attachmentFinalizationLedger).toMatchObject({
      ledgerId: 'crm-contract-attachment-finalization:crm-ct-doc:2026-07-09T15:00:00.000Z',
      status: 'finalized',
      finalizedAttachmentCount: expect.any(Number),
      deferredAttachmentCount: 0,
      attachmentRecordPath: '_generated/crm-contract-lifecycle/crm-ct-doc/attachment-confirmation.md',
    });
    expect(result.dmsExecution.governance.templateChangeReview).toMatchObject({
      status: 'not-required',
      reviewerLoginId: 'sales',
    });
    expect(result.dmsExecution.governance.templateChangeRequestLedger).toMatchObject({
      status: 'closed-without-change',
      changeRequestRequired: false,
      reviewStatus: 'not-required',
      requestedByLoginId: 'sales',
    });
    expect(result.dmsExecution.governance.approvalActors.map((actor) => actor.role)).toEqual([
      'template-owner',
      'contract-approver',
    ]);
    expect(result.dmsExecution.evidenceSteps).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'attachment-confirmation', evidencePath: '_generated/crm-contract-lifecycle/crm-ct-doc/attachment-finalization-ledger.md' }),
      expect.objectContaining({ key: 'word-export', evidencePath: 'local://crm-ct-doc.docx' }),
      expect.objectContaining({ key: 'pdf-export', evidencePath: 'local://crm-ct-doc.pdf' }),
      expect.objectContaining({ key: 'approval', evidencePath: '_generated/crm-contract-lifecycle/crm-ct-doc/approval-workflow.md' }),
    ]));
    expect(Array.from(db.$executeRaw.calls[1]?.[0] as TemplateStringsArray).join('')).toContain('dms-execution-evidence-update');
  });

  it('keeps the saved DMS markdown draft path visible after preview reload', async () => {
    const db = createDbMock();
    db.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 10n,
          contractCode: 'crm-ct-doc',
          sourceOpportunityId: 77n,
          sourceOpportunityCode: 'crm-opp-077',
          customerName: 'LS ITC',
          contractName: '데이터 플랫폼 구축 계약',
          ownerName: '김민준',
          businessType: 'SI 구축',
          industryLine: '전력/제조',
          regionCode: 'domestic',
          statusCode: 'active',
          confirmed: true,
          contractStartDate: new Date('2026-09-01T00:00:00.000Z'),
          contractEndDate: new Date('2026-10-31T00:00:00.000Z'),
          wbsCode: 'WBS-CRM-DOC',
          paymentTermCode: 'NET30',
          revenueSubtotal: 200000000n,
          specialDiscountTypeCode: 'amount',
          specialDiscountValue: null,
          specialDiscountAmount: 0n,
          revenueTotal: 200000000n,
          costTotal: 60000000n,
          externalCostTotal: 60000000n,
          pmsHandoffStatusCode: 'planned',
          dmsLinkStatusCode: 'draft-created',
          adminBoundaryCode: 'shared-admin',
          nextAction: 'DMS 문서 패킷 확인',
          updatedAt: new Date('2026-07-06T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          contractId: 10n,
          id: 101n,
          lineCode: 'revenue-001',
          lineKindCode: 'revenue',
          categoryCode: 'service',
          lineLabel: '구축 서비스',
          quantity: 2,
          unitPrice: 100000000n,
          amount: 200000000n,
          marginRate: null,
          truncUnit: 0n,
          department: 'DX센터',
          memberName: '구축팀',
          grade: 'Senior',
          serviceTypeCode: 'internal',
          revenueLinked: false,
          linkedCostLineCode: null,
          revenueUnitPrice: null,
          sortOrder: 10,
        },
      ])
      .mockResolvedValueOnce([
        {
          contractId: 10n,
          id: 201n,
          billingYm: '2026/09',
          revenueAmount: 100000000n,
          externalCostAmount: 30000000n,
          sortOrder: 10,
        },
      ])
      .mockResolvedValueOnce([createDmsHandoffRow({
        memo: '재조회 handoff',
        savedAt: new Date('2026-07-09T13:00:00.000Z'),
      })]);
    const service = createService(db, createQuoteSettingsMock({
      id: 'seller-1',
      profileCode: 'default',
      companyName: 'SSOO 주식회사',
      ceoName: '홍길동',
      businessRegistrationNo: '123-45-67890',
      address: '서울특별시 중구 세종대로 1',
      ciStatus: 'configured',
      updatedAt: '2026-07-07T00:00:00.000Z',
    }));

    const result = await service.getDmsDocumentPreview('crm-ct-doc');

    expect(result.dmsLinkStatus).toBe('draft-created');
    expect(result.draftPathHint).toBe('CRM/LS_ITC/crm-ct-doc/crm-ct-doc_데이터_플랫폼_구축_계약_contract-draft.md');
    expect(result.savedDraftPath).toBe(result.draftPathHint);
    expect(result.latestHandoff).toMatchObject({
      id: '501',
      draftPath: result.draftPathHint,
      memo: '재조회 handoff',
    });
    expect(result.lifecycle).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'markdown-draft',
        owner: 'crm',
        status: 'completed',
        evidencePath: result.draftPathHint,
      }),
      expect.objectContaining({ key: 'word-export', owner: 'dms', status: 'pending' }),
      expect.objectContaining({ key: 'pdf-export', owner: 'dms', status: 'pending' }),
    ]));
  });

  it('replaces billing actuals for confirmed contracts', async () => {
    const db = createDbMock();
    db.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 10n,
          code: 'crm-ct-new',
          sourceOpportunityId: null,
          sourceOpportunityCode: null,
          confirmed: true,
          wbsCode: 'WBS-CRM-NEW',
          revenueTotal: 200000000n,
          externalCostTotal: 60000000n,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 10n,
          code: 'crm-ct-new',
          sourceOpportunityId: null,
          sourceOpportunityCode: null,
          confirmed: true,
          wbsCode: 'WBS-CRM-NEW',
          revenueTotal: 200000000n,
          externalCostTotal: 60000000n,
        },
      ])
      .mockResolvedValueOnce([
        {
          contractId: 10n,
          id: 201n,
          billingYm: '2026/09',
          revenueAmount: 100000000n,
          externalCostAmount: 30000000n,
          sortOrder: 10,
        },
        {
          contractId: 10n,
          id: 202n,
          billingYm: '2026/10',
          revenueAmount: 100000000n,
          externalCostAmount: 30000000n,
          sortOrder: 20,
        },
      ])
      .mockResolvedValueOnce([
        {
          contractId: 10n,
          id: 301n,
          billingYm: '2026/09',
          revenueAmount: 100000000n,
          externalCostAmount: 30000000n,
          sortOrder: 10,
        },
        {
          contractId: 10n,
          id: 302n,
          billingYm: '2026/10',
          revenueAmount: 90000000n,
          externalCostAmount: 25000000n,
          sortOrder: 20,
        },
      ]);
    const service = createService(db);

    const result = await service.replaceBillingActual('crm-ct-new', {
      lines: [
        { billingYm: '2026/09', revenueAmount: 100000000, externalCostAmount: 30000000 },
        { billingYm: '2026/10', revenueAmount: 90000000, externalCostAmount: 25000000 },
      ],
    }, 7n);

    expect(db.$executeRaw.calls).toHaveLength(3);
    expect(result.summary.actualRevenueTotal).toBe(190000000);
    expect(result.summary.revenueAchievementRate).toBe(95);
  });

  it('rejects billing actual saves for unconfirmed contracts', async () => {
    const db = createDbMock();
    db.$queryRaw.mockResolvedValueOnce([
      {
        id: 10n,
        code: 'crm-ct-new',
        sourceOpportunityId: null,
        sourceOpportunityCode: null,
        confirmed: false,
        wbsCode: 'WBS-CRM-NEW',
        revenueTotal: 200000000n,
        externalCostTotal: 60000000n,
      },
    ]);
    const service = createService(db);

    await expect(service.replaceBillingActual('crm-ct-new', {
      lines: [
        { billingYm: '2026/09', revenueAmount: 100000000, externalCostAmount: 30000000 },
      ],
    }, 7n)).rejects.toThrow(BadRequestException);
    expect(db.$executeRaw.calls).toHaveLength(0);
  });

  it('builds monthly contract performance from confirmed contract plans and actuals', async () => {
    const db = createDbMock();
    db.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 10n,
          contractCode: 'crm-ct-new',
          sourceOpportunityId: null,
          sourceOpportunityCode: null,
          customerName: 'LS ITC',
          contractName: '월별 계약대비실적 검증',
          ownerName: '김민준',
          businessType: 'SI 구축',
          industryLine: '전력/제조',
          regionCode: 'domestic',
          statusCode: 'active',
          confirmed: true,
          contractStartDate: new Date('2026-09-01T00:00:00.000Z'),
          contractEndDate: new Date('2026-10-31T00:00:00.000Z'),
          wbsCode: 'WBS-CRM-NEW',
          paymentTermCode: 'NET30',
          revenueSubtotal: 200000000n,
          specialDiscountTypeCode: 'amount',
          specialDiscountValue: null,
          specialDiscountAmount: 0n,
          revenueTotal: 200000000n,
          costTotal: 60000000n,
          externalCostTotal: 60000000n,
          pmsHandoffStatusCode: 'planned',
          dmsLinkStatusCode: 'planned',
          adminBoundaryCode: 'shared-admin',
          nextAction: '계약대비실적 검증',
          updatedAt: new Date('2026-07-06T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          contractId: 10n,
          id: 201n,
          billingYm: '2026/09',
          revenueAmount: 100000000n,
          externalCostAmount: 30000000n,
          sortOrder: 10,
        },
        {
          contractId: 10n,
          id: 202n,
          billingYm: '2026/10',
          revenueAmount: 100000000n,
          externalCostAmount: 30000000n,
          sortOrder: 20,
        },
      ])
      .mockResolvedValueOnce([
        {
          contractId: 10n,
          contractCode: 'crm-ct-new',
          id: 301n,
          billingYm: '2026/09',
          revenueAmount: 90000000n,
          externalCostAmount: 25000000n,
          sortOrder: 10,
        },
      ]);
    const service = createService(db);

    const result = await service.getMonthlyPerformance({
      year: 2026,
      businessType: 'SI 구축',
      region: 'domestic',
    });

    expect(result.summary.contractCount).toBe(1);
    expect(result.summary.planRevenueTotal).toBe(200000000);
    expect(result.summary.actualRevenueTotal).toBe(90000000);
    expect(result.summary.revenueDelta).toBe(-110000000);
    expect(result.summary.revenueAchievementRate).toBe(45);
    expect(result.summary.businessTypeOptions).toEqual(['SI 구축']);
    expect(result.items[0]?.months[8]?.planRevenueAmount).toBe(100000000);
    expect(result.items[0]?.months[8]?.actualRevenueAmount).toBe(90000000);
    expect(result.items[0]?.months[9]?.actualRevenueAmount).toBe(0);
    expect(result.items[0]?.total.marginDelta).toBe(-75000000);
  });

  it('creates an editable CRM contract with lines and billing plan', async () => {
    const db = createDbMock();
    db.$queryRaw
      .mockResolvedValueOnce([{ id: 7n, userName: 'kim.mj', displayName: '김민준' }])
      .mockResolvedValueOnce([{ id: 10n, code: 'crm-ct-new' }])
      .mockResolvedValueOnce([
        {
          id: 10n,
          contractCode: 'crm-ct-new',
          sourceOpportunityId: null,
          sourceOpportunityCode: null,
          customerName: 'LS ITC',
          contractName: '계약 저장 API 검증',
          ownerName: '김민준',
          clientContactName: '박고객',
          ownerUserId: 7n,
          businessType: 'SI 구축',
          industryLine: '전력/제조',
          regionCode: 'domestic',
          statusCode: 'review',
          confirmed: false,
          contractStartDate: new Date('2026-09-01T00:00:00.000Z'),
          contractEndDate: new Date('2026-10-31T00:00:00.000Z'),
          wbsCode: 'WBS-CRM-NEW',
          paymentTermCode: 'NET30',
          revenueSubtotal: 200000000n,
          specialDiscountTypeCode: 'amount',
          specialDiscountValue: 10000000,
          specialDiscountAmount: 10000000n,
          revenueTotal: 190000000n,
          costTotal: 60000000n,
          externalCostTotal: 60000000n,
          pmsHandoffStatusCode: 'planned',
          dmsLinkStatusCode: 'planned',
          adminBoundaryCode: 'shared-admin',
          nextAction: '계약 조건과 청구계획 검토',
          updatedAt: new Date('2026-07-06T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          contractId: 10n,
          id: 101n,
          lineCode: 'revenue-001',
          lineKindCode: 'revenue',
          categoryCode: 'service',
          lineLabel: '구축 서비스',
          quantity: 2,
          unitPrice: 100000000n,
          amount: 200000000n,
          marginRate: null,
          truncUnit: 0n,
          department: 'DX센터',
          memberName: '구축팀',
          grade: 'Senior',
          serviceTypeCode: 'internal',
          revenueLinked: false,
          linkedCostLineCode: null,
          revenueUnitPrice: null,
          sortOrder: 10,
        },
        {
          contractId: 10n,
          id: 102n,
          lineCode: 'cost-001',
          lineKindCode: 'cost',
          categoryCode: 'external-cost',
          lineLabel: '외부 검증',
          quantity: 1,
          unitPrice: 60000000n,
          amount: 60000000n,
          marginRate: null,
          truncUnit: 0n,
          department: '파트너',
          memberName: '검증팀',
          grade: 'Partner',
          serviceTypeCode: 'external',
          revenueLinked: false,
          linkedCostLineCode: null,
          revenueUnitPrice: null,
          sortOrder: 10,
        },
      ])
      .mockResolvedValueOnce([
        {
          contractId: 10n,
          id: 201n,
          billingYm: '2026/09',
          revenueAmount: 190000000n,
          externalCostAmount: 60000000n,
          sortOrder: 10,
        },
      ]);
    const service = createService(db);

    const result = await service.createContract({
      customerName: 'LS ITC',
      contractName: '계약 저장 API 검증',
      ownerName: '김민준',
      clientContactName: '박고객',
      ownerUserId: '7',
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      region: 'domestic',
      contractStartDate: '2026-09-01',
      contractEndDate: '2026-10-31',
      wbsCode: 'WBS-CRM-NEW',
      paymentTermCode: 'NET30',
      specialDiscountType: 'amount',
      specialDiscountValue: 10000000,
      revenueLines: [
        {
          category: 'service',
          label: '구축 서비스',
          quantity: 2,
          unitPrice: 100000000,
          serviceType: 'internal',
        },
      ],
      costLines: [
        {
          category: 'external-cost',
          label: '외부 검증',
          quantity: 1,
          unitPrice: 60000000,
          serviceType: 'external',
        },
      ],
      billingPlan: [
        {
          billingYm: '2026/09',
          revenueAmount: 190000000,
          externalCostAmount: 60000000,
        },
      ],
    }, 7n);

    expect(result.id).toBe('crm-ct-new');
    expect(result.revenueTotal).toBe(190000000);
    expect(result.externalCostTotal).toBe(60000000);
    expect(result.clientContactName).toBe('박고객');
    expect(result.ownerUserId).toBe('7');
    expect(result.billingPlan).toHaveLength(1);
    expect(db.$executeRaw.calls).toHaveLength(5);
  });

  it('rejects a contract owner identity that is not an active common user', async () => {
    const db = createDbMock();
    db.$queryRaw.mockResolvedValueOnce([]);
    const service = createService(db);

    await expect(service.createContract({
      customerName: 'LS ITC',
      contractName: '담당 사용자 FK 검증',
      ownerName: '알 수 없는 담당자',
      ownerUserId: '999999',
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      region: 'domestic',
      contractStartDate: '2026-09-01',
      contractEndDate: '2026-10-31',
      revenueLines: [{
        category: 'service',
        label: '구축 서비스',
        amount: 100000000,
        serviceType: 'internal',
      }],
      costLines: [],
    }, 7n)).rejects.toThrow('활성 상태인 담당 사용자를 찾을 수 없습니다.');

    expect(db.$queryRaw.calls).toHaveLength(1);
    expect(db.$executeRaw.calls).toHaveLength(0);
  });

  it('rejects contract saves when billing plan totals do not match the payload totals', async () => {
    const db = createDbMock();
    const service = createService(db);

    await expect(service.createContract({
      customerName: 'LS ITC',
      contractName: '계약 저장 합계 검증',
      ownerName: '김민준',
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      region: 'domestic',
      contractStartDate: '2026-09-01',
      contractEndDate: '2026-10-31',
      revenueLines: [
        {
          category: 'service',
          label: '구축 서비스',
          quantity: 2,
          unitPrice: 100000000,
          serviceType: 'internal',
        },
      ],
      costLines: [
        {
          category: 'external-cost',
          label: '외부 검증',
          quantity: 1,
          unitPrice: 60000000,
          serviceType: 'external',
        },
      ],
      billingPlan: [
        {
          billingYm: '2026/09',
          revenueAmount: 190000000,
          externalCostAmount: 60000000,
        },
      ],
    }, 7n)).rejects.toThrow(BadRequestException);

    expect(db.$queryRaw.calls).toHaveLength(0);
    expect(db.$executeRaw.calls).toHaveLength(0);
  });

  it('rejects contract confirmation when billing totals do not match the ledger', async () => {
    const db = createDbMock();
    db.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 10n,
          code: 'crm-ct-new',
          confirmed: false,
          wbsCode: 'WBS-CRM-NEW',
          revenueTotal: 190000000n,
          externalCostTotal: 60000000n,
        },
      ])
      .mockResolvedValueOnce([
        {
          wbsCode: 'WBS-CRM-NEW',
          revenueTotal: 190000000n,
          externalCostTotal: 60000000n,
          billingCount: 1n,
          billingRevenueTotal: 180000000n,
          billingExternalCostTotal: 60000000n,
        },
      ]);
    const service = createService(db);

    await expect(service.confirmContract('crm-ct-new', 7n))
      .rejects.toThrow(BadRequestException);
    expect(db.$executeRaw.calls).toHaveLength(0);
  });

  it('rejects updates for confirmed contracts', async () => {
    const db = createDbMock();
    db.$queryRaw.mockResolvedValueOnce([
      {
        id: 10n,
        code: 'crm-ct-new',
        confirmed: true,
        wbsCode: 'WBS-CRM-NEW',
        revenueTotal: 190000000n,
        externalCostTotal: 60000000n,
      },
    ]);
    const service = createService(db);

    await expect(service.updateContract('crm-ct-new', {
      customerName: 'LS ITC',
      contractName: '계약 저장 API 검증',
      ownerName: '김민준',
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      region: 'domestic',
      contractStartDate: '2026-09-01',
      contractEndDate: '2026-10-31',
      revenueLines: [],
      costLines: [],
    }, 7n)).rejects.toThrow(BadRequestException);
  });

  it('unlinks the source opportunity when deleting an unconfirmed converted contract', async () => {
    const db = createDbMock();
    db.$queryRaw.mockResolvedValueOnce([
      {
        id: 10n,
        code: 'crm-ct-new',
        sourceOpportunityId: 1n,
        sourceOpportunityCode: 'crm-opp-001',
        confirmed: false,
        wbsCode: null,
        revenueTotal: 190000000n,
        externalCostTotal: 60000000n,
      },
    ]);
    const service = createService(db);

    const result = await service.deleteContract('crm-ct-new', 7n);

    expect(result).toEqual({ id: 'crm-ct-new', deleted: true });
    expect(db.$executeRaw.calls).toHaveLength(2);
  });

  it('revokes even a confirmed converted contract and restores the source opportunity in one transaction', async () => {
    const db = createDbMock();
    db.$queryRaw.mockResolvedValueOnce([
      {
        id: 10n,
        code: 'crm-ct-new',
        sourceOpportunityId: 1n,
        sourceOpportunityCode: 'crm-opp-001',
        confirmed: true,
        wbsCode: 'WBS-CRM-NEW',
        revenueTotal: 190000000n,
        externalCostTotal: 60000000n,
      },
    ]);
    const service = createService(db);

    const result = await service.revokeConvertedContract({
      opportunityId: 1n,
      opportunityCode: 'crm-opp-001',
      contractCode: 'crm-ct-new',
      reopenOpportunity: false,
      currentUserId: 7n,
    });

    expect(result).toEqual({
      contractCode: 'crm-ct-new',
      opportunityCode: 'crm-opp-001',
      opportunityConfirmed: true,
    });
    expect(db.$executeRaw.calls).toHaveLength(2);
  });

  it('rejects converted-contract recovery when the contract belongs to another opportunity', async () => {
    const db = createDbMock();
    db.$queryRaw.mockResolvedValueOnce([
      {
        id: 10n,
        code: 'crm-ct-new',
        sourceOpportunityId: 99n,
        sourceOpportunityCode: 'crm-opp-099',
        confirmed: false,
        wbsCode: null,
        revenueTotal: 190000000n,
        externalCostTotal: 60000000n,
      },
    ]);
    const service = createService(db);

    await expect(service.revokeConvertedContract({
      opportunityId: 1n,
      opportunityCode: 'crm-opp-001',
      contractCode: 'crm-ct-new',
      reopenOpportunity: true,
      currentUserId: 7n,
    })).rejects.toThrow('연결 계약과 영업기회가 일치하지 않습니다.');
    expect(db.$executeRaw.calls).toHaveLength(0);
  });
});
