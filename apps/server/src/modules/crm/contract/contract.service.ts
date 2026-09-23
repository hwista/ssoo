import { AccessRequestService } from '../../dms/access/access-request.service.js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import type {
  CrmBillingSplitPreviewLine,
  CrmBillingSplitPreviewRequest,
  CrmBillingSplitPreviewResponse,
  CrmBillingSplitTarget,
  CrmContract,
  CrmContractBillingActualLine,
  CrmContractBillingActualResponse,
  CrmContractBillingActualUpsertLine,
  CrmContractBillingActualUpsertRequest,
  CrmContractBillingPlanLine,
  CrmContractBillingPlanUpsertLine,
  CrmContractDmsDocumentAttachmentStatus,
  CrmContractDmsDocumentDraft,
  CrmContractDmsDocumentDraftRequest,
  CrmContractDmsDocumentExecutionEvidenceRequest,
  CrmContractDmsDocumentExecutionEvidenceResult,
  CrmContractDmsDocumentExecutionEvidenceStep,
  CrmContractDmsDocumentExecutionStepKey,
  CrmContractDmsDocumentLifecycleExecutionRequest,
  CrmContractDmsDocumentLifecycleExecutionResult,
  CrmContractDmsDocumentHandoff,
  CrmContractDmsDocumentHandoffStatus,
  CrmContractDmsDocumentHandoffSummary,
  CrmContractDmsDocumentLifecycleStep,
  CrmContractDmsDocumentPreview,
  CrmContractDmsDocumentVariable,
  CrmContractLine,
  CrmContractListQuery,
  CrmContractListResponse,
  CrmContractPerformanceMonth,
  CrmContractPerformanceQuery,
  CrmContractPerformanceRegion,
  CrmContractPerformanceResponse,
  CrmContractPerformanceRow,
  CrmContractPmsHandoffPreview,
  CrmContractSort,
  CrmContractStatus,
  CrmContractSummary,
  CrmContractUpsertLine,
  CrmContractUpsertRequest,
  CrmDmsDocumentTemplateOption,
  CrmOpportunityDiscountType,
  CrmOpportunityServiceType,
  CrmQuotePreviewSellerInfoStatus,
  CrmQuoteSellerCiReferenceStatus,
  CrmQuoteSellerProfile,
} from '@ssoo/types/crm';
import type { TemplateItem } from '@ssoo/types/dms';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { DmsCrmContractLifecycleService } from '../../dms/crm-contract-lifecycle/crm-contract-lifecycle.service.js';
import { FileCrudService } from '../../dms/file/file-crud.service.js';
import { storageAdapterService } from '../../dms/storage/storage-adapter.service.js';
import { TemplateService } from '../../dms/templates/template.service.js';
import { DatabaseService } from '../../../database/database.service.js';
import { QuoteSettingsService } from '../quote-settings/quote-settings.service.js';
import { CrmOperationAttemptService, type CrmOperationRunContext } from '../operations/operation-attempt.service.js';

const DEFAULT_SORT: CrmContractSort = 'updated-desc';
const CONTRACT_STATUSES: CrmContractStatus[] = ['review', 'active', 'completed', 'terminated'];
const CONTRACT_SORTS: CrmContractSort[] = ['updated-desc', 'revenue-desc', 'margin-desc', 'start-asc'];
const CONTRACT_PERFORMANCE_REGIONS: CrmContractPerformanceRegion[] = ['all', 'domestic', 'overseas'];
const BILLING_SPLIT_TARGETS: CrmBillingSplitTarget[] = ['revenue', 'external-cost', 'both'];
const DISCOUNT_TYPES: CrmOpportunityDiscountType[] = ['amount', 'rate'];
const CRM_CONTRACT_BOUNDARY_NOTICE = 'CRM은 계약/청구 원장과 계약 금액 기준값을 소유하고 PMS는 수행 스냅샷만 소비합니다.';
const CRM_CONTRACT_DMS_BOUNDARY_NOTICE = 'CRM은 계약 원장 기반 문서 입력 패킷과 DMS markdown 초안 요청만 제공하고 DMS는 템플릿, 버전, 검토, 첨부를 소유합니다.';
const CONTRACT_UNIMPLEMENTED_INTEGRATIONS = ['DMS 계약서 검토 확정', 'PMS 프로젝트 생성'];
// These actions are fulfilled by the connected DMS lifecycle and surfaced in
// its execution artifacts, so they are no longer unavailable actions.
const CONTRACT_DMS_UNAVAILABLE_ACTIONS: string[] = [];
const CRM_CONTRACT_DMS_TEMPLATE_KEY = 'crm-contract-v1';
const CRM_CONTRACT_DMS_TEMPLATE_TASK_KEY = 'crm-contract-document';
const CRM_CONTRACT_DMS_EXECUTION_STEP_KEYS = new Set<CrmContractDmsDocumentExecutionStepKey>([
  'template-review',
  'attachment-confirmation',
  'word-export',
  'pdf-export',
  'approval',
]);

interface DecimalLike {
  toString(): string;
}

interface RawContractWriter {
  $queryRaw<T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  $executeRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<number>;
}

interface CrmContractLedgerRow {
  id: bigint;
  contractCode: string;
  sourceOpportunityId: bigint | null;
  sourceOpportunityCode: string | null;
  customerName: string;
  contractName: string;
  ownerName: string;
  clientContactName: string | null;
  ownerUserId: bigint | null;
  businessType: string;
  industryLine: string;
  regionCode: string;
  statusCode: string;
  confirmed: boolean;
  contractStartDate: Date;
  contractEndDate: Date;
  wbsCode: string | null;
  paymentTermCode: string | null;
  revenueSubtotal: bigint;
  specialDiscountTypeCode: string;
  specialDiscountValue: DecimalLike | number | string | null;
  specialDiscountAmount: bigint;
  revenueTotal: bigint;
  costTotal: bigint;
  externalCostTotal: bigint;
  pmsHandoffStatusCode: string;
  dmsLinkStatusCode: string;
  adminBoundaryCode: string;
  nextAction: string;
  updatedAt: Date;
}

interface CrmContractLineLedgerRow {
  contractId: bigint;
  id: bigint;
  lineCode: string;
  lineKindCode: string;
  categoryCode: string;
  lineLabel: string;
  quantity: DecimalLike | number | string | null;
  unitPrice: bigint | null;
  amount: bigint;
  marginRate: DecimalLike | number | string | null;
  truncUnit: bigint | null;
  department: string | null;
  memberName: string | null;
  grade: string | null;
  serviceTypeCode: string | null;
  revenueLinked: boolean;
  linkedCostLineCode: string | null;
  revenueUnitPrice: bigint | null;
  sortOrder: number;
}

interface CrmContractBillingPlanLedgerRow {
  contractId: bigint;
  id: bigint;
  billingYm: string;
  revenueAmount: bigint;
  externalCostAmount: bigint;
  sortOrder: number;
}

interface CrmContractBillingActualLedgerRow {
  contractId: bigint;
  contractCode: string;
  id: bigint;
  billingYm: string;
  revenueAmount: bigint;
  externalCostAmount: bigint;
  sortOrder: number;
}

interface CrmContractDmsHandoffLedgerRow {
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
}

type CrmContractDmsTemplateEvidence =
  | {
    state: 'available';
    templateKey: string;
    templateName: string;
    sourcePath?: string;
    status: TemplateItem['status'];
    updatedAt: string;
  }
  | {
    state: 'missing';
    templateKey: string;
    reason: string;
  }
  | {
    state: 'unavailable';
    templateKey: string;
    reason: string;
  };

interface CrmContractWriteRow {
  id: bigint;
  code: string;
  sourceOpportunityId: bigint | null;
  sourceOpportunityCode: string | null;
  confirmed: boolean;
  wbsCode: string | null;
  revenueTotal: bigint;
  externalCostTotal: bigint;
}

interface CrmContractInsertedRow {
  id: bigint;
  code: string;
}

interface CrmConvertedContractRevocationRequest {
  opportunityId: bigint;
  opportunityCode: string;
  contractCode: string;
  reopenOpportunity: boolean;
  currentUserId?: bigint;
}

interface CrmConvertedContractRevocationResult {
  contractCode: string;
  opportunityCode: string;
  opportunityConfirmed: boolean;
}

interface CrmSourceOpportunityRow {
  id: bigint;
  code: string;
}

interface CrmContractOwnerUserRow {
  id: bigint;
  userName: string;
  displayName: string | null;
}

interface NormalizedContractLine {
  clientLineId: string | null;
  category: CrmContractLine['category'];
  label: string;
  quantity: number | null;
  unitPrice: bigint | null;
  amount: bigint;
  marginRate: number | null;
  truncUnit: bigint | null;
  department: string | null;
  memberName: string | null;
  grade: string | null;
  serviceTypeCode: CrmOpportunityServiceType | null;
  revenueLinked: boolean;
  linkedCostLineCode: string | null;
  revenueUnitPrice: bigint | null;
}

interface NormalizedContractBillingPlanLine {
  billingYm: string;
  revenueAmount: bigint;
  externalCostAmount: bigint;
}

interface NormalizedContractBillingActualLine {
  billingYm: string;
  revenueAmount: bigint;
  externalCostAmount: bigint;
}

interface NormalizedContractPayload {
  sourceOpportunityIdText: string | null;
  sourceOpportunityCodeText: string | null;
  customerName: string;
  contractName: string;
  ownerName: string;
  clientContactName: string | null;
  ownerUserId: bigint | null;
  businessType: string;
  industryLine: string;
  regionCode: CrmContract['region'];
  statusCode: CrmContractStatus;
  contractStartDate: Date;
  contractEndDate: Date;
  wbsCode: string | null;
  paymentTermCode: string | null;
  revenueSubtotal: bigint;
  specialDiscountTypeCode: CrmOpportunityDiscountType;
  specialDiscountValue: number | null;
  specialDiscountAmount: bigint;
  revenueTotal: bigint;
  costTotal: bigint;
  externalCostTotal: bigint;
  nextAction: string;
  revenueLines: NormalizedContractLine[];
  costLines: NormalizedContractLine[];
  billingPlan: NormalizedContractBillingPlanLine[];
}

interface SellerCiReferenceResolution {
  status: CrmQuoteSellerCiReferenceStatus;
  storageRef?: string;
  normalizedRef?: string;
  reason?: string;
}

@Injectable()
export class ContractService {
  constructor(
    private readonly db: DatabaseService,
    @Optional() private readonly quoteSettingsService?: QuoteSettingsService,
    @Optional() private readonly fileCrudService?: FileCrudService,
    @Optional() private readonly templateService?: TemplateService,
    @Optional() private readonly dmsCrmContractLifecycleService?: DmsCrmContractLifecycleService,
    @Optional() private readonly operationAttemptService?: CrmOperationAttemptService,
    @Optional() private readonly documentAccessService?: AccessRequestService,
  ) {}

  async listContracts(query: CrmContractListQuery = {}): Promise<CrmContract[]> {
    const normalized = this.normalizeQuery(query);
    const rows = await this.loadContractRows();
    const lineRows = await this.loadContractLineRows();
    const billingRows = await this.loadContractBillingPlanRows();
    const linesByContract = this.groupByContract(lineRows);
    const billingByContract = this.groupByContract(billingRows);
    const contracts = rows.map((row) => this.toContract(
      row,
      linesByContract.get(row.id.toString()) ?? [],
      billingByContract.get(row.id.toString()) ?? [],
    ));

    return this.filterAndSortContracts(contracts, normalized);
  }

  async listResponse(query: CrmContractListQuery = {}): Promise<CrmContractListResponse> {
    const normalized = this.normalizeQuery(query);
    const allContracts = await this.listContracts({ sort: normalized.sort });
    const items = this.filterAndSortContracts(allContracts, normalized);

    return {
      summary: this.buildSummary(allContracts, items, normalized),
      items,
    };
  }

  async getContract(id: string): Promise<CrmContract> {
    const contracts = await this.listContracts();
    const contract = contracts.find((candidate) => candidate.id === id || candidate.code === id);
    if (!contract) {
      throw new NotFoundException('CRM contract not found');
    }
    return contract;
  }

  async getBillingActual(id: string): Promise<CrmContractBillingActualResponse> {
    const existing = await this.findContractWriteRow(id);
    if (!existing) {
      throw new NotFoundException('CRM contract not found');
    }

    const planRows = await this.loadContractBillingPlanRows(existing.id);
    const actualRows = await this.loadContractBillingActualRows(existing.id);
    return this.toBillingActualResponse(existing, planRows, actualRows);
  }

  async getPmsHandoffPreview(id: string): Promise<CrmContractPmsHandoffPreview> {
    const contract = await this.getContract(id);
    return this.toPmsHandoffPreview(contract);
  }

  async getDmsDocumentPreview(id: string): Promise<CrmContractDmsDocumentPreview> {
    const contract = await this.getContract(id);
    const sellerProfile = await this.quoteSettingsService?.getSellerProfile();
    const latestHandoff = await this.loadLatestDmsDocumentHandoff(contract.code);
    const templateKey = latestHandoff?.templateKey ?? CRM_CONTRACT_DMS_TEMPLATE_KEY;
    const [templateEvidence, templateOptions] = await Promise.all([
      this.loadDmsTemplateEvidence(templateKey),
      this.loadDmsTemplateOptions(),
    ]);
    return this.toDmsDocumentPreview(contract, sellerProfile, latestHandoff, templateEvidence, templateOptions);
  }

  async createDmsDocumentDraft(
    id: string,
    dto: CrmContractDmsDocumentDraftRequest = {},
    currentUser: TokenPayload,
  ): Promise<CrmContractDmsDocumentDraft> {
    if (!this.fileCrudService) {
      throw new BadRequestException('DMS file service is not available in this runtime.');
    }
    const contract = await this.getContract(id);
    const sellerProfile = await this.quoteSettingsService?.getSellerProfile();
    const existingHandoff = await this.loadLatestDmsDocumentHandoff(contract.code);
    const templateKey = dto.templateKey?.trim() || CRM_CONTRACT_DMS_TEMPLATE_KEY;
    const [templateEvidence, templateOptions] = await Promise.all([
      this.loadDmsTemplateEvidence(templateKey),
      this.loadDmsTemplateOptions(),
    ]);
    this.assertDmsTemplateSelectable(templateKey, templateOptions);
    const preview = this.toDmsDocumentPreview(contract, sellerProfile, existingHandoff, templateEvidence, templateOptions);
    if (preview.readiness !== 'ready') {
      throw new BadRequestException(`DMS 문서 초안을 저장할 수 없습니다: ${preview.blockedReasons.join(', ')}`);
    }

    const savedPath = this.toDmsDraftPath(preview);
    const draftPreview = this.toSavedDmsDocumentDraftPreview(preview, savedPath, null, templateEvidence);
    const content = this.toDmsDocumentDraftMarkdown(contract, draftPreview, dto.memo);
    if (!this.documentAccessService) throw new BadRequestException('문서 권한 등록 서비스를 사용할 수 없습니다.');
    const result = await this.fileCrudService.write(savedPath, content, currentUser);
    if (!result.success) {
      throw new BadRequestException(`DMS 문서 초안 저장에 실패했습니다: ${result.error}`);
    }

    await this.documentAccessService.syncDocumentProjection(savedPath, result.data.metadata as unknown as Record<string, unknown>);
    const handoff = await this.persistDmsDocumentHandoff(contract, draftPreview, savedPath, dto, currentUser);
    const handoffSummary = this.toDmsDocumentHandoffSummary(handoff);
    const nextPreview = this.toSavedDmsDocumentDraftPreview(draftPreview, savedPath, handoffSummary, templateEvidence);

    return {
      contractId: contract.id,
      contractCode: contract.code,
      documentTitle: preview.documentTitle,
      templateKey: preview.templateKey,
      savedPath,
      dmsLinkStatus: 'draft-created',
      savedAt: new Date().toISOString(),
      boundaryNotice: CRM_CONTRACT_DMS_BOUNDARY_NOTICE,
      nextAction: 'DMS 문서 페이지에서 초안을 검토하고 템플릿/첨부/승인 흐름을 진행하세요.',
      handoff,
      preview: nextPreview,
    };
  }

  async readDmsDocumentArtifact(
    id: string,
    kind: string,
  ): Promise<{ buffer: Buffer; fileName: string; contentType: string }> {
    if (kind !== 'word-export' && kind !== 'pdf-export') {
      throw new BadRequestException('다운로드 가능한 계약 산출물은 word-export 또는 pdf-export입니다.');
    }
    const contract = await this.getContract(id);
    const handoff = await this.loadLatestDmsDocumentHandoff(contract.code);
    const step = handoff?.lifecycleSnapshot.find((candidate) => candidate.key === kind);
    const storageUri = step?.status === 'completed' ? step.evidencePath?.trim() : '';
    if (!storageUri || !/^(local|nas):\/\//.test(storageUri)) {
      throw new NotFoundException('완료된 DMS 계약 산출물 evidence를 찾을 수 없습니다.');
    }

    try {
      const opened = storageAdapterService.open({ storageUri });
      const resolved = storageAdapterService.resolveContainedPath(opened.provider, opened.path);
      const expectedExtension = kind === 'word-export' ? '.docx' : '.pdf';
      if (path.extname(resolved.fullPath).toLowerCase() !== expectedExtension || !fs.existsSync(resolved.fullPath)) {
        throw new Error('산출물 파일 형식 또는 경로가 lifecycle evidence와 일치하지 않습니다.');
      }
      return {
        buffer: fs.readFileSync(resolved.fullPath),
        fileName: path.basename(resolved.fullPath),
        contentType: kind === 'word-export'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf',
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'DMS 계약 산출물을 열 수 없습니다.');
    }
  }

  async recordDmsDocumentExecutionEvidence(
    id: string,
    dto: CrmContractDmsDocumentExecutionEvidenceRequest,
    currentUser: TokenPayload,
  ): Promise<CrmContractDmsDocumentExecutionEvidenceResult> {
    const contract = await this.getContract(id);
    const latestHandoff = await this.loadLatestDmsDocumentHandoff(contract.code);
    if (!latestHandoff) {
      throw new BadRequestException('DMS markdown 초안 handoff를 먼저 생성해야 실행 evidence를 기록할 수 있습니다.');
    }

    const executionSteps = this.normalizeDmsExecutionEvidenceSteps(dto.steps);
    const nextLifecycle = this.applyDmsExecutionEvidenceToLifecycle(
      latestHandoff.lifecycleSnapshot,
      executionSteps,
    );
    const nextDocumentSnapshot = {
      ...latestHandoff.documentSnapshot,
      lifecycle: nextLifecycle,
    };
    const handoff = await this.persistDmsDocumentExecutionEvidence(
      contract,
      latestHandoff,
      nextDocumentSnapshot,
      dto,
      currentUser,
    );
    const sellerProfile = await this.quoteSettingsService?.getSellerProfile();
    const [templateEvidence, templateOptions] = await Promise.all([
      this.loadDmsTemplateEvidence(handoff.templateKey),
      this.loadDmsTemplateOptions(),
    ]);
    const preview = this.toDmsDocumentPreview(contract, sellerProfile, handoff, templateEvidence, templateOptions);

    return {
      contractId: contract.id,
      contractCode: contract.code,
      templateKey: handoff.templateKey,
      appliedStepKeys: executionSteps.map((step) => step.key),
      recordedAt: handoff.savedAt,
      handoff,
      preview,
      boundaryNotice: CRM_CONTRACT_DMS_BOUNDARY_NOTICE,
      nextAction: 'DMS 실행 evidence가 CRM handoff snapshot에 반영되었습니다. 실제 파일/승인 정본은 DMS에서 계속 소유합니다.',
    };
  }

  async executeDmsDocumentLifecycle(
    id: string,
    dto: CrmContractDmsDocumentLifecycleExecutionRequest = {},
    currentUser: TokenPayload,
    operationContext?: CrmOperationRunContext,
  ): Promise<CrmContractDmsDocumentLifecycleExecutionResult> {
    if (this.operationAttemptService) {
      return this.operationAttemptService.run({
        target: 'dms',
        action: 'contract-dms-lifecycle',
        sourceEntityType: 'crm.contract',
        sourceEntityId: id,
        requestedBy: BigInt(currentUser.userId),
        fingerprintInput: { contractId: id, memo: dto.memo ?? null },
        context: operationContext,
        execute: () => this.performDmsDocumentLifecycle(id, dto, currentUser),
        evidence: (result) => ({
          contractId: result.contractId,
          contractCode: result.contractCode,
          templateKey: result.templateKey,
          appliedStepKeys: result.appliedStepKeys,
          recordedAt: result.recordedAt,
        }),
      });
    }
    return this.performDmsDocumentLifecycle(id, dto, currentUser);
  }

  private async performDmsDocumentLifecycle(
    id: string,
    dto: CrmContractDmsDocumentLifecycleExecutionRequest,
    currentUser: TokenPayload,
  ): Promise<CrmContractDmsDocumentLifecycleExecutionResult> {
    if (!this.dmsCrmContractLifecycleService) {
      throw new BadRequestException('DMS contract lifecycle service is not available in this runtime.');
    }

    const contract = await this.getContract(id);
    const latestHandoff = await this.loadLatestDmsDocumentHandoff(contract.code);
    if (!latestHandoff) {
      throw new BadRequestException('DMS markdown 초안 handoff를 먼저 생성해야 DMS lifecycle을 실행할 수 있습니다.');
    }

    const dmsExecution = await this.dmsCrmContractLifecycleService.execute({
      contractId: contract.id,
      contractCode: contract.code,
      documentTitle: latestHandoff.documentTitle,
      templateKey: latestHandoff.templateKey,
      draftPath: latestHandoff.draftPath,
      variables: latestHandoff.variablesSnapshot,
      attachments: latestHandoff.attachmentsSnapshot,
      lifecycle: latestHandoff.lifecycleSnapshot,
      memo: dto.memo ?? 'CRM 계약 handoff 기반 DMS lifecycle 실행',
    }, currentUser);
    const evidence = await this.recordDmsDocumentExecutionEvidence(
      id,
      {
        steps: dmsExecution.evidenceSteps.map((step) => ({
          key: step.key as CrmContractDmsDocumentExecutionStepKey,
          evidencePath: step.evidencePath,
          ...(step.evidenceLabel ? { evidenceLabel: step.evidenceLabel } : {}),
          ...(step.note ? { note: step.note } : {}),
        })),
        memo: dto.memo ?? 'DMS lifecycle artifact execution',
      },
      currentUser,
    );

    return {
      ...evidence,
      dmsExecution: {
        executedAt: dmsExecution.executedAt,
        governance: dmsExecution.governance,
        artifacts: dmsExecution.artifacts,
        evidenceSteps: evidence.handoff.lifecycleSnapshot
          .filter((step) => CRM_CONTRACT_DMS_EXECUTION_STEP_KEYS.has(step.key as CrmContractDmsDocumentExecutionStepKey))
          .filter((step) => step.status === 'completed' && Boolean(step.evidencePath))
          .map((step) => ({
            key: step.key as CrmContractDmsDocumentExecutionStepKey,
            evidencePath: step.evidencePath ?? '',
            evidenceLabel: step.evidenceLabel,
            note: step.note,
          })),
        boundaryNotice: dmsExecution.boundaryNotice,
        nextAction: dmsExecution.nextAction,
      },
    };
  }

  async getMonthlyPerformance(query: CrmContractPerformanceQuery = {}): Promise<CrmContractPerformanceResponse> {
    const normalized = this.normalizePerformanceQuery(query);
    const contracts = await this.listContracts({ sort: 'start-asc' });
    const confirmedContracts = contracts.filter((contract) => contract.confirmed);
    const businessTypeOptions = this.toSortedUniqueOptions(confirmedContracts.map((contract) => contract.businessType));
    const industryLineOptions = this.toSortedUniqueOptions(confirmedContracts.map((contract) => contract.industryLine));
    const actualRows = await this.loadContractBillingActualRows();
    const actualRowsByContract = this.groupBillingActualRowsByContractCode(actualRows);
    const search = normalized.search.toLowerCase();

    const rows = confirmedContracts
      .filter((contract) => {
        if (normalized.businessType && contract.businessType !== normalized.businessType) {
          return false;
        }
        if (normalized.industryLine && contract.industryLine !== normalized.industryLine) {
          return false;
        }
        if (normalized.region !== 'all' && contract.region !== normalized.region) {
          return false;
        }
        if (!search) {
          return true;
        }
        return [
          contract.code,
          contract.contractName,
          contract.customerName,
          contract.ownerName,
          contract.businessType,
          contract.industryLine,
          contract.wbsCode ?? '',
        ].some((value) => value.toLowerCase().includes(search));
      })
      .map((contract) => this.toPerformanceRow(
        contract,
        normalized.year,
        actualRowsByContract.get(contract.code) ?? [],
      ))
      .filter((row) => (
        row.total.planRevenueAmount > 0
        || row.total.planExternalCostAmount > 0
        || row.total.actualRevenueAmount > 0
        || row.total.actualExternalCostAmount > 0
      ));

    return {
      summary: this.buildPerformanceSummary(rows, normalized, businessTypeOptions, industryLineOptions),
      items: rows,
    };
  }

  async replaceBillingActual(
    id: string,
    dto: CrmContractBillingActualUpsertRequest,
    currentUserId?: bigint,
  ): Promise<CrmContractBillingActualResponse> {
    const existing = await this.findContractWriteRow(id);
    if (!existing) {
      throw new NotFoundException('CRM contract not found');
    }
    if (!existing.confirmed) {
      throw new BadRequestException('확정된 계약에서만 청구실적을 저장할 수 있습니다.');
    }

    const lines = this.normalizeBillingActual(dto.lines ?? []);
    await this.db.client.$transaction(async (tx) => {
      const writer = tx as unknown as RawContractWriter;
      await this.replaceBillingActualLines(writer, existing.id, lines, currentUserId);
    });

    return this.getBillingActual(existing.code);
  }

  async createContract(dto: CrmContractUpsertRequest, currentUserId?: bigint): Promise<CrmContract> {
    const payload = this.normalizeUpsertPayload(dto);
    const contractCode = this.createContractCode();
    const createdCode = await this.db.client.$transaction(async (tx) => {
      const writer = tx as unknown as RawContractWriter;
      const sourceOpportunity = await this.resolveSourceOpportunity(writer, payload);
      const ownerUser = await this.resolveContractOwnerUser(writer, payload.ownerUserId);
      const ownerName = this.resolveContractOwnerName(payload.ownerName, ownerUser);
      const insertedRows = await writer.$queryRaw<CrmContractInsertedRow[]>`
        insert into crm.crm_contract_m (
          contract_code, source_opportunity_id, source_opportunity_code,
          customer_name, contract_name, owner_name, client_contact, owner_user_id,
          business_type, industry_line,
          region_code, status_code, confirmed, contract_start_date, contract_end_date,
          wbs_code, payment_term_code, revenue_subtotal, special_discount_type_code,
          special_discount_value, special_discount_amount, revenue_total, cost_total,
          external_cost_total, pms_handoff_status_code, dms_link_status_code,
          admin_boundary_code, next_action, created_by, updated_by, last_source, last_activity
        )
        values (
          ${contractCode}, ${sourceOpportunity?.id ?? null}, ${sourceOpportunity?.code ?? payload.sourceOpportunityCodeText},
          ${payload.customerName}, ${payload.contractName}, ${ownerName}, ${payload.clientContactName}, ${ownerUser?.id ?? null},
          ${payload.businessType}, ${payload.industryLine},
          ${payload.regionCode}, ${payload.statusCode}, false, ${payload.contractStartDate}, ${payload.contractEndDate},
          ${payload.wbsCode}, ${payload.paymentTermCode}, ${payload.revenueSubtotal}, ${payload.specialDiscountTypeCode},
          ${payload.specialDiscountValue}, ${payload.specialDiscountAmount}, ${payload.revenueTotal}, ${payload.costTotal},
          ${payload.externalCostTotal}, 'planned', 'planned',
          'shared-admin', ${payload.nextAction}, ${currentUserId ?? null}, ${currentUserId ?? null}, 'crm.contract', 'create'
        )
        returning contract_id as "id", contract_code as "code"
      `;
      const created = insertedRows[0];
      if (!created) {
        throw new BadRequestException('계약 원장 생성에 실패했습니다.');
      }

      await this.replaceContractLines(writer, created.id, payload, currentUserId);
      await this.replaceBillingPlan(writer, created.id, payload.billingPlan, currentUserId);
      return created.code;
    });

    return this.getContract(createdCode);
  }

  async updateContract(id: string, dto: CrmContractUpsertRequest, currentUserId?: bigint): Promise<CrmContract> {
    const existing = await this.findContractWriteRow(id);
    if (!existing) {
      throw new NotFoundException('CRM contract not found');
    }
    if (existing.confirmed) {
      throw new BadRequestException('확정된 계약은 수정할 수 없습니다.');
    }

    const payload = this.normalizeUpsertPayload(dto);
    await this.db.client.$transaction(async (tx) => {
      const writer = tx as unknown as RawContractWriter;
      const sourceOpportunity = await this.resolveSourceOpportunity(writer, payload);
      const ownerUser = await this.resolveContractOwnerUser(writer, payload.ownerUserId);
      const ownerName = this.resolveContractOwnerName(payload.ownerName, ownerUser);
      await writer.$executeRaw`
        update crm.crm_contract_m
           set source_opportunity_id = ${sourceOpportunity?.id ?? null},
               source_opportunity_code = ${sourceOpportunity?.code ?? payload.sourceOpportunityCodeText},
               customer_name = ${payload.customerName},
               contract_name = ${payload.contractName},
               owner_name = ${ownerName},
               client_contact = ${payload.clientContactName},
               owner_user_id = ${ownerUser?.id ?? null},
               business_type = ${payload.businessType},
               industry_line = ${payload.industryLine},
               region_code = ${payload.regionCode},
               status_code = ${payload.statusCode},
               contract_start_date = ${payload.contractStartDate},
               contract_end_date = ${payload.contractEndDate},
               wbs_code = ${payload.wbsCode},
               payment_term_code = ${payload.paymentTermCode},
               revenue_subtotal = ${payload.revenueSubtotal},
               special_discount_type_code = ${payload.specialDiscountTypeCode},
               special_discount_value = ${payload.specialDiscountValue},
               special_discount_amount = ${payload.specialDiscountAmount},
               revenue_total = ${payload.revenueTotal},
               cost_total = ${payload.costTotal},
               external_cost_total = ${payload.externalCostTotal},
               next_action = ${payload.nextAction},
               updated_by = ${currentUserId ?? null},
               updated_at = now(),
               last_source = 'crm.contract',
               last_activity = 'update'
         where contract_id = ${existing.id}
           and is_active = true
      `;

      await this.replaceContractLines(writer, existing.id, payload, currentUserId);
      await this.replaceBillingPlan(writer, existing.id, payload.billingPlan, currentUserId);
    });

    return this.getContract(existing.code);
  }

  async confirmContract(id: string, currentUserId?: bigint): Promise<CrmContract> {
    const existing = await this.findContractWriteRow(id);
    if (!existing) {
      throw new NotFoundException('CRM contract not found');
    }
    if (existing.confirmed) {
      return this.getContract(existing.code);
    }

    await this.assertContractCanConfirm(existing.id);
    await this.db.$executeRaw`
      update crm.crm_contract_m
         set confirmed = true,
             status_code = 'active',
             updated_by = ${currentUserId ?? null},
             updated_at = now(),
             last_source = 'crm.contract',
             last_activity = 'confirm'
       where contract_id = ${existing.id}
         and is_active = true
    `;

    return this.getContract(existing.code);
  }

  async reopenContract(id: string, currentUserId?: bigint): Promise<CrmContract> {
    const existing = await this.findContractWriteRow(id);
    if (!existing) {
      throw new NotFoundException('CRM contract not found');
    }
    if (!existing.confirmed) {
      throw new BadRequestException('미확정 계약은 확정 해제할 수 없습니다.');
    }

    await this.db.$executeRaw`
      update crm.crm_contract_m
         set confirmed = false,
             status_code = case when status_code = 'active' then 'review' else status_code end,
             updated_by = ${currentUserId ?? null},
             updated_at = now(),
             last_source = 'crm.contract',
             last_activity = 'reopen'
       where contract_id = ${existing.id}
         and is_active = true
    `;

    return this.getContract(existing.code);
  }

  async deleteContract(id: string, currentUserId?: bigint): Promise<{ id: string; deleted: true }> {
    const existing = await this.findContractWriteRow(id);
    if (!existing) {
      throw new NotFoundException('CRM contract not found');
    }
    if (existing.confirmed) {
      throw new BadRequestException('확정된 계약은 삭제할 수 없습니다.');
    }

    await this.db.client.$transaction(async (tx) => {
      const writer = tx as unknown as RawContractWriter;
      await writer.$executeRaw`
        update crm.crm_contract_m
           set is_active = false,
               updated_by = ${currentUserId ?? null},
               updated_at = now(),
               last_source = 'crm.contract',
               last_activity = 'delete'
         where contract_id = ${existing.id}
           and is_active = true
      `;
      await this.revokeOpportunityContractLink(writer, existing, currentUserId);
    });

    return { id: existing.code, deleted: true };
  }

  async revokeConvertedContract(
    request: CrmConvertedContractRevocationRequest,
  ): Promise<CrmConvertedContractRevocationResult> {
    const existing = await this.findContractWriteRow(request.contractCode);
    if (!existing) {
      throw new NotFoundException('연결 계약을 찾을 수 없습니다.');
    }

    const sourceIdMismatch = existing.sourceOpportunityId !== null
      && existing.sourceOpportunityId !== request.opportunityId;
    const sourceCodeMismatch = existing.sourceOpportunityCode !== null
      && existing.sourceOpportunityCode !== request.opportunityCode;
    const hasSourceIdentity = existing.sourceOpportunityId !== null || existing.sourceOpportunityCode !== null;
    if (!hasSourceIdentity || sourceIdMismatch || sourceCodeMismatch) {
      throw new BadRequestException('연결 계약과 영업기회가 일치하지 않습니다.');
    }

    await this.db.client.$transaction(async (tx) => {
      const writer = tx as unknown as RawContractWriter;
      const deletedCount = await writer.$executeRaw`
        update crm.crm_contract_m
           set is_active = false,
               updated_by = ${request.currentUserId ?? null},
               updated_at = now(),
               last_source = 'crm.opportunity',
               last_activity = ${request.reopenOpportunity ? 'reopen-with-contract-revocation' : 'revoke-contract'}
         where contract_id = ${existing.id}
           and contract_code = ${existing.code}
           and is_active = true
      `;
      if (deletedCount !== 1) {
        throw new BadRequestException('연결 계약 회수 상태가 변경되어 다시 확인해야 합니다.');
      }

      const opportunityUpdatedCount = await writer.$executeRaw`
        update crm.crm_opportunity_m
           set confirmed = ${!request.reopenOpportunity},
               status_code = ${request.reopenOpportunity ? 'proposal' : 'won'},
               contract_created = false,
               contract_created_at = null,
               contract_code = null,
               updated_by = ${request.currentUserId ?? null},
               updated_at = now(),
               last_source = 'crm.opportunity',
               last_activity = ${request.reopenOpportunity ? 'reopen-with-contract-revocation' : 'revoke-contract'}
         where opportunity_id = ${request.opportunityId}
           and opportunity_code = ${request.opportunityCode}
           and contract_created = true
           and contract_code = ${existing.code}
           and is_active = true
      `;
      if (opportunityUpdatedCount !== 1) {
        throw new BadRequestException('영업기회 계약 연결 상태가 변경되어 다시 확인해야 합니다.');
      }
    });

    return {
      contractCode: existing.code,
      opportunityCode: request.opportunityCode,
      opportunityConfirmed: !request.reopenOpportunity,
    };
  }

  previewBillingSplit(request: CrmBillingSplitPreviewRequest): CrmBillingSplitPreviewResponse {
    const startDate = this.parseDate(request.startDate, '계약 시작일');
    const endDate = this.parseDate(request.endDate, '계약 종료일');
    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException('계약 종료일은 시작일 이후여야 합니다.');
    }

    const target = this.normalizeSplitTarget(request.target);
    const periodMonths = this.normalizePositiveInteger(request.periodMonths ?? 1, '분할 주기');
    const truncUnit = this.normalizePositiveInteger(request.truncUnit ?? 1, '절사 단위');
    const includeLastMonth = request.includeLastMonth !== false;
    const totalRevenue = this.normalizeAmount(request.totalRevenue, '매출 총액');
    const totalExternalCost = this.normalizeAmount(request.totalExternalCost, '외부원가 총액');
    const billingYms = this.buildBillingMonths(startDate, endDate, periodMonths, includeLastMonth);
    const revenueAmounts = target === 'external-cost' ? billingYms.map(() => 0) : this.splitAmount(totalRevenue, billingYms.length, truncUnit);
    const externalCostAmounts = target === 'revenue' ? billingYms.map(() => 0) : this.splitAmount(totalExternalCost, billingYms.length, truncUnit);
    const lines: CrmBillingSplitPreviewLine[] = billingYms.map((billingYm, index) => ({
      billingYm,
      revenueAmount: revenueAmounts[index] ?? 0,
      externalCostAmount: externalCostAmounts[index] ?? 0,
      isRemainderRow: index === billingYms.length - 1,
    }));
    const splitRevenueTotal = lines.reduce((sum, line) => sum + line.revenueAmount, 0);
    const splitExternalCostTotal = lines.reduce((sum, line) => sum + line.externalCostAmount, 0);

    return {
      target,
      periodMonths,
      truncUnit,
      includeLastMonth,
      lines,
      summary: {
        totalRevenue,
        splitRevenueTotal,
        revenueDelta: totalRevenue - splitRevenueTotal,
        totalExternalCost,
        splitExternalCostTotal,
        externalCostDelta: totalExternalCost - splitExternalCostTotal,
        boundaryNotice: CRM_CONTRACT_BOUNDARY_NOTICE,
      },
    };
  }

  private toPmsHandoffPreview(contract: CrmContract): CrmContractPmsHandoffPreview {
    const billingRevenueTotal = contract.billingPlan.reduce((sum, line) => sum + line.revenueAmount, 0);
    const billingExternalCostTotal = contract.billingPlan.reduce((sum, line) => sum + line.externalCostAmount, 0);
    const blockedReasons = [
      ...(!contract.confirmed ? ['계약 확정 후 PMS 인계 후보로 사용할 수 있습니다.'] : []),
      ...(!contract.wbsCode?.trim() ? ['PMS 실행 기준 WBS 코드가 필요합니다.'] : []),
      ...(contract.billingPlan.length === 0 ? ['PMS 실행 참고용 청구계획이 필요합니다.'] : []),
      ...(billingRevenueTotal !== contract.revenueTotal ? ['청구계획 매출 합계가 계약 매출 합계와 일치해야 합니다.'] : []),
      ...(billingExternalCostTotal !== contract.externalCostTotal ? ['청구계획 외부원가 합계가 계약 외부원가 합계와 일치해야 합니다.'] : []),
    ];

    return {
      contractId: contract.id,
      contractCode: contract.code,
      sourceOpportunityId: contract.sourceOpportunityId,
      sourceOpportunityCode: contract.sourceOpportunityCode,
      customerName: contract.customerName,
      contractName: contract.contractName,
      ownerName: contract.ownerName,
      clientContactName: contract.clientContactName,
      ownerUserId: contract.ownerUserId,
      businessType: contract.businessType,
      industryLine: contract.industryLine,
      region: contract.region,
      contractStartDate: contract.contractStartDate,
      contractEndDate: contract.contractEndDate,
      wbsCode: contract.wbsCode,
      confirmed: contract.confirmed,
      readiness: blockedReasons.length === 0 ? 'ready' : 'blocked',
      blockedReasons,
      handoffStatus: contract.pmsHandoffStatus,
      financials: {
        revenueTotal: contract.revenueTotal,
        costTotal: contract.costTotal,
        externalCostTotal: contract.externalCostTotal,
        marginTotal: contract.marginTotal,
        marginRate: contract.marginRate,
        billingPlanCount: contract.billingPlan.length,
        billingRevenueTotal,
        billingExternalCostTotal,
      },
      revenueLines: contract.revenueLines,
      costLines: contract.costLines,
      billingPlan: contract.billingPlan,
      boundaryNotice: CRM_CONTRACT_BOUNDARY_NOTICE,
      nextAction: contract.confirmed
        ? 'PMS는 이 preview를 읽기용 실행 스냅샷으로 소비하고, 프로젝트 수행 데이터는 PMS에서 별도로 소유합니다.'
        : '계약 확정, WBS, 청구계획 합계 검증을 완료한 뒤 PMS 인계 후보로 사용할 수 있습니다.',
    };
  }

  private async loadLatestDmsDocumentHandoff(contractCode: string): Promise<CrmContractDmsDocumentHandoff | null> {
    const rows = await this.db.$queryRaw<CrmContractDmsHandoffLedgerRow[]>`
      select
        contract_dms_handoff_id as "id",
        contract_id as "contractId",
        contract_code as "contractCode",
        document_type_code as "documentTypeCode",
        document_title as "documentTitle",
        template_key as "templateKey",
        folder_hint as "folderHint",
        file_name_hint as "fileNameHint",
        draft_path as "draftPath",
        status_code as "statusCode",
        document_snapshot as "documentSnapshot",
        variables_snapshot as "variablesSnapshot",
        attachments_snapshot as "attachmentsSnapshot",
        memo,
        saved_by as "savedBy",
        saved_at as "savedAt"
      from crm.crm_contract_dms_handoff_m
      where contract_code = ${contractCode}
        and is_active = true
      order by saved_at desc, contract_dms_handoff_id desc
      limit 1
    `;
    return rows[0] ? this.toDmsDocumentHandoff(rows[0]) : null;
  }

  private async loadDmsTemplateEvidence(templateKey: string): Promise<CrmContractDmsTemplateEvidence> {
    if (!this.templateService) {
      return {
        state: 'unavailable',
        templateKey,
        reason: '현재 런타임에서 DMS TemplateService가 연결되지 않았습니다.',
      };
    }

    const template = await this.templateService.get(templateKey, 'global', 'system');
    if (!template) {
      return {
        state: 'missing',
        templateKey,
        reason: `DMS 시스템 템플릿 registry에서 ${templateKey} 템플릿을 찾을 수 없습니다.`,
      };
    }

    return {
      state: 'available',
      templateKey: template.id,
      templateName: template.name,
      sourcePath: template.sourcePath,
      status: template.status,
      updatedAt: template.updatedAt,
    };
  }

  private async loadDmsTemplateOptions(): Promise<CrmDmsDocumentTemplateOption[]> {
    if (!this.templateService || typeof this.templateService.list !== 'function') {
      return [];
    }

    const templates = await this.templateService.list('system');
    return templates.global
      .filter((template) => template.kind === 'document')
      .filter((template) => template.id === CRM_CONTRACT_DMS_TEMPLATE_KEY
        || template.generation?.taskKey === CRM_CONTRACT_DMS_TEMPLATE_TASK_KEY)
      .map((template) => {
        const status = template.status ?? 'active';
        const selectable = status === 'active' && Boolean(template.docxTemplate);
        return {
          templateKey: template.id,
          templateName: template.name,
          taskKey: CRM_CONTRACT_DMS_TEMPLATE_TASK_KEY,
          sourcePath: template.sourcePath,
          status,
          docxFileName: template.docxTemplate?.fileName,
          docxOrigin: template.docxTemplate?.origin,
          reviewStatus: template.reviewConfirmation?.status ?? 'pending',
          selectable,
          ...(!selectable
            ? { unavailableReason: status !== 'active' ? '보관된 템플릿입니다.' : '실제 DOCX binary가 연결되지 않았습니다.' }
            : {}),
        } satisfies CrmDmsDocumentTemplateOption;
      })
      .sort((left, right) => {
        if (left.templateKey === CRM_CONTRACT_DMS_TEMPLATE_KEY) return -1;
        if (right.templateKey === CRM_CONTRACT_DMS_TEMPLATE_KEY) return 1;
        return left.templateName.localeCompare(right.templateName, 'ko');
      });
  }

  private assertDmsTemplateSelectable(
    templateKey: string,
    templateOptions: CrmDmsDocumentTemplateOption[],
  ): void {
    if (!this.templateService || typeof this.templateService.list !== 'function') {
      if (templateKey !== CRM_CONTRACT_DMS_TEMPLATE_KEY) {
        throw new BadRequestException(`DMS 계약 템플릿 ${templateKey}을 검증할 수 없습니다.`);
      }
      return;
    }
    const selected = templateOptions.find((option) => option.templateKey === templateKey);
    if (!selected) {
      throw new BadRequestException(`DMS 계약 템플릿 ${templateKey}은 계약 문서 용도로 등록되지 않았습니다.`);
    }
    if (!selected.selectable) {
      throw new BadRequestException(selected.unavailableReason ?? `DMS 계약 템플릿 ${templateKey}을 사용할 수 없습니다.`);
    }
  }

  private async persistDmsDocumentHandoff(
    contract: CrmContract,
    preview: CrmContractDmsDocumentPreview,
    savedPath: string,
    dto: CrmContractDmsDocumentDraftRequest,
    currentUser: TokenPayload,
  ): Promise<CrmContractDmsDocumentHandoff> {
    const currentUserId = BigInt(currentUser.userId);
    const memo = dto.memo?.trim() ? dto.memo.trim() : null;
    const documentSnapshotJson = JSON.stringify(this.toDmsDocumentSnapshot(preview));
    const variablesSnapshotJson = JSON.stringify(preview.variables);
    const attachmentsSnapshotJson = JSON.stringify(preview.attachments);

    const rows = await this.db.client.$transaction(async (tx) => {
      const writer = tx as RawContractWriter;
      await writer.$executeRaw`
        update crm.crm_contract_dms_handoff_m
           set status_code = 'replaced',
               is_active = false,
               updated_at = now(),
               last_source = 'crm.contract',
               last_activity = 'dms-handoff-replaced'
         where contract_code = ${contract.code}
           and is_active = true
      `;
      const inserted = await writer.$queryRaw<CrmContractDmsHandoffLedgerRow[]>`
        insert into crm.crm_contract_dms_handoff_m (
          contract_id,
          contract_code,
          document_type_code,
          document_title,
          template_key,
          folder_hint,
          file_name_hint,
          draft_path,
          status_code,
          document_snapshot,
          variables_snapshot,
          attachments_snapshot,
          memo,
          saved_by,
          last_source,
          last_activity
        )
        select
          contract_id,
          contract_code,
          ${preview.documentType},
          ${preview.documentTitle},
          ${preview.templateKey},
          ${preview.folderHint},
          ${preview.fileNameHint},
          ${savedPath},
          'draft-created',
          ${documentSnapshotJson}::jsonb,
          ${variablesSnapshotJson}::jsonb,
          ${attachmentsSnapshotJson}::jsonb,
          ${memo},
          ${currentUserId},
          'crm.contract',
          'dms-handoff-create'
        from crm.crm_contract_m
        where contract_code = ${contract.code}
        returning
          contract_dms_handoff_id as "id",
          contract_id as "contractId",
          contract_code as "contractCode",
          document_type_code as "documentTypeCode",
          document_title as "documentTitle",
          template_key as "templateKey",
          folder_hint as "folderHint",
          file_name_hint as "fileNameHint",
          draft_path as "draftPath",
          status_code as "statusCode",
          document_snapshot as "documentSnapshot",
          variables_snapshot as "variablesSnapshot",
          attachments_snapshot as "attachmentsSnapshot",
          memo,
          saved_by as "savedBy",
          saved_at as "savedAt"
      `;
      await writer.$executeRaw`
        update crm.crm_contract_m
           set dms_link_status_code = 'draft-created',
               updated_by = ${currentUserId},
               updated_at = now(),
               last_source = 'crm.contract',
               last_activity = 'dms-draft-create'
         where contract_code = ${contract.code}
      `;
      return inserted;
    });

    if (!rows[0]) {
      throw new BadRequestException('DMS handoff snapshot could not be recorded for this contract.');
    }

    return this.toDmsDocumentHandoff(rows[0]);
  }

  private async persistDmsDocumentExecutionEvidence(
    contract: CrmContract,
    latestHandoff: CrmContractDmsDocumentHandoff,
    documentSnapshot: Omit<CrmContractDmsDocumentPreview, 'latestHandoff'>,
    dto: CrmContractDmsDocumentExecutionEvidenceRequest,
    currentUser: TokenPayload,
  ): Promise<CrmContractDmsDocumentHandoff> {
    const currentUserId = BigInt(currentUser.userId);
    const memo = dto.memo?.trim() ? dto.memo.trim() : latestHandoff.memo ?? null;
    const documentSnapshotJson = JSON.stringify(documentSnapshot);
    const variablesSnapshotJson = JSON.stringify(latestHandoff.variablesSnapshot);
    const attachmentsSnapshotJson = JSON.stringify(latestHandoff.attachmentsSnapshot);

    const rows = await this.db.client.$transaction(async (tx) => {
      const writer = tx as RawContractWriter;
      await writer.$executeRaw`
        update crm.crm_contract_dms_handoff_m
           set status_code = 'replaced',
               is_active = false,
               updated_at = now(),
               last_source = 'crm.contract',
               last_activity = 'dms-execution-evidence-replaced'
         where contract_code = ${contract.code}
           and is_active = true
      `;
      const inserted = await writer.$queryRaw<CrmContractDmsHandoffLedgerRow[]>`
        insert into crm.crm_contract_dms_handoff_m (
          contract_id,
          contract_code,
          document_type_code,
          document_title,
          template_key,
          folder_hint,
          file_name_hint,
          draft_path,
          status_code,
          document_snapshot,
          variables_snapshot,
          attachments_snapshot,
          memo,
          saved_by,
          last_source,
          last_activity
        )
        select
          contract_id,
          contract_code,
          ${latestHandoff.documentType},
          ${latestHandoff.documentTitle},
          ${latestHandoff.templateKey},
          ${latestHandoff.folderHint},
          ${latestHandoff.fileNameHint},
          ${latestHandoff.draftPath},
          'execution-evidence-updated',
          ${documentSnapshotJson}::jsonb,
          ${variablesSnapshotJson}::jsonb,
          ${attachmentsSnapshotJson}::jsonb,
          ${memo},
          ${currentUserId},
          'crm.contract',
          'dms-execution-evidence-update'
        from crm.crm_contract_m
        where contract_code = ${contract.code}
        returning
          contract_dms_handoff_id as "id",
          contract_id as "contractId",
          contract_code as "contractCode",
          document_type_code as "documentTypeCode",
          document_title as "documentTitle",
          template_key as "templateKey",
          folder_hint as "folderHint",
          file_name_hint as "fileNameHint",
          draft_path as "draftPath",
          status_code as "statusCode",
          document_snapshot as "documentSnapshot",
          variables_snapshot as "variablesSnapshot",
          attachments_snapshot as "attachmentsSnapshot",
          memo,
          saved_by as "savedBy",
          saved_at as "savedAt"
      `;
      await writer.$executeRaw`
        update crm.crm_contract_m
           set dms_link_status_code = 'draft-created',
               updated_by = ${currentUserId},
               updated_at = now(),
               last_source = 'crm.contract',
               last_activity = 'dms-execution-evidence-update'
         where contract_code = ${contract.code}
      `;
      return inserted;
    });

    if (!rows[0]) {
      throw new BadRequestException('DMS execution evidence snapshot could not be recorded for this contract.');
    }

    return this.toDmsDocumentHandoff(rows[0]);
  }

  private toDmsDocumentPreview(
    contract: CrmContract,
    sellerProfile: CrmQuoteSellerProfile | null | undefined,
    latestHandoff: CrmContractDmsDocumentHandoff | null = null,
    templateEvidence: CrmContractDmsTemplateEvidence = {
      state: 'unavailable',
      templateKey: CRM_CONTRACT_DMS_TEMPLATE_KEY,
      reason: '현재 런타임에서 DMS TemplateService가 연결되지 않았습니다.',
    },
    templateOptions: CrmDmsDocumentTemplateOption[] = [],
  ): CrmContractDmsDocumentPreview {
    const sellerName = sellerProfile?.companyName?.trim() || '공급자 회사 정보 미설정';
    const sellerInfoStatus: CrmQuotePreviewSellerInfoStatus = this.quoteSettingsService
      ? this.quoteSettingsService.toSellerInfoStatus(sellerProfile)
      : 'not-configured';
    const sellerCiReference = this.resolveSellerCiReference(sellerProfile);
    const sellerProfileWithCiReference: CrmQuoteSellerProfile | undefined = sellerProfile
      ? {
        ...sellerProfile,
        ciReferenceStatus: sellerCiReference.status,
        ...(sellerCiReference.reason ? { ciReferenceReason: sellerCiReference.reason } : {}),
      }
      : undefined;
    const missingSellerDetails = sellerInfoStatus === 'not-configured'
      ? []
      : [
        ...(!sellerProfile?.businessRegistrationNo?.trim() ? ['공급자 사업자등록번호가 필요합니다.'] : []),
        ...(!sellerProfile?.ceoName?.trim() ? ['공급자 대표자명이 필요합니다.'] : []),
        ...(!sellerProfile?.address?.trim() ? ['공급자 주소가 필요합니다.'] : []),
      ];
    const blockedReasons = [
      ...(!contract.confirmed ? ['계약 확정 후 DMS 계약서 패킷으로 사용할 수 있습니다.'] : []),
      ...(!contract.wbsCode?.trim() ? ['문서 패킷에는 PMS/WBS 기준 코드가 필요합니다.'] : []),
      ...(contract.revenueTotal <= 0 ? ['계약 매출 합계가 0원보다 커야 합니다.'] : []),
      ...(contract.billingPlan.length === 0 ? ['계약서 납부조건 변수에는 청구계획이 필요합니다.'] : []),
      ...(contract.dmsLinkStatus === 'not-implemented' ? ['DMS 계약서 저장 연계가 not-implemented 상태입니다.'] : []),
      ...(sellerInfoStatus === 'not-configured' ? ['공급자 회사 정보가 설정되어야 합니다.'] : []),
      ...this.toSellerCiReferenceBlockingReasons(sellerCiReference),
      ...missingSellerDetails,
    ];
    const draftPathHint = this.toDmsDraftPathFromParts(contract.customerName, contract.code, contract.contractName);
    const savedDraftPath = latestHandoff?.draftPath
      ?? (contract.dmsLinkStatus === 'draft-created' ? draftPathHint : undefined);
    const attachments: CrmContractDmsDocumentPreview['attachments'] = [
      {
        key: 'seller-ci',
        label: '공급자 CI',
        status: this.toSellerCiAttachmentStatus(sellerProfile, sellerCiReference),
        evidenceLabel: 'DMS CI storage ref',
        ...(sellerCiReference.storageRef ? { evidencePath: sellerCiReference.storageRef } : {}),
        referenceStatus: sellerCiReference.status,
        ...(sellerCiReference.reason ? { referenceReason: sellerCiReference.reason } : {}),
        note: this.toSellerCiAttachmentNote(sellerCiReference),
      },
      {
        key: 'billing-plan',
        label: '청구계획 별첨',
        status: contract.billingPlan.length > 0 ? 'ready' : 'blocked',
        evidenceLabel: 'CRM billing plan rows',
        ...(contract.billingPlan.length > 0 ? { evidencePath: `${contract.code}#billing-plan:${contract.billingPlan.length}` } : {}),
        note: contract.billingPlan.length > 0
          ? `${contract.billingPlan.length}건의 청구계획을 문서 변수 후보로 전달합니다.`
          : '계약서 납부조건/별첨에 사용할 청구계획이 없습니다.',
      },
    ];
    const latestHandoffSummary = latestHandoff ? this.toDmsDocumentHandoffSummary(latestHandoff) : null;
    const lifecycle = this.mergeDmsExecutionLifecycleEvidence(this.toDmsDocumentLifecycle({
      readiness: blockedReasons.length === 0 ? 'ready' : 'blocked',
      blockedReasons,
      dmsLinkStatus: contract.dmsLinkStatus,
      draftPathHint,
      savedDraftPath,
      latestHandoff: latestHandoffSummary,
      attachments,
      templateEvidence,
    }), latestHandoff);

    return {
      contractId: contract.id,
      contractCode: contract.code,
      sourceOpportunityId: contract.sourceOpportunityId,
      sourceOpportunityCode: contract.sourceOpportunityCode,
      customerName: contract.customerName,
      contractName: contract.contractName,
      ownerName: contract.ownerName,
      clientContactName: contract.clientContactName,
      ownerUserId: contract.ownerUserId,
      contractStartDate: contract.contractStartDate,
      contractEndDate: contract.contractEndDate,
      wbsCode: contract.wbsCode,
      paymentTermCode: contract.paymentTermCode,
      revenueTotal: contract.revenueTotal,
      externalCostTotal: contract.externalCostTotal,
      marginTotal: contract.marginTotal,
      documentType: 'contract',
      documentTitle: `${contract.customerName} ${contract.contractName} 계약서`,
      templateKey: templateEvidence.templateKey,
      templateOptions,
      folderHint: `/CRM/${this.toFileHintPart(contract.customerName)}/${contract.code}`,
      fileNameHint: `${contract.code}_${this.toFileHintPart(contract.customerName)}_${this.toFileHintPart(contract.contractName)}.docx`,
      draftPathHint,
      ...(savedDraftPath ? { savedDraftPath } : {}),
      readOnly: true,
      confirmed: contract.confirmed,
      readiness: blockedReasons.length === 0 ? 'ready' : 'blocked',
      blockedReasons,
      dmsLinkStatus: contract.dmsLinkStatus,
      sellerName,
      sellerInfoStatus,
      sellerProfile: sellerProfileWithCiReference,
      variables: this.toDmsDocumentVariables(contract, sellerProfileWithCiReference, sellerName),
      attachments,
      lifecycle,
      latestHandoff: latestHandoffSummary,
      boundaryNotice: CRM_CONTRACT_DMS_BOUNDARY_NOTICE,
      unavailableActions: CONTRACT_DMS_UNAVAILABLE_ACTIONS,
      nextAction: blockedReasons.length === 0
        ? 'CRM에서 DMS markdown 초안을 저장할 수 있습니다. 템플릿/버전/첨부/Word/PDF 처리는 DMS에서 이어서 진행합니다.'
        : '차단 사유를 보완한 뒤 DMS 문서 패킷을 다시 확인하세요.',
    };
  }

  private toSavedDmsDocumentDraftPreview(
    preview: CrmContractDmsDocumentPreview,
    savedPath: string,
    latestHandoff?: CrmContractDmsDocumentHandoffSummary | null,
    templateEvidence: CrmContractDmsTemplateEvidence = {
      state: 'unavailable',
      templateKey: CRM_CONTRACT_DMS_TEMPLATE_KEY,
      reason: '현재 런타임에서 DMS TemplateService가 연결되지 않았습니다.',
    },
  ): CrmContractDmsDocumentPreview {
    const nextPreview: CrmContractDmsDocumentPreview = {
      ...preview,
      dmsLinkStatus: 'draft-created',
      draftPathHint: savedPath,
      savedDraftPath: savedPath,
      latestHandoff: latestHandoff ?? preview.latestHandoff,
      unavailableActions: CONTRACT_DMS_UNAVAILABLE_ACTIONS,
      nextAction: 'DMS markdown 초안이 저장되었습니다. 템플릿 검토, 첨부, Word/PDF 산출은 DMS에서 이어서 처리합니다.',
    };

    return {
      ...nextPreview,
      lifecycle: this.toDmsDocumentLifecycleFromPreview(nextPreview, templateEvidence),
    };
  }

  private toDmsDocumentLifecycleFromPreview(
    preview: Pick<
      CrmContractDmsDocumentPreview,
      | 'readiness'
      | 'blockedReasons'
      | 'dmsLinkStatus'
      | 'draftPathHint'
      | 'savedDraftPath'
      | 'latestHandoff'
      | 'attachments'
    >,
    templateEvidence: CrmContractDmsTemplateEvidence = {
      state: 'unavailable',
      templateKey: CRM_CONTRACT_DMS_TEMPLATE_KEY,
      reason: '현재 런타임에서 DMS TemplateService가 연결되지 않았습니다.',
    },
  ): CrmContractDmsDocumentLifecycleStep[] {
    return this.toDmsDocumentLifecycle({
      readiness: preview.readiness,
      blockedReasons: preview.blockedReasons,
      dmsLinkStatus: preview.dmsLinkStatus,
      draftPathHint: preview.draftPathHint,
      savedDraftPath: preview.savedDraftPath,
      latestHandoff: preview.latestHandoff,
      attachments: preview.attachments,
      templateEvidence,
    });
  }

  private toDmsDocumentLifecycle(params: {
    readiness: CrmContractDmsDocumentPreview['readiness'];
    blockedReasons: string[];
    dmsLinkStatus: CrmContract['dmsLinkStatus'];
    draftPathHint: string;
    savedDraftPath?: string;
    latestHandoff?: CrmContractDmsDocumentHandoffSummary | null;
    attachments: CrmContractDmsDocumentPreview['attachments'];
    templateEvidence: CrmContractDmsTemplateEvidence;
  }): CrmContractDmsDocumentLifecycleStep[] {
    const draftEvidencePath = params.savedDraftPath ?? params.latestHandoff?.draftPath;
    const draftCompleted = params.dmsLinkStatus === 'draft-created' || Boolean(draftEvidencePath);
    const draftBlocked = !draftCompleted && params.readiness === 'blocked';
    const draftBlockingReasons = draftBlocked ? params.blockedReasons : [];
    const dmsPrerequisiteBlockingReasons = draftCompleted
      ? []
      : ['CRM markdown 초안 저장 후 DMS 문서 lifecycle을 진행할 수 있습니다.'];
    const blockedAttachments = params.attachments.filter((attachment) => attachment.status === 'blocked');
    const attachmentBlockingReasons = blockedAttachments.map((attachment) => `${attachment.label}: ${attachment.note}`);
    const attachmentStatus = this.toDmsAttachmentLifecycleStatus(params.attachments, draftCompleted);
    const attachmentEvidencePath = this.toDmsAttachmentEvidencePath(params.attachments);
    const dmsStatus = draftCompleted ? 'pending' : 'blocked';
    const templateEvidencePath = params.templateEvidence.state === 'available'
      ? params.templateEvidence.sourcePath
      : undefined;
    const templateStatus = this.toDmsTemplateLifecycleStatus(params.templateEvidence, draftCompleted);
    const templateBlockingReasons = this.toDmsTemplateBlockingReasons(params.templateEvidence, draftCompleted);
    const templateNote = this.toDmsTemplateLifecycleNote(params.templateEvidence);

    return [
      {
        key: 'markdown-draft',
        label: 'CRM markdown 초안',
        owner: 'crm',
        status: draftCompleted ? 'completed' : draftBlocked ? 'blocked' : 'ready',
        evidenceLabel: 'DMS markdown path',
        evidencePath: draftEvidencePath ?? params.draftPathHint,
        note: draftCompleted
          ? 'CRM 계약 원장 기준 markdown 초안이 DMS working tree에 저장되었습니다.'
          : 'CRM 계약 원장, 공급자 정보, 청구계획을 확인한 뒤 markdown 초안을 저장합니다.',
        ...(draftBlockingReasons.length > 0 ? { blockingReasons: draftBlockingReasons } : {}),
      },
      {
        key: 'template-review',
        label: 'DMS 템플릿 검토',
        owner: 'dms',
        status: templateStatus,
        evidenceLabel: 'DMS template version',
        ...(templateEvidencePath ? { evidencePath: templateEvidencePath } : {}),
        note: templateNote,
        ...(templateBlockingReasons.length > 0 ? { blockingReasons: templateBlockingReasons } : {}),
      },
      {
        key: 'attachment-confirmation',
        label: 'DMS 첨부 확인',
        owner: 'dms',
        status: attachmentStatus,
        evidenceLabel: 'DMS attachment refs',
        ...(attachmentEvidencePath ? { evidencePath: attachmentEvidencePath } : {}),
        note: 'DMS가 CI, 청구계획 별첨, 추가 증빙 첨부를 확인합니다.',
        ...(!draftCompleted || attachmentBlockingReasons.length > 0
          ? { blockingReasons: [...dmsPrerequisiteBlockingReasons, ...attachmentBlockingReasons] }
          : {}),
      },
      {
        key: 'word-export',
        label: 'Word 산출',
        owner: 'dms',
        status: dmsStatus,
        evidenceLabel: 'DMS Word export artifact',
        note: 'Word 파일 생성은 DMS export runtime에서 수행하고 CRM은 결과 파일을 만들지 않습니다.',
        ...(dmsPrerequisiteBlockingReasons.length > 0 ? { blockingReasons: dmsPrerequisiteBlockingReasons } : {}),
      },
      {
        key: 'pdf-export',
        label: 'PDF 저장',
        owner: 'dms',
        status: dmsStatus,
        evidenceLabel: 'DMS PDF export artifact',
        note: 'PDF 저장은 DMS export runtime에서 수행하고 CRM은 결과 파일을 만들지 않습니다.',
        ...(dmsPrerequisiteBlockingReasons.length > 0 ? { blockingReasons: dmsPrerequisiteBlockingReasons } : {}),
      },
      {
        key: 'approval',
        label: 'DMS 승인',
        owner: 'dms',
        status: dmsStatus,
        evidenceLabel: 'DMS approval record',
        note: '계약서 검토 확정과 승인 이력은 DMS 문서 lifecycle에서 소유합니다.',
        ...(dmsPrerequisiteBlockingReasons.length > 0 ? { blockingReasons: dmsPrerequisiteBlockingReasons } : {}),
      },
    ];
  }

  private normalizeDmsExecutionEvidenceSteps(
    steps: CrmContractDmsDocumentExecutionEvidenceRequest['steps'] | undefined,
  ): CrmContractDmsDocumentExecutionEvidenceStep[] {
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new BadRequestException('DMS execution evidence step이 1개 이상 필요합니다.');
    }

    const seen = new Set<CrmContractDmsDocumentExecutionStepKey>();
    return steps.map((step) => {
      if (!CRM_CONTRACT_DMS_EXECUTION_STEP_KEYS.has(step.key)) {
        throw new BadRequestException(`DMS execution evidence step ${step.key}는 CRM markdown 초안 단계가 아닌 DMS 소유 단계여야 합니다.`);
      }
      if (seen.has(step.key)) {
        throw new BadRequestException(`DMS execution evidence step ${step.key}가 중복되었습니다.`);
      }
      seen.add(step.key);

      const evidencePath = step.evidencePath?.trim();
      if (!evidencePath) {
        throw new BadRequestException(`DMS execution evidence step ${step.key}에는 evidencePath가 필요합니다.`);
      }

      return {
        key: step.key,
        evidencePath,
        ...(step.evidenceLabel?.trim() ? { evidenceLabel: step.evidenceLabel.trim() } : {}),
        ...(step.note?.trim() ? { note: step.note.trim() } : {}),
      };
    });
  }

  private applyDmsExecutionEvidenceToLifecycle(
    lifecycle: CrmContractDmsDocumentLifecycleStep[],
    evidenceSteps: CrmContractDmsDocumentExecutionEvidenceStep[],
  ): CrmContractDmsDocumentLifecycleStep[] {
    if (lifecycle.length === 0) {
      throw new BadRequestException('DMS lifecycle snapshot이 없어 execution evidence를 기록할 수 없습니다.');
    }

    const draftStep = lifecycle.find((step) => step.key === 'markdown-draft');
    if (!draftStep || draftStep.status !== 'completed') {
      throw new BadRequestException('CRM markdown 초안 저장 완료 후 DMS execution evidence를 기록할 수 있습니다.');
    }

    const lifecycleByKey = new Map(lifecycle.map((step) => [step.key, step]));
    for (const evidenceStep of evidenceSteps) {
      const existingStep = lifecycleByKey.get(evidenceStep.key);
      if (!existingStep) {
        throw new BadRequestException(`DMS lifecycle snapshot에 ${evidenceStep.key} 단계가 없습니다.`);
      }
      if (existingStep.owner !== 'dms') {
        throw new BadRequestException(`${evidenceStep.key} 단계는 DMS 소유 단계가 아닙니다.`);
      }
    }

    const evidenceByKey = new Map(evidenceSteps.map((step) => [step.key, step]));
    return lifecycle.map((step) => {
      const evidenceStep = evidenceByKey.get(step.key as CrmContractDmsDocumentExecutionStepKey);
      if (!evidenceStep) {
        return step;
      }
      const nextStep: CrmContractDmsDocumentLifecycleStep = {
        ...step,
        status: 'completed',
        evidenceLabel: evidenceStep.evidenceLabel ?? step.evidenceLabel,
        evidencePath: evidenceStep.evidencePath,
        note: evidenceStep.note ?? `${step.label} 실행 evidence가 DMS에서 확인되었습니다.`,
      };
      delete nextStep.blockingReasons;
      return nextStep;
    });
  }

  private mergeDmsExecutionLifecycleEvidence(
    lifecycle: CrmContractDmsDocumentLifecycleStep[],
    latestHandoff: CrmContractDmsDocumentHandoff | null | undefined,
  ): CrmContractDmsDocumentLifecycleStep[] {
    if (!latestHandoff?.lifecycleSnapshot.length) {
      return lifecycle;
    }

    const completedDmsSteps = new Map(
      latestHandoff.lifecycleSnapshot
        .filter((step) => step.owner === 'dms' && step.status === 'completed')
        .map((step) => [step.key, step]),
    );
    if (completedDmsSteps.size === 0) {
      return lifecycle;
    }

    return lifecycle.map((step) => {
      const completedStep = completedDmsSteps.get(step.key);
      if (!completedStep) {
        return step;
      }
      const nextStep: CrmContractDmsDocumentLifecycleStep = {
        ...step,
        status: 'completed',
        evidenceLabel: completedStep.evidenceLabel || step.evidenceLabel,
        evidencePath: completedStep.evidencePath,
        note: completedStep.note || step.note,
      };
      delete nextStep.blockingReasons;
      return nextStep;
    });
  }

  private toDmsTemplateLifecycleStatus(
    evidence: CrmContractDmsTemplateEvidence,
    draftCompleted: boolean,
  ): CrmContractDmsDocumentLifecycleStep['status'] {
    if (!draftCompleted) {
      return 'blocked';
    }
    if (evidence.state === 'unavailable') {
      return 'pending';
    }
    if (evidence.state === 'available' && evidence.status === 'active') {
      return 'ready';
    }
    return 'blocked';
  }

  private toDmsTemplateBlockingReasons(
    evidence: CrmContractDmsTemplateEvidence,
    draftCompleted: boolean,
  ): string[] {
    if (!draftCompleted) {
      return ['CRM markdown 초안 저장 후 DMS 문서 lifecycle을 진행할 수 있습니다.'];
    }
    if (evidence.state === 'missing') {
      return [evidence.reason];
    }
    if (evidence.state === 'available' && evidence.status !== 'active') {
      return [`DMS 시스템 템플릿 ${evidence.templateKey} 상태가 ${evidence.status}입니다.`];
    }
    return [];
  }

  private toDmsTemplateLifecycleNote(evidence: CrmContractDmsTemplateEvidence): string {
    if (evidence.state === 'available') {
      return `DMS 시스템 템플릿 ${evidence.templateKey}(${evidence.templateName})을 확인했습니다. 실제 검토 확정과 버전 승인은 DMS 문서 lifecycle이 소유합니다.`;
    }
    if (evidence.state === 'missing') {
      return evidence.reason;
    }
    return `${evidence.reason} DMS 템플릿 검토 상태는 DMS에서 이어서 확인합니다.`;
  }

  private toDmsAttachmentLifecycleStatus(
    attachments: CrmContractDmsDocumentPreview['attachments'],
    draftCompleted: boolean,
  ): CrmContractDmsDocumentLifecycleStep['status'] {
    if (!draftCompleted || attachments.some((attachment) => attachment.status === 'blocked')) {
      return 'blocked';
    }
    return attachments.every((attachment) => attachment.status === 'ready') ? 'ready' : 'pending';
  }

  private toDmsAttachmentEvidencePath(
    attachments: CrmContractDmsDocumentPreview['attachments'],
  ): string | undefined {
    const evidencePaths = attachments
      .map((attachment) => attachment.evidencePath?.trim())
      .filter((value): value is string => Boolean(value));
    return evidencePaths.length > 0 ? evidencePaths.join(', ') : undefined;
  }

  private toDmsDocumentSnapshot(
    preview: CrmContractDmsDocumentPreview,
  ): Omit<CrmContractDmsDocumentPreview, 'latestHandoff'> {
    const snapshot = { ...preview } as Partial<CrmContractDmsDocumentPreview>;
    delete snapshot.latestHandoff;
    return snapshot as Omit<CrmContractDmsDocumentPreview, 'latestHandoff'>;
  }

  private toDmsDocumentHandoff(row: CrmContractDmsHandoffLedgerRow): CrmContractDmsDocumentHandoff {
    const variablesSnapshot = this.fromJson<CrmContractDmsDocumentVariable[]>(row.variablesSnapshot, []);
    const attachmentsSnapshot = this.fromJson<CrmContractDmsDocumentPreview['attachments']>(row.attachmentsSnapshot, []);
    const documentSnapshot = this.fromJson<Omit<CrmContractDmsDocumentPreview, 'latestHandoff'>>(
      row.documentSnapshot,
      {} as Omit<CrmContractDmsDocumentPreview, 'latestHandoff'>,
    );
    const lifecycleSnapshot = Array.isArray(documentSnapshot.lifecycle)
      ? documentSnapshot.lifecycle
      : [];

    return {
      id: row.id.toString(),
      contractId: row.contractId.toString(),
      contractCode: row.contractCode,
      documentType: row.documentTypeCode === 'contract' ? 'contract' : 'contract',
      documentTitle: row.documentTitle,
      templateKey: row.templateKey,
      folderHint: row.folderHint,
      fileNameHint: row.fileNameHint,
      draftPath: row.draftPath,
      status: this.toDmsDocumentHandoffStatus(row.statusCode),
      documentSnapshot,
      variablesSnapshot,
      attachmentsSnapshot,
      lifecycleSnapshot,
      memo: row.memo ?? undefined,
      savedBy: row.savedBy?.toString(),
      savedAt: row.savedAt.toISOString(),
      boundaryNotice: CRM_CONTRACT_DMS_BOUNDARY_NOTICE,
      nextAction: 'DMS가 템플릿 검토, 첨부, Word/PDF 산출, 승인 상태를 이어서 소유합니다.',
    };
  }

  private toDmsDocumentHandoffSummary(
    handoff: CrmContractDmsDocumentHandoff,
  ): CrmContractDmsDocumentHandoffSummary {
    return {
      id: handoff.id,
      status: handoff.status,
      documentTitle: handoff.documentTitle,
      templateKey: handoff.templateKey,
      draftPath: handoff.draftPath,
      savedAt: handoff.savedAt,
      savedBy: handoff.savedBy,
      memo: handoff.memo,
    };
  }

  private toDmsDocumentHandoffStatus(value: string): CrmContractDmsDocumentHandoffStatus {
    if (value === 'execution-evidence-updated') {
      return 'execution-evidence-updated';
    }
    return value === 'replaced' ? 'replaced' : 'draft-created';
  }

  private fromJson<T>(value: unknown, fallback: T): T {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        return fallback;
      }
    }
    return value === null || value === undefined ? fallback : value as T;
  }

  private toDmsDocumentVariables(
    contract: CrmContract,
    sellerProfile: CrmQuoteSellerProfile | null | undefined,
    sellerName: string,
  ): CrmContractDmsDocumentVariable[] {
    const billingRevenueTotal = contract.billingPlan.reduce((sum, line) => sum + line.revenueAmount, 0);
    const billingExternalCostTotal = contract.billingPlan.reduce((sum, line) => sum + line.externalCostAmount, 0);
    const billingMonths = contract.billingPlan.map((line) => line.billingYm).join(', ');

    return [
      this.toDmsVariable('contractCode', '계약번호', contract.code, true, 'contract'),
      this.toDmsVariable('customerName', '고객사', contract.customerName, true, 'contract'),
      this.toDmsVariable('contractName', '계약명', contract.contractName, true, 'contract'),
      this.toDmsVariable('ownerName', '영업 담당자', contract.ownerName, true, 'contract'),
      this.toDmsVariable('clientContactName', '고객사 계약 담당자', contract.clientContactName, false, 'contract'),
      this.toDmsVariable('ownerUserId', '영업 담당자 사용자 ID', contract.ownerUserId, false, 'contract'),
      this.toDmsVariable('contractPeriod', '계약기간', `${contract.contractStartDate} - ${contract.contractEndDate}`, true, 'contract'),
      this.toDmsVariable('wbsCode', 'WBS', contract.wbsCode, true, 'contract'),
      this.toDmsVariable('paymentTermCode', '수금조건', contract.paymentTermCode, false, 'contract'),
      this.toDmsVariable('revenueTotal', '계약 매출', this.formatWonForDocument(contract.revenueTotal), true, 'contract'),
      this.toDmsVariable('externalCostTotal', '외부원가', this.formatWonForDocument(contract.externalCostTotal), false, 'contract'),
      this.toDmsVariable('marginTotal', '계약 손익', this.formatWonForDocument(contract.marginTotal), false, 'contract'),
      this.toDmsVariable('billingPlanCount', '청구계획 건수', `${contract.billingPlan.length}건`, true, 'billing-plan'),
      this.toDmsVariable('billingPlanMonths', '청구 예정월', billingMonths, false, 'billing-plan'),
      this.toDmsVariable('billingRevenueTotal', '청구계획 매출 합계', this.formatWonForDocument(billingRevenueTotal), true, 'billing-plan'),
      this.toDmsVariable('billingExternalCostTotal', '청구계획 외부원가 합계', this.formatWonForDocument(billingExternalCostTotal), false, 'billing-plan'),
      this.toDmsVariable('sellerCompanyName', '공급자 회사명', sellerName, true, 'seller-profile'),
      this.toDmsVariable('sellerBusinessRegistrationNo', '공급자 사업자등록번호', sellerProfile?.businessRegistrationNo, true, 'seller-profile'),
      this.toDmsVariable('sellerCeoName', '공급자 대표자', sellerProfile?.ceoName, true, 'seller-profile'),
      this.toDmsVariable('sellerAddress', '공급자 주소', sellerProfile?.address, true, 'seller-profile'),
      this.toDmsVariable('sellerTel', '공급자 전화번호', sellerProfile?.tel, false, 'seller-profile'),
      this.toDmsVariable('sellerEmail', '공급자 이메일', sellerProfile?.email, false, 'seller-profile'),
      this.toDmsVariable('dmsBoundary', 'DMS 경계', CRM_CONTRACT_DMS_BOUNDARY_NOTICE, true, 'dms-boundary'),
    ];
  }

  private toDmsDraftPath(preview: CrmContractDmsDocumentPreview): string {
    return this.toDmsDraftPathFromParts(preview.customerName, preview.contractCode, preview.contractName);
  }

  private toDmsDraftPathFromParts(customerName: string, contractCode: string, contractName: string): string {
    return [
      'CRM',
      this.toFileHintPart(customerName),
      contractCode,
      `${contractCode}_${this.toFileHintPart(contractName)}_contract-draft.md`,
    ].join('/');
  }

  private toDmsDocumentDraftMarkdown(
    contract: CrmContract,
    preview: CrmContractDmsDocumentPreview,
    memo?: string,
  ): string {
    const lines = [
      `# ${this.escapeMarkdownText(preview.documentTitle)}`,
      '',
      '> CRM 계약 원장에서 생성한 DMS markdown 초안입니다. 템플릿 검토, 첨부, Word/PDF 산출은 DMS에서 이어서 처리합니다.',
      '',
      '## 계약 요약',
      '',
      '| 항목 | 값 |',
      '|---|---|',
      `| 계약번호 | ${this.escapeMarkdownTableCell(preview.contractCode)} |`,
      `| 고객사 | ${this.escapeMarkdownTableCell(preview.customerName)} |`,
      `| 계약명 | ${this.escapeMarkdownTableCell(preview.contractName)} |`,
      `| 담당자 | ${this.escapeMarkdownTableCell(preview.ownerName)} |`,
      `| 담당 사용자 ID | ${this.escapeMarkdownTableCell(preview.ownerUserId ?? '-')} |`,
      `| 고객사 계약 담당자 | ${this.escapeMarkdownTableCell(preview.clientContactName ?? '-')} |`,
      `| 계약기간 | ${this.escapeMarkdownTableCell(`${preview.contractStartDate} - ${preview.contractEndDate}`)} |`,
      `| WBS | ${this.escapeMarkdownTableCell(preview.wbsCode ?? '-')} |`,
      `| 수금조건 | ${this.escapeMarkdownTableCell(preview.paymentTermCode ?? '-')} |`,
      `| 계약 매출 | ${this.escapeMarkdownTableCell(this.formatWonForDocument(preview.revenueTotal))} |`,
      `| 외부원가 | ${this.escapeMarkdownTableCell(this.formatWonForDocument(preview.externalCostTotal))} |`,
      `| 계약 손익 | ${this.escapeMarkdownTableCell(this.formatWonForDocument(preview.marginTotal))} |`,
      '',
      '## 공급자 정보',
      '',
      '| 항목 | 값 |',
      '|---|---|',
      `| 공급자 | ${this.escapeMarkdownTableCell(preview.sellerName)} |`,
      `| 사업자등록번호 | ${this.escapeMarkdownTableCell(preview.sellerProfile?.businessRegistrationNo ?? '-')} |`,
      `| 대표자 | ${this.escapeMarkdownTableCell(preview.sellerProfile?.ceoName ?? '-')} |`,
      `| 주소 | ${this.escapeMarkdownTableCell(preview.sellerProfile?.address ?? '-')} |`,
      `| 전화 | ${this.escapeMarkdownTableCell(preview.sellerProfile?.tel ?? '-')} |`,
      `| 이메일 | ${this.escapeMarkdownTableCell(preview.sellerProfile?.email ?? '-')} |`,
      '',
      '## 문서 변수',
      '',
      '| Key | 라벨 | 값 | 출처 | 필수 |',
      '|---|---|---|---|---|',
      ...preview.variables.map((variable) => (
        `| ${this.escapeMarkdownTableCell(variable.key)} | ${this.escapeMarkdownTableCell(variable.label)} | ${this.escapeMarkdownTableCell(variable.value)} | ${this.escapeMarkdownTableCell(variable.source)} | ${variable.required ? 'Y' : 'N'} |`
      )),
      '',
      '## 청구계획',
      '',
      '| 예정월 | 매출 | 외부원가 |',
      '|---|---:|---:|',
      ...contract.billingPlan.map((line) => (
        `| ${this.escapeMarkdownTableCell(line.billingYm)} | ${this.escapeMarkdownTableCell(this.formatWonForDocument(line.revenueAmount))} | ${this.escapeMarkdownTableCell(this.formatWonForDocument(line.externalCostAmount))} |`
      )),
      '',
      '## 첨부/검토 후보',
      '',
      '| 항목 | 상태 | 메모 |',
      '|---|---|---|',
      ...preview.attachments.map((attachment) => (
        `| ${this.escapeMarkdownTableCell(attachment.label)} | ${this.escapeMarkdownTableCell(attachment.status)} | ${this.escapeMarkdownTableCell(attachment.note)} |`
      )),
      '',
      '## DMS 문서 lifecycle',
      '',
      '| 단계 | 소유 | 상태 | 증거 | 메모 |',
      '|---|---|---|---|---|',
      ...preview.lifecycle.map((step) => (
        `| ${this.escapeMarkdownTableCell(step.label)} | ${this.escapeMarkdownTableCell(step.owner)} | ${this.escapeMarkdownTableCell(step.status)} | ${this.escapeMarkdownTableCell(step.evidencePath ?? step.evidenceLabel)} | ${this.escapeMarkdownTableCell(step.note)} |`
      )),
      '',
      '## CRM-DMS 경계',
      '',
      this.escapeMarkdownText(CRM_CONTRACT_DMS_BOUNDARY_NOTICE),
      '',
      memo?.trim() ? '## 저장 메모' : '',
      memo?.trim() ? '' : '',
      memo?.trim() ? this.escapeMarkdownText(memo.trim().slice(0, 1000)) : '',
    ];

    return `${lines.filter((line, index, source) => line || source[index - 1] || source[index + 1]).join('\n')}\n`;
  }

  private escapeMarkdownText(value: string): string {
    return value.replace(/\r\n/g, '\n').trim();
  }

  private escapeMarkdownTableCell(value: string): string {
    return this.escapeMarkdownText(value).replace(/\|/g, '\\|').replace(/\n+/g, '<br />') || '-';
  }

  private toDmsVariable(
    key: string,
    label: string,
    value: string | number | null | undefined,
    required: boolean,
    source: CrmContractDmsDocumentVariable['source'],
  ): CrmContractDmsDocumentVariable {
    const normalized = String(value ?? '').trim();
    return {
      key,
      label,
      value: normalized || '-',
      required,
      source,
    };
  }

  private resolveSellerCiReference(
    sellerProfile: CrmQuoteSellerProfile | null | undefined,
  ): SellerCiReferenceResolution {
    if (!sellerProfile || sellerProfile.ciStatus === 'not-configured') {
      return {
        status: 'not-configured',
        reason: '공급자 CI 참조가 설정되지 않았습니다.',
      };
    }

    if (sellerProfile.ciStatus === 'dms-planned') {
      return {
        status: 'planned',
        reason: '공급자 CI 파일은 DMS 저장소에서 연결 예정입니다.',
      };
    }

    const storageRef = sellerProfile.ciStorageRef?.trim();
    if (!storageRef) {
      return {
        status: 'invalid',
        reason: 'CI 상태가 설정됨이지만 DMS 저장소 참조가 비어 있습니다.',
      };
    }

    if (storageRef.startsWith('dms://')) {
      const normalizedRef = storageRef.slice('dms://'.length).replace(/^\/+/, '').trim();
      if (!normalizedRef) {
        return {
          status: 'invalid',
          storageRef,
          reason: 'dms:// CI 참조에는 DMS 상대 경로가 필요합니다.',
        };
      }
      return this.resolveDmsWorkingTreeCiReference(storageRef, normalizedRef);
    }

    if (/^(local|nas):\/\//.test(storageRef)) {
      return this.resolveDmsStorageCiReference(storageRef);
    }

    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(storageRef)) {
      return {
        status: 'invalid',
        storageRef,
        reason: 'CI 저장소 참조는 dms://, local://, nas:// 또는 DMS 상대 경로여야 합니다.',
      };
    }

    return this.resolveDmsWorkingTreeCiReference(storageRef, storageRef);
  }

  private resolveDmsWorkingTreeCiReference(storageRef: string, relativePath: string): SellerCiReferenceResolution {
    if (!this.fileCrudService) {
      return {
        status: 'unverified',
        storageRef,
        normalizedRef: relativePath,
        reason: '현재 런타임에서 DMS file service가 연결되지 않아 CI 참조 존재 여부를 확인하지 못했습니다.',
      };
    }

    const resolved = this.fileCrudService.resolveFilePath(relativePath);
    if (!resolved.valid) {
      return {
        status: 'invalid',
        storageRef,
        normalizedRef: resolved.safeRelPath,
        reason: 'CI 참조가 DMS 문서 루트 밖을 가리킵니다.',
      };
    }

    if (!fs.existsSync(resolved.targetPath)) {
      return {
        status: 'missing',
        storageRef,
        normalizedRef: resolved.safeRelPath,
        reason: `DMS 문서 루트에서 CI 파일을 찾지 못했습니다: ${resolved.safeRelPath}`,
      };
    }

    return {
      status: 'verified',
      storageRef,
      normalizedRef: resolved.safeRelPath,
      reason: `DMS 문서 루트에서 CI 파일을 확인했습니다: ${resolved.safeRelPath}`,
    };
  }

  private resolveDmsStorageCiReference(storageRef: string): SellerCiReferenceResolution {
    try {
      const openResult = storageAdapterService.open({ storageUri: storageRef });
      return {
        status: 'verified',
        storageRef: openResult.storageUri,
        normalizedRef: openResult.path,
        reason: `DMS storage adapter에서 CI 참조를 확인했습니다: ${openResult.provider}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'DMS storage adapter가 CI 참조를 열지 못했습니다.';
      const status: CrmQuoteSellerCiReferenceStatus = message.includes('비활성화')
        ? 'unverified'
        : message.includes('찾을 수 없습니다')
          ? 'missing'
          : 'invalid';
      return {
        status,
        storageRef,
        reason: message,
      };
    }
  }

  private toSellerCiReferenceBlockingReasons(reference: SellerCiReferenceResolution): string[] {
    if (reference.status === 'invalid' || reference.status === 'missing') {
      return [reference.reason ?? '공급자 CI 참조를 확인할 수 없습니다.'];
    }
    return [];
  }

  private toSellerCiAttachmentStatus(
    sellerProfile: CrmQuoteSellerProfile | null | undefined,
    reference: SellerCiReferenceResolution,
  ): CrmContractDmsDocumentAttachmentStatus {
    if (!sellerProfile || sellerProfile.ciStatus === 'not-configured') {
      return 'blocked';
    }
    if (reference.status === 'verified') {
      return 'ready';
    }
    if (reference.status === 'invalid' || reference.status === 'missing') {
      return 'blocked';
    }
    return 'planned';
  }

  private toSellerCiAttachmentNote(reference: SellerCiReferenceResolution): string {
    if (reference.status === 'verified') {
      return reference.reason ?? 'DMS 문서 렌더링 시 사용할 CI 참조를 확인했습니다.';
    }
    if (reference.status === 'unverified') {
      return reference.reason ?? 'CI 참조가 설정됐지만 현재 런타임에서 검증하지 못했습니다.';
    }
    if (reference.status === 'invalid' || reference.status === 'missing') {
      return reference.reason ?? 'CI 참조를 DMS 자산으로 확인하지 못했습니다.';
    }
    return reference.reason ?? 'CI 원본은 DMS 저장소에서 관리하며 CRM은 참조 상태만 전달합니다.';
  }

  private toFileHintPart(value: string): string {
    const normalized = value
      .trim()
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 80);
    return normalized || 'unknown';
  }

  private formatWonForDocument(value: number): string {
    return `${Math.round(value).toLocaleString('ko-KR')}원`;
  }

  private async findContractWriteRow(id: string): Promise<CrmContractWriteRow | null> {
    const normalizedId = id.trim();
    if (!normalizedId) {
      return null;
    }

    const numericId = /^\d+$/.test(normalizedId) ? BigInt(normalizedId) : null;
    const rows = numericId
      ? await this.db.$queryRaw<CrmContractWriteRow[]>`
          select
            contract_id as "id",
            contract_code as "code",
            source_opportunity_id as "sourceOpportunityId",
            source_opportunity_code as "sourceOpportunityCode",
            confirmed as "confirmed",
            wbs_code as "wbsCode",
            revenue_total as "revenueTotal",
            external_cost_total as "externalCostTotal"
          from crm.crm_contract_m
          where is_active = true
            and (contract_id = ${numericId} or contract_code = ${normalizedId})
          limit 1
        `
      : await this.db.$queryRaw<CrmContractWriteRow[]>`
          select
            contract_id as "id",
            contract_code as "code",
            source_opportunity_id as "sourceOpportunityId",
            source_opportunity_code as "sourceOpportunityCode",
            confirmed as "confirmed",
            wbs_code as "wbsCode",
            revenue_total as "revenueTotal",
            external_cost_total as "externalCostTotal"
          from crm.crm_contract_m
          where is_active = true
            and contract_code = ${normalizedId}
          limit 1
        `;

    return rows[0] ?? null;
  }

  private async revokeOpportunityContractLink(
    writer: RawContractWriter,
    contract: Pick<CrmContractWriteRow, 'sourceOpportunityId' | 'sourceOpportunityCode' | 'code'>,
    currentUserId?: bigint,
  ): Promise<void> {
    if (contract.sourceOpportunityId) {
      await writer.$executeRaw`
        update crm.crm_opportunity_m
           set contract_created = false,
               contract_created_at = null,
               contract_code = null,
               updated_by = ${currentUserId ?? null},
               updated_at = now(),
               last_source = 'crm.contract',
               last_activity = 'revoke-contract'
         where opportunity_id = ${contract.sourceOpportunityId}
           and is_active = true
           and contract_code = ${contract.code}
      `;
      return;
    }

    if (contract.sourceOpportunityCode) {
      await writer.$executeRaw`
        update crm.crm_opportunity_m
           set contract_created = false,
               contract_created_at = null,
               contract_code = null,
               updated_by = ${currentUserId ?? null},
               updated_at = now(),
               last_source = 'crm.contract',
               last_activity = 'revoke-contract'
         where opportunity_code = ${contract.sourceOpportunityCode}
           and is_active = true
           and contract_code = ${contract.code}
      `;
      return;
    }

    await writer.$executeRaw`
      update crm.crm_opportunity_m
         set contract_created = false,
             contract_created_at = null,
             contract_code = null,
             updated_by = ${currentUserId ?? null},
             updated_at = now(),
             last_source = 'crm.contract',
             last_activity = 'revoke-contract'
       where contract_code = ${contract.code}
         and is_active = true
    `;
  }

  private async assertContractCanConfirm(contractId: bigint): Promise<void> {
    const rows = await this.db.$queryRaw<Array<{
      wbsCode: string | null;
      revenueTotal: bigint;
      externalCostTotal: bigint;
      billingCount: bigint;
      billingRevenueTotal: bigint;
      billingExternalCostTotal: bigint;
    }>>`
      select
        c.wbs_code as "wbsCode",
        c.revenue_total as "revenueTotal",
        c.external_cost_total as "externalCostTotal",
        coalesce(p.billing_count, 0)::bigint as "billingCount",
        coalesce(p.revenue_total, 0)::bigint as "billingRevenueTotal",
        coalesce(p.external_cost_total, 0)::bigint as "billingExternalCostTotal"
      from crm.crm_contract_m c
      left join (
        select
          contract_id,
          count(*)::bigint as billing_count,
          coalesce(sum(revenue_amount), 0)::bigint as revenue_total,
          coalesce(sum(external_cost_amount), 0)::bigint as external_cost_total
        from crm.crm_contract_billing_plan_d
        where is_active = true
        group by contract_id
      ) p on p.contract_id = c.contract_id
      where c.contract_id = ${contractId}
        and c.is_active = true
      limit 1
    `;
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('CRM contract not found');
    }
    if (!row.wbsCode?.trim()) {
      throw new BadRequestException('계약 확정에는 WBS 코드가 필요합니다.');
    }
    if (row.billingCount <= 0n) {
      throw new BadRequestException('계약 확정에는 청구계획이 1건 이상 필요합니다.');
    }
    if (row.billingRevenueTotal !== row.revenueTotal) {
      throw new BadRequestException('청구계획 매출 합계가 계약 매출 합계와 일치해야 합니다.');
    }
    if (row.billingExternalCostTotal !== row.externalCostTotal) {
      throw new BadRequestException('청구계획 외부원가 합계가 계약 외부원가 합계와 일치해야 합니다.');
    }
  }

  private async resolveSourceOpportunity(
    writer: RawContractWriter,
    payload: Pick<NormalizedContractPayload, 'sourceOpportunityIdText' | 'sourceOpportunityCodeText'>,
  ): Promise<CrmSourceOpportunityRow | null> {
    const candidate = payload.sourceOpportunityIdText ?? payload.sourceOpportunityCodeText;
    if (!candidate) {
      return null;
    }

    const numericId = /^\d+$/.test(candidate) ? BigInt(candidate) : null;
    const rows = numericId
      ? await writer.$queryRaw<CrmSourceOpportunityRow[]>`
          select opportunity_id as "id", opportunity_code as "code"
          from crm.crm_opportunity_m
          where is_active = true
            and (opportunity_id = ${numericId} or opportunity_code = ${payload.sourceOpportunityCodeText ?? candidate})
          order by updated_at desc, opportunity_id desc
          limit 1
        `
      : await writer.$queryRaw<CrmSourceOpportunityRow[]>`
          select opportunity_id as "id", opportunity_code as "code"
          from crm.crm_opportunity_m
          where is_active = true
            and opportunity_code = ${candidate}
          order by updated_at desc, opportunity_id desc
          limit 1
        `;

    const row = rows[0];
    if (!row) {
      throw new BadRequestException('원천 영업기회를 찾을 수 없습니다.');
    }
    return row;
  }

  private async resolveContractOwnerUser(
    writer: RawContractWriter,
    ownerUserId: bigint | null,
  ): Promise<CrmContractOwnerUserRow | null> {
    if (ownerUserId === null) {
      return null;
    }

    const rows = await writer.$queryRaw<CrmContractOwnerUserRow[]>`
      select
        user_id as "id",
        user_name as "userName",
        display_name as "displayName"
      from common.cm_user_m
      where user_id = ${ownerUserId}
        and is_active = true
      limit 1
    `;
    const ownerUser = rows[0];
    if (!ownerUser) {
      throw new BadRequestException('활성 상태인 담당 사용자를 찾을 수 없습니다.');
    }
    return ownerUser;
  }

  private resolveContractOwnerName(
    ownerNameSnapshot: string,
    ownerUser: CrmContractOwnerUserRow | null,
  ): string {
    return ownerUser?.displayName?.trim() || ownerUser?.userName.trim() || ownerNameSnapshot;
  }

  private async replaceContractLines(
    writer: RawContractWriter,
    contractId: bigint,
    payload: Pick<NormalizedContractPayload, 'revenueLines' | 'costLines'>,
    currentUserId?: bigint,
  ): Promise<void> {
    await writer.$executeRaw`
      delete from crm.crm_contract_line_d
      where contract_id = ${contractId}
    `;

    const costLineCodesByClientId = new Map<string, string>();
    payload.costLines.forEach((line, index) => {
      if (line.clientLineId) {
        costLineCodesByClientId.set(line.clientLineId, `cost-${String(index + 1).padStart(3, '0')}`);
      }
    });

    for (const [index, line] of payload.revenueLines.entries()) {
      await this.insertContractLine(writer, {
        contractId,
        line,
        lineKindCode: 'revenue',
        lineCode: `revenue-${String(index + 1).padStart(3, '0')}`,
        linkedCostLineCode: line.linkedCostLineCode
          ? costLineCodesByClientId.get(line.linkedCostLineCode) ?? line.linkedCostLineCode
          : null,
        sortOrder: (index + 1) * 10,
        currentUserId,
      });
    }

    for (const [index, line] of payload.costLines.entries()) {
      await this.insertContractLine(writer, {
        contractId,
        line,
        lineKindCode: 'cost',
        lineCode: `cost-${String(index + 1).padStart(3, '0')}`,
        linkedCostLineCode: line.linkedCostLineCode,
        sortOrder: (index + 1) * 10,
        currentUserId,
      });
    }
  }

  private async insertContractLine(
    writer: RawContractWriter,
    params: {
      contractId: bigint;
      line: NormalizedContractLine;
      lineKindCode: 'revenue' | 'cost';
      lineCode: string;
      linkedCostLineCode: string | null;
      sortOrder: number;
      currentUserId?: bigint;
    },
  ): Promise<void> {
    await writer.$executeRaw`
      insert into crm.crm_contract_line_d (
        contract_id, line_code, line_kind_code, category_code, line_label,
        quantity, unit_price, amount, margin_rate, trunc_unit,
        department, member_name, grade, service_type_code,
        revenue_linked, linked_cost_line_code, revenue_unit_price,
        sort_order, created_by, updated_by, last_source, last_activity
      )
      values (
        ${params.contractId}, ${params.lineCode}, ${params.lineKindCode}, ${params.line.category}, ${params.line.label},
        ${params.line.quantity}, ${params.line.unitPrice}, ${params.line.amount}, ${params.line.marginRate}, ${params.line.truncUnit},
        ${params.line.department}, ${params.line.memberName}, ${params.line.grade}, ${params.line.serviceTypeCode},
        ${params.line.revenueLinked}, ${params.linkedCostLineCode}, ${params.line.revenueUnitPrice},
        ${params.sortOrder}, ${params.currentUserId ?? null}, ${params.currentUserId ?? null}, 'crm.contract', 'replace-lines'
      )
    `;
  }

  private async replaceBillingPlan(
    writer: RawContractWriter,
    contractId: bigint,
    billingPlan: NormalizedContractBillingPlanLine[],
    currentUserId?: bigint,
  ): Promise<void> {
    await writer.$executeRaw`
      delete from crm.crm_contract_billing_plan_d
      where contract_id = ${contractId}
    `;

    for (const [index, line] of billingPlan.entries()) {
      await writer.$executeRaw`
        insert into crm.crm_contract_billing_plan_d (
          contract_id, billing_ym, revenue_amount, external_cost_amount,
          sort_order, created_by, updated_by, last_source, last_activity
        )
        values (
          ${contractId}, ${line.billingYm}, ${line.revenueAmount}, ${line.externalCostAmount},
          ${(index + 1) * 10}, ${currentUserId ?? null}, ${currentUserId ?? null}, 'crm.contract', 'replace-billing-plan'
        )
      `;
    }
  }

  private async replaceBillingActualLines(
    writer: RawContractWriter,
    contractId: bigint,
    lines: NormalizedContractBillingActualLine[],
    currentUserId?: bigint,
  ): Promise<void> {
    await writer.$executeRaw`
      delete from crm.crm_contract_billing_actual_d
      where contract_id = ${contractId}
    `;

    for (const [index, line] of lines.entries()) {
      await writer.$executeRaw`
        insert into crm.crm_contract_billing_actual_d (
          contract_id, billing_ym, revenue_amount, external_cost_amount,
          sort_order, created_by, updated_by, last_source, last_activity
        )
        values (
          ${contractId}, ${line.billingYm}, ${line.revenueAmount}, ${line.externalCostAmount},
          ${(index + 1) * 10}, ${currentUserId ?? null}, ${currentUserId ?? null}, 'crm.contract', 'replace-billing-actual'
        )
      `;
    }
  }

  private normalizeUpsertPayload(dto: CrmContractUpsertRequest): NormalizedContractPayload {
    const revenueLines = this.normalizeLines(dto.revenueLines ?? [], 'revenue');
    const costLines = this.normalizeLines(dto.costLines ?? [], 'cost');
    const contractStartDate = this.parseDate(dto.contractStartDate, '계약 시작일');
    const contractEndDate = this.parseDate(dto.contractEndDate, '계약 종료일');
    if (contractEndDate < contractStartDate) {
      throw new BadRequestException('계약 종료일은 시작일 이후여야 합니다.');
    }

    const revenueSubtotal = revenueLines.reduce((sum, line) => sum + line.amount, 0n);
    const specialDiscountTypeCode = this.normalizeDiscountType(dto.specialDiscountType);
    const specialDiscountValue = this.normalizeDiscountValue(dto.specialDiscountValue, specialDiscountTypeCode);
    const specialDiscountAmount = this.calculateSpecialDiscountAmount(
      revenueSubtotal,
      specialDiscountTypeCode,
      specialDiscountValue,
    );
    const revenueTotal = revenueSubtotal - specialDiscountAmount;
    const costTotal = costLines.reduce((sum, line) => sum + line.amount, 0n);
    const externalCostTotal = costLines.reduce((sum, line) => {
      if (line.category === 'product' || line.category === 'external-cost' || line.serviceTypeCode === 'external') {
        return sum + line.amount;
      }
      return sum;
    }, 0n);
    const billingPlan = this.normalizeBillingPlan(dto.billingPlan ?? []);
    this.assertBillingPlanMatchesTotals(billingPlan, revenueTotal, externalCostTotal);

    return {
      sourceOpportunityIdText: this.optionalText(dto.sourceOpportunityId, 80),
      sourceOpportunityCodeText: this.optionalText(dto.sourceOpportunityCode, 80),
      customerName: this.requiredText(dto.customerName, '고객사명', 200),
      contractName: this.requiredText(dto.contractName, '계약명', 300),
      ownerName: this.requiredText(dto.ownerName, '담당자명', 100),
      clientContactName: this.optionalText(dto.clientContactName, 120),
      ownerUserId: this.normalizeOptionalUserId(dto.ownerUserId, '담당자 사용자 ID'),
      businessType: this.requiredText(dto.businessType, '사업구분', 120),
      industryLine: this.requiredText(dto.industryLine, '계열/산업 구분', 120),
      regionCode: dto.region === 'overseas' ? 'overseas' : 'domestic',
      statusCode: this.normalizeStatus(dto.status ?? 'review'),
      contractStartDate,
      contractEndDate,
      wbsCode: this.optionalText(dto.wbsCode, 80),
      paymentTermCode: this.optionalText(dto.paymentTermCode, 80),
      revenueSubtotal,
      specialDiscountTypeCode,
      specialDiscountValue,
      specialDiscountAmount,
      revenueTotal,
      costTotal,
      externalCostTotal,
      nextAction: this.optionalText(dto.nextAction, 1000) ?? '계약 조건과 청구계획 검토',
      revenueLines,
      costLines,
      billingPlan,
    };
  }

  private assertBillingPlanMatchesTotals(
    billingPlan: NormalizedContractBillingPlanLine[],
    revenueTotal: bigint,
    externalCostTotal: bigint,
  ): void {
    if (billingPlan.length === 0) {
      return;
    }

    const billingRevenueTotal = billingPlan.reduce((sum, line) => sum + line.revenueAmount, 0n);
    const billingExternalCostTotal = billingPlan.reduce((sum, line) => sum + line.externalCostAmount, 0n);
    if (billingRevenueTotal !== revenueTotal) {
      throw new BadRequestException('청구계획 매출 합계가 계약 매출 합계와 일치해야 합니다.');
    }
    if (billingExternalCostTotal !== externalCostTotal) {
      throw new BadRequestException('청구계획 외부원가 합계가 계약 외부원가 합계와 일치해야 합니다.');
    }
  }

  private normalizeLines(
    lines: CrmContractUpsertLine[],
    lineKind: 'revenue' | 'cost',
  ): NormalizedContractLine[] {
    return lines
      .map((line): NormalizedContractLine => {
        const quantity = this.normalizeOptionalNumber(line.quantity, '수량');
        const unitPrice = this.normalizeOptionalBigInt(line.unitPrice, '단가');
        const truncUnit = this.normalizeOptionalBigInt(line.truncUnit, '절사 단위');
        const amount = this.resolveLineAmount({
          quantity,
          unitPrice,
          truncUnit,
          fallbackAmount: line.amount,
        });
        const category = this.normalizeLineCategory(line.category, lineKind);

        return {
          clientLineId: this.optionalText(line.id, 80),
          category,
          label: this.requiredText(line.label, '라인명', 300),
          quantity,
          unitPrice,
          amount,
          marginRate: this.normalizeOptionalNumber(line.marginRate, '이익률', -999, 999),
          truncUnit,
          department: this.optionalText(line.department, 120),
          memberName: this.optionalText(line.memberName, 120),
          grade: this.optionalText(line.grade, 80),
          serviceTypeCode: this.normalizeServiceType(line.serviceType, category),
          revenueLinked: line.revenueLinked === true,
          linkedCostLineCode: this.optionalText(line.linkedCostLineId, 80),
          revenueUnitPrice: this.normalizeOptionalBigInt(line.revenueUnitPrice, '매출 연동 단가'),
        };
      })
      .filter((line) => line.label.length > 0 || line.amount > 0n);
  }

  private normalizeBillingPlan(lines: CrmContractBillingPlanUpsertLine[]): NormalizedContractBillingPlanLine[] {
    const seen = new Set<string>();
    return lines
      .map((line) => ({
        billingYm: this.normalizeBillingYm(line.billingYm, '청구 예정월'),
        revenueAmount: this.normalizeMoneyAmount(line.revenueAmount),
        externalCostAmount: this.normalizeMoneyAmount(line.externalCostAmount),
      }))
      .filter((line) => line.revenueAmount > 0n || line.externalCostAmount > 0n)
      .map((line) => {
        if (seen.has(line.billingYm)) {
          throw new BadRequestException(`청구 예정월이 중복되었습니다: ${line.billingYm}`);
        }
        seen.add(line.billingYm);
        return line;
      });
  }

  private normalizeBillingActual(lines: CrmContractBillingActualUpsertLine[]): NormalizedContractBillingActualLine[] {
    const seen = new Set<string>();
    return lines
      .map((line) => ({
        billingYm: this.normalizeBillingYm(line.billingYm, '청구 실적월'),
        revenueAmount: this.normalizeMoneyAmount(line.revenueAmount),
        externalCostAmount: this.normalizeMoneyAmount(line.externalCostAmount),
      }))
      .filter((line) => line.revenueAmount > 0n || line.externalCostAmount > 0n)
      .map((line) => {
        if (seen.has(line.billingYm)) {
          throw new BadRequestException(`청구 실적월이 중복되었습니다: ${line.billingYm}`);
        }
        seen.add(line.billingYm);
        return line;
      });
  }

  private normalizeBillingYm(value: string, label: string): string {
    const normalized = value?.trim() ?? '';
    if (!/^\d{4}\/(0[1-9]|1[0-2])$/.test(normalized)) {
      throw new BadRequestException(`${label}은 YYYY/MM 형식이어야 합니다.`);
    }
    return normalized;
  }

  private async loadContractRows(): Promise<CrmContractLedgerRow[]> {
    return this.db.$queryRaw<CrmContractLedgerRow[]>`
      select
        c.contract_id as "id",
        c.contract_code as "contractCode",
        c.source_opportunity_id as "sourceOpportunityId",
        c.source_opportunity_code as "sourceOpportunityCode",
        c.customer_name as "customerName",
        c.contract_name as "contractName",
        c.owner_name as "ownerName",
        c.client_contact as "clientContactName",
        c.owner_user_id as "ownerUserId",
        c.business_type as "businessType",
        c.industry_line as "industryLine",
        c.region_code as "regionCode",
        c.status_code as "statusCode",
        c.confirmed as "confirmed",
        c.contract_start_date as "contractStartDate",
        c.contract_end_date as "contractEndDate",
        c.wbs_code as "wbsCode",
        c.payment_term_code as "paymentTermCode",
        c.revenue_subtotal as "revenueSubtotal",
        c.special_discount_type_code as "specialDiscountTypeCode",
        c.special_discount_value as "specialDiscountValue",
        c.special_discount_amount as "specialDiscountAmount",
        c.revenue_total as "revenueTotal",
        c.cost_total as "costTotal",
        c.external_cost_total as "externalCostTotal",
        c.pms_handoff_status_code as "pmsHandoffStatusCode",
        c.dms_link_status_code as "dmsLinkStatusCode",
        c.admin_boundary_code as "adminBoundaryCode",
        c.next_action as "nextAction",
        c.updated_at as "updatedAt"
      from crm.crm_contract_m c
      where c.is_active = true
      order by c.updated_at desc, c.contract_id desc
    `;
  }

  private async loadContractLineRows(): Promise<CrmContractLineLedgerRow[]> {
    return this.db.$queryRaw<CrmContractLineLedgerRow[]>`
      select
        l.contract_id as "contractId",
        l.contract_line_id as "id",
        l.line_code as "lineCode",
        l.line_kind_code as "lineKindCode",
        l.category_code as "categoryCode",
        l.line_label as "lineLabel",
        l.quantity as "quantity",
        l.unit_price as "unitPrice",
        l.amount as "amount",
        l.margin_rate as "marginRate",
        l.trunc_unit as "truncUnit",
        l.department as "department",
        l.member_name as "memberName",
        l.grade as "grade",
        l.service_type_code as "serviceTypeCode",
        l.revenue_linked as "revenueLinked",
        l.linked_cost_line_code as "linkedCostLineCode",
        l.revenue_unit_price as "revenueUnitPrice",
        l.sort_order as "sortOrder"
      from crm.crm_contract_line_d l
      join crm.crm_contract_m c on c.contract_id = l.contract_id
      where c.is_active = true and l.is_active = true
      order by l.contract_id, l.sort_order, l.contract_line_id
    `;
  }

  private async loadContractBillingPlanRows(contractId?: bigint): Promise<CrmContractBillingPlanLedgerRow[]> {
    if (contractId) {
      return this.db.$queryRaw<CrmContractBillingPlanLedgerRow[]>`
        select
          b.contract_id as "contractId",
          b.contract_billing_plan_id as "id",
          b.billing_ym as "billingYm",
          b.revenue_amount as "revenueAmount",
          b.external_cost_amount as "externalCostAmount",
          b.sort_order as "sortOrder"
        from crm.crm_contract_billing_plan_d b
        join crm.crm_contract_m c on c.contract_id = b.contract_id
        where c.is_active = true
          and b.is_active = true
          and b.contract_id = ${contractId}
        order by b.sort_order, b.contract_billing_plan_id
      `;
    }

    return this.db.$queryRaw<CrmContractBillingPlanLedgerRow[]>`
      select
        b.contract_id as "contractId",
        b.contract_billing_plan_id as "id",
        b.billing_ym as "billingYm",
        b.revenue_amount as "revenueAmount",
        b.external_cost_amount as "externalCostAmount",
        b.sort_order as "sortOrder"
      from crm.crm_contract_billing_plan_d b
      join crm.crm_contract_m c on c.contract_id = b.contract_id
      where c.is_active = true and b.is_active = true
      order by b.contract_id, b.sort_order, b.contract_billing_plan_id
    `;
  }

  private async loadContractBillingActualRows(contractId?: bigint): Promise<CrmContractBillingActualLedgerRow[]> {
    if (contractId) {
      return this.db.$queryRaw<CrmContractBillingActualLedgerRow[]>`
        select
          a.contract_id as "contractId",
          c.contract_code as "contractCode",
          a.contract_billing_actual_id as "id",
          a.billing_ym as "billingYm",
          a.revenue_amount as "revenueAmount",
          a.external_cost_amount as "externalCostAmount",
          a.sort_order as "sortOrder"
        from crm.crm_contract_billing_actual_d a
        join crm.crm_contract_m c on c.contract_id = a.contract_id
        where c.is_active = true
          and a.is_active = true
          and a.contract_id = ${contractId}
        order by a.sort_order, a.contract_billing_actual_id
      `;
    }

    return this.db.$queryRaw<CrmContractBillingActualLedgerRow[]>`
      select
        a.contract_id as "contractId",
        c.contract_code as "contractCode",
        a.contract_billing_actual_id as "id",
        a.billing_ym as "billingYm",
        a.revenue_amount as "revenueAmount",
        a.external_cost_amount as "externalCostAmount",
        a.sort_order as "sortOrder"
      from crm.crm_contract_billing_actual_d a
      join crm.crm_contract_m c on c.contract_id = a.contract_id
      where c.is_active = true
        and a.is_active = true
      order by a.contract_id, a.sort_order, a.contract_billing_actual_id
    `;
  }

  private groupByContract<T extends { contractId: bigint }>(rows: T[]): Map<string, T[]> {
    const grouped = new Map<string, T[]>();
    for (const row of rows) {
      const key = row.contractId.toString();
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    }
    return grouped;
  }

  private groupBillingActualRowsByContractCode(rows: CrmContractBillingActualLedgerRow[]): Map<string, CrmContractBillingActualLedgerRow[]> {
    const grouped = new Map<string, CrmContractBillingActualLedgerRow[]>();
    for (const row of rows) {
      grouped.set(row.contractCode, [...(grouped.get(row.contractCode) ?? []), row]);
    }
    return grouped;
  }

  private toPerformanceRow(
    contract: CrmContract,
    year: number,
    actualRows: CrmContractBillingActualLedgerRow[],
  ): CrmContractPerformanceRow {
    const monthDrafts = Array.from({ length: 12 }, (_, index) => this.createPerformanceMonth(index + 1));
    for (const line of contract.billingPlan) {
      const month = this.getBillingMonthInYear(line.billingYm, year);
      if (!month) {
        continue;
      }
      const target = monthDrafts[month - 1];
      target.planRevenueAmount += line.revenueAmount;
      target.planExternalCostAmount += line.externalCostAmount;
    }

    for (const row of actualRows) {
      const month = this.getBillingMonthInYear(row.billingYm, year);
      if (!month) {
        continue;
      }
      const target = monthDrafts[month - 1];
      target.actualRevenueAmount += this.toNumber(row.revenueAmount);
      target.actualExternalCostAmount += this.toNumber(row.externalCostAmount);
    }

    const months = monthDrafts.map((month) => this.finalizePerformanceMonth(month));
    const totalDraft = months.reduce((total, month) => {
      total.planRevenueAmount += month.planRevenueAmount;
      total.planExternalCostAmount += month.planExternalCostAmount;
      total.actualRevenueAmount += month.actualRevenueAmount;
      total.actualExternalCostAmount += month.actualExternalCostAmount;
      return total;
    }, this.createPerformanceMonth(0));

    return {
      contractId: contract.id,
      contractCode: contract.code,
      customerName: contract.customerName,
      contractName: contract.contractName,
      ownerName: contract.ownerName,
      businessType: contract.businessType,
      industryLine: contract.industryLine,
      region: contract.region,
      wbsCode: contract.wbsCode,
      contractStartDate: contract.contractStartDate,
      contractEndDate: contract.contractEndDate,
      months,
      total: this.finalizePerformanceMonth(totalDraft),
    };
  }

  private createPerformanceMonth(month: number): CrmContractPerformanceMonth {
    return {
      month,
      planRevenueAmount: 0,
      planExternalCostAmount: 0,
      planMarginAmount: 0,
      actualRevenueAmount: 0,
      actualExternalCostAmount: 0,
      actualMarginAmount: 0,
      revenueDelta: 0,
      externalCostDelta: 0,
      marginDelta: 0,
    };
  }

  private finalizePerformanceMonth(month: CrmContractPerformanceMonth): CrmContractPerformanceMonth {
    const planMarginAmount = month.planRevenueAmount - month.planExternalCostAmount;
    const actualMarginAmount = month.actualRevenueAmount - month.actualExternalCostAmount;
    return {
      ...month,
      planMarginAmount,
      actualMarginAmount,
      revenueDelta: month.actualRevenueAmount - month.planRevenueAmount,
      externalCostDelta: month.actualExternalCostAmount - month.planExternalCostAmount,
      marginDelta: actualMarginAmount - planMarginAmount,
    };
  }

  private getBillingMonthInYear(billingYm: string, year: number): number | null {
    const match = billingYm.trim().match(/^(\d{4})[/-](0[1-9]|1[0-2])$/);
    if (!match || Number(match[1]) !== year) {
      return null;
    }
    return Number(match[2]);
  }

  private toContract(
    row: CrmContractLedgerRow,
    lineRows: CrmContractLineLedgerRow[],
    billingRows: CrmContractBillingPlanLedgerRow[],
  ): CrmContract {
    const revenueLines = lineRows.filter((line) => line.lineKindCode === 'revenue').map((line) => this.toLine(line));
    const costLines = lineRows.filter((line) => line.lineKindCode === 'cost').map((line) => this.toLine(line));
    const revenueTotal = this.toNumber(row.revenueTotal);
    const costTotal = this.toNumber(row.costTotal);
    const marginTotal = revenueTotal - costTotal;

    return {
      id: row.contractCode,
      code: row.contractCode,
      sourceOpportunityId: row.sourceOpportunityId?.toString(),
      sourceOpportunityCode: row.sourceOpportunityCode ?? undefined,
      customerName: row.customerName,
      contractName: row.contractName,
      ownerName: row.ownerName,
      clientContactName: row.clientContactName ?? undefined,
      ownerUserId: row.ownerUserId?.toString(),
      businessType: row.businessType,
      industryLine: row.industryLine,
      region: row.regionCode === 'overseas' ? 'overseas' : 'domestic',
      status: this.normalizeStatus(row.statusCode),
      confirmed: row.confirmed,
      contractStartDate: this.formatDate(row.contractStartDate),
      contractEndDate: this.formatDate(row.contractEndDate),
      wbsCode: row.wbsCode ?? undefined,
      paymentTermCode: row.paymentTermCode ?? undefined,
      revenueSubtotal: this.toNumber(row.revenueSubtotal),
      specialDiscountType: row.specialDiscountTypeCode === 'rate' ? 'rate' : 'amount',
      specialDiscountValue: this.toNumber(row.specialDiscountValue),
      specialDiscountAmount: this.toNumber(row.specialDiscountAmount),
      revenueTotal,
      costTotal,
      externalCostTotal: this.toNumber(row.externalCostTotal),
      marginTotal,
      marginRate: revenueTotal > 0 ? Math.round((marginTotal / revenueTotal) * 10000) / 100 : 0,
      revenueLines,
      costLines,
      billingPlan: billingRows.map((billingRow) => this.toBillingLine(billingRow)),
      pmsHandoffStatus: row.pmsHandoffStatusCode === 'not-implemented' ? 'not-implemented' : 'planned',
      dmsLinkStatus: row.dmsLinkStatusCode === 'not-implemented'
        ? 'not-implemented'
        : row.dmsLinkStatusCode === 'draft-created'
          ? 'draft-created'
          : 'planned',
      adminBoundary: 'shared-admin',
      nextAction: row.nextAction,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toLine(row: CrmContractLineLedgerRow): CrmContractLine {
    return {
      id: row.lineCode,
      category: this.normalizeLineCategory(row.categoryCode),
      label: row.lineLabel,
      quantity: row.quantity === null ? undefined : this.toNumber(row.quantity),
      unitPrice: row.unitPrice === null ? undefined : this.toNumber(row.unitPrice),
      amount: this.toNumber(row.amount),
      marginRate: row.marginRate === null ? undefined : this.toNumber(row.marginRate),
      truncUnit: row.truncUnit === null ? undefined : this.toNumber(row.truncUnit),
      department: row.department ?? undefined,
      memberName: row.memberName ?? undefined,
      grade: row.grade ?? undefined,
      serviceType: row.serviceTypeCode === 'external' ? 'external' : row.serviceTypeCode === 'internal' ? 'internal' : undefined,
      revenueLinked: row.revenueLinked || undefined,
      linkedCostLineId: row.linkedCostLineCode ?? undefined,
      revenueUnitPrice: row.revenueUnitPrice === null ? undefined : this.toNumber(row.revenueUnitPrice),
    };
  }

  private toBillingLine(row: CrmContractBillingPlanLedgerRow): CrmContractBillingPlanLine {
    return {
      id: row.id.toString(),
      billingYm: row.billingYm,
      revenueAmount: this.toNumber(row.revenueAmount),
      externalCostAmount: this.toNumber(row.externalCostAmount),
    };
  }

  private toBillingActualLine(row: CrmContractBillingActualLedgerRow): CrmContractBillingActualLine {
    return {
      id: row.id.toString(),
      billingYm: row.billingYm,
      revenueAmount: this.toNumber(row.revenueAmount),
      externalCostAmount: this.toNumber(row.externalCostAmount),
    };
  }

  private toBillingActualResponse(
    contract: Pick<CrmContractWriteRow, 'code' | 'confirmed'>,
    planRows: CrmContractBillingPlanLedgerRow[],
    actualRows: CrmContractBillingActualLedgerRow[],
  ): CrmContractBillingActualResponse {
    const planLines = planRows.map((row) => this.toBillingLine(row));
    const actualLines = actualRows.map((row) => this.toBillingActualLine(row));
    const planRevenueTotal = planLines.reduce((sum, line) => sum + line.revenueAmount, 0);
    const planExternalCostTotal = planLines.reduce((sum, line) => sum + line.externalCostAmount, 0);
    const actualRevenueTotal = actualLines.reduce((sum, line) => sum + line.revenueAmount, 0);
    const actualExternalCostTotal = actualLines.reduce((sum, line) => sum + line.externalCostAmount, 0);

    return {
      contractId: contract.code,
      contractCode: contract.code,
      confirmed: contract.confirmed,
      planLines,
      actualLines,
      summary: {
        planRevenueTotal,
        planExternalCostTotal,
        actualRevenueTotal,
        actualExternalCostTotal,
        revenueDelta: actualRevenueTotal - planRevenueTotal,
        externalCostDelta: actualExternalCostTotal - planExternalCostTotal,
        revenueAchievementRate: this.toAchievementRate(actualRevenueTotal, planRevenueTotal),
        externalCostAchievementRate: this.toAchievementRate(actualExternalCostTotal, planExternalCostTotal),
        boundaryNotice: CRM_CONTRACT_BOUNDARY_NOTICE,
      },
    };
  }

  private normalizeQuery(query: CrmContractListQuery): Required<CrmContractListQuery> {
    const status = CONTRACT_STATUSES.includes(query.status as CrmContractStatus)
      ? query.status as CrmContractStatus
      : 'all';
    const sort = CONTRACT_SORTS.includes(query.sort as CrmContractSort)
      ? query.sort as CrmContractSort
      : DEFAULT_SORT;

    return {
      search: query.search?.trim() ?? '',
      status,
      sort,
    };
  }

  private normalizePerformanceQuery(query: CrmContractPerformanceQuery): Required<CrmContractPerformanceQuery> {
    const yearValue = Number(query.year ?? new Date().getFullYear());
    const year = Number.isFinite(yearValue) && yearValue >= 2000 && yearValue <= 2100
      ? Math.trunc(yearValue)
      : new Date().getFullYear();
    const region = CONTRACT_PERFORMANCE_REGIONS.includes(query.region as CrmContractPerformanceRegion)
      ? query.region as CrmContractPerformanceRegion
      : 'all';

    return {
      year,
      businessType: this.optionalText(query.businessType, 120) ?? '',
      industryLine: this.optionalText(query.industryLine, 120) ?? '',
      region,
      search: this.optionalText(query.search, 200) ?? '',
    };
  }

  private filterAndSortContracts(contracts: CrmContract[], query: Required<CrmContractListQuery>): CrmContract[] {
    const search = query.search.toLowerCase();
    const filtered = contracts.filter((contract) => {
      const matchesStatus = query.status === 'all' || contract.status === query.status;
      const matchesSearch = !search || [
        contract.code,
        contract.customerName,
        contract.contractName,
        contract.ownerName,
        contract.clientContactName ?? '',
        contract.ownerUserId ?? '',
        contract.businessType,
        contract.industryLine,
        contract.wbsCode ?? '',
      ].some((value) => value.toLowerCase().includes(search));

      return matchesStatus && matchesSearch;
    });

    return [...filtered].sort((left, right) => {
      if (query.sort === 'revenue-desc') {
        return right.revenueTotal - left.revenueTotal;
      }
      if (query.sort === 'margin-desc') {
        return right.marginRate - left.marginRate;
      }
      if (query.sort === 'start-asc') {
        return left.contractStartDate.localeCompare(right.contractStartDate);
      }
      return right.updatedAt.localeCompare(left.updatedAt);
    });
  }

  private buildPerformanceSummary(
    rows: CrmContractPerformanceRow[],
    query: Required<CrmContractPerformanceQuery>,
    businessTypeOptions: string[],
    industryLineOptions: string[],
  ): CrmContractPerformanceResponse['summary'] {
    const totals = rows.reduce((total, row) => {
      total.planRevenueAmount += row.total.planRevenueAmount;
      total.planExternalCostAmount += row.total.planExternalCostAmount;
      total.actualRevenueAmount += row.total.actualRevenueAmount;
      total.actualExternalCostAmount += row.total.actualExternalCostAmount;
      return total;
    }, this.createPerformanceMonth(0));
    const finalized = this.finalizePerformanceMonth(totals);

    return {
      year: query.year,
      contractCount: rows.length,
      planRevenueTotal: finalized.planRevenueAmount,
      planExternalCostTotal: finalized.planExternalCostAmount,
      planMarginTotal: finalized.planMarginAmount,
      actualRevenueTotal: finalized.actualRevenueAmount,
      actualExternalCostTotal: finalized.actualExternalCostAmount,
      actualMarginTotal: finalized.actualMarginAmount,
      revenueDelta: finalized.revenueDelta,
      externalCostDelta: finalized.externalCostDelta,
      marginDelta: finalized.marginDelta,
      revenueAchievementRate: this.toAchievementRate(finalized.actualRevenueAmount, finalized.planRevenueAmount),
      externalCostAchievementRate: this.toAchievementRate(finalized.actualExternalCostAmount, finalized.planExternalCostAmount),
      activeFilters: query,
      businessTypeOptions,
      industryLineOptions,
      boundaryNotice: CRM_CONTRACT_BOUNDARY_NOTICE,
    };
  }

  private buildSummary(
    allContracts: CrmContract[],
    items: CrmContract[],
    query: Required<CrmContractListQuery>,
  ): CrmContractSummary {
    const totalRevenue = items.reduce((sum, item) => sum + item.revenueTotal, 0);
    const totalCost = items.reduce((sum, item) => sum + item.costTotal, 0);
    const totalExternalCost = items.reduce((sum, item) => sum + item.externalCostTotal, 0);
    const totalMargin = totalRevenue - totalCost;

    return {
      totalCount: allContracts.length,
      filteredCount: items.length,
      reviewCount: items.filter((item) => item.status === 'review').length,
      activeCount: items.filter((item) => item.status === 'active').length,
      completedCount: items.filter((item) => item.status === 'completed').length,
      totalRevenue,
      totalCost,
      totalExternalCost,
      totalMargin,
      grossMarginRate: totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 10000) / 100 : 0,
      boundaryNotice: CRM_CONTRACT_BOUNDARY_NOTICE,
      unimplementedIntegrations: CONTRACT_UNIMPLEMENTED_INTEGRATIONS,
      activeFilters: query,
    };
  }

  private toSortedUniqueOptions(values: string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, 'ko-KR'));
  }

  private normalizeStatus(value: string): CrmContractStatus {
    return CONTRACT_STATUSES.includes(value as CrmContractStatus) ? value as CrmContractStatus : 'review';
  }

  private normalizeLineCategory(value: string | undefined, lineKind?: 'revenue' | 'cost'): CrmContractLine['category'] {
    if (lineKind === 'revenue') {
      return value === 'product' ? 'product' : 'service';
    }
    if (lineKind === 'cost') {
      if (value === 'product' || value === 'internal-cost' || value === 'external-cost') {
        return value;
      }
      return 'internal-cost';
    }
    if (value === 'product' || value === 'service' || value === 'internal-cost' || value === 'external-cost') {
      return value;
    }
    return 'service';
  }

  private normalizeSplitTarget(value?: string): CrmBillingSplitTarget {
    return BILLING_SPLIT_TARGETS.includes(value as CrmBillingSplitTarget) ? value as CrmBillingSplitTarget : 'both';
  }

  private normalizePositiveInteger(value: number, label: string): number {
    if (!Number.isFinite(value) || value < 1) {
      throw new BadRequestException(`${label}은 1 이상이어야 합니다.`);
    }
    return Math.floor(value);
  }

  private normalizeAmount(value: number, label: string): number {
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException(`${label}은 0 이상이어야 합니다.`);
    }
    return Math.round(value);
  }

  private parseDate(value: string, label: string): Date {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (!value || Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${label} 형식이 올바르지 않습니다.`);
    }
    return date;
  }

  private buildBillingMonths(startDate: Date, endDate: Date, periodMonths: number, includeLastMonth: boolean): string[] {
    const allMonths: string[] = [];
    const cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
    const endMonth = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1);

    while (cursor.getTime() <= endMonth) {
      allMonths.push(`${cursor.getUTCFullYear()}/${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`);
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    const selected = allMonths.filter((_, index) => index % periodMonths === 0);
    const lastMonth = allMonths[allMonths.length - 1];
    if (includeLastMonth && lastMonth && !selected.includes(lastMonth)) {
      selected.push(lastMonth);
    }

    return selected.length > 0 ? selected : allMonths.slice(0, 1);
  }

  private splitAmount(total: number, count: number, truncUnit: number): number[] {
    if (count <= 0) {
      return [];
    }
    if (count === 1) {
      return [total];
    }

    const base = Math.floor(total / count / truncUnit) * truncUnit;
    const amounts = Array.from({ length: count - 1 }, () => base);
    const remainder = total - amounts.reduce((sum, value) => sum + value, 0);
    amounts.push(remainder);
    return amounts;
  }

  private normalizeDiscountType(value: CrmOpportunityDiscountType | undefined): CrmOpportunityDiscountType {
    return value && DISCOUNT_TYPES.includes(value) ? value : 'amount';
  }

  private normalizeDiscountValue(
    value: number | undefined,
    discountType: CrmOpportunityDiscountType,
  ): number | null {
    if (value === undefined || value === null) {
      return null;
    }

    const max = discountType === 'rate' ? 100 : Number.MAX_SAFE_INTEGER;
    if (!Number.isFinite(value) || value < 0 || value > max) {
      throw new BadRequestException(discountType === 'rate'
        ? '특별할인율은 0 이상 100 이하의 숫자여야 합니다.'
        : '특별할인 금액은 0 이상의 안전한 정수 범위여야 합니다.');
    }

    return discountType === 'rate' ? Math.round(value * 100) / 100 : Math.round(value);
  }

  private calculateSpecialDiscountAmount(
    revenueSubtotal: bigint,
    discountType: CrmOpportunityDiscountType,
    discountValue: number | null,
  ): bigint {
    if (!discountValue || revenueSubtotal <= 0n) {
      return 0n;
    }

    const calculated = discountType === 'rate'
      ? this.calculateRateDiscountAmount(revenueSubtotal, discountValue)
      : BigInt(Math.round(discountValue));
    if (calculated < 0n) {
      return 0n;
    }

    return calculated > revenueSubtotal ? revenueSubtotal : calculated;
  }

  private calculateRateDiscountAmount(revenueSubtotal: bigint, discountRate: number): bigint {
    const scaledRate = BigInt(Math.round(discountRate * 100));
    const denominator = 10000n;
    return (revenueSubtotal * scaledRate + denominator / 2n) / denominator;
  }

  private normalizeOptionalBigInt(value: number | undefined, label: string): bigint | null {
    if (value === undefined || value === null) {
      return null;
    }
    if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
      throw new BadRequestException(`${label}은 0 이상의 안전한 정수 범위여야 합니다.`);
    }
    return BigInt(Math.round(value));
  }

  private normalizeOptionalNumber(
    value: number | undefined,
    label: string,
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
  ): number | null {
    if (value === undefined || value === null) {
      return null;
    }
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new BadRequestException(`${label}은 허용 범위의 숫자여야 합니다.`);
    }
    return Math.round(value * 100) / 100;
  }

  private resolveLineAmount({
    quantity,
    unitPrice,
    truncUnit,
    fallbackAmount,
  }: {
    quantity: number | null;
    unitPrice: bigint | null;
    truncUnit: bigint | null;
    fallbackAmount?: number;
  }): bigint {
    if (quantity !== null && unitPrice !== null) {
      const rawAmount = Math.round(quantity * Number(unitPrice));
      const trunc = Number(truncUnit ?? 0n);
      if (trunc > 0) {
        return BigInt(Math.floor(rawAmount / trunc) * trunc);
      }
      return BigInt(rawAmount);
    }

    return this.normalizeMoneyAmount(fallbackAmount);
  }

  private normalizeMoneyAmount(value: number | undefined): bigint {
    const normalized = value ?? 0;
    if (!Number.isFinite(normalized) || normalized < 0 || normalized > Number.MAX_SAFE_INTEGER) {
      throw new BadRequestException('금액은 0 이상의 안전한 정수 범위여야 합니다.');
    }

    return BigInt(Math.round(normalized));
  }

  private normalizeServiceType(
    value: CrmOpportunityServiceType | undefined,
    category: CrmContractLine['category'],
  ): CrmOpportunityServiceType | null {
    if (value === 'internal' || value === 'external') {
      return value;
    }
    if (category === 'internal-cost') {
      return 'internal';
    }
    if (category === 'external-cost') {
      return 'external';
    }
    return null;
  }

  private optionalText(value: string | undefined, maxLength: number): string | null {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) {
      return null;
    }
    if (trimmed.length > maxLength) {
      throw new BadRequestException(`입력값은 ${maxLength}자 이하여야 합니다.`);
    }

    return trimmed;
  }

  private normalizeOptionalUserId(value: string | undefined, label: string): bigint | null {
    const normalized = value?.trim() ?? '';
    if (!normalized) {
      return null;
    }
    if (!/^\d+$/.test(normalized)) {
      throw new BadRequestException(`${label}는 양의 정수 문자열이어야 합니다.`);
    }

    const userId = BigInt(normalized);
    if (userId <= 0n) {
      throw new BadRequestException(`${label}는 1 이상이어야 합니다.`);
    }
    return userId;
  }

  private requiredText(value: string | undefined, fieldName: string, maxLength: number): string {
    const normalized = this.optionalText(value, maxLength);
    if (!normalized) {
      throw new BadRequestException(`${fieldName}은 필수입니다.`);
    }

    return normalized;
  }

  private createContractCode(): string {
    return `crm-ct-${randomUUID().slice(0, 8)}`;
  }

  private formatDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private toAchievementRate(actual: number, plan: number): number {
    if (plan <= 0) {
      return 0;
    }

    return Math.round((actual / plan) * 10000) / 100;
  }

  private toNumber(value: bigint | DecimalLike | number | string | null): number {
    if (value === null) {
      return 0;
    }
    if (typeof value === 'bigint') {
      return Number(value);
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      return Number(value);
    }
    return Number(value.toString());
  }
}
