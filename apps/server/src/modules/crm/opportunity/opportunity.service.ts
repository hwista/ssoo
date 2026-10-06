import { PlatformAdmissionService } from '../../common/onboarding/platform-admission.service.js';
import { CrmAccessService } from '../access/access.service.js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { BadRequestException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import type {
  CrmContractUpsertLine,
  CrmContractUpsertRequest,
  CrmDmsDocumentTemplateOption,
  CrmOpportunityUpsertRequest,
  CrmAdminBoundary,
  CrmIntegrationStatus,
  CrmOpportunity,
  CrmOpportunityContractConversionRequest,
  CrmOpportunityContractConversionResponse,
  CrmOpportunityContractDocumentArtifact,
  CrmOpportunityContractDocumentDraftRequest,
  CrmOpportunityContractDocumentDraftResult,
  CrmOpportunityContractDocumentHandoffSummary,
  CrmOpportunityContractDocumentLifecycleExecutionRequest,
  CrmOpportunityContractDocumentLifecycleExecutionResult,
  CrmOpportunityContractDocumentLifecycleStep,
  CrmOpportunityContractDocumentPreview,
  CrmOpportunityContractDocumentVariable,
  CrmOpportunityDeleteResult,
  CrmOpportunityDiscountType,
  CrmOpportunityHistoryEntry,
  CrmOpportunityHistoryEventType,
  CrmOpportunityHistoryListResponse,
  CrmOpportunityLine,
  CrmOpportunityListQuery,
  CrmOpportunityListResponse,
  CrmOpportunityOwnerLookupItem,
  CrmOpportunityOwnerLookupQuery,
  CrmOpportunityPriority,
  CrmOpportunityQuotePreview,
  CrmOpportunityServiceType,
  CrmOpportunitySort,
  CrmSourceOpportunityStatus,
  CrmOpportunityStatus,
  CrmOpportunitySummary,
  CrmOpportunityVersionListResponse,
  CrmOpportunityVersionSummary,
  CrmQuoteOwnerContactProfile,
  CrmQuoteDmsDocumentDraft,
  CrmQuoteDmsDocumentDraftRequest,
  CrmQuoteDmsDocumentExecutionEvidenceRequest,
  CrmQuoteDmsDocumentExecutionEvidenceResult,
  CrmQuoteDmsDocumentExecutionEvidenceStep,
  CrmQuoteDmsDocumentExecutionStepKey,
  CrmQuoteDmsDocumentHandoff,
  CrmQuoteDmsDocumentHandoffStatus,
  CrmQuoteDmsDocumentHandoffSummary,
  CrmQuoteDmsDocumentLifecycleExecutionRequest,
  CrmQuoteDmsDocumentLifecycleExecutionResult,
  CrmQuoteDmsDocumentLifecycleStep,
  CrmQuoteDmsDocumentPreview,
  CrmQuoteDmsDocumentVariable,
  CrmQuoteDmsTemplateEvidence,
  CrmQuotePreviewOwnerContactStatus,
  CrmQuotePreviewSellerInfoStatus,
  CrmQuoteSellerProfile,
  CrmQuoteWorkflowStatus,
  CrmQuoteWorkflowUpdateRequest,
} from '@ssoo/types/crm';
import type { AiIndexJobType, AiIndexJsonObject } from '@ssoo/types/common';
import type { TemplateItem } from '@ssoo/types/dms';
import { DatabaseService } from '../../../database/database.service.js';
import { AiIndexingService } from '../../common/ai-index/ai-indexing.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { UserService } from '../../common/user/user.service.js';
import { CodeService } from '../../common/code/code.service.js';
import { FileCrudService } from '../../dms/file/file-crud.service.js';
import { DmsCrmOpportunityContractLifecycleService } from '../../dms/crm-opportunity-contract-lifecycle/crm-opportunity-contract-lifecycle.service.js';
import { DmsCrmQuoteLifecycleService } from '../../dms/crm-quote-lifecycle/crm-quote-lifecycle.service.js';
import { storageAdapterService } from '../../dms/storage/storage-adapter.service.js';
import { TemplateService } from '../../dms/templates/template.service.js';
import { ContractService } from '../contract/contract.service.js';
import { QuoteSettingsService } from '../quote-settings/quote-settings.service.js';
import { CrmOperationAttemptService, type CrmOperationRunContext } from '../operations/operation-attempt.service.js';

const DEFAULT_SORT: CrmOpportunitySort = 'customer-asc';
const CRM_BOUNDARY_NOTICE = 'CRM은 계약/청구/매출/원가 원장을 소유하고 PMS는 실행 수행과 읽기용 인계 스냅샷만 소비합니다.';
const UNIMPLEMENTED_INTEGRATIONS = ['견적 생성', 'DMS 연결', 'PMS 인계'];
const CRM_QUOTE_DMS_BOUNDARY_NOTICE = 'CRM은 영업기회 원장 기반 브라우저 견적 인쇄/PDF와 DMS 문서 입력 패킷을 제공하고 DMS는 템플릿 기반 Word/PDF export와 파일 lifecycle을 소유합니다.';
// DOCX/PDF generation is implemented through the DMS lifecycle boundary.
// Keep this list for response compatibility, but do not expose a completed
// delegated action as an unavailable CRM feature.
const QUOTE_UNAVAILABLE_ACTIONS: string[] = [];
const CRM_QUOTE_DMS_TEMPLATE_KEY = 'crm-quote-v1';
const CRM_QUOTE_DMS_TEMPLATE_TASK_KEY = 'crm-quote-document';
const CRM_OPPORTUNITY_CONTRACT_DMS_TEMPLATE_KEY = 'crm-opportunity-contract-v1';
const CRM_OPPORTUNITY_CONTRACT_DMS_TEMPLATE_TASK_KEY = 'crm-opportunity-contract-document';
const CRM_OPPORTUNITY_CONTRACT_DMS_BOUNDARY_NOTICE = 'CRM은 확정 영업기회와 원천 22개 변수 snapshot을 소유하고, DMS는 계약서 DOCX 템플릿 binary·버전·render·artifact storage를 소유합니다.';
const CRM_QUOTE_DMS_EXECUTION_STEP_KEYS: CrmQuoteDmsDocumentExecutionStepKey[] = [
  'template-review',
  'word-export',
  'pdf-export',
];
const QUOTE_VALIDITY_DAYS = 30;
const STATUSES: CrmOpportunityStatus[] = ['draft', 'qualified', 'proposal', 'won', 'lost', 'hold'];
const SOURCE_STATUSES: CrmSourceOpportunityStatus[] = ['진행중', '검토중', '계약완료', '실패'];
const SORTS: CrmOpportunitySort[] = ['customer-asc', 'updated-desc', 'revenue-desc', 'profit-desc', 'margin-desc'];
const DISCOUNT_TYPES: CrmOpportunityDiscountType[] = ['amount', 'rate'];
const QUOTE_WORKFLOW_STATUSES: CrmQuoteWorkflowStatus[] = ['draft', 'review', 'approved', 'sent', 'accepted', 'rejected', 'void'];
const PAYMENT_TERM_LABELS: Record<string, string> = {
  monthly: '월별',
  quarterly: '분기별',
  계약즉시: '계약 즉시',
  NET30: '계약 후 30일 이내',
  NET60: '계약 후 60일 이내',
  분할납부: '분할 납부 (협의)',
  납품후: '납품 완료 후 30일',
};

interface DecimalLike {
  toString(): string;
}

interface RawOpportunityWriter {
  $queryRaw<T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  $executeRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<number>;
}

interface CrmOpportunityLineLedgerRow {
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

interface CrmOpportunityLedgerRow {
  ownerOrganizationId: bigint | null;
  id: bigint;
  opportunityCode: string;
  opportunityGroupCode: string;
  customerName: string;
  opportunityName: string;
  ownerName: string;
  ownerUserId: bigint | null;
  businessType: string;
  industryLine: string;
  regionCode: string;
  statusCode: string;
  priorityCode: string;
  versionNo: number;
  confirmed: boolean;
  contractCreated: boolean;
  contractCreatedAt: Date | null;
  contractCode: string | null;
  expectedStartDate: Date | null;
  expectedEndDate: Date | null;
  paymentTermCode: string | null;
  quoteStatusCode: string;
  quoteClientContactName: string | null;
  quoteIssuedAt: Date | null;
  quoteValidUntil: Date | null;
  quoteMemo: string | null;
  revenueSubtotal: bigint;
  specialDiscountTypeCode: string;
  specialDiscountValue: DecimalLike | number | string | null;
  specialDiscountAmount: bigint;
  revenueTotal: bigint;
  costTotal: bigint;
  pmsHandoffStatusCode: string;
  dmsLinkStatusCode: string;
  adminBoundaryCode: string;
  nextAction: string;
  updatedAt: Date;
  lines: CrmOpportunityLineLedgerRow[];
}

interface CrmOpportunityHistoryLedgerRow {
  opportunityId: bigint;
  historySeq: bigint;
  eventType: string;
  eventAt: Date;
  eventBy: bigint | null;
  opportunityCode: string;
  opportunityGroupCode: string;
  statusCode: string;
  versionNo: number;
  confirmed: boolean;
  contractCreated: boolean;
  contractCode: string | null;
  paymentTermCode: string | null;
  quoteStatusCode: string;
  revenueSubtotal: bigint;
  specialDiscountAmount: bigint;
  revenueTotal: bigint;
  costTotal: bigint;
  lastSource: string | null;
  lastActivity: string | null;
}

interface NormalizedOpportunityLine {
  clientLineId: string | null;
  category: CrmOpportunityLine['category'];
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

interface NormalizedOpportunityPayload {
  customerName: string;
  opportunityName: string;
  ownerName: string;
  ownerUserId: bigint | null;
  businessType: string;
  industryLine: string;
  regionCode: CrmOpportunity['region'];
  statusCode: CrmOpportunityStatus;
  priorityCode: CrmOpportunityPriority;
  expectedStartDate: Date | null;
  expectedEndDate: Date | null;
  clientContactName: string | null;
  paymentTermCode: string | null;
  revenueSubtotal: bigint;
  specialDiscountTypeCode: CrmOpportunityDiscountType;
  specialDiscountValue: number | null;
  specialDiscountAmount: bigint;
  nextAction: string;
  revenueLines: NormalizedOpportunityLine[];
  costLines: NormalizedOpportunityLine[];
  revenueTotal: bigint;
  costTotal: bigint;
}

interface OpportunityLineWriter {
  crmOpportunityLine: {
    deleteMany(args: { where: { opportunityId: bigint } }): Promise<unknown>;
    createMany(args: {
      data: Array<{
        opportunityId: bigint;
        lineCode: string;
        lineKindCode: string;
        categoryCode: string;
        lineLabel: string;
        quantity: number | null;
        unitPrice: bigint | null;
        amount: bigint;
        marginRate: number | null;
        truncUnit: bigint | null;
        department: string | null;
        memberName: string | null;
        grade: string | null;
        serviceTypeCode: string | null;
        revenueLinked: boolean;
        linkedCostLineCode: string | null;
        revenueUnitPrice: bigint | null;
        sortOrder: number;
      }>;
    }): Promise<unknown>;
  };
}

interface OpportunityVersionWriter extends OpportunityLineWriter {
  crmOpportunity: {
    create(args: {
      data: {
        opportunityCode: string;
        ownerOrganizationId: bigint | null;
        opportunityGroupCode: string;
        customerName: string;
        opportunityName: string;
        ownerName: string;
        ownerUserId: bigint | null;
        businessType: string;
        industryLine: string;
        regionCode: string;
        statusCode: string;
        priorityCode: string;
        versionNo: number;
        confirmed: boolean;
        expectedStartDate: Date | null;
        expectedEndDate: Date | null;
        paymentTermCode: string | null;
        quoteStatusCode?: string;
        quoteClientContactName?: string | null;
        quoteIssuedAt?: Date | null;
        quoteValidUntil?: Date | null;
        quoteMemo?: string | null;
        revenueSubtotal: bigint;
        specialDiscountTypeCode: string;
        specialDiscountValue: number | null;
        specialDiscountAmount: bigint;
        revenueTotal: bigint;
        costTotal: bigint;
        pmsHandoffStatusCode: string;
        dmsLinkStatusCode: string;
        adminBoundaryCode: string;
        nextAction: string;
        lastSource: string;
        lastActivity: string;
      };
    }): Promise<{ id: bigint }>;
  };
}

interface OpportunityVersionContext {
  versionCount: number;
  isLatest: boolean;
}

interface CrmAiIndexQueueResult {
  status: 'queued' | 'failed' | 'skipped';
  errorMessage?: string;
}

interface QuoteOwnerContactResolution {
  status: CrmQuotePreviewOwnerContactStatus;
  profile: CrmQuoteOwnerContactProfile | null;
}

interface CrmQuoteDmsHandoffLedgerRow {
  id: bigint;
  opportunityId: bigint;
  opportunityCode: string;
  quoteNumber: string;
  documentTypeCode: string;
  documentTitle: string;
  templateKey: string;
  folderHint: string;
  fileNameHint: string;
  draftPath: string;
  statusCode: string;
  documentSnapshot: unknown;
  variablesSnapshot: unknown;
  memo: string | null;
  savedBy: bigint | null;
  savedAt: Date;
}

interface CrmOpportunityContractDmsHandoffLedgerRow {
  id: bigint;
  opportunityId: bigint;
  opportunityCode: string;
  documentTitle: string;
  templateKey: string;
  folderHint: string;
  fileNameHint: string;
  draftPath: string;
  statusCode: string;
  documentSnapshot: unknown;
  variablesSnapshot: unknown;
  artifactSnapshot: unknown | null;
  memo: string | null;
  savedBy: bigint | null;
  savedAt: Date;
}

interface OpportunityContractDocumentHandoff extends CrmOpportunityContractDocumentHandoffSummary {
  opportunityId: string;
  opportunityCode: string;
  documentTitle: string;
  folderHint: string;
  fileNameHint: string;
  documentSnapshot: Omit<CrmOpportunityContractDocumentPreview, 'latestHandoff'>;
  variablesSnapshot: CrmOpportunityContractDocumentVariable[];
}

@Injectable()
export class OpportunityService {
  private readonly logger = new Logger(OpportunityService.name);

  constructor(
    private readonly db: DatabaseService,
    @Optional() private readonly aiIndexingService?: AiIndexingService,
    @Optional() private readonly contractService?: ContractService,
    @Optional() private readonly quoteSettingsService?: QuoteSettingsService,
    @Optional() private readonly userService?: UserService,
    @Optional() private readonly fileCrudService?: FileCrudService,
    @Optional() private readonly templateService?: TemplateService,
    @Optional() private readonly dmsCrmQuoteLifecycleService?: DmsCrmQuoteLifecycleService,
    @Optional() private readonly dmsCrmOpportunityContractLifecycleService?: DmsCrmOpportunityContractLifecycleService,
    @Optional() private readonly operationAttemptService?: CrmOperationAttemptService,
    @Optional() private readonly codeService?: CodeService,
    private readonly admission: PlatformAdmissionService = new PlatformAdmissionService(db),
    private readonly crmAccess?: CrmAccessService,
  ) {}

  async listOpportunities(query: CrmOpportunityListQuery = {}, currentUser?: TokenPayload, organizationId?: bigint): Promise<CrmOpportunity[]> {
    const normalized = this.normalizeQuery(query);
    const rows = await this.loadActiveOpportunityRows(currentUser, organizationId);
    const versionCounts = this.countVersionsByGroup(rows);
    const orderedRows = query.view === 'source-list'
      ? [...rows].sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
      : rows;
    const latestRows = this.selectLatestOpportunityRows(orderedRows);
    const opportunities = latestRows.map((row) => this.toContract(row, {
      versionCount: versionCounts.get(row.opportunityGroupCode) ?? 1,
      isLatest: true,
    }));
    return this.filterAndSortOpportunities(opportunities, normalized, query.view === 'source-list');
  }

  async listSourceDashboardOpportunities(currentUser?: TokenPayload): Promise<{ latest: CrmOpportunity[]; confirmed: CrmOpportunity[] }> {
    const rows = await this.loadActiveOpportunityRows(currentUser);
    // The demo enumerates numeric group IDs in registration order before reversing
    // its recent list. Group codes replace those IDs here; the first row's ID
    // preserves that order, independently of later edits and new versions.
    const registrationOrder = [...rows].sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
    const latestRows = this.selectLatestOpportunityRows(registrationOrder);
    const latestIds = new Set(latestRows.map((row) => row.id));
    const versionCounts = this.countVersionsByGroup(rows);
    const convert = (row: CrmOpportunityLedgerRow) => this.toContract(row, {
      versionCount: versionCounts.get(row.opportunityGroupCode) ?? 1,
      isLatest: latestIds.has(row.id),
    });
    return {
      latest: latestRows.map(convert),
      // Select the latest confirmed version even when a newer draft exists.
      confirmed: this.selectLatestOpportunityRows(registrationOrder.filter((row) => row.confirmed)).map(convert),
    };
  }

  async getOpportunity(id: string): Promise<CrmOpportunity> {
    const row = await this.findOpportunityRow(id);
    if (!row) {
      throw new NotFoundException('CRM opportunity not found');
    }

    const versions = await this.loadOpportunityVersionRows(row.opportunityGroupCode);
    return this.toContract(row, {
      versionCount: versions.length,
      isLatest: this.isLatestVersion(row, versions),
    });
  }

  async createOpportunity(dto: CrmOpportunityUpsertRequest, currentUserId?: bigint): Promise<CrmOpportunity> {
    const payload = this.normalizeUpsertPayload(dto);
    if (!currentUserId) throw new BadRequestException('업무 조직을 확인할 사용자 정보가 필요합니다.');
    const opportunityCode = this.createOpportunityCode();
    const createdId = await this.db.client.$transaction(async (tx) => {
      const ownerOrganizationId = await this.admission.resolveBusinessOrganization(currentUserId, 'crm', dto.ownerOrganizationId, tx);
      const row = await tx.crmOpportunity.create({
        data: {
          opportunityCode,
          ownerOrganizationId,
          createdBy: currentUserId,
          updatedBy: currentUserId,
          opportunityGroupCode: opportunityCode,
          customerName: payload.customerName,
          opportunityName: payload.opportunityName,
          ownerName: payload.ownerName,
          ownerUserId: payload.ownerUserId,
          businessType: payload.businessType,
          industryLine: payload.industryLine,
          regionCode: payload.regionCode,
          statusCode: payload.statusCode,
          priorityCode: payload.priorityCode,
          versionNo: 1,
          confirmed: false,
          expectedStartDate: payload.expectedStartDate,
          expectedEndDate: payload.expectedEndDate,
          paymentTermCode: payload.paymentTermCode,
          quoteClientContactName: payload.clientContactName,
          revenueSubtotal: payload.revenueSubtotal,
          specialDiscountTypeCode: payload.specialDiscountTypeCode,
          specialDiscountValue: payload.specialDiscountValue,
          specialDiscountAmount: payload.specialDiscountAmount,
          revenueTotal: payload.revenueTotal,
          costTotal: payload.costTotal,
          pmsHandoffStatusCode: 'planned',
          dmsLinkStatusCode: 'planned',
          adminBoundaryCode: 'shared-admin',
          nextAction: payload.nextAction,
          lastSource: 'crm.opportunity',
          lastActivity: 'create',
        },
      });

      await this.replaceOpportunityLines(tx, row.id, payload);
      return row.id;
    });

    await this.queueOpportunityAiIndexJob(createdId, 'upsert', 'opportunity_created');
    return this.getOpportunity(createdId.toString());
  }

  async updateOpportunity(id: string, dto: CrmOpportunityUpsertRequest, currentUserId?: bigint): Promise<CrmOpportunity> {
    const existing = await this.findOpportunityRow(id);
    if (!existing) {
      throw new NotFoundException('CRM opportunity not found');
    }

    if (dto.ownerOrganizationId !== undefined && dto.ownerOrganizationId !== existing.ownerOrganizationId?.toString()) {
      throw new BadRequestException('영업기회 차수와 연결 자료의 업무 조직은 일반 수정에서 변경할 수 없습니다.');
    }

    if (existing.confirmed) {
      throw new BadRequestException('확정된 영업기회는 수정할 수 없습니다.');
    }

    const versions = await this.loadOpportunityVersionRows(existing.opportunityGroupCode);
    if (!this.isLatestVersion(existing, versions)) {
      throw new BadRequestException('이전 차수 영업기회는 수정할 수 없습니다.');
    }

    const payload = this.normalizeUpsertPayload(dto);
    await this.db.client.$transaction(async (tx) => {
      await tx.crmOpportunity.update({
        where: { id: existing.id },
        data: {
          customerName: payload.customerName,
          opportunityName: payload.opportunityName,
          ownerName: payload.ownerName,
          ownerUserId: payload.ownerUserId,
          businessType: payload.businessType,
          industryLine: payload.industryLine,
          regionCode: payload.regionCode,
          statusCode: payload.statusCode,
          priorityCode: payload.priorityCode,
          expectedStartDate: payload.expectedStartDate,
          expectedEndDate: payload.expectedEndDate,
          paymentTermCode: payload.paymentTermCode,
          quoteClientContactName: payload.clientContactName,
          revenueSubtotal: payload.revenueSubtotal,
          specialDiscountTypeCode: payload.specialDiscountTypeCode,
          specialDiscountValue: payload.specialDiscountValue,
          specialDiscountAmount: payload.specialDiscountAmount,
          revenueTotal: payload.revenueTotal,
          costTotal: payload.costTotal,
          nextAction: payload.nextAction,
          lastSource: 'crm.opportunity',
          lastActivity: 'update',
          updatedBy: currentUserId,
        },
      });

      await this.replaceOpportunityLines(tx, existing.id, payload);
    });

    await this.queueOpportunityAiIndexJob(existing.id, 'upsert', 'opportunity_updated');
    return this.getOpportunity(existing.id.toString());
  }

  async deleteOpportunity(id: string): Promise<CrmOpportunityDeleteResult> {
    const existing = await this.findOpportunityRow(id);
    if (!existing) {
      throw new NotFoundException('CRM opportunity not found');
    }

    if (existing.confirmed) {
      throw new BadRequestException('확정된 영업기회는 삭제할 수 없습니다.');
    }

    const versions = await this.loadOpportunityVersionRows(existing.opportunityGroupCode);
    if (!this.isLatestVersion(existing, versions)) {
      throw new BadRequestException('이전 차수 영업기회는 삭제할 수 없습니다.');
    }

    const nextOpportunity = versions
      .filter((version) => version.id !== existing.id)
      .sort((left, right) => right.versionNo - left.versionNo)[0];

    await this.db.client.crmOpportunity.delete({ where: { id: existing.id } });
    await this.queueOpportunityAiIndexJob(existing.id, 'delete', 'opportunity_deleted');

    return {
      deletedOpportunityId: existing.opportunityCode,
      groupId: existing.opportunityGroupCode,
      deletedVersion: existing.versionNo,
      ...(nextOpportunity ? { nextOpportunityId: nextOpportunity.opportunityCode } : {}),
    };
  }

  async confirmOpportunity(id: string): Promise<CrmOpportunity> {
    const existing = await this.findOpportunityRow(id);
    if (!existing) {
      throw new NotFoundException('CRM opportunity not found');
    }

    if (existing.confirmed) {
      return this.getOpportunity(existing.id.toString());
    }

    const versions = await this.loadOpportunityVersionRows(existing.opportunityGroupCode);
    if (!this.isLatestVersion(existing, versions)) {
      throw new BadRequestException('이전 차수 영업기회는 확정할 수 없습니다.');
    }

    if (existing.statusCode === 'lost' || existing.statusCode === 'hold') {
      throw new BadRequestException('실주 또는 보류 영업기회는 확정할 수 없습니다.');
    }

    if (existing.revenueTotal <= 0n) {
      throw new BadRequestException('매출 합계가 0원인 영업기회는 확정할 수 없습니다.');
    }

    await this.db.client.crmOpportunity.update({
      where: { id: existing.id },
      data: {
        confirmed: true,
        lastSource: 'crm.opportunity',
        lastActivity: 'confirm',
      },
    });

    await this.queueOpportunityAiIndexJob(existing.id, 'upsert', 'opportunity_confirmed');
    return this.getOpportunity(existing.id.toString());
  }

  async reopenOpportunity(id: string, currentUserId?: bigint): Promise<CrmOpportunity> {
    const existing = await this.findOpportunityRow(id);
    if (!existing) {
      throw new NotFoundException('CRM opportunity not found');
    }

    if (!existing.confirmed) {
      throw new BadRequestException('미확정 영업기회는 확정 해제할 수 없습니다.');
    }

    const versions = await this.loadOpportunityVersionRows(existing.opportunityGroupCode);
    if (!this.isLatestVersion(existing, versions)) {
      throw new BadRequestException('이전 차수 영업기회는 확정 해제할 수 없습니다.');
    }

    if (existing.contractCreated) {
      if (!existing.contractCode) {
        throw new BadRequestException('연결 계약 코드를 확인할 수 없습니다.');
      }
      if (!this.contractService) {
        throw new BadRequestException('계약 회수 서비스를 사용할 수 없습니다.');
      }

      await this.contractService.revokeConvertedContract({
        opportunityId: existing.id,
        opportunityCode: existing.opportunityCode,
        contractCode: existing.contractCode,
        reopenOpportunity: true,
        currentUserId,
      });
      await this.queueOpportunityAiIndexJob(existing.id, 'upsert', 'opportunity_reopened_with_contract_revocation');
      return this.getOpportunity(existing.id.toString());
    }

    await this.db.client.crmOpportunity.update({
      where: { id: existing.id },
      data: {
        confirmed: false,
        statusCode: 'proposal',
        updatedBy: currentUserId,
        lastSource: 'crm.opportunity',
        lastActivity: 'reopen',
      },
    });

    await this.queueOpportunityAiIndexJob(existing.id, 'upsert', 'opportunity_reopened');
    return this.getOpportunity(existing.id.toString());
  }

  async revokeOpportunityContract(id: string, currentUserId?: bigint): Promise<CrmOpportunity> {
    const existing = await this.findOpportunityRow(id);
    if (!existing) {
      throw new NotFoundException('CRM opportunity not found');
    }
    if (!existing.confirmed) {
      throw new BadRequestException('확정된 영업기회의 계약만 회수할 수 있습니다.');
    }

    const versions = await this.loadOpportunityVersionRows(existing.opportunityGroupCode);
    if (!this.isLatestVersion(existing, versions)) {
      throw new BadRequestException('최신 차수 영업기회의 계약만 회수할 수 있습니다.');
    }
    if (!existing.contractCreated) {
      return this.getOpportunity(existing.id.toString());
    }
    if (!existing.contractCode) {
      throw new BadRequestException('연결 계약 코드를 확인할 수 없습니다.');
    }
    if (!this.contractService) {
      throw new BadRequestException('계약 회수 서비스를 사용할 수 없습니다.');
    }

    await this.contractService.revokeConvertedContract({
      opportunityId: existing.id,
      opportunityCode: existing.opportunityCode,
      contractCode: existing.contractCode,
      reopenOpportunity: false,
      currentUserId,
    });
    await this.queueOpportunityAiIndexJob(existing.id, 'upsert', 'opportunity_contract_revoked');
    return this.getOpportunity(existing.id.toString());
  }

  async listOpportunityVersions(id: string): Promise<CrmOpportunityVersionListResponse> {
    const existing = await this.findOpportunityRow(id);
    if (!existing) {
      throw new NotFoundException('CRM opportunity not found');
    }

    const versions = await this.loadOpportunityVersionRows(existing.opportunityGroupCode);
    return {
      opportunityId: existing.opportunityCode,
      groupId: existing.opportunityGroupCode,
      versions: versions.map((row) => this.toVersionSummary(row, this.isLatestVersion(row, versions))),
    };
  }

  async listOpportunityHistory(id: string): Promise<CrmOpportunityHistoryListResponse> {
    const existing = await this.findOpportunityRow(id);
    if (!existing) {
      throw new NotFoundException('CRM opportunity not found');
    }

    const rows = await this.db.client.crmOpportunityHistory.findMany({
      where: { opportunityId: existing.id },
      orderBy: [{ historySeq: 'desc' }],
      take: 20,
    }) as unknown as CrmOpportunityHistoryLedgerRow[];

    return {
      opportunityId: existing.opportunityCode,
      groupId: existing.opportunityGroupCode,
      items: rows.map((row) => this.toHistoryEntry(row)),
    };
  }

  async getQuotePreview(id: string, currentUser?: TokenPayload): Promise<CrmOpportunityQuotePreview> {
    const opportunity = await this.getOpportunity(id);
    const sellerProfile = await this.quoteSettingsService?.getSellerProfile();
    const ownerContact = await this.loadQuoteOwnerContact(opportunity.ownerUserId, currentUser);
    const latestHandoff = await this.loadLatestQuoteDmsDocumentHandoff(opportunity.id);
    const templateKey = latestHandoff?.templateKey ?? CRM_QUOTE_DMS_TEMPLATE_KEY;
    const [templateEvidence, templateOptions] = await Promise.all([
      this.loadQuoteDmsTemplateEvidence(templateKey),
      this.loadQuoteDmsTemplateOptions(),
    ]);
    return this.toQuotePreview(opportunity, sellerProfile, ownerContact, latestHandoff, templateEvidence, templateOptions);
  }

  async getOpportunityContractDocumentPreview(
    id: string,
    currentUser?: TokenPayload,
    templateKey?: string,
  ): Promise<CrmOpportunityContractDocumentPreview> {
    const existing = await this.findOpportunityRow(id);
    if (!existing) {
      throw new NotFoundException('CRM opportunity not found');
    }
    const versions = await this.loadOpportunityVersionRows(existing.opportunityGroupCode);
    const opportunity = this.toContract(existing, {
      versionCount: versions.length,
      isLatest: this.isLatestVersion(existing, versions),
    });
    const [sellerProfile, ownerContact, latestHandoff, templateOptions] = await Promise.all([
      this.quoteSettingsService?.getSellerProfile(),
      opportunity.ownerUserId
        ? this.loadQuoteOwnerContact(opportunity.ownerUserId, currentUser)
        : Promise.resolve({ status: 'opportunity-owner-profile-missing', profile: null } as QuoteOwnerContactResolution),
      this.loadLatestOpportunityContractDocumentHandoff(opportunity.id),
      this.loadOpportunityContractDocumentTemplateOptions(),
    ]);
    return this.toOpportunityContractDocumentPreview(
      opportunity,
      sellerProfile,
      ownerContact,
      latestHandoff,
      templateOptions,
      templateKey,
    );
  }

  async createOpportunityContractDocumentDraft(
    id: string,
    dto: CrmOpportunityContractDocumentDraftRequest,
    currentUser: TokenPayload,
  ): Promise<CrmOpportunityContractDocumentDraftResult> {
    if (!this.fileCrudService) {
      throw new BadRequestException('DMS file service is not available for CRM opportunity contract draft handoff.');
    }
    const existing = await this.findOpportunityRow(id);
    if (!existing) {
      throw new NotFoundException('CRM opportunity not found');
    }
    const selectedPreview = await this.getOpportunityContractDocumentPreview(existing.opportunityCode, currentUser, dto.templateKey);
    this.assertOpportunityContractDocumentTemplateSelectable(selectedPreview.templateKey, selectedPreview.templateOptions);
    if (selectedPreview.readiness !== 'ready') {
      throw new BadRequestException(selectedPreview.blockedReasons.join(' ') || '영업기회 계약서 초안 저장 준비가 완료되지 않았습니다.');
    }
    const markdown = this.toOpportunityContractDocumentDraftMarkdown(selectedPreview, dto.memo);
    const writeResult = await this.fileCrudService.write(selectedPreview.draftPathHint, markdown, currentUser);
    if (!writeResult.success) {
      throw new BadRequestException(`DMS opportunity contract markdown draft save failed: ${writeResult.error}`);
    }
    const handoff = await this.persistOpportunityContractDocumentHandoff(
      existing,
      selectedPreview,
      selectedPreview.draftPathHint,
      'draft-created',
      null,
      dto.memo,
      currentUser,
    );
    return {
      preview: await this.getOpportunityContractDocumentPreview(existing.opportunityCode, currentUser),
      handoff,
    };
  }

  async executeOpportunityContractDocumentLifecycle(
    id: string,
    dto: CrmOpportunityContractDocumentLifecycleExecutionRequest,
    currentUser: TokenPayload,
    operationContext?: CrmOperationRunContext,
  ): Promise<CrmOpportunityContractDocumentLifecycleExecutionResult> {
    if (this.operationAttemptService) {
      return this.operationAttemptService.run({
        target: 'dms',
        action: 'opportunity-contract-document-lifecycle',
        sourceEntityType: 'crm.opportunity',
        sourceEntityId: id,
        requestedBy: BigInt(currentUser.userId),
        fingerprintInput: { opportunityId: id, memo: dto.memo ?? null },
        context: operationContext,
        execute: () => this.performOpportunityContractDocumentLifecycle(id, dto, currentUser),
        evidence: (result) => ({
          opportunityId: result.preview.opportunityId,
          templateKey: result.handoff.templateKey,
          artifactPath: result.artifact.path,
        }),
      });
    }
    return this.performOpportunityContractDocumentLifecycle(id, dto, currentUser);
  }

  async readOpportunityContractDocumentArtifact(
    id: string,
  ): Promise<{ buffer: Buffer; fileName: string; contentType: string }> {
    const existing = await this.findOpportunityRow(id);
    if (!existing) {
      throw new NotFoundException('CRM opportunity not found');
    }
    const handoff = await this.loadLatestOpportunityContractDocumentHandoff(existing.opportunityCode);
    const storageUri = handoff?.artifact?.storageUri?.trim() ?? '';
    if (handoff?.status !== 'execution-completed' || !/^(local|nas):\/\//.test(storageUri)) {
      throw new NotFoundException('완료된 DMS 영업기회 계약서 DOCX artifact를 찾을 수 없습니다.');
    }
    return this.readDmsDocxArtifact(storageUri);
  }

  async readOpportunityContractDocumentSample(): Promise<{ buffer: Buffer; fileName: string; contentType: string }> {
    if (!this.templateService) {
      throw new BadRequestException('DMS template service is not available.');
    }
    const template = await this.templateService.get(CRM_OPPORTUNITY_CONTRACT_DMS_TEMPLATE_KEY, 'global', 'system');
    if (!template?.docxTemplate) {
      throw new NotFoundException('CRM 영업기회 계약서 샘플 DOCX 템플릿을 찾을 수 없습니다.');
    }
    return {
      buffer: this.templateService.readDocxBinary(template),
      fileName: 'CRM_영업기회_계약서_샘플.docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  async updateQuoteWorkflow(
    id: string,
    dto: CrmQuoteWorkflowUpdateRequest,
    currentUserId?: bigint,
    currentUser?: TokenPayload,
  ): Promise<CrmOpportunityQuotePreview> {
    const existing = await this.findOpportunityRow(id);
    if (!existing) {
      throw new NotFoundException('CRM opportunity not found');
    }

    const versions = await this.loadOpportunityVersionRows(existing.opportunityGroupCode);
    if (!this.isLatestVersion(existing, versions)) {
      throw new BadRequestException('이전 차수 영업기회의 견적 상태는 수정할 수 없습니다.');
    }
    if (existing.contractCreated) {
      throw new BadRequestException('계약으로 전환된 영업기회의 견적 상태는 수정할 수 없습니다.');
    }

    const quoteIssuedAt = this.normalizeDate(dto.issuedAt, '견적 발행 기준일');
    const quoteValidUntil = this.normalizeDate(dto.validUntil, '견적 유효기한');
    if (quoteIssuedAt && quoteValidUntil && quoteValidUntil < quoteIssuedAt) {
      throw new BadRequestException('견적 유효기한은 발행 기준일보다 빠를 수 없습니다.');
    }

    await this.db.client.crmOpportunity.update({
      where: { id: existing.id },
      data: {
        quoteStatusCode: this.toQuoteWorkflowStatus(dto.status),
        quoteClientContactName: this.optionalText(dto.clientContactName, 120),
        quoteIssuedAt,
        quoteValidUntil,
        quoteMemo: this.optionalText(dto.quoteMemo, 1000),
        updatedBy: currentUserId,
        lastSource: 'crm.quote',
        lastActivity: 'quote-workflow-update',
      },
    });

    await this.queueOpportunityAiIndexJob(existing.id, 'upsert', 'quote_workflow_updated');
    return this.getQuotePreview(existing.id.toString(), currentUser);
  }

  async createQuoteDmsDocumentDraft(
    id: string,
    dto: CrmQuoteDmsDocumentDraftRequest = {},
    currentUser: TokenPayload,
  ): Promise<CrmQuoteDmsDocumentDraft> {
    if (!this.fileCrudService) {
      throw new BadRequestException('DMS file service is not available for CRM quote draft handoff.');
    }

    const existing = await this.findOpportunityRow(id);
    if (!existing) {
      throw new NotFoundException('CRM opportunity not found');
    }

    const versions = await this.loadOpportunityVersionRows(existing.opportunityGroupCode);
    if (!this.isLatestVersion(existing, versions)) {
      throw new BadRequestException('이전 차수 영업기회의 견적 DMS 초안은 저장할 수 없습니다.');
    }
    if (existing.contractCreated) {
      throw new BadRequestException('계약으로 전환된 영업기회의 견적 DMS 초안은 저장할 수 없습니다.');
    }

    const opportunity = this.toContract(existing, {
      versionCount: versions.length,
      isLatest: true,
    });
    const sellerProfile = await this.quoteSettingsService?.getSellerProfile();
    const ownerContact = await this.loadQuoteOwnerContact(opportunity.ownerUserId, currentUser);
    const previousHandoff = await this.loadLatestQuoteDmsDocumentHandoff(opportunity.id);
    const templateKey = dto.templateKey?.trim() || CRM_QUOTE_DMS_TEMPLATE_KEY;
    const [templateEvidence, templateOptions] = await Promise.all([
      this.loadQuoteDmsTemplateEvidence(templateKey),
      this.loadQuoteDmsTemplateOptions(),
    ]);
    this.assertQuoteDmsTemplateSelectable(templateKey, templateOptions);
    const preview = await this.toQuotePreview(
      opportunity,
      sellerProfile,
      ownerContact,
      previousHandoff,
      templateEvidence,
      templateOptions,
    );
    if (preview.dmsDocument.readiness !== 'ready') {
      throw new BadRequestException(preview.dmsDocument.blockedReasons.join(' ') || '견적 DMS 초안 저장 준비가 완료되지 않았습니다.');
    }

    const draftPath = this.toQuoteDmsDraftPath(preview.dmsDocument);
    const markdown = this.toQuoteDmsDocumentDraftMarkdown(preview, dto.memo);
    const writeResult = await this.fileCrudService.write(draftPath, markdown, currentUser);
    if (!writeResult.success) {
      throw new BadRequestException(`DMS markdown draft save failed: ${writeResult.error}`);
    }

    const handoff = await this.persistQuoteDmsDocumentHandoff(existing, preview.dmsDocument, draftPath, dto, currentUser);
    const nextPreview = await this.getQuotePreview(existing.id.toString(), currentUser);

    return {
      opportunityId: opportunity.id,
      opportunityCode: opportunity.id,
      quoteNumber: preview.workflow.quoteNumber,
      documentTitle: handoff.documentTitle,
      templateKey: handoff.templateKey,
      savedPath: draftPath,
      dmsLinkStatus: 'draft-created',
      savedAt: handoff.savedAt,
      boundaryNotice: CRM_QUOTE_DMS_BOUNDARY_NOTICE,
      nextAction: 'DMS에서 견적서 템플릿 검토와 Word/PDF export를 이어서 처리합니다.',
      handoff,
      preview: nextPreview.dmsDocument,
    };
  }

  async readQuoteDmsArtifact(
    id: string,
    kind: string,
  ): Promise<{ buffer: Buffer; fileName: string; contentType: string }> {
    if (kind !== 'word-export' && kind !== 'pdf-export') {
      throw new BadRequestException('다운로드 가능한 견적 산출물은 word-export 또는 pdf-export입니다.');
    }
    const existing = await this.findOpportunityRow(id);
    if (!existing) {
      throw new NotFoundException('CRM opportunity not found');
    }
    const handoff = await this.loadLatestQuoteDmsDocumentHandoff(existing.opportunityCode);
    const step = handoff?.lifecycleSnapshot.find((candidate) => candidate.key === kind);
    const storageUri = step?.status === 'completed' ? step.evidencePath?.trim() : '';
    if (!storageUri || !/^(local|nas):\/\//.test(storageUri)) {
      throw new NotFoundException('완료된 DMS 견적 산출물 evidence를 찾을 수 없습니다.');
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
      throw new BadRequestException(error instanceof Error ? error.message : 'DMS 견적 산출물을 열 수 없습니다.');
    }
  }

  async recordQuoteDmsDocumentExecutionEvidence(
    id: string,
    dto: CrmQuoteDmsDocumentExecutionEvidenceRequest,
    currentUser: TokenPayload,
  ): Promise<CrmQuoteDmsDocumentExecutionEvidenceResult> {
    const existing = await this.findOpportunityRow(id);
    if (!existing) {
      throw new NotFoundException('CRM opportunity not found');
    }

    const latestHandoff = await this.loadLatestQuoteDmsDocumentHandoff(existing.opportunityCode);
    if (!latestHandoff) {
      throw new BadRequestException('견적 DMS markdown 초안 handoff를 먼저 생성해야 execution evidence를 기록할 수 있습니다.');
    }

    const steps = this.normalizeQuoteDmsExecutionEvidenceSteps(dto.steps);
    const nextLifecycle = this.mergeQuoteDmsExecutionLifecycleEvidence(
      latestHandoff.lifecycleSnapshot,
      steps,
    );
    const handoff = await this.persistQuoteDmsDocumentExecutionEvidence(
      existing,
      latestHandoff,
      nextLifecycle,
      steps,
      dto,
      currentUser,
    );
    const nextPreview = await this.getQuotePreview(existing.id.toString(), currentUser);

    return {
      opportunityId: existing.id.toString(),
      opportunityCode: existing.opportunityCode,
      quoteNumber: handoff.quoteNumber,
      templateKey: handoff.templateKey,
      appliedStepKeys: steps.map((step) => step.key),
      recordedAt: handoff.savedAt,
      handoff,
      preview: nextPreview.dmsDocument,
      boundaryNotice: CRM_QUOTE_DMS_BOUNDARY_NOTICE,
      nextAction: 'DMS 견적 artifact evidence가 CRM handoff snapshot에 반영되었습니다. DMS 문서 정본에서 산출물을 검토하세요.',
    };
  }

  async executeQuoteDmsDocumentLifecycle(
    id: string,
    dto: CrmQuoteDmsDocumentLifecycleExecutionRequest,
    currentUser: TokenPayload,
    operationContext?: CrmOperationRunContext,
  ): Promise<CrmQuoteDmsDocumentLifecycleExecutionResult> {
    if (this.operationAttemptService) {
      return this.operationAttemptService.run({
        target: 'dms',
        action: 'quote-dms-lifecycle',
        sourceEntityType: 'crm.opportunity',
        sourceEntityId: id,
        requestedBy: BigInt(currentUser.userId),
        fingerprintInput: { opportunityId: id, memo: dto.memo ?? null },
        context: operationContext,
        execute: () => this.performQuoteDmsDocumentLifecycle(id, dto, currentUser),
        evidence: (result) => ({
          opportunityId: result.opportunityId,
          templateKey: result.templateKey,
          appliedStepKeys: result.appliedStepKeys,
          recordedAt: result.recordedAt,
        }),
      });
    }
    return this.performQuoteDmsDocumentLifecycle(id, dto, currentUser);
  }

  private async performQuoteDmsDocumentLifecycle(
    id: string,
    dto: CrmQuoteDmsDocumentLifecycleExecutionRequest,
    currentUser: TokenPayload,
  ): Promise<CrmQuoteDmsDocumentLifecycleExecutionResult> {
    if (!this.dmsCrmQuoteLifecycleService) {
      throw new BadRequestException('DMS quote lifecycle service is not available for CRM quote artifact execution.');
    }

    const existing = await this.findOpportunityRow(id);
    if (!existing) {
      throw new NotFoundException('CRM opportunity not found');
    }

    const latestHandoff = await this.loadLatestQuoteDmsDocumentHandoff(existing.opportunityCode);
    if (!latestHandoff) {
      throw new BadRequestException('견적 DMS markdown 초안 handoff를 먼저 생성해야 DMS lifecycle을 실행할 수 있습니다.');
    }

    const dmsExecution = await this.dmsCrmQuoteLifecycleService.execute({
      opportunityId: existing.id.toString(),
      opportunityCode: existing.opportunityCode,
      quoteNumber: latestHandoff.quoteNumber,
      documentTitle: latestHandoff.documentTitle,
      templateKey: latestHandoff.templateKey,
      draftPath: latestHandoff.draftPath,
      variables: latestHandoff.variablesSnapshot,
      lifecycle: latestHandoff.lifecycleSnapshot,
      ...(dto.memo?.trim() ? { memo: dto.memo.trim() } : {}),
    }, currentUser);

    const recorded = await this.recordQuoteDmsDocumentExecutionEvidence(
      existing.opportunityCode,
      {
        steps: dmsExecution.evidenceSteps,
        memo: dto.memo ?? 'DMS 견적 lifecycle artifact 실행 결과',
      },
      currentUser,
    );

    return {
      ...recorded,
      dmsExecution,
      boundaryNotice: dmsExecution.boundaryNotice,
      nextAction: dmsExecution.nextAction,
    };
  }

  async convertOpportunityToContract(
    id: string,
    dto: CrmOpportunityContractConversionRequest = {},
    currentUserId?: bigint,
  ): Promise<CrmOpportunityContractConversionResponse> {
    if (!this.contractService) {
      throw new BadRequestException('계약 전환 서비스를 사용할 수 없습니다.');
    }

    const existing = await this.findOpportunityRow(id);
    if (!existing) {
      throw new NotFoundException('CRM opportunity not found');
    }

    if (!existing.confirmed) {
      throw new BadRequestException('확정된 영업기회만 계약으로 전환할 수 있습니다.');
    }
    if (existing.contractCreated) {
      throw new BadRequestException('이미 계약으로 전환된 영업기회입니다.');
    }

    const versions = await this.loadOpportunityVersionRows(existing.opportunityGroupCode);
    if (!this.isLatestVersion(existing, versions)) {
      throw new BadRequestException('최신 차수 영업기회만 계약으로 전환할 수 있습니다.');
    }
    if (existing.revenueTotal <= 0n) {
      throw new BadRequestException('매출 합계가 0원인 영업기회는 계약으로 전환할 수 없습니다.');
    }

    const contractPayload = this.toContractCreatePayload(existing, dto);
    const contract = await this.contractService.createContract(contractPayload, currentUserId);
    await this.db.client.crmOpportunity.update({
      where: { id: existing.id },
      data: {
        contractCreated: true,
        contractCreatedAt: new Date(),
        contractCode: contract.code,
        statusCode: 'won',
        nextAction: dto.nextAction?.trim() || `계약 ${contract.code} 청구계획과 WBS 확정 후 PMS 인계 후보 생성`,
        updatedBy: currentUserId,
        lastSource: 'crm.opportunity',
        lastActivity: 'convert-contract',
      },
    });

    await this.queueOpportunityAiIndexJob(existing.id, 'upsert', 'opportunity_contract_converted');
    return {
      opportunity: await this.getOpportunity(existing.id.toString()),
      contract,
    };
  }

  async addOpportunityVersion(id: string): Promise<CrmOpportunity> {
    const existing = await this.findOpportunityRow(id);
    if (!existing) {
      throw new NotFoundException('CRM opportunity not found');
    }

    if (!existing.confirmed) {
      throw new BadRequestException('확정된 영업기회만 차수를 추가할 수 있습니다.');
    }
    if (existing.contractCreated) {
      throw new BadRequestException('계약으로 전환된 영업기회는 차수를 추가할 수 없습니다.');
    }

    const versions = await this.loadOpportunityVersionRows(existing.opportunityGroupCode);
    if (!this.isLatestVersion(existing, versions)) {
      throw new BadRequestException('최신 차수에서만 새 차수를 추가할 수 있습니다.');
    }

    const nextVersion = Math.max(...versions.map((row) => row.versionNo), existing.versionNo) + 1;
    const nextOpportunityCode = this.createOpportunityVersionCode(existing.opportunityGroupCode, nextVersion);
    const createdId = await this.db.client.$transaction(async (tx: OpportunityVersionWriter) => {
      const row = await tx.crmOpportunity.create({
        data: {
          opportunityCode: nextOpportunityCode,
          ownerOrganizationId: existing.ownerOrganizationId,
          opportunityGroupCode: existing.opportunityGroupCode,
          customerName: existing.customerName,
          opportunityName: existing.opportunityName,
          ownerName: existing.ownerName,
          ownerUserId: existing.ownerUserId,
          businessType: existing.businessType,
          industryLine: existing.industryLine,
          regionCode: this.toRegion(existing.regionCode),
          statusCode: this.toStatus(existing.statusCode),
          priorityCode: this.toPriority(existing.priorityCode),
          versionNo: nextVersion,
          confirmed: false,
          expectedStartDate: existing.expectedStartDate,
          expectedEndDate: existing.expectedEndDate,
          paymentTermCode: existing.paymentTermCode,
          quoteStatusCode: 'draft',
          quoteClientContactName: existing.quoteClientContactName,
          quoteIssuedAt: null,
          quoteValidUntil: null,
          quoteMemo: null,
          revenueSubtotal: existing.revenueSubtotal,
          specialDiscountTypeCode: existing.specialDiscountTypeCode,
          specialDiscountValue: this.toOptionalNumber(existing.specialDiscountValue) ?? null,
          specialDiscountAmount: existing.specialDiscountAmount,
          revenueTotal: existing.revenueTotal,
          costTotal: existing.costTotal,
          pmsHandoffStatusCode: existing.pmsHandoffStatusCode,
          dmsLinkStatusCode: existing.dmsLinkStatusCode,
          adminBoundaryCode: existing.adminBoundaryCode,
          nextAction: existing.nextAction,
          lastSource: 'crm.opportunity',
          lastActivity: 'add-version',
        },
      });

      await this.copyOpportunityLines(tx, existing.lines, row.id);
      return row.id;
    });

    await this.queueOpportunityAiIndexJob(createdId, 'upsert', 'opportunity_version_added');
    return this.getOpportunity(createdId.toString());
  }

  async getSummary(
    items?: CrmOpportunity[],
    query: CrmOpportunityListQuery = {},
    currentUser?: TokenPayload,
    organizationId?: bigint,
  ): Promise<CrmOpportunitySummary> {
    const normalized = this.normalizeQuery(query);
    const rows = await this.loadActiveOpportunityRows(currentUser, organizationId);
    const versionCounts = this.countVersionsByGroup(rows);
    const allItems = this.selectLatestOpportunityRows(rows).map((row) => this.toContract(row, {
      versionCount: versionCounts.get(row.opportunityGroupCode) ?? 1,
      isLatest: true,
    }));
    const summaryItems = items ?? this.filterAndSortOpportunities(allItems, normalized);
    const totalRevenue = allItems.reduce((sum, item) => sum + item.revenueTotal, 0);
    const totalCost = allItems.reduce((sum, item) => sum + item.costTotal, 0);
    const totalMargin = totalRevenue - totalCost;

    return {
      totalCount: allItems.length,
      filteredCount: summaryItems.length,
      qualifiedCount: allItems.filter((item) => item.status === 'qualified').length,
      proposalCount: allItems.filter((item) => item.status === 'proposal').length,
      wonCount: allItems.filter((item) => item.status === 'won').length,
      totalRevenue,
      totalCost,
      totalMargin,
      grossMarginRate: totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 1000) / 10 : 0,
      boundaryNotice: CRM_BOUNDARY_NOTICE,
      unimplementedIntegrations: UNIMPLEMENTED_INTEGRATIONS,
      activeFilters: normalized,
    };
  }

  async listResponse(query: CrmOpportunityListQuery = {}, currentUser?: TokenPayload, organizationId?: bigint): Promise<CrmOpportunityListResponse> {
    const items = await this.listOpportunities(query, currentUser, organizationId);
    return { summary: await this.getSummary(items, query, currentUser, organizationId), items };
  }

  async findOwnerLookup(query: CrmOpportunityOwnerLookupQuery = {}): Promise<CrmOpportunityOwnerLookupItem[]> {
    const search = query.search?.trim();
    const limit = this.normalizeLookupLimit(query.limit);
    const users = await this.db.client.user.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { userName: { contains: search, mode: 'insensitive' } },
                { displayName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { departmentCode: { contains: search, mode: 'insensitive' } },
                { organizationRelations: { some: {
                  isActive: true,
                  organization: {
                    isActive: true,
                    orgClass: 'permanent',
                    OR: [
                      { orgName: { contains: search, mode: 'insensitive' } },
                      { orgCode: { contains: search, mode: 'insensitive' } },
                    ],
                  },
                } } },
                { authAccount: { is: { loginId: { contains: search, mode: 'insensitive' } } } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        userName: true,
        displayName: true,
        email: true,
        departmentCode: true,
        positionCode: true,
        authAccount: {
          select: {
            loginId: true,
          },
        },
        organizationRelations: {
          where: {
            isActive: true,
            organization: {
              isActive: true,
              orgClass: 'permanent',
            },
          },
          select: {
            isPrimary: true,
            organization: {
              select: {
                orgId: true,
                orgCode: true,
                orgName: true,
                scope: true,
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          take: 1,
        },
      },
      orderBy: [{ userName: 'asc' }, { id: 'asc' }],
      take: limit,
    });

    return users.map((user) => {
      const primaryOrganization = user.organizationRelations[0]?.organization;
      return {
        userId: user.id.toString(),
        userName: user.userName,
        displayName: user.displayName,
        loginId: user.authAccount?.loginId ?? null,
        email: user.email,
        departmentCode: user.departmentCode,
        positionCode: user.positionCode,
        primaryOrganizationId: primaryOrganization?.orgId.toString() ?? null,
        primaryOrganizationCode: primaryOrganization?.orgCode ?? null,
        primaryOrganizationName: primaryOrganization?.orgName ?? null,
        primaryOrganizationScope: primaryOrganization?.scope ?? null,
      };
    });
  }

  private filterAndSortOpportunities(
    opportunities: CrmOpportunity[],
    normalized: Required<Omit<CrmOpportunityListQuery, 'view'>>,
    sourceList = false,
  ): CrmOpportunity[] {
    const search = normalized.search.toLowerCase();

    return opportunities.filter((item) => {
      const matchesStatus = normalized.status === 'all' || item.status === normalized.status;
      const matchesSourceStatus = normalized.sourceStatus === 'all'
        || this.toSourceOpportunityStatus(item.status) === normalized.sourceStatus;
      const searchable = [item.customerName, item.opportunityName, item.ownerName, item.businessType, item.industryLine].join(' ').toLowerCase();
      const matchesSearch = search.length === 0 || (sourceList
        ? [item.customerName, item.opportunityName, item.ownerName].some((value) => value.toLowerCase().includes(search))
        : searchable.includes(search));
      return matchesStatus && matchesSourceStatus && matchesSearch;
    }).sort((left, right) => {
      const leftTotals = sourceList ? this.sourceOpportunityTotals(left) : left;
      const rightTotals = sourceList ? this.sourceOpportunityTotals(right) : right;
      if (normalized.sort === 'revenue-desc') return rightTotals.revenueTotal - leftTotals.revenueTotal;
      if (normalized.sort === 'profit-desc') return rightTotals.marginTotal - leftTotals.marginTotal;
      if (normalized.sort === 'margin-desc') return right.marginRate - left.marginRate;
      if (normalized.sort === 'customer-asc') return left.customerName.localeCompare(right.customerName, 'ko');
      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    });
  }

  private async loadActiveOpportunityRows(currentUser?: TokenPayload, organizationId?: bigint): Promise<CrmOpportunityLedgerRow[]> {
    const scope = currentUser ? await this.crmAccess!.businessOrganizationScope(currentUser) : null;
    return this.db.client.crmOpportunity.findMany({
      where: { isActive: true, ...(scope === null ? {} : { ownerOrganizationId: { in: scope } }), ...(organizationId === undefined ? {} : { AND: { ownerOrganizationId: organizationId } }) },
      include: {
        lines: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { lineCode: 'asc' }],
        },
      },
      orderBy: [{ opportunityGroupCode: 'asc' }, { versionNo: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
    }) as unknown as Promise<CrmOpportunityLedgerRow[]>;
  }

  private async loadOpportunityVersionRows(opportunityGroupCode: string): Promise<CrmOpportunityLedgerRow[]> {
    const rows = await (this.db.client.crmOpportunity.findMany({
      where: {
        isActive: true,
        opportunityGroupCode,
      },
      include: {
        lines: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { lineCode: 'asc' }],
        },
      },
      orderBy: [{ versionNo: 'asc' }, { id: 'asc' }],
    }) as unknown as Promise<CrmOpportunityLedgerRow[]>);
    return [...rows].sort((left, right) => {
      if (left.versionNo !== right.versionNo) {
        return left.versionNo - right.versionNo;
      }

      return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    });
  }

  private selectLatestOpportunityRows(rows: CrmOpportunityLedgerRow[]): CrmOpportunityLedgerRow[] {
    const latestByGroup = new Map<string, CrmOpportunityLedgerRow>();

    for (const row of rows) {
      const current = latestByGroup.get(row.opportunityGroupCode);
      if (!current || row.versionNo > current.versionNo || (row.versionNo === current.versionNo && row.updatedAt > current.updatedAt)) {
        latestByGroup.set(row.opportunityGroupCode, row);
      }
    }

    return [...latestByGroup.values()];
  }

  private countVersionsByGroup(rows: CrmOpportunityLedgerRow[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.opportunityGroupCode, (counts.get(row.opportunityGroupCode) ?? 0) + 1);
    }
    return counts;
  }

  private isLatestVersion(row: CrmOpportunityLedgerRow, versions: CrmOpportunityLedgerRow[]): boolean {
    return versions.every((candidate) => (
      candidate.versionNo < row.versionNo
      || (candidate.versionNo === row.versionNo && candidate.updatedAt <= row.updatedAt)
    ));
  }

  private async findOpportunityRow(id: string): Promise<CrmOpportunityLedgerRow | null> {
    const normalizedId = id.trim();
    const numericId = /^\d+$/.test(normalizedId) ? BigInt(normalizedId) : null;

    return this.db.client.crmOpportunity.findFirst({
      where: {
        isActive: true,
        OR: [
          { opportunityCode: normalizedId },
          ...(numericId ? [{ id: numericId }] : []),
        ],
      },
      include: {
        lines: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { lineCode: 'asc' }],
        },
      },
    }) as Promise<CrmOpportunityLedgerRow | null>;
  }

  private async replaceOpportunityLines(
    tx: OpportunityLineWriter,
    opportunityId: bigint,
    payload: Pick<NormalizedOpportunityPayload, 'revenueLines' | 'costLines'>,
  ): Promise<void> {
    await tx.crmOpportunityLine.deleteMany({ where: { opportunityId } });
    const costLineCodesByClientId = new Map<string, string>();
    payload.costLines.forEach((line, index) => {
      if (line.clientLineId) {
        costLineCodesByClientId.set(line.clientLineId, `cost-${String(index + 1).padStart(3, '0')}`);
      }
    });
    const data = [
      ...payload.revenueLines.map((line, index) => ({
        opportunityId,
        lineCode: `revenue-${String(index + 1).padStart(3, '0')}`,
        lineKindCode: 'revenue',
        categoryCode: line.category,
        lineLabel: line.label,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        amount: line.amount,
        marginRate: line.marginRate,
        truncUnit: line.truncUnit,
        department: line.department,
        memberName: line.memberName,
        grade: line.grade,
        serviceTypeCode: line.serviceTypeCode,
        revenueLinked: line.revenueLinked,
        linkedCostLineCode: line.linkedCostLineCode
          ? costLineCodesByClientId.get(line.linkedCostLineCode) ?? line.linkedCostLineCode
          : null,
        revenueUnitPrice: line.revenueUnitPrice,
        sortOrder: (index + 1) * 10,
      })),
      ...payload.costLines.map((line, index) => ({
        opportunityId,
        lineCode: `cost-${String(index + 1).padStart(3, '0')}`,
        lineKindCode: 'cost',
        categoryCode: line.category,
        lineLabel: line.label,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        amount: line.amount,
        marginRate: line.marginRate,
        truncUnit: line.truncUnit,
        department: line.department,
        memberName: line.memberName,
        grade: line.grade,
        serviceTypeCode: line.serviceTypeCode,
        revenueLinked: line.revenueLinked,
        linkedCostLineCode: line.linkedCostLineCode,
        revenueUnitPrice: line.revenueUnitPrice,
        sortOrder: (index + 1) * 10,
      })),
    ];

    if (data.length > 0) {
      await tx.crmOpportunityLine.createMany({ data });
    }
  }

  private async copyOpportunityLines(
    tx: OpportunityLineWriter,
    lines: CrmOpportunityLineLedgerRow[],
    opportunityId: bigint,
  ): Promise<void> {
    if (lines.length === 0) {
      return;
    }

    await tx.crmOpportunityLine.createMany({
      data: lines.map((line) => ({
        opportunityId,
        lineCode: line.lineCode,
        lineKindCode: line.lineKindCode,
        categoryCode: line.categoryCode,
        lineLabel: line.lineLabel,
        quantity: this.toOptionalNumber(line.quantity) ?? null,
        unitPrice: line.unitPrice,
        amount: line.amount,
        marginRate: this.toOptionalNumber(line.marginRate) ?? null,
        truncUnit: line.truncUnit,
        department: line.department,
        memberName: line.memberName,
        grade: line.grade,
        serviceTypeCode: line.serviceTypeCode,
        revenueLinked: line.revenueLinked,
        linkedCostLineCode: line.linkedCostLineCode,
        revenueUnitPrice: line.revenueUnitPrice,
        sortOrder: line.sortOrder,
      })),
    });
  }

  private toContractCreatePayload(
    row: CrmOpportunityLedgerRow,
    dto: CrmOpportunityContractConversionRequest,
  ): CrmContractUpsertRequest {
    const contractStartDate = dto.contractStartDate?.trim() || this.toDateString(row.expectedStartDate);
    const contractEndDate = dto.contractEndDate?.trim() || this.toDateString(row.expectedEndDate);
    if (!contractStartDate || !contractEndDate) {
      throw new BadRequestException('계약 전환에는 계약 시작일과 종료일이 필요합니다.');
    }

    const revenueLines = row.lines
      .filter((line) => line.lineKindCode === 'revenue')
      .map((line) => this.toContractUpsertLine(line));
    const costLines = row.lines
      .filter((line) => line.lineKindCode === 'cost')
      .map((line) => this.toContractUpsertLine(line));
    if (revenueLines.length === 0) {
      throw new BadRequestException('계약 전환에는 매출 라인이 1건 이상 필요합니다.');
    }

    return {
      sourceOpportunityId: row.id.toString(),
      sourceOpportunityCode: row.opportunityCode,
      customerName: row.customerName,
      contractName: row.opportunityName,
      ownerName: row.ownerName,
      clientContactName: row.quoteClientContactName ?? undefined,
      ownerUserId: row.ownerUserId?.toString(),
      businessType: row.businessType,
      industryLine: row.industryLine,
      region: this.toRegion(row.regionCode),
      status: 'review',
      contractStartDate,
      contractEndDate,
      wbsCode: dto.wbsCode?.trim() || undefined,
      paymentTermCode: row.paymentTermCode ?? undefined,
      specialDiscountType: this.toDiscountType(row.specialDiscountTypeCode),
      specialDiscountValue: this.toOptionalNumber(row.specialDiscountValue),
      revenueLines,
      costLines,
      billingPlan: [],
      nextAction: dto.nextAction?.trim() || '계약 조건과 청구계획 검토 후 계약 확정',
    };
  }

  private toContractUpsertLine(line: CrmOpportunityLineLedgerRow): CrmContractUpsertLine {
    return {
      id: line.lineCode,
      category: this.toLineCategory(line.categoryCode),
      label: line.lineLabel,
      quantity: this.toOptionalNumber(line.quantity),
      unitPrice: this.toOptionalBigIntNumber(line.unitPrice),
      amount: Number(line.amount),
      marginRate: this.toOptionalNumber(line.marginRate),
      truncUnit: this.toOptionalBigIntNumber(line.truncUnit),
      department: line.department ?? undefined,
      memberName: line.memberName ?? undefined,
      grade: line.grade ?? undefined,
      serviceType: this.toServiceType(line.serviceTypeCode),
      revenueLinked: line.revenueLinked,
      linkedCostLineId: line.linkedCostLineCode ?? undefined,
      revenueUnitPrice: this.toOptionalBigIntNumber(line.revenueUnitPrice),
    };
  }

  private toContract(row: CrmOpportunityLedgerRow, versionContext: OpportunityVersionContext = { versionCount: 1, isLatest: true }): CrmOpportunity {
    const revenueSubtotal = Number(row.revenueSubtotal);
    const specialDiscountAmount = Number(row.specialDiscountAmount);
    const revenueTotal = Number(row.revenueTotal);
    const costTotal = Number(row.costTotal);
    const marginTotal = revenueTotal - costTotal;
    const revenueLines = row.lines
      .filter((line) => line.lineKindCode === 'revenue')
      .map((line) => this.toLineContract(line));
    const costLines = row.lines
      .filter((line) => line.lineKindCode === 'cost')
      .map((line) => this.toLineContract(line));

    return {
      id: row.opportunityCode,
      groupId: row.opportunityGroupCode,
      customerName: row.customerName,
      opportunityName: row.opportunityName,
      ownerName: row.ownerName,
      ownerUserId: row.ownerUserId?.toString(),
      ownerOrganizationId: row.ownerOrganizationId?.toString(),
      businessType: row.businessType,
      industryLine: row.industryLine,
      region: this.toRegion(row.regionCode),
      status: this.toStatus(row.statusCode),
      priority: this.toPriority(row.priorityCode),
      version: row.versionNo,
      versionCount: versionContext.versionCount,
      isLatest: versionContext.isLatest,
      confirmed: row.confirmed,
      contractCreated: row.contractCreated === true,
      contractCreatedAt: row.contractCreatedAt?.toISOString(),
      contractCode: row.contractCode ?? undefined,
      expectedStartDate: this.toDateString(row.expectedStartDate),
      expectedEndDate: this.toDateString(row.expectedEndDate),
      clientContactName: row.quoteClientContactName ?? undefined,
      paymentTermCode: row.paymentTermCode ?? undefined,
      quoteStatus: this.toQuoteWorkflowStatus(row.quoteStatusCode),
      quoteIssuedAt: row.quoteIssuedAt?.toISOString(),
      quoteValidUntil: row.quoteValidUntil ? this.toDateString(row.quoteValidUntil) : undefined,
      quoteMemo: row.quoteMemo ?? undefined,
      revenueSubtotal,
      specialDiscountType: this.toDiscountType(row.specialDiscountTypeCode),
      specialDiscountValue: this.toOptionalNumber(row.specialDiscountValue) ?? 0,
      specialDiscountAmount,
      revenueTotal,
      costTotal,
      marginTotal,
      marginRate: revenueTotal > 0 ? Math.round((marginTotal / revenueTotal) * 1000) / 10 : 0,
      revenueLines,
      costLines,
      pmsHandoffStatus: this.toIntegrationStatus(row.pmsHandoffStatusCode),
      dmsLinkStatus: this.toIntegrationStatus(row.dmsLinkStatusCode),
      adminBoundary: this.toAdminBoundary(row.adminBoundaryCode),
      nextAction: row.nextAction,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private sourceOpportunityTotals(item: Pick<CrmOpportunity, 'revenueLines' | 'costLines'>) {
    const rawTotal = (lines: CrmOpportunity['revenueLines']) => lines.reduce((sum, line) => sum + (line.quantity ?? 0) * (line.unitPrice ?? 0), 0);
    const revenueTotal = rawTotal(item.revenueLines);
    const costTotal = rawTotal(item.costLines);
    const marginTotal = revenueTotal - costTotal;
    return { revenueTotal, costTotal, marginTotal, marginRate: revenueTotal > 0 ? Math.round(marginTotal / revenueTotal * 100) : 0 };
  }

  private toVersionSummary(row: CrmOpportunityLedgerRow, isLatest: boolean): CrmOpportunityVersionSummary {
    const revenueSubtotal = Number(row.revenueSubtotal);
    const specialDiscountAmount = Number(row.specialDiscountAmount);
    const revenueTotal = Number(row.revenueTotal);
    const costTotal = Number(row.costTotal);
    const marginTotal = revenueTotal - costTotal;

    return {
      sourceTotals: this.sourceOpportunityTotals(this.toContract(row)),
      id: row.opportunityCode,
      groupId: row.opportunityGroupCode,
      customerName: row.customerName,
      opportunityName: row.opportunityName,
      ownerName: row.ownerName,
      version: row.versionNo,
      isLatest,
      confirmed: row.confirmed,
      contractCreated: row.contractCreated === true,
      contractCode: row.contractCode ?? undefined,
      ownerUserId: row.ownerUserId?.toString(),
      status: this.toStatus(row.statusCode),
      quoteStatus: this.toQuoteWorkflowStatus(row.quoteStatusCode),
      paymentTermCode: row.paymentTermCode ?? undefined,
      expectedStartDate: this.toDateString(row.expectedStartDate),
      expectedEndDate: this.toDateString(row.expectedEndDate),
      revenueSubtotal,
      specialDiscountAmount,
      revenueTotal,
      costTotal,
      marginTotal,
      marginRate: revenueTotal > 0 ? Math.round((marginTotal / revenueTotal) * 1000) / 10 : 0,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toHistoryEntry(row: CrmOpportunityHistoryLedgerRow): CrmOpportunityHistoryEntry {
    const revenueTotal = Number(row.revenueTotal);
    const costTotal = Number(row.costTotal);
    const marginTotal = revenueTotal - costTotal;

    return {
      historySeq: row.historySeq.toString(),
      eventType: this.toHistoryEventType(row.eventType),
      eventAt: row.eventAt.toISOString(),
      eventBy: row.eventBy?.toString(),
      activity: row.lastActivity ?? undefined,
      source: row.lastSource ?? undefined,
      status: this.toStatus(row.statusCode),
      confirmed: row.confirmed,
      contractCreated: row.contractCreated === true,
      contractCode: row.contractCode ?? undefined,
      version: row.versionNo,
      quoteStatus: this.toQuoteWorkflowStatus(row.quoteStatusCode),
      paymentTermCode: row.paymentTermCode ?? undefined,
      revenueSubtotal: Number(row.revenueSubtotal),
      specialDiscountAmount: Number(row.specialDiscountAmount),
      revenueTotal,
      costTotal,
      marginTotal,
      marginRate: revenueTotal > 0 ? Math.round((marginTotal / revenueTotal) * 1000) / 10 : 0,
    };
  }

  private async toQuotePreview(
    opportunity: CrmOpportunity,
    sellerProfile: CrmQuoteSellerProfile | null | undefined,
    ownerContact: QuoteOwnerContactResolution,
    latestHandoff: CrmQuoteDmsDocumentHandoff | null,
    templateEvidence: CrmQuoteDmsTemplateEvidence = this.toUnavailableQuoteDmsTemplateEvidence(CRM_QUOTE_DMS_TEMPLATE_KEY),
    templateOptions: CrmDmsDocumentTemplateOption[] = [],
  ): Promise<CrmOpportunityQuotePreview> {
    const productLines = opportunity.revenueLines
      .filter((line) => line.category === 'product')
      .map((line) => ({
        id: line.id,
        section: 'product' as const,
        label: line.label,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        amount: line.amount,
      }));
    const serviceLines = opportunity.revenueLines
      .filter((line) => line.category === 'service')
      .map((line) => ({
        id: line.id,
        section: 'service' as const,
        label: line.label,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        amount: line.amount,
        department: line.department,
        memberName: line.memberName,
        grade: line.grade,
        serviceType: line.serviceType,
      }));
    const issuedAt = opportunity.quoteIssuedAt ? new Date(opportunity.quoteIssuedAt) : new Date();
    const validUntil = new Date(issuedAt);
    if (opportunity.quoteValidUntil) {
      const persistedValidUntil = new Date(`${opportunity.quoteValidUntil}T00:00:00.000Z`);
      validUntil.setTime(persistedValidUntil.getTime());
    } else {
      validUntil.setDate(validUntil.getDate() + QUOTE_VALIDITY_DAYS);
    }
    const productSubtotal = productLines.reduce((sum, line) => sum + line.amount, 0);
    const serviceSubtotal = serviceLines.reduce((sum, line) => sum + line.amount, 0);
    const previewStatus = opportunity.revenueTotal > 0 && opportunity.status !== 'lost' && opportunity.status !== 'hold'
      ? 'candidate'
      : 'blocked';
    const sellerName = sellerProfile?.companyName?.trim() || '공급자 회사 정보 미설정';
    const sellerInfoStatus = this.quoteSettingsService
      ? this.quoteSettingsService.toSellerInfoStatus(sellerProfile)
      : 'not-configured';
    const quoteNumber = `Q-${opportunity.id}-V${opportunity.version}`;
    const dmsDocument = this.toQuoteDmsDocumentPreview(
      opportunity,
      quoteNumber,
      sellerProfile,
      sellerName,
      sellerInfoStatus,
      ownerContact,
      previewStatus,
      latestHandoff,
      templateEvidence,
      templateOptions,
    );

    return {
      workflow: {
        sourceOpportunityId: opportunity.id,
        sourceOpportunityVersion: opportunity.version,
        sourceOpportunityStatus: opportunity.status,
        confirmed: opportunity.confirmed,
        previewStatus,
        workflowStatus: opportunity.quoteStatus,
        quoteNumber,
        issuedAt: issuedAt.toISOString(),
        validUntil: validUntil.toISOString().slice(0, 10),
        validityDays: QUOTE_VALIDITY_DAYS,
        paymentTermCode: opportunity.paymentTermCode,
        paymentTermLabel: await this.formatPaymentTerm(opportunity.paymentTermCode),
        quoteMemo: opportunity.quoteMemo,
        readOnly: true,
        unavailableActions: QUOTE_UNAVAILABLE_ACTIONS,
        boundaryNotice: '견적 후보는 영업기회 원장 기반 미리보기이며 브라우저 인쇄/PDF 저장을 제공합니다. 템플릿 기반 Word/PDF export는 DMS가 소유하고 계약 전환은 확정된 최신 영업기회 상세에서 실행합니다.',
      },
      party: {
        customerName: opportunity.customerName,
        clientContactName: opportunity.clientContactName,
        sellerName,
        sellerInfoStatus,
        sellerProfile: sellerProfile ?? undefined,
        ownerName: opportunity.ownerName,
        ownerContactStatus: ownerContact.status,
        ownerContact: ownerContact.profile ?? undefined,
      },
      productLines,
      serviceLines,
      summary: {
        productSubtotal,
        serviceSubtotal,
        revenueSubtotal: opportunity.revenueSubtotal,
        specialDiscountType: opportunity.specialDiscountType,
        specialDiscountValue: opportunity.specialDiscountValue,
        specialDiscountAmount: opportunity.specialDiscountAmount,
        quoteTotal: opportunity.revenueTotal,
        vatIncluded: false,
        vatNotice: 'VAT 별도',
      },
      dmsDocument,
      notes: [
        '원천 데모의 견적서 미리보기 흐름을 SSOO 영업기회 원장 위에서 읽기 전용 후보로 재구성했습니다.',
        '공급자 회사 정보는 CRM 견적 설정에서 관리하고 담당자 연락처는 영업기회 ownerUserId의 공용 사용자 프로필을 우선 표시합니다.',
        'CRM은 DMS markdown 초안 handoff snapshot만 남기며 Word/PDF 생성과 문서 lifecycle은 DMS에서 이어서 처리합니다.',
      ],
    };
  }

  private async toOpportunityContractDocumentPreview(
    opportunity: CrmOpportunity,
    sellerProfile: CrmQuoteSellerProfile | null | undefined,
    ownerContact: QuoteOwnerContactResolution,
    latestHandoff: OpportunityContractDocumentHandoff | null,
    templateOptions: CrmDmsDocumentTemplateOption[],
    requestedTemplateKey?: string,
  ): Promise<CrmOpportunityContractDocumentPreview> {
    const preferredKey = latestHandoff?.templateKey ?? CRM_OPPORTUNITY_CONTRACT_DMS_TEMPLATE_KEY;
    const templateKey = requestedTemplateKey?.trim()
      || (templateOptions.some((option) => option.templateKey === preferredKey && option.selectable)
        ? preferredKey
        : templateOptions.find((option) => option.selectable)?.templateKey ?? preferredKey);
    const selectedTemplate = templateOptions.find((option) => option.templateKey === templateKey);
    const now = new Date();
    const variables = this.toOpportunityContractDocumentVariables(opportunity, sellerProfile, ownerContact, now, opportunity.paymentTermCode ? await this.formatPaymentTerm(opportunity.paymentTermCode) : '');
    const missingVariables = variables.filter((variable) => variable.required && !variable.value.trim());
    const blockedReasons = [
      ...(!opportunity.confirmed ? ['원천 데모와 동일하게 확정된 영업기회만 계약서를 생성할 수 있습니다.'] : []),
      ...(!opportunity.isLatest ? ['이전 차수 영업기회에서는 계약서를 생성할 수 없습니다.'] : []),
      ...(opportunity.revenueTotal <= 0 ? ['계약금액이 0원인 영업기회에서는 계약서를 생성할 수 없습니다.'] : []),
      ...(!opportunity.expectedStartDate || !opportunity.expectedEndDate ? ['계약 시작일과 종료일이 필요합니다.'] : []),
      ...(missingVariables.length > 0
        ? [`실제 문서 입력값이 필요합니다: ${missingVariables.map((variable) => variable.key).join(', ')}`]
        : []),
      ...(!selectedTemplate?.selectable
        ? [selectedTemplate?.unavailableReason ?? `선택 가능한 DMS 영업기회 계약서 DOCX 템플릿 ${templateKey}이 없습니다.`]
        : []),
    ];
    const readiness = blockedReasons.length === 0 ? 'ready' : 'blocked';
    const documentTitle = `${opportunity.customerName} ${opportunity.opportunityName} 계약서`;
    const hints = this.toOpportunityContractDocumentPathHints(
      opportunity.customerName,
      opportunity.opportunityName,
      opportunity.id,
      selectedTemplate?.templateName ?? templateKey,
      now,
    );
    return {
      opportunityId: opportunity.id,
      opportunityCode: opportunity.id,
      opportunityVersion: opportunity.version,
      customerName: opportunity.customerName,
      opportunityName: opportunity.opportunityName,
      confirmed: opportunity.confirmed,
      latestVersion: opportunity.isLatest,
      documentTitle,
      templateKey,
      templateOptions,
      ...hints,
      readiness,
      blockedReasons,
      variables,
      lifecycle: this.toOpportunityContractDocumentLifecycle(
        readiness,
        blockedReasons,
        latestHandoff,
        templateKey,
      ),
      latestHandoff: latestHandoff ? this.toOpportunityContractDocumentHandoffSummary(latestHandoff) : null,
      boundaryNotice: CRM_OPPORTUNITY_CONTRACT_DMS_BOUNDARY_NOTICE,
      nextAction: readiness === 'ready'
        ? latestHandoff?.status === 'execution-completed'
          ? '생성된 DOCX 계약서를 내려받아 원천 22개 변수 치환 결과를 검토하세요.'
          : latestHandoff
            ? 'DMS 템플릿 검토와 DOCX 산출을 실행하세요.'
            : '원천 22개 변수 snapshot을 DMS markdown 초안으로 저장하세요.'
        : '차단 사유의 실제 CRM·판매자·담당자·DMS 템플릿 데이터를 먼저 보완하세요.',
    };
  }

  private toOpportunityContractDocumentVariables(
    opportunity: CrmOpportunity,
    sellerProfile: CrmQuoteSellerProfile | null | undefined,
    ownerContact: QuoteOwnerContactResolution,
    now: Date,
    paymentTermLabel: string,
  ): CrmOpportunityContractDocumentVariable[] {
    const startDate = this.toDotDate(opportunity.expectedStartDate);
    const endDate = this.toDotDate(opportunity.expectedEndDate);
    const owner = ownerContact.profile;
    const values: Array<[
      CrmOpportunityContractDocumentVariable['key'],
      string,
      CrmOpportunityContractDocumentVariable['source'],
    ]> = [
      ['공급자_회사명', sellerProfile?.companyName?.trim() ?? '', 'seller-profile'],
      ['공급자_대표자', sellerProfile?.ceoName?.trim() ?? '', 'seller-profile'],
      ['공급자_사업자번호', sellerProfile?.businessRegistrationNo?.trim() ?? '', 'seller-profile'],
      ['공급자_주소', sellerProfile?.address?.trim() ?? '', 'seller-profile'],
      ['공급자_전화', sellerProfile?.tel?.trim() ?? '', 'seller-profile'],
      ['고객사명', opportunity.customerName.trim(), 'opportunity'],
      ['건명', opportunity.opportunityName.trim(), 'opportunity'],
      ['계약금액', this.formatSourceNumber(opportunity.revenueTotal), 'opportunity'],
      ['계약금액_한글', this.toSourceKoreanWon(opportunity.revenueTotal), 'opportunity'],
      // The source labels this external cost but calls calcCostTotal(d), so preserve total cost exactly.
      ['외부원가', this.formatSourceNumber(opportunity.costTotal), 'opportunity'],
      ['순이익', this.formatSourceNumber(opportunity.revenueTotal - opportunity.costTotal), 'opportunity'],
      ['계약시작일', startDate, 'opportunity'],
      ['계약종료일', endDate, 'opportunity'],
      ['계약기간', startDate && endDate ? `${startDate} ~ ${endDate}` : '', 'opportunity'],
      ['사업구분', opportunity.businessType.trim(), 'opportunity'],
      ['담당자명', owner?.displayName?.trim() ?? '', 'owner-profile'],
      ['담당자부서', owner?.departmentName?.trim() ?? '', 'owner-profile'],
      ['담당자연락처', owner?.phone?.trim() ?? '', 'owner-profile'],
      ['담당자이메일', owner?.email?.trim() ?? '', 'owner-profile'],
      ['수금조건', paymentTermLabel, 'opportunity'],
      ['작성일', `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`, 'system-date'],
      ['계약년도', opportunity.expectedStartDate?.slice(0, 4) || String(now.getFullYear()), 'opportunity'],
    ];
    const requiredKeys = new Set<CrmOpportunityContractDocumentVariable['key']>([
      '고객사명', '건명', '계약금액', '계약금액_한글', '계약시작일', '계약종료일', '계약기간',
    ]);
    return values.map(([key, value, source]) => ({ key, label: key, value, required: requiredKeys.has(key), source }));
  }

  private async loadOpportunityContractDocumentTemplateOptions(): Promise<CrmDmsDocumentTemplateOption[]> {
    if (!this.templateService || typeof this.templateService.list !== 'function') {
      return [];
    }
    const templates = await this.templateService.list('system');
    return templates.global
      .filter((template) => template.kind === 'document')
      .filter((template) => template.id === CRM_OPPORTUNITY_CONTRACT_DMS_TEMPLATE_KEY
        || template.generation?.taskKey === CRM_OPPORTUNITY_CONTRACT_DMS_TEMPLATE_TASK_KEY)
      .map((template) => {
        const status = template.status ?? 'active';
        const selectable = status === 'active' && Boolean(template.docxTemplate);
        return {
          templateKey: template.id,
          templateName: template.name,
          taskKey: CRM_OPPORTUNITY_CONTRACT_DMS_TEMPLATE_TASK_KEY,
          sourcePath: template.sourcePath,
          status,
          docxFileName: template.docxTemplate?.fileName,
          docxOrigin: template.docxTemplate?.origin,
          reviewStatus: template.reviewConfirmation?.status ?? 'pending',
          selectable,
          unavailableReason: selectable
            ? undefined
            : status !== 'active'
              ? `DMS 계약서 템플릿 ${template.name} 상태가 ${status}입니다.`
              : `DMS 계약서 템플릿 ${template.name}에 실제 DOCX binary가 없습니다.`,
        };
      });
  }

  private assertOpportunityContractDocumentTemplateSelectable(
    templateKey: string,
    templateOptions: CrmDmsDocumentTemplateOption[],
  ): void {
    const option = templateOptions.find((candidate) => candidate.templateKey === templateKey);
    if (!option?.selectable) {
      throw new BadRequestException(option?.unavailableReason ?? `선택 가능한 DMS 영업기회 계약서 템플릿 ${templateKey}이 없습니다.`);
    }
  }

  private async loadLatestOpportunityContractDocumentHandoff(
    opportunityCode: string,
  ): Promise<OpportunityContractDocumentHandoff | null> {
    const rows = await this.db.client.$queryRaw<CrmOpportunityContractDmsHandoffLedgerRow[]>`
      select
        opportunity_contract_dms_handoff_id as "id",
        opportunity_id as "opportunityId",
        opportunity_code as "opportunityCode",
        document_title as "documentTitle",
        template_key as "templateKey",
        folder_hint as "folderHint",
        file_name_hint as "fileNameHint",
        draft_path as "draftPath",
        status_code as "statusCode",
        document_snapshot as "documentSnapshot",
        variables_snapshot as "variablesSnapshot",
        artifact_snapshot as "artifactSnapshot",
        memo,
        saved_by as "savedBy",
        saved_at as "savedAt"
      from crm.crm_opportunity_contract_dms_handoff_m
      where opportunity_code = ${opportunityCode}
        and is_active = true
      order by opportunity_contract_dms_handoff_id desc
      limit 1
    `;
    return rows[0] ? this.toOpportunityContractDocumentHandoff(rows[0]) : null;
  }

  private async persistOpportunityContractDocumentHandoff(
    opportunity: CrmOpportunityLedgerRow,
    preview: CrmOpportunityContractDocumentPreview,
    draftPath: string,
    status: 'draft-created' | 'execution-completed',
    artifact: CrmOpportunityContractDocumentArtifact | null,
    memo: string | undefined,
    currentUser: TokenPayload,
  ): Promise<CrmOpportunityContractDocumentHandoffSummary> {
    const documentSnapshot = { ...preview };
    delete (documentSnapshot as Partial<CrmOpportunityContractDocumentPreview>).latestHandoff;
    const currentUserId = BigInt(currentUser.userId);
    const savedRows = await this.db.client.$transaction(async (tx) => {
      const writer = tx as RawOpportunityWriter;
      await writer.$executeRaw`
        update crm.crm_opportunity_contract_dms_handoff_m
           set status_code = 'replaced',
               is_active = false,
               updated_at = now(),
               last_source = 'crm.opportunity-contract-document',
               last_activity = 'opportunity-contract-document-replaced'
         where opportunity_id = ${opportunity.id}
           and is_active = true
      `;
      const inserted = await writer.$queryRaw<CrmOpportunityContractDmsHandoffLedgerRow[]>`
        insert into crm.crm_opportunity_contract_dms_handoff_m (
          opportunity_id,
          opportunity_code,
          document_title,
          template_key,
          folder_hint,
          file_name_hint,
          draft_path,
          status_code,
          document_snapshot,
          variables_snapshot,
          artifact_snapshot,
          memo,
          saved_by,
          last_source,
          last_activity
        ) values (
          ${opportunity.id},
          ${opportunity.opportunityCode},
          ${preview.documentTitle},
          ${preview.templateKey},
          ${preview.folderHint},
          ${preview.fileNameHint},
          ${draftPath},
          ${status},
          ${JSON.stringify(documentSnapshot)}::jsonb,
          ${JSON.stringify(preview.variables)}::jsonb,
          ${artifact ? JSON.stringify(artifact) : null}::jsonb,
          ${memo?.trim() || null},
          ${currentUserId},
          'crm.opportunity-contract-document',
          ${status === 'execution-completed' ? 'opportunity-contract-document-executed' : 'opportunity-contract-document-draft'}
        )
        returning
          opportunity_contract_dms_handoff_id as "id",
          opportunity_id as "opportunityId",
          opportunity_code as "opportunityCode",
          document_title as "documentTitle",
          template_key as "templateKey",
          folder_hint as "folderHint",
          file_name_hint as "fileNameHint",
          draft_path as "draftPath",
          status_code as "statusCode",
          document_snapshot as "documentSnapshot",
          variables_snapshot as "variablesSnapshot",
          artifact_snapshot as "artifactSnapshot",
          memo,
          saved_by as "savedBy",
          saved_at as "savedAt"
      `;
      await writer.$executeRaw`
        update crm.crm_opportunity_m
           set dms_link_status_code = ${status === 'execution-completed' ? 'linked' : 'draft-created'},
               updated_by = ${currentUserId},
               updated_at = now(),
               last_source = 'crm.opportunity-contract-document',
               last_activity = ${status === 'execution-completed' ? 'opportunity-contract-document-executed' : 'opportunity-contract-document-draft'}
         where opportunity_id = ${opportunity.id}
      `;
      return inserted;
    });
    if (!savedRows[0]) {
      throw new BadRequestException('CRM 영업기회 계약서 DMS handoff snapshot을 저장하지 못했습니다.');
    }
    await this.queueOpportunityAiIndexJob(opportunity.id, 'upsert', `opportunity_contract_document_${status}`);
    return this.toOpportunityContractDocumentHandoffSummary(this.toOpportunityContractDocumentHandoff(savedRows[0]));
  }

  private async performOpportunityContractDocumentLifecycle(
    id: string,
    dto: CrmOpportunityContractDocumentLifecycleExecutionRequest,
    currentUser: TokenPayload,
  ): Promise<CrmOpportunityContractDocumentLifecycleExecutionResult> {
    if (!this.dmsCrmOpportunityContractLifecycleService) {
      throw new BadRequestException('DMS opportunity contract lifecycle service is not available.');
    }
    const existing = await this.findOpportunityRow(id);
    if (!existing) {
      throw new NotFoundException('CRM opportunity not found');
    }
    const latest = await this.loadLatestOpportunityContractDocumentHandoff(existing.opportunityCode);
    if (!latest) {
      throw new BadRequestException('영업기회 계약서 DMS markdown 초안 handoff를 먼저 생성해야 합니다.');
    }
    const currentPreview = await this.getOpportunityContractDocumentPreview(existing.opportunityCode, currentUser, latest.templateKey);
    if (currentPreview.readiness !== 'ready') {
      throw new BadRequestException(currentPreview.blockedReasons.join(' ') || '영업기회 계약서 실행 준비가 완료되지 않았습니다.');
    }
    this.assertOpportunityContractDocumentTemplateSelectable(latest.templateKey, currentPreview.templateOptions);
    const dmsExecution = await this.dmsCrmOpportunityContractLifecycleService.execute({
      opportunityId: existing.id.toString(),
      opportunityCode: existing.opportunityCode,
      documentTitle: latest.documentTitle,
      fileNameHint: latest.fileNameHint,
      templateKey: latest.templateKey,
      draftPath: latest.draftPath,
      variables: latest.variablesSnapshot,
      ...(dto.memo?.trim() ? { memo: dto.memo.trim() } : {}),
    }, currentUser);
    const word = dmsExecution.artifacts.find((candidate) => candidate.kind === 'word-export');
    if (!word?.storageUri) {
      throw new BadRequestException('DMS lifecycle 실행 결과에 DOCX artifact storage URI가 없습니다.');
    }
    const artifact: CrmOpportunityContractDocumentArtifact = {
      kind: 'word-export',
      label: word.label,
      path: word.path,
      storageUri: word.storageUri,
      checksum: word.checksum,
      size: word.size,
    };
    const persistedPreview: CrmOpportunityContractDocumentPreview = {
      ...latest.documentSnapshot,
      readiness: currentPreview.readiness,
      blockedReasons: currentPreview.blockedReasons,
      templateOptions: currentPreview.templateOptions,
      lifecycle: this.toOpportunityContractDocumentLifecycle('ready', [], {
        ...latest,
        status: 'execution-completed',
        artifact,
      }, latest.templateKey),
      latestHandoff: this.toOpportunityContractDocumentHandoffSummary(latest),
    };
    const handoff = await this.persistOpportunityContractDocumentHandoff(
      existing,
      persistedPreview,
      latest.draftPath,
      'execution-completed',
      artifact,
      dto.memo,
      currentUser,
    );
    return {
      preview: await this.getOpportunityContractDocumentPreview(existing.opportunityCode, currentUser),
      handoff,
      artifact,
      boundaryNotice: dmsExecution.boundaryNotice,
      nextAction: dmsExecution.nextAction,
    };
  }

  private toOpportunityContractDocumentHandoff(
    row: CrmOpportunityContractDmsHandoffLedgerRow,
  ): OpportunityContractDocumentHandoff {
    const artifact = this.fromJson<CrmOpportunityContractDocumentArtifact | null>(row.artifactSnapshot, null);
    const documentSnapshot = this.fromJson<Omit<CrmOpportunityContractDocumentPreview, 'latestHandoff'>>(
      row.documentSnapshot,
      {
        opportunityId: row.opportunityCode,
        opportunityCode: row.opportunityCode,
        opportunityVersion: 1,
        customerName: '',
        opportunityName: '',
        confirmed: false,
        latestVersion: false,
        documentTitle: row.documentTitle,
        templateKey: row.templateKey,
        templateOptions: [],
        folderHint: row.folderHint,
        fileNameHint: row.fileNameHint,
        draftPathHint: row.draftPath,
        readiness: 'blocked',
        blockedReasons: ['저장된 CRM 계약서 문서 snapshot을 해석할 수 없습니다.'],
        variables: [],
        lifecycle: [],
        boundaryNotice: CRM_OPPORTUNITY_CONTRACT_DMS_BOUNDARY_NOTICE,
        nextAction: 'CRM 계약서 문서 snapshot을 다시 생성하세요.',
      },
    );
    return {
      id: row.id.toString(),
      opportunityId: row.opportunityId.toString(),
      opportunityCode: row.opportunityCode,
      documentTitle: row.documentTitle,
      folderHint: row.folderHint,
      fileNameHint: row.fileNameHint,
      status: row.statusCode === 'execution-completed'
        ? 'execution-completed'
        : row.statusCode === 'replaced'
          ? 'replaced'
          : 'draft-created',
      templateKey: row.templateKey,
      draftPath: row.draftPath,
      savedAt: row.savedAt.toISOString(),
      savedBy: row.savedBy?.toString(),
      memo: row.memo ?? undefined,
      artifact: artifact ?? undefined,
      documentSnapshot,
      variablesSnapshot: this.fromJson<CrmOpportunityContractDocumentVariable[]>(row.variablesSnapshot, []),
    };
  }

  private toOpportunityContractDocumentHandoffSummary(
    handoff: OpportunityContractDocumentHandoff,
  ): CrmOpportunityContractDocumentHandoffSummary {
    return {
      id: handoff.id,
      status: handoff.status,
      templateKey: handoff.templateKey,
      draftPath: handoff.draftPath,
      savedAt: handoff.savedAt,
      savedBy: handoff.savedBy,
      memo: handoff.memo,
      artifact: handoff.artifact,
    };
  }

  private toOpportunityContractDocumentLifecycle(
    readiness: 'ready' | 'blocked',
    blockedReasons: string[],
    handoff: CrmOpportunityContractDocumentHandoffSummary | null,
    templateKey: string,
  ): CrmOpportunityContractDocumentLifecycleStep[] {
    const executed = handoff?.status === 'execution-completed' && Boolean(handoff.artifact);
    const blocked = readiness === 'blocked';
    const templateReviewPath = handoff?.artifact?.path
      ? `${handoff.artifact.path.split('/').slice(0, -1).join('/').replace(/^_assets\//, '_generated/')}/template-review.md`
      : undefined;
    return [
      {
        key: 'markdown-draft',
        label: 'CRM 원천 22개 변수 초안',
        owner: 'crm',
        status: handoff ? 'completed' : blocked ? 'blocked' : 'ready',
        evidenceLabel: 'CRM opportunity contract markdown handoff',
        evidencePath: handoff?.draftPath,
        note: handoff ? 'CRM이 원천 22개 변수 snapshot과 markdown 초안을 저장했습니다.' : 'CRM 원천 변수 초안 저장 대기 중입니다.',
        blockingReasons: !handoff && blocked ? blockedReasons : undefined,
      },
      {
        key: 'template-review',
        label: 'DMS DOCX 템플릿 검토',
        owner: 'dms',
        status: executed ? 'completed' : blocked ? 'blocked' : handoff ? 'pending' : 'ready',
        evidenceLabel: `DMS ${templateKey} template review record`,
        evidencePath: executed ? templateReviewPath : undefined,
        note: executed ? '실제 사용한 DMS 템플릿 버전과 검토 기록을 보존했습니다.' : 'DMS template review 실행 대기 중입니다.',
        blockingReasons: !executed && blocked ? blockedReasons : undefined,
      },
      {
        key: 'word-export',
        label: 'DMS DOCX 계약서 산출',
        owner: 'dms',
        status: executed ? 'completed' : blocked ? 'blocked' : handoff ? 'pending' : 'ready',
        evidenceLabel: 'DMS opportunity contract DOCX artifact',
        evidencePath: handoff?.artifact?.storageUri,
        note: executed ? '원천 22개 변수를 치환한 DOCX artifact를 저장했습니다.' : 'DMS DOCX render 실행 대기 중입니다.',
        blockingReasons: !executed && blocked ? blockedReasons : undefined,
      },
    ];
  }

  private toOpportunityContractDocumentPathHints(
    customerName: string,
    opportunityName: string,
    opportunityCode: string,
    templateName: string,
    now = new Date(),
  ): Pick<CrmOpportunityContractDocumentPreview, 'folderHint' | 'fileNameHint' | 'draftPathHint'> {
    const customer = this.toFileHintPart(customerName);
    const opportunity = this.toFileHintPart(opportunityName);
    const template = this.toFileHintPart(templateName);
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const folderHint = `/CRM/${customer}/opportunity-contracts/${this.toFileHintPart(opportunityCode)}`;
    const fileNameHint = `${customer}_${opportunity}_${template}_${date}.docx`;
    return {
      folderHint,
      fileNameHint,
      draftPathHint: `${folderHint.slice(1)}/${fileNameHint.replace(/\.docx$/i, '_draft.md')}`,
    };
  }

  private toOpportunityContractDocumentDraftMarkdown(
    preview: CrmOpportunityContractDocumentPreview,
    memo?: string,
  ): string {
    return `${[
      `# ${this.escapeMarkdownText(preview.documentTitle)}`,
      '',
      '> CRM 확정 영업기회에서 원천 데모의 22개 변수를 그대로 고정한 DMS DOCX 입력 초안입니다.',
      '',
      '| Key | 값 | 출처 |',
      '|---|---|---|',
      ...preview.variables.map((variable) => `| ${this.escapeMarkdownTableCell(variable.key)} | ${this.escapeMarkdownTableCell(variable.value)} | ${variable.source} |`),
      '',
      '## CRM-DMS 책임 경계',
      '',
      CRM_OPPORTUNITY_CONTRACT_DMS_BOUNDARY_NOTICE,
      ...(memo?.trim() ? ['', '## 저장 메모', '', this.escapeMarkdownText(memo.trim().slice(0, 1000))] : []),
    ].join('\n')}\n`;
  }

  private readDmsDocxArtifact(storageUri: string): { buffer: Buffer; fileName: string; contentType: string } {
    try {
      const opened = storageAdapterService.open({ storageUri });
      const resolved = storageAdapterService.resolveContainedPath(opened.provider, opened.path);
      if (path.extname(resolved.fullPath).toLowerCase() !== '.docx' || !fs.existsSync(resolved.fullPath)) {
        throw new Error('산출물 파일 형식 또는 경로가 lifecycle evidence와 일치하지 않습니다.');
      }
      return {
        buffer: fs.readFileSync(resolved.fullPath),
        fileName: path.basename(resolved.fullPath),
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'DMS 영업기회 계약서 산출물을 열 수 없습니다.');
    }
  }

  private toDotDate(value: string | undefined): string {
    return value?.slice(0, 10).replace(/-/g, '.') ?? '';
  }

  private formatSourceNumber(value: number): string {
    return Math.round(value).toLocaleString('ko-KR');
  }

  private toSourceKoreanWon(value: number): string {
    let remaining = Math.max(0, Math.round(value));
    if (remaining === 0) {
      return '영원';
    }
    const units = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
    const places = ['', '십', '백', '천'];
    const bigs = ['', '만', '억', '조'];
    let result = '';
    let bigIndex = 0;
    while (remaining > 0) {
      const chunk = remaining % 10000;
      if (chunk > 0) {
        let chunkText = '';
        let part = chunk;
        for (let place = 0; part > 0; place += 1) {
          const digit = part % 10;
          if (digit > 0) {
            chunkText = `${units[digit]}${places[place]}${chunkText}`;
          }
          part = Math.floor(part / 10);
        }
        result = `${chunkText}${bigs[bigIndex] ?? ''}${result}`;
      }
      bigIndex += 1;
      remaining = Math.floor(remaining / 10000);
    }
    return `${result}원`;
  }

  private async loadQuoteDmsTemplateEvidence(templateKey: string): Promise<CrmQuoteDmsTemplateEvidence> {
    if (!this.templateService) {
      return this.toUnavailableQuoteDmsTemplateEvidence(templateKey);
    }

    const template = await this.templateService.get(templateKey, 'global', 'system');
    if (!template) {
      return {
        state: 'missing',
        templateKey,
        reason: `DMS 시스템 템플릿 registry에서 ${templateKey} 템플릿을 찾을 수 없습니다.`,
      };
    }

    return this.toAvailableQuoteDmsTemplateEvidence(template);
  }

  private async loadQuoteDmsTemplateOptions(): Promise<CrmDmsDocumentTemplateOption[]> {
    if (!this.templateService || typeof this.templateService.list !== 'function') {
      return [];
    }

    const templates = await this.templateService.list('system');
    return templates.global
      .filter((template) => template.kind === 'document')
      .filter((template) => template.id === CRM_QUOTE_DMS_TEMPLATE_KEY
        || template.generation?.taskKey === CRM_QUOTE_DMS_TEMPLATE_TASK_KEY)
      .map((template) => {
        const status = template.status ?? 'active';
        const selectable = status === 'active' && Boolean(template.docxTemplate);
        return {
          templateKey: template.id,
          templateName: template.name,
          taskKey: CRM_QUOTE_DMS_TEMPLATE_TASK_KEY,
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
        if (left.templateKey === CRM_QUOTE_DMS_TEMPLATE_KEY) return -1;
        if (right.templateKey === CRM_QUOTE_DMS_TEMPLATE_KEY) return 1;
        return left.templateName.localeCompare(right.templateName, 'ko');
      });
  }

  private assertQuoteDmsTemplateSelectable(
    templateKey: string,
    templateOptions: CrmDmsDocumentTemplateOption[],
  ): void {
    if (!this.templateService || typeof this.templateService.list !== 'function') {
      if (templateKey !== CRM_QUOTE_DMS_TEMPLATE_KEY) {
        throw new BadRequestException(`DMS 견적 템플릿 ${templateKey}을 검증할 수 없습니다.`);
      }
      return;
    }
    const selected = templateOptions.find((option) => option.templateKey === templateKey);
    if (!selected) {
      throw new BadRequestException(`DMS 견적 템플릿 ${templateKey}은 견적 문서 용도로 등록되지 않았습니다.`);
    }
    if (!selected.selectable) {
      throw new BadRequestException(selected.unavailableReason ?? `DMS 견적 템플릿 ${templateKey}을 사용할 수 없습니다.`);
    }
  }

  private toAvailableQuoteDmsTemplateEvidence(template: TemplateItem): CrmQuoteDmsTemplateEvidence {
    return {
      state: 'available',
      templateKey: template.id,
      templateName: template.name,
      sourcePath: template.sourcePath,
      status: template.status,
      updatedAt: template.updatedAt,
    };
  }

  private toUnavailableQuoteDmsTemplateEvidence(templateKey: string): CrmQuoteDmsTemplateEvidence {
    return {
      state: 'unavailable',
      templateKey,
      reason: '현재 런타임에서 DMS TemplateService가 연결되지 않았습니다.',
    };
  }

  private async loadLatestQuoteDmsDocumentHandoff(opportunityCode: string): Promise<CrmQuoteDmsDocumentHandoff | null> {
    const rawClient = this.db.client as unknown as Partial<RawOpportunityWriter>;
    if (typeof rawClient.$queryRaw !== 'function') {
      return null;
    }

    const rows = await rawClient.$queryRaw<CrmQuoteDmsHandoffLedgerRow[]>`
      select
        quote_dms_handoff_id as "id",
        opportunity_id as "opportunityId",
        opportunity_code as "opportunityCode",
        quote_number as "quoteNumber",
        document_type_code as "documentTypeCode",
        document_title as "documentTitle",
        template_key as "templateKey",
        folder_hint as "folderHint",
        file_name_hint as "fileNameHint",
        draft_path as "draftPath",
        status_code as "statusCode",
        document_snapshot as "documentSnapshot",
        variables_snapshot as "variablesSnapshot",
        memo,
        saved_by as "savedBy",
        saved_at as "savedAt"
      from crm.crm_quote_dms_handoff_m
      where opportunity_code = ${opportunityCode}
        and is_active = true
      order by saved_at desc, quote_dms_handoff_id desc
      limit 1
    `;
    return rows[0] ? this.toQuoteDmsDocumentHandoff(rows[0]) : null;
  }

  private async persistQuoteDmsDocumentHandoff(
    row: CrmOpportunityLedgerRow,
    preview: CrmQuoteDmsDocumentPreview,
    savedPath: string,
    dto: CrmQuoteDmsDocumentDraftRequest,
    currentUser: TokenPayload,
  ): Promise<CrmQuoteDmsDocumentHandoff> {
    const currentUserId = BigInt(currentUser.userId);
    const memo = dto.memo?.trim() ? dto.memo.trim() : null;
    const completedPreview: CrmQuoteDmsDocumentPreview = {
      ...preview,
      savedDraftPath: savedPath,
      dmsLinkStatus: 'draft-created',
      lifecycle: this.markQuoteDmsDraftLifecycleCompleted(preview.lifecycle, savedPath),
      nextAction: 'DMS에서 견적서 템플릿 검토와 Word/PDF export를 이어서 처리합니다.',
    };
    const documentSnapshotJson = JSON.stringify(this.toQuoteDmsDocumentSnapshot(completedPreview));
    const variablesSnapshotJson = JSON.stringify(preview.variables);

    const rows = await this.db.client.$transaction(async (tx) => {
      const writer = tx as RawOpportunityWriter;
      await writer.$executeRaw`
        update crm.crm_quote_dms_handoff_m
           set status_code = 'replaced',
               is_active = false,
               updated_at = now(),
               last_source = 'crm.quote',
               last_activity = 'quote-dms-handoff-replaced'
         where opportunity_code = ${row.opportunityCode}
           and is_active = true
      `;
      const inserted = await writer.$queryRaw<CrmQuoteDmsHandoffLedgerRow[]>`
        insert into crm.crm_quote_dms_handoff_m (
          opportunity_id,
          opportunity_code,
          quote_number,
          document_type_code,
          document_title,
          template_key,
          folder_hint,
          file_name_hint,
          draft_path,
          status_code,
          document_snapshot,
          variables_snapshot,
          memo,
          saved_by,
          last_source,
          last_activity
        )
        select
          opportunity_id,
          opportunity_code,
          ${preview.quoteNumber},
          ${preview.documentType},
          ${preview.documentTitle},
          ${preview.templateKey},
          ${preview.folderHint},
          ${preview.fileNameHint},
          ${savedPath},
          'draft-created',
          ${documentSnapshotJson}::jsonb,
          ${variablesSnapshotJson}::jsonb,
          ${memo},
          ${currentUserId},
          'crm.quote',
          'quote-dms-handoff-create'
        from crm.crm_opportunity_m
        where opportunity_id = ${row.id}
        returning
          quote_dms_handoff_id as "id",
          opportunity_id as "opportunityId",
          opportunity_code as "opportunityCode",
          quote_number as "quoteNumber",
          document_type_code as "documentTypeCode",
          document_title as "documentTitle",
          template_key as "templateKey",
          folder_hint as "folderHint",
          file_name_hint as "fileNameHint",
          draft_path as "draftPath",
          status_code as "statusCode",
          document_snapshot as "documentSnapshot",
          variables_snapshot as "variablesSnapshot",
          memo,
          saved_by as "savedBy",
          saved_at as "savedAt"
      `;
      await writer.$executeRaw`
        update crm.crm_opportunity_m
           set dms_link_status_code = 'draft-created',
               updated_by = ${currentUserId},
               updated_at = now(),
               last_source = 'crm.quote',
               last_activity = 'quote-dms-draft-create'
         where opportunity_id = ${row.id}
      `;
      return inserted;
    });

    if (!rows[0]) {
      throw new BadRequestException('DMS quote handoff snapshot could not be recorded for this opportunity.');
    }

    await this.queueOpportunityAiIndexJob(row.id, 'upsert', 'quote_dms_draft_created');
    return this.toQuoteDmsDocumentHandoff(rows[0]);
  }

  private async persistQuoteDmsDocumentExecutionEvidence(
    row: CrmOpportunityLedgerRow,
    latestHandoff: CrmQuoteDmsDocumentHandoff,
    lifecycle: CrmQuoteDmsDocumentLifecycleStep[],
    steps: CrmQuoteDmsDocumentExecutionEvidenceStep[],
    dto: CrmQuoteDmsDocumentExecutionEvidenceRequest,
    currentUser: TokenPayload,
  ): Promise<CrmQuoteDmsDocumentHandoff> {
    const currentUserId = BigInt(currentUser.userId);
    const memo = dto.memo?.trim() ? dto.memo.trim() : null;
    const documentSnapshot: Omit<CrmQuoteDmsDocumentPreview, 'latestHandoff'> = {
      ...latestHandoff.documentSnapshot,
      savedDraftPath: latestHandoff.draftPath,
      dmsLinkStatus: 'draft-created',
      lifecycle,
      unavailableActions: QUOTE_UNAVAILABLE_ACTIONS,
      nextAction: 'DMS 견적 artifact evidence가 CRM handoff snapshot에 반영되었습니다. DMS 문서 정본에서 산출물을 검토하세요.',
    };
    const documentSnapshotJson = JSON.stringify(documentSnapshot);
    const variablesSnapshotJson = JSON.stringify(latestHandoff.variablesSnapshot);

    const rows = await this.db.client.$transaction(async (tx) => {
      const writer = tx as RawOpportunityWriter;
      await writer.$executeRaw`
        update crm.crm_quote_dms_handoff_m
           set status_code = 'replaced',
               is_active = false,
               updated_at = now(),
               last_source = 'crm.quote',
               last_activity = 'quote-dms-execution-evidence-replaced'
         where opportunity_code = ${row.opportunityCode}
           and is_active = true
      `;
      const inserted = await writer.$queryRaw<CrmQuoteDmsHandoffLedgerRow[]>`
        insert into crm.crm_quote_dms_handoff_m (
          opportunity_id,
          opportunity_code,
          quote_number,
          document_type_code,
          document_title,
          template_key,
          folder_hint,
          file_name_hint,
          draft_path,
          status_code,
          document_snapshot,
          variables_snapshot,
          memo,
          saved_by,
          last_source,
          last_activity
        )
        select
          opportunity_id,
          opportunity_code,
          ${latestHandoff.quoteNumber},
          ${latestHandoff.documentType},
          ${latestHandoff.documentTitle},
          ${latestHandoff.templateKey},
          ${latestHandoff.folderHint},
          ${latestHandoff.fileNameHint},
          ${latestHandoff.draftPath},
          'execution-evidence-updated',
          ${documentSnapshotJson}::jsonb,
          ${variablesSnapshotJson}::jsonb,
          ${memo},
          ${currentUserId},
          'crm.quote',
          'quote-dms-execution-evidence'
        from crm.crm_opportunity_m
        where opportunity_id = ${row.id}
        returning
          quote_dms_handoff_id as "id",
          opportunity_id as "opportunityId",
          opportunity_code as "opportunityCode",
          quote_number as "quoteNumber",
          document_type_code as "documentTypeCode",
          document_title as "documentTitle",
          template_key as "templateKey",
          folder_hint as "folderHint",
          file_name_hint as "fileNameHint",
          draft_path as "draftPath",
          status_code as "statusCode",
          document_snapshot as "documentSnapshot",
          variables_snapshot as "variablesSnapshot",
          memo,
          saved_by as "savedBy",
          saved_at as "savedAt"
      `;
      await writer.$executeRaw`
        update crm.crm_opportunity_m
           set dms_link_status_code = 'draft-created',
               updated_by = ${currentUserId},
               updated_at = now(),
               last_source = 'crm.quote',
               last_activity = 'quote-dms-execution-evidence'
         where opportunity_id = ${row.id}
      `;
      return inserted;
    });

    if (!rows[0]) {
      throw new BadRequestException('DMS quote execution evidence snapshot could not be recorded for this opportunity.');
    }

    await this.queueOpportunityAiIndexJob(row.id, 'upsert', `quote_dms_execution_evidence_${steps.map((step) => step.key).join('_')}`);
    return this.toQuoteDmsDocumentHandoff(rows[0]);
  }

  private toQuoteDmsDocumentPreview(
    opportunity: CrmOpportunity,
    quoteNumber: string,
    sellerProfile: CrmQuoteSellerProfile | null | undefined,
    sellerName: string,
    sellerInfoStatus: CrmQuotePreviewSellerInfoStatus,
    ownerContact: QuoteOwnerContactResolution,
    previewStatus: 'candidate' | 'blocked',
    latestHandoff: CrmQuoteDmsDocumentHandoff | null,
    templateEvidence: CrmQuoteDmsTemplateEvidence,
    templateOptions: CrmDmsDocumentTemplateOption[],
  ): CrmQuoteDmsDocumentPreview {
    const blockedReasons = [
      ...(previewStatus === 'blocked' ? ['견적 후보 매출이 없거나 영업기회 상태가 보류/실패입니다.'] : []),
      ...(sellerInfoStatus === 'not-configured' ? ['견적서 공급자 회사 정보가 필요합니다.'] : []),
    ];
    const documentTitle = `${opportunity.customerName} ${opportunity.opportunityName} 견적서`;
    const folderHint = `/CRM/${this.toFileHintPart(opportunity.customerName)}/quotes/${quoteNumber}`;
    const fileNameHint = `${quoteNumber}_${this.toFileHintPart(opportunity.customerName)}_${this.toFileHintPart(opportunity.opportunityName)}_quote-draft.md`;
    const readiness = blockedReasons.length === 0 ? 'ready' : 'blocked';
    const lifecycle = this.mergeQuoteDmsHandoffLifecycle(
      this.toQuoteDmsDocumentLifecycle({
        readiness,
        blockedReasons,
        latestHandoff,
        templateEvidence,
      }),
      latestHandoff,
    );

    return {
      opportunityId: opportunity.id,
      opportunityCode: opportunity.id,
      quoteNumber,
      customerName: opportunity.customerName,
      opportunityName: opportunity.opportunityName,
      ownerName: opportunity.ownerName,
      documentType: 'quote',
      documentTitle,
      templateKey: templateEvidence.templateKey,
      templateEvidence,
      templateOptions,
      folderHint,
      fileNameHint,
      draftPathHint: this.toQuoteDmsDraftPathFromParts(opportunity.customerName, quoteNumber, opportunity.opportunityName),
      savedDraftPath: latestHandoff?.draftPath,
      readOnly: true,
      readiness,
      blockedReasons,
      dmsLinkStatus: latestHandoff ? 'draft-created' : opportunity.dmsLinkStatus,
      sellerName,
      sellerInfoStatus,
      sellerProfile: sellerProfile ?? undefined,
      variables: this.toQuoteDmsDocumentVariables(opportunity, quoteNumber, sellerProfile, sellerName, ownerContact),
      lifecycle,
      latestHandoff: latestHandoff ? this.toQuoteDmsDocumentHandoffSummary(latestHandoff) : null,
      boundaryNotice: CRM_QUOTE_DMS_BOUNDARY_NOTICE,
      unavailableActions: QUOTE_UNAVAILABLE_ACTIONS,
      nextAction: blockedReasons.length === 0
        ? '견적 markdown 초안을 DMS에 저장한 뒤 Word/PDF export는 DMS 문서 lifecycle에서 처리합니다.'
        : '견적 매출 후보와 공급자 회사 정보를 보강한 뒤 DMS 초안을 저장할 수 있습니다.',
    };
  }

  private toQuoteDmsDocumentLifecycle(input: {
    readiness: CrmQuoteDmsDocumentPreview['readiness'];
    blockedReasons: string[];
    latestHandoff: CrmQuoteDmsDocumentHandoff | null;
    templateEvidence: CrmQuoteDmsTemplateEvidence;
  }): CrmQuoteDmsDocumentLifecycleStep[] {
    const hasDraft = Boolean(input.latestHandoff);
    const draftBlockedReasons = input.readiness === 'blocked'
      ? input.blockedReasons
      : ['CRM markdown 초안 저장 후 DMS 견적 lifecycle을 진행할 수 있습니다.'];
    const templateBlockingReasons = [
      ...(!hasDraft ? ['CRM markdown 초안 handoff가 필요합니다.'] : []),
      ...(input.templateEvidence.state === 'missing' || input.templateEvidence.state === 'unavailable'
        ? [input.templateEvidence.reason ?? `DMS 시스템 템플릿 ${input.templateEvidence.templateKey} 확인이 필요합니다.`]
        : []),
    ];
    const exportBlockingReasons = !hasDraft ? ['CRM markdown 초안 handoff가 필요합니다.'] : [];

    return [
      {
        key: 'markdown-draft',
        label: 'CRM markdown 초안',
        owner: 'crm',
        status: hasDraft ? 'completed' : input.readiness === 'ready' ? 'ready' : 'blocked',
        evidenceLabel: hasDraft ? 'CRM quote markdown draft handoff' : 'CRM quote markdown draft path hint',
        evidencePath: input.latestHandoff?.draftPath,
        note: hasDraft
          ? 'CRM이 DMS markdown 초안 handoff snapshot을 남겼습니다.'
          : 'CRM은 견적 문서 입력 패킷과 markdown 초안 저장까지만 수행합니다.',
        ...(!hasDraft && draftBlockedReasons.length > 0 ? { blockingReasons: draftBlockedReasons } : {}),
      },
      {
        key: 'template-review',
        label: 'DMS 템플릿 검토',
        owner: 'dms',
        status: templateBlockingReasons.length === 0 ? 'ready' : 'blocked',
        evidenceLabel: input.templateEvidence.state === 'available'
          ? 'DMS active quote template registry evidence'
          : 'DMS quote template registry evidence unavailable',
        evidencePath: input.templateEvidence.sourcePath,
        note: input.templateEvidence.state === 'available'
          ? `DMS 시스템 템플릿 ${input.templateEvidence.templateKey}(${input.templateEvidence.templateName})을 확인했습니다. 실제 검토 확정과 버전 승인은 DMS 문서 lifecycle이 소유합니다.`
          : 'DMS 견적 템플릿 registry 확인 전에는 템플릿 검토 evidence를 완료할 수 없습니다.',
        ...(templateBlockingReasons.length > 0 ? { blockingReasons: templateBlockingReasons } : {}),
      },
      {
        key: 'word-export',
        label: 'Word 견적서 산출',
        owner: 'dms',
        status: exportBlockingReasons.length === 0 ? 'pending' : 'blocked',
        evidenceLabel: 'DMS quote DOCX artifact',
        note: 'DMS가 CRM 견적 markdown 초안과 템플릿을 사용해 DOCX artifact를 생성하고 evidence path를 CRM에 수신시킵니다.',
        ...(exportBlockingReasons.length > 0 ? { blockingReasons: exportBlockingReasons } : {}),
      },
      {
        key: 'pdf-export',
        label: 'PDF 견적서 저장',
        owner: 'dms',
        status: exportBlockingReasons.length === 0 ? 'pending' : 'blocked',
        evidenceLabel: 'DMS quote PDF artifact',
        note: 'DMS가 CRM 견적 markdown 초안과 템플릿을 사용해 PDF artifact를 생성하고 evidence path를 CRM에 수신시킵니다.',
        ...(exportBlockingReasons.length > 0 ? { blockingReasons: exportBlockingReasons } : {}),
      },
    ];
  }

  private markQuoteDmsDraftLifecycleCompleted(
    lifecycle: CrmQuoteDmsDocumentLifecycleStep[],
    draftPath: string,
  ): CrmQuoteDmsDocumentLifecycleStep[] {
    const draftRequiredReason = 'CRM markdown 초안 handoff가 필요합니다.';
    return lifecycle.map((step) => {
      if (step.key === 'markdown-draft') {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { blockingReasons: _blockingReasons, ...stepWithoutBlockingReasons } = step;
        return {
          ...stepWithoutBlockingReasons,
          status: 'completed',
          evidencePath: draftPath,
          evidenceLabel: 'CRM quote markdown draft handoff',
          note: 'CRM이 DMS markdown 초안 handoff snapshot을 남겼습니다.',
        };
      }

      if (!step.blockingReasons?.includes(draftRequiredReason)) {
        return step;
      }

      const remainingBlockingReasons = step.blockingReasons.filter((reason) => reason !== draftRequiredReason);
      const nextStatus = remainingBlockingReasons.length > 0
        ? 'blocked'
        : step.key === 'template-review'
          ? 'ready'
          : 'pending';
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { blockingReasons: _blockingReasons, ...stepWithoutBlockingReasons } = step;
      return remainingBlockingReasons.length > 0
        ? { ...stepWithoutBlockingReasons, status: nextStatus, blockingReasons: remainingBlockingReasons }
        : { ...stepWithoutBlockingReasons, status: nextStatus };
    });
  }

  private mergeQuoteDmsHandoffLifecycle(
    lifecycle: CrmQuoteDmsDocumentLifecycleStep[],
    latestHandoff: CrmQuoteDmsDocumentHandoff | null,
  ): CrmQuoteDmsDocumentLifecycleStep[] {
    if (!latestHandoff?.lifecycleSnapshot.length) {
      return lifecycle;
    }

    const snapshotByKey = new Map(latestHandoff.lifecycleSnapshot.map((step) => [step.key, step]));
    return lifecycle.map((step) => {
      const snapshot = snapshotByKey.get(step.key);
      if (!snapshot) {
        return step;
      }
      if (snapshot.status !== 'completed' && step.status === 'completed') {
        return step;
      }

      const nextStep = {
        ...step,
        status: snapshot.status,
        evidenceLabel: snapshot.evidenceLabel || step.evidenceLabel,
        evidencePath: snapshot.evidencePath ?? step.evidencePath,
        note: snapshot.note || step.note,
      };
      const blockingReasons = snapshot.status === 'completed' ? undefined : snapshot.blockingReasons ?? step.blockingReasons;
      return blockingReasons ? { ...nextStep, blockingReasons } : nextStep;
    });
  }

  private normalizeQuoteDmsExecutionEvidenceSteps(
    steps: CrmQuoteDmsDocumentExecutionEvidenceStep[],
  ): CrmQuoteDmsDocumentExecutionEvidenceStep[] {
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new BadRequestException('DMS 견적 execution evidence step은 1개 이상이어야 합니다.');
    }

    const normalized = steps.map((step) => {
      const key = step.key;
      if (!CRM_QUOTE_DMS_EXECUTION_STEP_KEYS.includes(key)) {
        throw new BadRequestException(`지원하지 않는 견적 DMS lifecycle step입니다: ${key}`);
      }
      const evidencePath = step.evidencePath?.trim();
      if (!evidencePath) {
        throw new BadRequestException(`${key} evidencePath는 필수입니다.`);
      }

      return {
        key,
        evidencePath,
        ...(step.evidenceLabel?.trim() ? { evidenceLabel: step.evidenceLabel.trim() } : {}),
        ...(step.note?.trim() ? { note: step.note.trim() } : {}),
      };
    });

    const seen = new Set<CrmQuoteDmsDocumentExecutionStepKey>();
    return normalized.filter((step) => {
      if (seen.has(step.key)) {
        return false;
      }
      seen.add(step.key);
      return true;
    });
  }

  private mergeQuoteDmsExecutionLifecycleEvidence(
    lifecycle: CrmQuoteDmsDocumentLifecycleStep[],
    evidenceSteps: CrmQuoteDmsDocumentExecutionEvidenceStep[],
  ): CrmQuoteDmsDocumentLifecycleStep[] {
    const draftStep = lifecycle.find((step) => step.key === 'markdown-draft');
    if (!draftStep || draftStep.status !== 'completed') {
      throw new BadRequestException('CRM markdown 초안 저장 완료 handoff가 있어야 DMS execution evidence를 기록할 수 있습니다.');
    }

    const lifecycleByKey = new Map(lifecycle.map((step) => [step.key, step]));
    for (const evidenceStep of evidenceSteps) {
      const existingStep = lifecycleByKey.get(evidenceStep.key);
      if (!existingStep) {
        throw new BadRequestException(`DMS lifecycle snapshot에 ${evidenceStep.key} 단계가 없습니다.`);
      }
      if (existingStep.status === 'blocked') {
        throw new BadRequestException(`${existingStep.label} 단계가 차단 상태라 evidence를 기록할 수 없습니다.`);
      }
    }

    const evidenceByKey = new Map(evidenceSteps.map((step) => [step.key, step]));
    return lifecycle.map((step) => {
      const evidenceStep = evidenceByKey.get(step.key as CrmQuoteDmsDocumentExecutionStepKey);
      if (!evidenceStep) {
        return step;
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { blockingReasons: _blockingReasons, ...stepWithoutBlockingReasons } = step;
      return {
        ...stepWithoutBlockingReasons,
        status: 'completed',
        evidencePath: evidenceStep.evidencePath,
        evidenceLabel: evidenceStep.evidenceLabel ?? step.evidenceLabel,
        note: evidenceStep.note ?? `${step.label} evidence를 DMS에서 수신했습니다.`,
      };
    });
  }

  private toQuoteDmsDocumentVariables(
    opportunity: CrmOpportunity,
    quoteNumber: string,
    sellerProfile: CrmQuoteSellerProfile | null | undefined,
    sellerName: string,
    ownerContact: QuoteOwnerContactResolution,
  ): CrmQuoteDmsDocumentVariable[] {
    return [
      this.toQuoteDmsVariable('quoteNumber', '견적번호', quoteNumber, true, 'quote-workflow'),
      this.toQuoteDmsVariable('customerName', '고객사', opportunity.customerName, true, 'opportunity'),
      this.toQuoteDmsVariable('clientContactName', '고객 담당자', opportunity.clientContactName, false, 'opportunity'),
      this.toQuoteDmsVariable('opportunityName', '건명', opportunity.opportunityName, true, 'opportunity'),
      this.toQuoteDmsVariable('ownerName', '영업 담당자', opportunity.ownerName, true, 'opportunity'),
      this.toQuoteDmsVariable('ownerDepartment', '담당 부서', ownerContact.profile?.departmentName, false, 'owner-profile'),
      this.toQuoteDmsVariable('ownerPhone', '담당 전화', ownerContact.profile?.phone, false, 'owner-profile'),
      this.toQuoteDmsVariable('ownerEmail', '담당 이메일', ownerContact.profile?.email, false, 'owner-profile'),
      this.toQuoteDmsVariable('issuedAt', '발행일', opportunity.quoteIssuedAt?.slice(0, 10), true, 'quote-workflow'),
      this.toQuoteDmsVariable('validUntil', '유효기한', opportunity.quoteValidUntil, true, 'quote-workflow'),
      this.toQuoteDmsVariable('paymentTermCode', '수금조건', opportunity.paymentTermCode, false, 'quote-workflow'),
      this.toQuoteDmsVariable('quoteTotal', '견적 금액', this.formatWonForDocument(opportunity.revenueTotal), true, 'opportunity'),
      this.toQuoteDmsVariable('vatNotice', '부가세', 'VAT 별도', true, 'quote-workflow'),
      this.toQuoteDmsVariable('sellerCompanyName', '공급자 회사명', sellerName, true, 'seller-profile'),
      this.toQuoteDmsVariable('sellerBusinessRegistrationNo', '공급자 사업자등록번호', sellerProfile?.businessRegistrationNo, true, 'seller-profile'),
      this.toQuoteDmsVariable('sellerCeoName', '공급자 대표자', sellerProfile?.ceoName, true, 'seller-profile'),
      this.toQuoteDmsVariable('sellerAddress', '공급자 주소', sellerProfile?.address, true, 'seller-profile'),
      this.toQuoteDmsVariable('sellerTel', '공급자 전화번호', sellerProfile?.tel, false, 'seller-profile'),
      this.toQuoteDmsVariable('sellerEmail', '공급자 이메일', sellerProfile?.email, false, 'seller-profile'),
      this.toQuoteDmsVariable('dmsBoundary', 'DMS 경계', CRM_QUOTE_DMS_BOUNDARY_NOTICE, true, 'dms-boundary'),
    ];
  }

  private toQuoteDmsDocumentDraftMarkdown(
    preview: CrmOpportunityQuotePreview,
    memo?: string,
  ): string {
    const lines = [
      `# ${this.escapeMarkdownText(preview.dmsDocument.documentTitle)}`,
      '',
      '> CRM 영업기회 원장에서 생성한 DMS markdown 견적 초안입니다. Word/PDF export와 문서 lifecycle은 DMS에서 이어서 처리합니다.',
      '',
      '## 견적 요약',
      '',
      '| 항목 | 값 |',
      '|---|---|',
      `| 견적번호 | ${this.escapeMarkdownTableCell(preview.workflow.quoteNumber)} |`,
      `| 고객사 | ${this.escapeMarkdownTableCell(preview.party.customerName)} |`,
      `| 고객 담당자 | ${this.escapeMarkdownTableCell(preview.party.clientContactName ?? '-')} |`,
      `| 공급자 | ${this.escapeMarkdownTableCell(preview.party.sellerName)} |`,
      `| 영업 담당자 | ${this.escapeMarkdownTableCell(preview.party.ownerName)} |`,
      `| 발행일 | ${this.escapeMarkdownTableCell(preview.workflow.issuedAt.slice(0, 10))} |`,
      `| 유효기한 | ${this.escapeMarkdownTableCell(preview.workflow.validUntil)} |`,
      `| 수금조건 | ${this.escapeMarkdownTableCell(preview.workflow.paymentTermLabel)} |`,
      `| 견적 금액 | ${this.escapeMarkdownTableCell(this.formatWonForDocument(preview.summary.quoteTotal))} |`,
      `| VAT | ${this.escapeMarkdownTableCell(preview.summary.vatNotice)} |`,
      '',
      '## 공급자 정보',
      '',
      '| 항목 | 값 |',
      '|---|---|',
      `| 회사명 | ${this.escapeMarkdownTableCell(preview.party.sellerName)} |`,
      `| 사업자등록번호 | ${this.escapeMarkdownTableCell(preview.party.sellerProfile?.businessRegistrationNo ?? '-')} |`,
      `| 대표자 | ${this.escapeMarkdownTableCell(preview.party.sellerProfile?.ceoName ?? '-')} |`,
      `| 주소 | ${this.escapeMarkdownTableCell(preview.party.sellerProfile?.address ?? '-')} |`,
      `| 전화 | ${this.escapeMarkdownTableCell(preview.party.sellerProfile?.tel ?? '-')} |`,
      `| 이메일 | ${this.escapeMarkdownTableCell(preview.party.sellerProfile?.email ?? '-')} |`,
      '',
      '## 상품 공급 내역',
      '',
      '| 항목 | 수량 | 단가 | 금액 |',
      '|---|---:|---:|---:|',
      ...this.toQuoteMarkdownLineRows(preview.productLines),
      '',
      '## 용역 제공 내역',
      '',
      '| 항목 | 수량/M-M | 단가 | 금액 |',
      '|---|---:|---:|---:|',
      ...this.toQuoteMarkdownLineRows(preview.serviceLines),
      '',
      '## 문서 변수',
      '',
      '| Key | 라벨 | 값 | 출처 | 필수 |',
      '|---|---|---|---|---|',
      ...preview.dmsDocument.variables.map((variable) => (
        `| ${this.escapeMarkdownTableCell(variable.key)} | ${this.escapeMarkdownTableCell(variable.label)} | ${this.escapeMarkdownTableCell(variable.value)} | ${this.escapeMarkdownTableCell(variable.source)} | ${variable.required ? 'Y' : 'N'} |`
      )),
      '',
      '## DMS 견적 lifecycle',
      '',
      '| 단계 | 소유 | 상태 | 증거 | 비고 |',
      '|---|---|---|---|---|',
      ...preview.dmsDocument.lifecycle.map((step) => (
        `| ${this.escapeMarkdownTableCell(step.label)} | ${this.escapeMarkdownTableCell(step.owner)} | ${this.escapeMarkdownTableCell(step.status)} | ${this.escapeMarkdownTableCell(step.evidencePath ?? step.evidenceLabel)} | ${this.escapeMarkdownTableCell(step.note)} |`
      )),
      '',
      '## CRM-DMS 경계',
      '',
      this.escapeMarkdownText(CRM_QUOTE_DMS_BOUNDARY_NOTICE),
      '',
      memo?.trim() ? '## 저장 메모' : '',
      memo?.trim() ? '' : '',
      memo?.trim() ? this.escapeMarkdownText(memo.trim().slice(0, 1000)) : '',
    ];

    return `${lines.filter((line, index, source) => line || source[index - 1] || source[index + 1]).join('\n')}\n`;
  }

  private toQuoteMarkdownLineRows(lines: Array<{ label: string; quantity?: number; unitPrice?: number; amount: number }>): string[] {
    if (lines.length === 0) {
      return ['| - | - | - | - |'];
    }

    return lines.map((line) => (
      `| ${this.escapeMarkdownTableCell(line.label)} | ${this.escapeMarkdownTableCell(line.quantity === undefined ? '-' : String(line.quantity))} | ${this.escapeMarkdownTableCell(line.unitPrice === undefined ? '-' : this.formatWonForDocument(line.unitPrice))} | ${this.escapeMarkdownTableCell(this.formatWonForDocument(line.amount))} |`
    ));
  }

  private toQuoteDmsDocumentHandoff(row: CrmQuoteDmsHandoffLedgerRow): CrmQuoteDmsDocumentHandoff {
    const documentSnapshot = this.fromJson<Omit<CrmQuoteDmsDocumentPreview, 'latestHandoff'>>(
      row.documentSnapshot,
      {
        opportunityId: row.opportunityCode,
        opportunityCode: row.opportunityCode,
        quoteNumber: row.quoteNumber,
        customerName: '',
        opportunityName: '',
        ownerName: '',
        documentType: 'quote',
        documentTitle: row.documentTitle,
        templateKey: row.templateKey,
        templateEvidence: this.toUnavailableQuoteDmsTemplateEvidence(row.templateKey),
        templateOptions: [],
        folderHint: row.folderHint,
        fileNameHint: row.fileNameHint,
        draftPathHint: row.draftPath,
        savedDraftPath: row.draftPath,
        readOnly: true,
        readiness: 'ready',
        blockedReasons: [],
        dmsLinkStatus: 'draft-created',
        sellerName: '',
        sellerInfoStatus: 'not-configured',
        variables: [],
        lifecycle: this.toFallbackQuoteDmsHandoffLifecycle(row.draftPath),
        boundaryNotice: CRM_QUOTE_DMS_BOUNDARY_NOTICE,
        unavailableActions: QUOTE_UNAVAILABLE_ACTIONS,
        nextAction: 'DMS에서 견적서 Word/PDF export를 이어서 처리합니다.',
      },
    );
    const variablesSnapshot = this.fromJson<CrmQuoteDmsDocumentVariable[]>(row.variablesSnapshot, []);
    const lifecycleSnapshot = Array.isArray(documentSnapshot.lifecycle)
      ? documentSnapshot.lifecycle
      : this.toFallbackQuoteDmsHandoffLifecycle(row.draftPath);

    return {
      id: row.id.toString(),
      opportunityId: row.opportunityId.toString(),
      opportunityCode: row.opportunityCode,
      quoteNumber: row.quoteNumber,
      status: this.toQuoteDmsDocumentHandoffStatus(row.statusCode),
      documentTitle: row.documentTitle,
      documentType: row.documentTypeCode === 'quote' ? 'quote' : 'quote',
      templateKey: row.templateKey,
      folderHint: row.folderHint,
      fileNameHint: row.fileNameHint,
      draftPath: row.draftPath,
      savedAt: row.savedAt.toISOString(),
      savedBy: row.savedBy?.toString(),
      memo: row.memo ?? undefined,
      documentSnapshot,
      variablesSnapshot,
      lifecycleSnapshot,
      boundaryNotice: CRM_QUOTE_DMS_BOUNDARY_NOTICE,
      nextAction: 'DMS에서 견적서 Word/PDF export를 이어서 처리합니다.',
    };
  }

  private toQuoteDmsDocumentHandoffSummary(handoff: CrmQuoteDmsDocumentHandoff): CrmQuoteDmsDocumentHandoffSummary {
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

  private toQuoteDmsDocumentHandoffStatus(value: string): CrmQuoteDmsDocumentHandoffStatus {
    if (value === 'replaced') {
      return 'replaced';
    }
    if (value === 'execution-evidence-updated') {
      return 'execution-evidence-updated';
    }
    return 'draft-created';
  }

  private toFallbackQuoteDmsHandoffLifecycle(draftPath: string): CrmQuoteDmsDocumentLifecycleStep[] {
    return [
      {
        key: 'markdown-draft',
        label: 'CRM markdown 초안',
        owner: 'crm',
        status: 'completed',
        evidenceLabel: 'CRM quote markdown draft handoff',
        evidencePath: draftPath,
        note: 'CRM이 DMS markdown 초안 handoff snapshot을 남겼습니다.',
      },
      {
        key: 'template-review',
        label: 'DMS 템플릿 검토',
        owner: 'dms',
        status: 'pending',
        evidenceLabel: 'DMS quote template review evidence',
        note: 'DMS 견적 템플릿 검토 evidence 수신 대기 중입니다.',
      },
      {
        key: 'word-export',
        label: 'Word 견적서 산출',
        owner: 'dms',
        status: 'pending',
        evidenceLabel: 'DMS quote DOCX artifact',
        note: 'DMS Word artifact evidence 수신 대기 중입니다.',
      },
      {
        key: 'pdf-export',
        label: 'PDF 견적서 저장',
        owner: 'dms',
        status: 'pending',
        evidenceLabel: 'DMS quote PDF artifact',
        note: 'DMS PDF artifact evidence 수신 대기 중입니다.',
      },
    ];
  }

  private toQuoteDmsDocumentSnapshot(preview: CrmQuoteDmsDocumentPreview): Omit<CrmQuoteDmsDocumentPreview, 'latestHandoff'> {
    const snapshot = { ...preview };
    delete (snapshot as Partial<CrmQuoteDmsDocumentPreview>).latestHandoff;
    return snapshot as Omit<CrmQuoteDmsDocumentPreview, 'latestHandoff'>;
  }

  private toQuoteDmsDraftPath(preview: CrmQuoteDmsDocumentPreview): string {
    return this.toQuoteDmsDraftPathFromParts(preview.customerName, preview.quoteNumber, preview.opportunityName);
  }

  private toQuoteDmsDraftPathFromParts(customerName: string, quoteNumber: string, opportunityName: string): string {
    return [
      'CRM',
      this.toFileHintPart(customerName),
      'quotes',
      quoteNumber,
      `${quoteNumber}_${this.toFileHintPart(opportunityName)}_quote-draft.md`,
    ].join('/');
  }

  private toQuoteDmsVariable(
    key: string,
    label: string,
    value: string | number | null | undefined,
    required: boolean,
    source: CrmQuoteDmsDocumentVariable['source'],
  ): CrmQuoteDmsDocumentVariable {
    const normalized = String(value ?? '').trim();
    return {
      key,
      label,
      value: normalized || '-',
      required,
      source,
    };
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

  private escapeMarkdownText(value: string): string {
    return value.replace(/\r\n/g, '\n').trim();
  }

  private escapeMarkdownTableCell(value: string): string {
    return this.escapeMarkdownText(value).replace(/\|/g, '\\|').replace(/\n+/g, '<br />') || '-';
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

  private async loadQuoteOwnerContact(
    ownerUserId?: string,
    currentUser?: TokenPayload,
  ): Promise<QuoteOwnerContactResolution> {
    const normalizedOwnerUserId = this.normalizeOptionalUserId(ownerUserId, '담당자 사용자 ID');
    if (normalizedOwnerUserId) {
      if (!this.userService) {
        return {
          status: 'opportunity-owner-profile-missing',
          profile: null,
        };
      }

      const profile = await this.findQuoteOwnerContactProfile(
        normalizedOwnerUserId,
        `opportunity owner user ${normalizedOwnerUserId.toString()}`,
      );
      return {
        status: profile ? 'opportunity-owner-profile' : 'opportunity-owner-profile-missing',
        profile,
      };
    }

    if (!currentUser || !this.userService) {
      return {
        status: 'session-user-profile-missing',
        profile: null,
      };
    }

    const profile = await this.findQuoteOwnerContactProfile(
      BigInt(currentUser.userId),
      `session user ${currentUser.userId}`,
      currentUser,
    );
    return {
      status: profile ? 'session-user-profile' : 'session-user-profile-missing',
      profile,
    };
  }

  private async findQuoteOwnerContactProfile(
    userId: bigint,
    warnContext: string,
    fallbackUser?: TokenPayload,
  ): Promise<CrmQuoteOwnerContactProfile | null> {
    if (!this.userService) {
      return null;
    }

    const profile = await this.userService.findProfileById(userId).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`CRM quote owner profile lookup failed for ${warnContext}: ${message}`);
      return null;
    });
    if (!profile) {
      return null;
    }

    const displayName = profile.displayName?.trim()
      || profile.userName?.trim()
      || fallbackUser?.userName?.trim()
      || fallbackUser?.loginId
      || profile.loginId;
    const ownerContact: CrmQuoteOwnerContactProfile = {
      userId: profile.id.toString(),
      displayName,
    };
    const departmentName = profile.departmentCode?.trim();
    const phone = profile.phone?.trim();
    const email = profile.email?.trim();
    if (departmentName) {
      ownerContact.departmentName = departmentName;
    }
    if (phone) {
      ownerContact.phone = phone;
    }
    if (email) {
      ownerContact.email = email;
    }
    return ownerContact;
  }

  private toLineContract(line: CrmOpportunityLineLedgerRow): CrmOpportunityLine {
    const quantity = this.toOptionalNumber(line.quantity);
    const marginRate = this.toOptionalNumber(line.marginRate);
    return {
      id: line.lineCode,
      category: this.toLineCategory(line.categoryCode),
      label: line.lineLabel,
      quantity,
      unitPrice: this.toOptionalBigIntNumber(line.unitPrice),
      amount: Number(line.amount),
      marginRate,
      truncUnit: this.toOptionalBigIntNumber(line.truncUnit),
      department: line.department ?? undefined,
      memberName: line.memberName ?? undefined,
      grade: line.grade ?? undefined,
      serviceType: this.toServiceType(line.serviceTypeCode),
      revenueLinked: line.revenueLinked,
      linkedCostLineId: line.linkedCostLineCode ?? undefined,
      revenueUnitPrice: this.toOptionalBigIntNumber(line.revenueUnitPrice),
    };
  }

  private toDateString(value: Date | null): string {
    return value ? value.toISOString().slice(0, 10) : '';
  }

  private async formatPaymentTerm(value: string | undefined): Promise<string> {
    if (!value) return '-';
    // Historical selections still need their name after a code is deactivated.
    const codes = await this.codeService?.findByGroup('payment_term');
    return codes?.find((code) => code.codeValue === value)?.displayNameKo
      || PAYMENT_TERM_LABELS[value] || value;
  }

  private toRegion(value: string): CrmOpportunity['region'] {
    return value === 'unspecified' ? 'unspecified' : value === 'overseas' ? 'overseas' : 'domestic';
  }

  private toStatus(value: string): CrmOpportunityStatus {
    return STATUSES.includes(value as CrmOpportunityStatus) ? value as CrmOpportunityStatus : 'draft';
  }

  private toPriority(value: string): CrmOpportunityPriority {
    if (value === 'high' || value === 'low') {
      return value;
    }

    return 'medium';
  }

  private toDiscountType(value: string): CrmOpportunityDiscountType {
    return value === 'rate' ? 'rate' : 'amount';
  }

  private toQuoteWorkflowStatus(value: string | undefined): CrmQuoteWorkflowStatus {
    return value && QUOTE_WORKFLOW_STATUSES.includes(value as CrmQuoteWorkflowStatus)
      ? value as CrmQuoteWorkflowStatus
      : 'draft';
  }

  private toHistoryEventType(value: string): CrmOpportunityHistoryEventType {
    if (value === 'C') {
      return 'create';
    }
    if (value === 'D') {
      return 'delete';
    }

    return 'update';
  }

  private toIntegrationStatus(value: string): CrmIntegrationStatus {
    if (value === 'not-implemented' || value === 'draft-created') {
      return value;
    }
    return 'planned';
  }

  private toAdminBoundary(value: string): CrmAdminBoundary {
    return value === 'shared-admin' ? 'shared-admin' : 'shared-admin';
  }

  private toLineCategory(value: string): CrmOpportunityLine['category'] {
    if (value === 'product' || value === 'internal-cost' || value === 'external-cost') {
      return value;
    }

    return 'service';
  }

  private toServiceType(value: string | null): CrmOpportunityServiceType | undefined {
    if (value === 'internal' || value === 'external') {
      return value;
    }

    return undefined;
  }

  private normalizeUpsertPayload(dto: CrmOpportunityUpsertRequest): NormalizedOpportunityPayload {
    const revenueLines = this.normalizeLines(dto.revenueLines ?? [], 'revenue');
    const costLines = this.normalizeLines(dto.costLines ?? [], 'cost');
    const expectedStartDate = this.normalizeDate(dto.expectedStartDate, '예상 시작일');
    const expectedEndDate = this.normalizeDate(dto.expectedEndDate, '예상 종료일');
    const revenueSubtotal = revenueLines.reduce((sum, line) => sum + line.amount, 0n);
    const specialDiscountTypeCode = this.normalizeDiscountType(dto.specialDiscountType);
    const specialDiscountValue = this.normalizeDiscountValue(dto.specialDiscountValue, specialDiscountTypeCode);
    const specialDiscountAmount = this.calculateSpecialDiscountAmount(
      revenueSubtotal,
      specialDiscountTypeCode,
      specialDiscountValue,
    );
    const revenueTotal = revenueSubtotal - specialDiscountAmount;

    if (expectedStartDate && expectedEndDate && expectedEndDate < expectedStartDate) {
      throw new BadRequestException('예상 종료일은 예상 시작일보다 빠를 수 없습니다.');
    }

    return {
      customerName: this.requiredText(dto.customerName, '고객사명', 200),
      opportunityName: this.requiredText(dto.opportunityName, '영업기회명', 300),
      ownerName: this.requiredText(dto.ownerName, '담당자명', 100),
      ownerUserId: this.normalizeOptionalUserId(dto.ownerUserId, '담당자 사용자 ID'),
      businessType: this.requiredText(dto.businessType, '사업구분', 120),
      industryLine: this.optionalText(dto.industryLine, 120) ?? '',
      regionCode: this.toRegion(dto.region),
      statusCode: this.toStatus(dto.status),
      priorityCode: this.toPriority(dto.priority),
      expectedStartDate,
      expectedEndDate,
      clientContactName: this.optionalText(dto.clientContactName, 120),
      paymentTermCode: this.optionalText(dto.paymentTermCode, 80),
      revenueSubtotal,
      specialDiscountTypeCode,
      specialDiscountValue,
      specialDiscountAmount,
      nextAction: this.optionalText(dto.nextAction, 1000) ?? '',
      revenueLines,
      costLines,
      revenueTotal,
      costTotal: costLines.reduce((sum, line) => sum + line.amount, 0n),
    };
  }

  private normalizeLines(
    lines: CrmOpportunityUpsertRequest['revenueLines'],
    lineKind: 'revenue' | 'cost',
  ): NormalizedOpportunityLine[] {
    return lines
      .map((line): NormalizedOpportunityLine => {
        const quantity = this.normalizeOptionalNumber(line.quantity, '수량');
        const unitPrice = this.normalizeOptionalBigInt(line.unitPrice, '단가');
        const truncUnit = this.normalizeOptionalBigInt(line.truncUnit, '절사 단위');
        const amount = this.resolveLineAmount({
          quantity,
          unitPrice,
          truncUnit,
          fallbackAmount: line.amount,
        });

        return {
          clientLineId: this.optionalText(line.id, 80),
          category: this.normalizeLineCategory(line.category, lineKind),
          label: this.requiredText(line.label, '라인명', 300),
          quantity,
          unitPrice,
          amount,
          marginRate: this.normalizeOptionalNumber(line.marginRate, '이익률', -999, 999),
          truncUnit,
          department: this.optionalText(line.department, 120),
          memberName: this.optionalText(line.memberName, 120),
          grade: this.optionalText(line.grade, 80),
          serviceTypeCode: this.normalizeServiceType(line.serviceType, line.category),
          revenueLinked: line.revenueLinked === true,
          linkedCostLineCode: this.optionalText(line.linkedCostLineId, 80),
          revenueUnitPrice: this.normalizeOptionalBigInt(line.revenueUnitPrice, '매출 연동 단가'),
        };
      })
      .filter((line) => line.label.length > 0 || line.amount > 0n);
  }

  private normalizeLineCategory(
    value: CrmOpportunityLine['category'],
    lineKind: 'revenue' | 'cost',
  ): CrmOpportunityLine['category'] {
    if (lineKind === 'revenue') {
      return value === 'product' ? 'product' : 'service';
    }

    if (value === 'product' || value === 'internal-cost' || value === 'external-cost') {
      return value;
    }

    return 'internal-cost';
  }

  private normalizeAmount(value: number | undefined): bigint {
    const normalized = value ?? 0;
    if (!Number.isFinite(normalized) || normalized < 0 || normalized > Number.MAX_SAFE_INTEGER) {
      throw new BadRequestException('금액은 0 이상의 안전한 정수 범위여야 합니다.');
    }

    return BigInt(Math.round(normalized));
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

  private normalizeOptionalUserId(value: string | undefined, label: string): bigint | null {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) {
      return null;
    }

    if (!/^\d+$/.test(trimmed)) {
      throw new BadRequestException(`${label}는 양의 정수 문자열이어야 합니다.`);
    }

    const id = BigInt(trimmed);
    if (id <= 0n) {
      throw new BadRequestException(`${label}는 1 이상이어야 합니다.`);
    }

    return id;
  }

  private normalizeLookupLimit(limit: unknown): number {
    const numericLimit = Number(limit);
    if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
      return 20;
    }

    return Math.min(Math.trunc(numericLimit), 50);
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
      // Quantity is normalized to hundredths before this calculation. Truncate
      // the exact product before rounding so 999.9 never becomes a 1,000 block.
      const scaledAmount = BigInt(Math.round(quantity * 100)) * unitPrice;
      if (truncUnit && truncUnit > 0n) {
        return scaledAmount / (100n * truncUnit) * truncUnit;
      }
      return (scaledAmount + 50n) / 100n;
    }

    return this.normalizeAmount(fallbackAmount);
  }

  private optionalText(value: string | undefined, maxLength: number): string | null {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) {
      return null;
    }

    if (trimmed.length > maxLength) {
      throw new BadRequestException(`라인 보조 정보는 ${maxLength}자 이하여야 합니다.`);
    }

    return trimmed;
  }

  private normalizeServiceType(
    value: CrmOpportunityServiceType | undefined,
    category: CrmOpportunityLine['category'],
  ): CrmOpportunityServiceType | null {
    if (value === 'internal' || value === 'external') {
      return value;
    }

    if (category === 'service' || category === 'internal-cost') {
      return 'internal';
    }

    if (category === 'external-cost') {
      return 'external';
    }

    return null;
  }

  private toOptionalNumber(value: DecimalLike | number | string | null | undefined): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private toOptionalBigIntNumber(value: bigint | null | undefined): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    return Number(value);
  }

  private normalizeDate(value: string | undefined, fieldName: string): Date | null {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      throw new BadRequestException(`${fieldName}은 YYYY-MM-DD 형식이어야 합니다.`);
    }

    const date = new Date(`${normalized}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName}이 올바른 날짜가 아닙니다.`);
    }

    return date;
  }

  private requiredText(value: string | undefined, fieldName: string, maxLength: number): string {
    const normalized = value?.trim() ?? '';
    if (!normalized) {
      throw new BadRequestException(`${fieldName}은 필수입니다.`);
    }

    if (normalized.length > maxLength) {
      throw new BadRequestException(`${fieldName}은 ${maxLength}자 이하여야 합니다.`);
    }

    return normalized;
  }

  private createOpportunityCode(): string {
    return `crm-opp-${randomUUID().slice(0, 8)}`;
  }

  private createOpportunityVersionCode(opportunityGroupCode: string, versionNo: number): string {
    const suffix = `-v${versionNo}`;
    const maxBaseLength = 80 - suffix.length;
    const base = opportunityGroupCode.length > maxBaseLength
      ? opportunityGroupCode.slice(0, maxBaseLength)
      : opportunityGroupCode;
    return `${base}${suffix}`;
  }

  private async queueOpportunityAiIndexJob(
    opportunityId: bigint,
    jobType: AiIndexJobType,
    reasonCode: string,
  ): Promise<CrmAiIndexQueueResult> {
    if (!this.aiIndexingService) {
      return { status: 'skipped' };
    }

    try {
      const payload = {
        source: 'crm.opportunity',
        reasonCode,
      } satisfies AiIndexJsonObject;

      await this.aiIndexingService.queueJob({
        sourceApp: 'crm',
        entityType: 'opportunity',
        entityId: opportunityId.toString(),
        jobType,
        priority: jobType === 'delete' ? 10 : 20,
        payload,
      });
      return { status: 'queued' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `CRM opportunity AI index job queue failed (${opportunityId.toString()}, ${reasonCode}): ${errorMessage}`,
      );
      return {
        status: 'failed',
        errorMessage,
      };
    }
  }

  private normalizeQuery(query: CrmOpportunityListQuery): Required<Omit<CrmOpportunityListQuery, 'view'>> {
    const status = query.status && STATUSES.includes(query.status as CrmOpportunityStatus) ? query.status : 'all';
    const sourceStatus = query.sourceStatus && SOURCE_STATUSES.includes(query.sourceStatus as CrmSourceOpportunityStatus)
      ? query.sourceStatus
      : 'all';
    const sort = query.sort && SORTS.includes(query.sort) ? query.sort : DEFAULT_SORT;
    return { search: query.view === 'source-list' ? query.search ?? '' : query.search?.trim() ?? '', status, sourceStatus, sort };
  }

  private toSourceOpportunityStatus(status: CrmOpportunityStatus): CrmSourceOpportunityStatus {
    if (status === 'proposal') return '진행중';
    if (status === 'won') return '계약완료';
    if (status === 'lost') return '실패';
    return '검토중';
  }
}
