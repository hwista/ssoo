import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException, Optional, ServiceUnavailableException } from '@nestjs/common';
import type {
  CrmContract,
  CrmContractLine,
  CrmContractPerformanceRow,
  CrmCostPlanAmsExternalMonthlyInput,
  CrmCostPlanAmsExternalMonthlyInputRequest,
  CrmCostPlanAmsExternalMonthlyInputResult,
  CrmCostPlanAmsExternalMonthlyWorkflowResult,
  CrmCostPlanAmsReadiness,
  CrmCostPlanAmsSourceExternalCostRequest,
  CrmCostPlanAmsSourceVendorCreateRequest,
  CrmCostPlanAmsSourceVendorWbsRequest,
  CrmCostPlanAmsSourceWorkspace,
  CrmCostPlanAmsSourceWorkspaceResult,
  CrmCostPlanAmsVendorWbsMapping,
  CrmCostPlanAmsVendorWbsMappingRequest,
  CrmCostPlanAmsVendorWbsMappingResult,
  CrmCostPlanAccountingPaymentExecutionEvidenceRequest,
  CrmCostPlanAccountingPaymentExecutionEvidenceResult,
  CrmCostPlanAccountingPaymentExecutionEvidenceStep,
  CrmCostPlanAccountingPaymentExecutionArtifact,
  CrmCostPlanAccountingPaymentExecutionMode,
  CrmCostPlanAccountingPaymentExecutionRequest,
  CrmCostPlanAccountingPaymentExecutionResult,
  CrmCostPlanAccountingPaymentExecutionStepKey,
  CrmCostPlanAccountingPaymentHandoff,
  CrmCostPlanAccountingPaymentHandoffRequest,
  CrmCostPlanAccountingPaymentHandoffResult,
  CrmCostPlanAccountingPaymentHandoffSummary,
  CrmCostPlanAccountingPaymentLine,
  CrmCostPlanAccountingPaymentPreview,
  CrmCostPlanInternalMonthlyInput,
  CrmCostPlanInternalMonthlyInputRequest,
  CrmCostPlanInternalMonthlyInputResult,
  CrmCostPlanInternalMonthlyWorkflowResult,
  CrmCostPlanInternalSourceGrid,
  CrmCostPlanInternalSourceGridRequest,
  CrmCostPlanInternalSourceGridResult,
  CrmCostPlanInternalSourceItemCode,
  CrmCostPlanPreviewMonth,
  CrmCostPlanPreviewQuery,
  CrmCostPlanPreviewRegion,
  CrmCostPlanPreviewResponse,
  CrmCostPlanPreviewRow,
  CrmCostPlanPreviewSummary,
  CrmOpportunity,
  CrmOpportunityLine,
} from '@ssoo/types/crm';
import { CrmAccessService } from '../access/access.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { DatabaseService } from '../../../database/database.service.js';
import { ContractService } from '../contract/contract.service.js';
import { OpportunityService } from '../opportunity/opportunity.service.js';
import { CrmOperationAttemptService, type CrmOperationRunContext } from '../operations/operation-attempt.service.js';
import { AccountingPaymentExternalExecutorService } from './accounting-payment-external-executor.service.js';

const CRM_COST_PLAN_PREVIEW_BOUNDARY_NOTICE = 'CRM 원가/AMS preview는 영업기회/계약 원가 라인, 확정 계약 외부원가 계획/실적, 내부원가 월별 입력/확정 원장, AMS 업체-WBS 매핑 원장, AMS 외부원가 월별 입력/정산 확정 원장을 조합합니다.';
const CRM_COST_PLAN_INTERNAL_INPUT_BOUNDARY_NOTICE = 'CRM 내부원가 월별 입력은 사업년도/사업구분/계열/담당자/WBS 기준의 계획·실적 금액을 저장하고 확정 상태를 관리합니다. 확정된 입력은 확정 해제 전 직접 수정할 수 없습니다.';
const CRM_COST_PLAN_INTERNAL_CONFIRM_BOUNDARY_NOTICE = 'CRM 내부원가 확정은 저장된 월별 계획·실적 입력을 잠그는 원장 상태입니다. 확정 row는 회계·지급 handoff snapshot 후보가 되지만 회계 전표 발행은 외부 회계 시스템의 후속 경계입니다.';
const CRM_COST_PLAN_INTERNAL_SOURCE_GRID_BOUNDARY_NOTICE = '원본 호환 내부원가는 연도별 인건비·기타·사업부간조정·매출원가용역·사업부공통의 계획/실적 12개월 값을 저장하며, 차이는 원본과 동일하게 계획-실적으로 계산합니다.';
const CRM_COST_PLAN_AMS_MAPPING_BOUNDARY_NOTICE = 'CRM AMS 업체-WBS 매핑은 확정 계약 WBS와 업체 기준만 저장합니다. 업체 마스터/계약 검증 고도화는 별도 후속 slice입니다.';
const CRM_COST_PLAN_AMS_EXTERNAL_INPUT_BOUNDARY_NOTICE = 'CRM AMS 외부원가 월별 입력은 업체-WBS 기준의 12개월 계획·실적 금액을 저장하고 정산 확정 상태를 관리합니다. 확정된 입력은 확정 해제 전 직접 수정할 수 없습니다.';
const CRM_COST_PLAN_AMS_EXTERNAL_CONFIRM_BOUNDARY_NOTICE = 'CRM AMS 외부원가 정산 확정은 저장된 업체-WBS 월별 계획·실적 입력을 잠그는 원장 상태입니다. 확정 row는 회계·지급 handoff snapshot 후보가 되지만 지급 실행은 외부 지급 시스템의 후속 경계입니다.';
const CRM_COST_PLAN_AMS_SOURCE_BOUNDARY_NOTICE = '원본 호환 AMS는 사업년도별 공급업체 마스터, 확정 계약의 복수 WBS 매핑, 업체×WBS별 연간 계획/실적을 관리하며 차이는 실적-계획으로 계산합니다.';
const CRM_COST_PLAN_ACCOUNTING_PAYMENT_BOUNDARY_NOTICE = 'CRM은 확정 내부원가와 AMS 정산 확정 row를 회계·지급 handoff snapshot으로 묶고, 데모 실행기는 전표·지급·외부 sync evidence 패키지를 생성합니다. 실제 ERP/API 반영은 외부 회계·지급 시스템 경계입니다.';
const CRM_COST_PLAN_ACCOUNTING_PAYMENT_EXECUTION_EVIDENCE_BOUNDARY_NOTICE = 'CRM은 외부 회계·지급 시스템 또는 CRM 데모 실행기가 만든 전표·지급 실행 evidence path를 handoff snapshot에 수신해 보존합니다.';
const CRM_COST_PLAN_ACCOUNTING_PAYMENT_EXECUTION_BOUNDARY_NOTICE = 'CRM 데모 실행기는 active 회계·지급 handoff snapshot의 확정 row를 기준으로 전표, 지급 요청, 지급 실행, 외부 sync evidence를 생성합니다. 실제 ERP/API 반영은 외부 회계·지급 시스템에서 수행합니다.';
const CRM_COST_PLAN_ACCOUNTING_PAYMENT_EXTERNAL_API_BOUNDARY_NOTICE = 'CRM은 provider 환경이 설정된 경우에만 active 회계·지급 handoff snapshot을 외부 회계·지급 API로 전송하고, 외부 API가 반환한 전표·지급 evidence를 handoff snapshot에 기록합니다.';
const CRM_COST_PLAN_ACCOUNTING_PAYMENT_UNAVAILABLE_ACTIONS = ['실제 외부 회계시스템 반영'];
const CRM_COST_PLAN_ACCOUNTING_PAYMENT_BLOCKED_REASON = '확정된 내부원가 또는 AMS 정산 확정 row가 필요합니다.';
const CRM_COST_PLAN_UNAVAILABLE_ACTIONS: string[] = [];
const CRM_COST_PLAN_ACCOUNTING_PAYMENT_EXECUTION_STEP_KEYS = new Set<CrmCostPlanAccountingPaymentExecutionStepKey>([
  'accounting-voucher',
  'payment-request',
  'payment-execution',
  'external-system-sync',
]);
const CRM_COST_PLAN_INTERNAL_SOURCE_ITEMS = [
  { code: 'labor', name: '인건비' },
  { code: 'other', name: '기타' },
  { code: 'dept_adj', name: '사업부간조정' },
  { code: 'svc', name: '매출원가용역' },
  { code: 'dept_common', name: '사업부공통' },
] as const satisfies ReadonlyArray<{ code: CrmCostPlanInternalSourceItemCode; name: string }>;

interface NormalizedCostPlanPreviewQuery extends Required<CrmCostPlanPreviewQuery> {}

interface CostPlanGroup {
  key: string;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: CrmCostPlanPreviewRegion;
  wbsCode?: string;
  amsMappingId?: string;
  amsVendorName?: string;
  amsVendorContractNo?: string;
  amsExternalCostInputId?: string;
  amsExternalCostInputStatus?: 'draft' | 'confirmed';
  amsExternalCostConfirmedAt?: string;
  amsReadyCount: number;
  amsBlockedCount: number;
  blockedReasons: Set<string>;
  internalCostInputId?: string;
  internalCostInputStatus?: 'draft' | 'confirmed';
  internalCostConfirmedAt?: string;
  months: Map<number, CrmCostPlanPreviewMonth>;
}

interface CostSplit {
  internalAmount: number;
  externalAmount: number;
}

interface CostLineLike {
  category: CrmOpportunityLine['category'];
  amount: number;
  serviceType?: CrmOpportunityLine['serviceType'];
}

interface CostPlanInternalMonthlyLedgerRow {
  ownerOrganizationId: bigint | null;
  id: bigint;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  regionCode: string;
  wbsCode: string | null;
  monthlyPlanAmounts: unknown;
  monthlyActualAmounts: unknown;
  planAmountTotal: bigint;
  actualAmountTotal: bigint;
  gapAmountTotal: bigint;
  statusCode: string;
  confirmed: boolean;
  confirmedAt: Date | string | null;
  confirmedBy: bigint | null;
  memo: string | null;
  updatedAt: Date | string;
}

interface CostPlanInternalSourceItemLedgerRow {
  id: bigint;
  targetYear: number;
  itemCode: string;
  itemName: string;
  monthlyPlanAmounts: unknown;
  monthlyActualAmounts: unknown;
  planAmountTotal: bigint;
  actualAmountTotal: bigint;
  differenceAmountTotal: bigint;
  updatedAt: Date | string;
}

interface CostPlanAmsVendorWbsMappingLedgerRow {
  ownerOrganizationId: bigint | null;
  id: bigint;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  regionCode: string;
  wbsCode: string;
  vendorName: string;
  vendorContractNo: string | null;
  memo: string | null;
  updatedAt: Date | string;
}

interface CostPlanAmsExternalMonthlyLedgerRow {
  ownerOrganizationId: bigint | null;
  id: bigint;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  regionCode: string;
  wbsCode: string;
  vendorName: string;
  vendorContractNo: string | null;
  monthlyPlanAmounts: unknown;
  monthlyActualAmounts: unknown;
  planAmountTotal: bigint;
  actualAmountTotal: bigint;
  gapAmountTotal: bigint;
  statusCode: string;
  confirmed: boolean;
  confirmedAt: Date | string | null;
  confirmedBy: bigint | null;
  memo: string | null;
  updatedAt: Date | string;
}

interface CostPlanAmsSourceVendorLedgerRow {
  id: bigint;
  targetYear: number;
  vendorName: string;
  sortOrder: number;
  updatedAt: Date | string;
}

interface CostPlanAmsSourceVendorWbsLedgerRow {
  id: bigint;
  vendorId: bigint;
  wbsCode: string;
  contractId: bigint | null;
  sortOrder: number;
}

interface CostPlanAmsSourceExternalLedgerRow {
  id: bigint;
  vendorId: bigint;
  wbsCode: string;
  monthlyPlanAmounts: unknown;
  monthlyActualAmounts: unknown;
  planAmountTotal: bigint;
  actualAmountTotal: bigint;
  differenceAmountTotal: bigint;
  updatedAt: Date | string;
}

interface CostPlanAccountingPaymentHandoffLedgerRow {
  ownerOrganizationId: bigint | null;
  id: bigint | number | string;
  targetYear: number;
  businessTypeFilter: string;
  industryLineFilter: string;
  regionFilter: CrmCostPlanPreviewRegion;
  searchFilter: string;
  statusCode: 'snapshot-created' | 'execution-evidence-updated' | 'replaced';
  lineCount: number | bigint;
  settlementAmountTotal: number | bigint;
  previewSnapshot: unknown;
  linesSnapshot: unknown;
  executionEvidenceSnapshot: unknown;
  executionEvidenceUpdatedAt: Date | string | null;
  memo: string | null;
  savedBy: bigint | number | string | null;
  savedAt: Date | string;
  updatedAt: Date | string;
}

interface RawCostPlanWriter {
  $queryRaw<T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  $executeRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<number>;
}

@Injectable()
export class CostPlanService {
  constructor(
    private readonly opportunityService: OpportunityService,
    private readonly contractService: ContractService,
    @Optional() private readonly db?: DatabaseService,
    @Optional() private readonly externalExecutor?: AccountingPaymentExternalExecutorService,
    @Optional() private readonly operationAttemptService?: CrmOperationAttemptService,
    private readonly crmAccess?: CrmAccessService,
  ) {}

  async getPreview(query: CrmCostPlanPreviewQuery = {}, currentUser?: TokenPayload): Promise<CrmCostPlanPreviewResponse> {
    const organizationId = currentUser ? await this.crmAccess!.resolveReadOrganization(currentUser, query.ownerOrganizationId) : query.ownerOrganizationId ? BigInt(query.ownerOrganizationId) : null;
    if (currentUser) await this.crmAccess!.assertOrganizationCapability(currentUser, 'canReadCostPlan', organizationId);
    const normalized = this.normalizeQuery({ ...query, ownerOrganizationId: organizationId?.toString() });
    const [opportunityResponse, contractResponse, performanceResponse] = await Promise.all([
      this.opportunityService.listResponse({ sort: 'updated-desc' }, currentUser, organizationId ?? undefined),
      this.contractService.listResponse({ sort: 'start-asc' }, currentUser, organizationId ?? undefined),
      this.contractService.getMonthlyPerformance({
        year: normalized.year,
        businessType: normalized.businessType || undefined,
        industryLine: normalized.industryLine || undefined,
        region: normalized.region,
        search: normalized.search || undefined,
      }, currentUser, organizationId ?? undefined),
    ]);
    const [internalMonthlyRows, internalSourceItemRows, amsVendorMappingRows, amsExternalMonthlyRows, amsSourceWorkspace] = await Promise.all([
      this.loadInternalMonthlyRows(normalized),
      this.loadInternalSourceItemRows(normalized.year, organizationId),
      this.loadAmsVendorMappingRows(normalized),
      this.loadAmsExternalMonthlyRows(normalized),
      this.loadAmsSourceWorkspace(normalized.year, contractResponse.items, organizationId),
    ]);
    const opportunities = this.filterOpportunities(opportunityResponse.items, normalized);
    const contracts = this.filterContracts(contractResponse.items, normalized);
    const performanceRows = performanceResponse.items;
    const amsVendorMappingLookup = this.createAmsVendorMappingLookup(amsVendorMappingRows);
    const businessTypeOptions = this.toSortedUniqueOptions([
      ...opportunityResponse.items.map((item) => item.businessType),
      ...contractResponse.items.map((item) => item.businessType),
      ...performanceRows.map((item) => item.businessType),
      ...internalMonthlyRows.map((item) => item.businessType),
      ...amsVendorMappingRows.map((item) => item.businessType),
      ...amsExternalMonthlyRows.map((item) => item.businessType),
    ]);
    const industryLineOptions = this.toSortedUniqueOptions([
      ...opportunityResponse.items.map((item) => item.industryLine),
      ...contractResponse.items.map((item) => item.industryLine),
      ...performanceRows.map((item) => item.industryLine),
      ...internalMonthlyRows.map((item) => item.industryLine),
      ...amsVendorMappingRows.map((item) => item.industryLine),
      ...amsExternalMonthlyRows.map((item) => item.industryLine),
    ]);
    const groups = new Map<string, CostPlanGroup>();

    opportunities.forEach((opportunity) => this.applyOpportunity(groups, opportunity, normalized.year));
    contracts.forEach((contract) => this.applyContract(groups, contract, normalized.year, amsVendorMappingLookup));
    performanceRows.forEach((row) => this.applyPerformanceRow(groups, row));
    internalMonthlyRows.forEach((row) => this.applyInternalMonthlyRow(groups, row));
    amsVendorMappingRows.forEach((row) => this.applyAmsVendorMappingRow(groups, row));
    amsExternalMonthlyRows.forEach((row) => this.applyAmsExternalMonthlyRow(groups, row));

    const rows = [...groups.values()]
      .map((group) => this.toResponseRow(group))
      .filter((row) => (
        row.internalCostCandidateAmount > 0
        || row.externalCostPlanCandidateAmount > 0
        || row.contractExternalActualAmount > 0
        || row.internalCostInputId
        || row.amsMappingId
        || row.amsExternalCostInputId
        || row.amsReadyCount > 0
        || row.amsBlockedCount > 0
      ))
      .sort((left, right) => (
        (right.internalCostCandidateAmount + right.externalCostPlanCandidateAmount)
        - (left.internalCostCandidateAmount + left.externalCostPlanCandidateAmount)
      ));
    const months = Array.from({ length: 12 }, (_, index) => this.sumMonth(rows, index + 1));

    return {
      summary: this.buildSummary(rows, months, normalized, businessTypeOptions, industryLineOptions),
      months,
      rows,
      internalCostSourceGrid: this.toInternalSourceGrid(normalized.year, internalSourceItemRows),
      amsSourceWorkspace,
    };
  }

  async getAccountingPaymentPreview(
    query: CrmCostPlanPreviewQuery = {},
    currentUser?: TokenPayload,
  ): Promise<CrmCostPlanAccountingPaymentPreview> {
    const organizationId = currentUser ? await this.crmAccess!.resolveReadOrganization(currentUser, query.ownerOrganizationId) : null;
    if (currentUser) await this.crmAccess!.assertOrganizationCapability(currentUser, 'canReadCostPlan', organizationId);
    return this.buildAccountingPaymentPreview(this.normalizeQuery({ ...query, ownerOrganizationId: organizationId?.toString() }), currentUser);
  }

  async createAccountingPaymentHandoff(
    request: CrmCostPlanAccountingPaymentHandoffRequest,
    currentUserId?: bigint,
  ): Promise<CrmCostPlanAccountingPaymentHandoffResult> {
    const client = this.db?.client;
    if (!client) {
      throw new ServiceUnavailableException('CRM 회계·지급 handoff 저장 DB 연결이 필요합니다.');
    }

    const { user: currentUser, organizationId } = await this.crmAccess!.resolveWriteOrganization(currentUserId, request.ownerOrganizationId, 'canConfirmCostPlan');
    const normalized = this.normalizeQuery({ ...request, ownerOrganizationId: organizationId.toString() });
    const preview = await this.buildAccountingPaymentPreview(normalized, currentUser);
    if (preview.readiness !== 'ready') {
      throw new BadRequestException(preview.blockedReasons[0] ?? CRM_COST_PLAN_ACCOUNTING_PAYMENT_BLOCKED_REASON);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { latestHandoff: _latestHandoff, ...previewSnapshot } = preview;
    const memo = request.memo?.trim().slice(0, 1000) || undefined;
    const transactionId = randomUUID();
    const rows = await client.$transaction(async (tx: RawCostPlanWriter) => {
      await tx.$executeRaw`
        update crm.crm_cost_plan_accounting_handoff_m
           set status_code = 'replaced',
               is_active = false,
               updated_by = ${currentUserId ?? null},
               updated_at = now(),
               last_source = 'crm.cost-plan',
               last_activity = 'accounting-payment-handoff-replaced',
               transaction_id = ${transactionId}::uuid
         where owner_organization_id is not distinct from ${normalized.ownerOrganizationId ? BigInt(normalized.ownerOrganizationId) : null}
           and target_year = ${normalized.year}
           and business_type_filter = ${normalized.businessType}
           and industry_line_filter = ${normalized.industryLine}
           and region_filter = ${normalized.region}
           and search_filter = ${normalized.search}
           and status_code in ('snapshot-created', 'execution-evidence-updated')
           and is_active = true
      `;

      return tx.$queryRaw<CostPlanAccountingPaymentHandoffLedgerRow[]>`
        insert into crm.crm_cost_plan_accounting_handoff_m (
          owner_organization_id, target_year, business_type_filter, industry_line_filter, region_filter, search_filter,
          status_code, line_count, settlement_amount_total, preview_snapshot, lines_snapshot,
          memo, saved_by, created_by, updated_by, last_source, last_activity, transaction_id
        )
        values (
          ${organizationId}, ${normalized.year}, ${normalized.businessType}, ${normalized.industryLine}, ${normalized.region}, ${normalized.search},
          'snapshot-created', ${preview.lineCount}, ${BigInt(Math.round(preview.settlementAmountTotal))},
          ${JSON.stringify(previewSnapshot)}::jsonb,
          ${JSON.stringify(preview.lines)}::jsonb,
          ${memo ?? null}, ${currentUserId ?? null}, ${currentUserId ?? null}, ${currentUserId ?? null},
          'crm.cost-plan', 'accounting-payment-handoff-create', ${transactionId}::uuid
        )
        returning
          cost_plan_accounting_handoff_id as "id",
             owner_organization_id as "ownerOrganizationId",
          target_year as "targetYear",
          business_type_filter as "businessTypeFilter",
          industry_line_filter as "industryLineFilter",
          region_filter as "regionFilter",
          search_filter as "searchFilter",
          status_code as "statusCode",
          line_count as "lineCount",
          settlement_amount_total as "settlementAmountTotal",
          preview_snapshot as "previewSnapshot",
          lines_snapshot as "linesSnapshot",
          execution_evidence_snapshot as "executionEvidenceSnapshot",
          execution_evidence_updated_at as "executionEvidenceUpdatedAt",
          memo,
          saved_by as "savedBy",
          saved_at as "savedAt",
          updated_at as "updatedAt"
      `;
    });

    const row = rows[0];
    if (!row) {
      throw new ServiceUnavailableException('CRM 회계·지급 handoff 저장 결과를 확인할 수 없습니다.');
    }

    const handoff = this.toAccountingPaymentHandoff(row, previewSnapshot, preview.lines);
    const refreshedPreview: CrmCostPlanAccountingPaymentPreview = {
      ...preview,
      latestHandoff: this.toAccountingPaymentHandoffSummary(row),
    };

    return {
      handoff,
      preview: refreshedPreview,
      boundaryNotice: CRM_COST_PLAN_ACCOUNTING_PAYMENT_BOUNDARY_NOTICE,
      nextAction: handoff.nextAction,
    };
  }

  async executeAccountingPayment(
    handoffId: string,
    request: CrmCostPlanAccountingPaymentExecutionRequest = {},
    currentUserId?: bigint,
    operationContext?: CrmOperationRunContext,
  ): Promise<CrmCostPlanAccountingPaymentExecutionResult> {
    if (!await this.loadActiveAccountingPaymentHandoffById(handoffId, currentUserId)) throw new NotFoundException('활성 CRM 회계·지급 handoff snapshot을 찾을 수 없습니다.');
    if (this.operationAttemptService && currentUserId) {
      return this.operationAttemptService.run({
        target: 'accounting',
        action: 'accounting-payment-execution',
        sourceEntityType: 'crm.cost-plan-accounting-handoff',
        sourceEntityId: handoffId,
        requestedBy: currentUserId,
        fingerprintInput: { handoffId, mode: request.mode ?? 'demo', memo: request.memo ?? null },
        context: operationContext,
        execute: () => this.performAccountingPaymentExecution(handoffId, request, currentUserId),
        evidence: (result) => ({
          handoffId: result.handoffId,
          providerMode: result.externalExecution.providerMode,
          providerName: result.externalExecution.providerName,
          appliedStepKeys: result.appliedStepKeys,
          recordedAt: result.recordedAt,
        }),
      });
    }
    return this.performAccountingPaymentExecution(handoffId, request, currentUserId);
  }

  private async performAccountingPaymentExecution(
    handoffId: string,
    request: CrmCostPlanAccountingPaymentExecutionRequest,
    currentUserId?: bigint,
  ): Promise<CrmCostPlanAccountingPaymentExecutionResult> {
    const existing = await this.loadActiveAccountingPaymentHandoffById(handoffId, currentUserId);
    if (!existing) {
      throw new NotFoundException('활성 CRM 회계·지급 handoff snapshot을 찾을 수 없습니다.');
    }

    const linesSnapshot = this.resolveAccountingPaymentLinesSnapshot(existing.linesSnapshot);
    if (linesSnapshot.length === 0) {
      throw new BadRequestException('회계·지급 실행을 위한 확정 원가 line snapshot이 없습니다.');
    }

    const mode = this.normalizeAccountingPaymentExecutionMode(request.mode);
    if (mode === 'external-api') {
      return this.executeAccountingPaymentThroughExternalApi(existing, linesSnapshot, request, currentUserId);
    }

    const executionId = randomUUID();
    const executedAt = new Date();
    const settlementAmountTotal = this.toNumber(existing.settlementAmountTotal);
    const artifacts = this.buildAccountingPaymentExecutionArtifacts(
      existing,
      executionId,
      settlementAmountTotal,
      executedAt,
    );
    const evidence = await this.recordAccountingPaymentExecutionEvidence(
      handoffId,
      {
        steps: artifacts.map((artifact) => ({
          key: artifact.key,
          evidencePath: artifact.evidencePath,
          evidenceLabel: artifact.label,
          note: this.toAccountingPaymentExecutionNote(artifact, linesSnapshot.length),
        })),
        memo: request.memo?.trim().slice(0, 1000) || 'CRM demo accounting/payment execution',
      },
      currentUserId,
    );

    return {
      ...evidence,
      externalExecution: {
        providerMode: 'demo',
        executedAt: executedAt.toISOString(),
        executionId,
        settlementAmountTotal,
        artifacts,
        boundaryNotice: CRM_COST_PLAN_ACCOUNTING_PAYMENT_EXECUTION_BOUNDARY_NOTICE,
        nextAction: '생성된 전표·지급·sync evidence를 검토하고 실제 ERP/API 반영은 외부 회계·지급 시스템에서 확인하세요.',
      },
    };
  }

  private async executeAccountingPaymentThroughExternalApi(
    existing: CostPlanAccountingPaymentHandoffLedgerRow,
    linesSnapshot: CrmCostPlanAccountingPaymentLine[],
    request: CrmCostPlanAccountingPaymentExecutionRequest,
    currentUserId?: bigint,
  ): Promise<CrmCostPlanAccountingPaymentExecutionResult> {
    if (!this.externalExecutor?.isConfigured()) {
      throw new ServiceUnavailableException('CRM 외부 회계·지급 API provider가 설정되지 않았습니다.');
    }

    const handoffId = this.toIdString(existing.id);
    const executionId = randomUUID();
    const executedAt = new Date().toISOString();
    const settlementAmountTotal = this.toNumber(existing.settlementAmountTotal);
    const externalExecution = await this.externalExecutor.execute({
      handoffId,
      executionId,
      executedAt,
      targetYear: existing.targetYear,
      businessTypeFilter: existing.businessTypeFilter,
      industryLineFilter: existing.industryLineFilter,
      regionFilter: existing.regionFilter,
      searchFilter: existing.searchFilter,
      lineCount: linesSnapshot.length,
      settlementAmountTotal,
      lines: linesSnapshot,
      memo: request.memo?.trim().slice(0, 1000) || undefined,
      requestedBy: currentUserId?.toString(),
    });
    const evidence = await this.recordAccountingPaymentExecutionEvidence(
      handoffId,
      {
        steps: externalExecution.artifacts.map((artifact) => ({
          key: artifact.key,
          evidencePath: artifact.evidencePath,
          evidenceLabel: artifact.label,
          note: `외부 API provider=${externalExecution.providerName}, reference=${artifact.referenceNo}`,
        })),
        memo: request.memo?.trim().slice(0, 1000) || 'External accounting/payment API execution',
      },
      currentUserId,
    );

    return {
      ...evidence,
      externalExecution: {
        providerMode: 'external-api',
        providerName: externalExecution.providerName,
        providerRequestId: externalExecution.providerRequestId,
        executedAt: externalExecution.executedAt,
        executionId: externalExecution.executionId,
        settlementAmountTotal,
        artifacts: externalExecution.artifacts,
        boundaryNotice: CRM_COST_PLAN_ACCOUNTING_PAYMENT_EXTERNAL_API_BOUNDARY_NOTICE,
        nextAction: '외부 회계·지급 API 응답 evidence와 실제 ERP/API 반영 상태를 대조하세요.',
      },
    };
  }

  async recordAccountingPaymentExecutionEvidence(
    handoffId: string,
    request: CrmCostPlanAccountingPaymentExecutionEvidenceRequest,
    currentUserId?: bigint,
  ): Promise<CrmCostPlanAccountingPaymentExecutionEvidenceResult> {
    const client = this.db?.client;
    if (!client) {
      throw new ServiceUnavailableException('CRM 회계·지급 실행 evidence 저장 DB 연결이 필요합니다.');
    }

    const existing = await this.loadActiveAccountingPaymentHandoffById(handoffId, currentUserId);
    if (!existing) {
      throw new NotFoundException('활성 CRM 회계·지급 handoff snapshot을 찾을 수 없습니다.');
    }

    const normalized = this.toAccountingPaymentHandoffQuery(existing);
    const preview = await this.buildAccountingPaymentPreview(normalized);
    const recordedAt = new Date();
    const incomingEvidence = this.normalizeAccountingPaymentExecutionEvidenceSteps(request.steps, recordedAt);
    const executionEvidence = this.mergeAccountingPaymentExecutionEvidence(
      this.resolveAccountingPaymentExecutionEvidence(existing.executionEvidenceSnapshot),
      incomingEvidence,
    );
    const previewSnapshot = this.resolveAccountingPaymentPreviewSnapshot(existing.previewSnapshot);
    const linesSnapshot = this.resolveAccountingPaymentLinesSnapshot(existing.linesSnapshot);
    const memo = request.memo?.trim().slice(0, 1000) || existing.memo || undefined;
    const transactionId = randomUUID();

    const rows = await client.$transaction(async (tx: RawCostPlanWriter) => {
      await tx.$executeRaw`
        update crm.crm_cost_plan_accounting_handoff_m
           set status_code = 'replaced',
               is_active = false,
               updated_by = ${currentUserId ?? null},
               updated_at = now(),
               last_source = 'crm.cost-plan',
               last_activity = 'accounting-payment-execution-evidence-replaced',
               transaction_id = ${transactionId}::uuid
         where cost_plan_accounting_handoff_id = ${this.normalizeLedgerId(handoffId, '회계·지급 handoff')}
           and status_code in ('snapshot-created', 'execution-evidence-updated')
           and is_active = true
      `;

      return tx.$queryRaw<CostPlanAccountingPaymentHandoffLedgerRow[]>`
        insert into crm.crm_cost_plan_accounting_handoff_m (
          owner_organization_id, target_year, business_type_filter, industry_line_filter, region_filter, search_filter,
          status_code, line_count, settlement_amount_total, preview_snapshot, lines_snapshot,
          execution_evidence_snapshot, execution_evidence_updated_at,
          memo, saved_by, created_by, updated_by, last_source, last_activity, transaction_id
        )
        values (
          ${existing.ownerOrganizationId ?? null}, ${existing.targetYear}, ${existing.businessTypeFilter}, ${existing.industryLineFilter}, ${existing.regionFilter}, ${existing.searchFilter},
          'execution-evidence-updated', ${this.toNumber(existing.lineCount)}, ${BigInt(Math.round(this.toNumber(existing.settlementAmountTotal)))},
          ${JSON.stringify(previewSnapshot)}::jsonb,
          ${JSON.stringify(linesSnapshot)}::jsonb,
          ${JSON.stringify(executionEvidence)}::jsonb,
          ${recordedAt},
          ${memo ?? null}, ${currentUserId ?? null}, ${currentUserId ?? null}, ${currentUserId ?? null},
          'crm.cost-plan', 'accounting-payment-execution-evidence-record', ${transactionId}::uuid
        )
        returning
          cost_plan_accounting_handoff_id as "id",
             owner_organization_id as "ownerOrganizationId",
          target_year as "targetYear",
          business_type_filter as "businessTypeFilter",
          industry_line_filter as "industryLineFilter",
          region_filter as "regionFilter",
          search_filter as "searchFilter",
          status_code as "statusCode",
          line_count as "lineCount",
          settlement_amount_total as "settlementAmountTotal",
          preview_snapshot as "previewSnapshot",
          lines_snapshot as "linesSnapshot",
          execution_evidence_snapshot as "executionEvidenceSnapshot",
          execution_evidence_updated_at as "executionEvidenceUpdatedAt",
          memo,
          saved_by as "savedBy",
          saved_at as "savedAt",
          updated_at as "updatedAt"
      `;
    });

    const row = rows[0];
    if (!row) {
      throw new ServiceUnavailableException('CRM 회계·지급 실행 evidence 저장 결과를 확인할 수 없습니다.');
    }

    const handoff = this.toAccountingPaymentHandoff(row, previewSnapshot, linesSnapshot);
    const refreshedPreview: CrmCostPlanAccountingPaymentPreview = {
      ...preview,
      latestHandoff: this.toAccountingPaymentHandoffSummary(row),
    };

    return {
      handoffId: handoff.id,
      appliedStepKeys: incomingEvidence.map((step) => step.key),
      recordedAt: recordedAt.toISOString(),
      handoff,
      preview: refreshedPreview,
      boundaryNotice: CRM_COST_PLAN_ACCOUNTING_PAYMENT_EXECUTION_EVIDENCE_BOUNDARY_NOTICE,
      nextAction: '외부 회계·지급 시스템 evidence를 검토하고 필요한 추가 증빙만 수신하세요.',
    };
  }

  async saveInternalMonthlyInput(
    dto: CrmCostPlanInternalMonthlyInputRequest,
    currentUserId?: bigint,
  ): Promise<CrmCostPlanInternalMonthlyInputResult> {
    const client = this.db?.client;
    if (!client) {
      throw new ServiceUnavailableException('CRM 원가/AMS 저장 DB 연결이 필요합니다.');
    }

    const { organizationId } = await this.crmAccess!.resolveWriteOrganization(currentUserId, dto.ownerOrganizationId, 'canWriteCostPlan');
    const targetYear = this.normalizeInputYear(dto.targetYear);
    const businessType = this.normalizeRequiredText(dto.businessType, '사업구분', 120);
    const industryLine = this.normalizeRequiredText(dto.industryLine, '계열/산업', 120);
    const ownerName = this.normalizeRequiredText(dto.ownerName, '담당자', 100);
    const region = this.normalizeInputRegion(dto.region);
    const wbsCode = dto.wbsCode?.trim().slice(0, 80) ?? '';
    const monthlyPlanAmounts = this.normalizeMonthlyAmounts(dto.monthlyPlanAmounts, '내부원가', '계획');
    const monthlyActualAmounts = this.normalizeMonthlyAmounts(dto.monthlyActualAmounts, '내부원가', '실적');
    const planAmountTotal = monthlyPlanAmounts.reduce((sum, amount) => sum + amount, 0);
    const actualAmountTotal = monthlyActualAmounts.reduce((sum, amount) => sum + amount, 0);
    const gapAmountTotal = actualAmountTotal - planAmountTotal;
    const memo = dto.memo?.trim() || undefined;
    const transactionId = randomUUID();
    const existing = await this.findInternalMonthlyInputByBasis(
      targetYear,
      businessType,
      industryLine,
      ownerName,
      region,
      wbsCode,
      organizationId,
    );
    if (existing?.confirmed) {
      throw new BadRequestException('확정된 내부원가 월별 입력은 확정 해제 후 수정할 수 있습니다.');
    }

    const saved = await client.$transaction(async (tx: RawCostPlanWriter) => {
      await tx.$executeRaw`
        insert into crm.crm_cost_plan_internal_monthly_d (
          owner_organization_id, target_year, business_type, industry_line, owner_name, region_code, wbs_code,
          monthly_plan_amounts, monthly_actual_amounts,
          plan_amount_total, actual_amount_total, gap_amount_total,
          status_code, confirmed, confirmed_at, confirmed_by,
          sort_order, is_active, memo,
          created_by, updated_by, last_source, last_activity, transaction_id
        )
        values (
          ${organizationId}, ${targetYear}, ${businessType}, ${industryLine}, ${ownerName}, ${region}, ${wbsCode},
          ${JSON.stringify(monthlyPlanAmounts)}::jsonb, ${JSON.stringify(monthlyActualAmounts)}::jsonb,
          ${BigInt(planAmountTotal)}, ${BigInt(actualAmountTotal)}, ${BigInt(gapAmountTotal)},
          'draft', false, null, null,
          0, true, ${memo ?? null},
          ${currentUserId ?? null}, ${currentUserId ?? null}, 'crm.cost-plan', 'internal-monthly-input', ${transactionId}::uuid
        )
        on conflict (owner_organization_id, target_year, business_type, industry_line, owner_name, region_code, wbs_code)
        do update
           set monthly_plan_amounts = excluded.monthly_plan_amounts,
               monthly_actual_amounts = excluded.monthly_actual_amounts,
               plan_amount_total = excluded.plan_amount_total,
               actual_amount_total = excluded.actual_amount_total,
               gap_amount_total = excluded.gap_amount_total,
               status_code = 'draft',
               confirmed = false,
               confirmed_at = null,
               confirmed_by = null,
               is_active = true,
               memo = coalesce(excluded.memo, crm.crm_cost_plan_internal_monthly_d.memo),
               updated_by = ${currentUserId ?? null},
               updated_at = now(),
               last_source = 'crm.cost-plan',
               last_activity = 'internal-monthly-input',
               transaction_id = ${transactionId}::uuid
      `;

      const rows = await tx.$queryRaw<CostPlanInternalMonthlyLedgerRow[]>`
        select cost_plan_internal_monthly_id as "id",
             owner_organization_id as "ownerOrganizationId",
               target_year as "targetYear",
               business_type as "businessType",
               industry_line as "industryLine",
               owner_name as "ownerName",
               region_code as "regionCode",
               wbs_code as "wbsCode",
               monthly_plan_amounts as "monthlyPlanAmounts",
               monthly_actual_amounts as "monthlyActualAmounts",
               plan_amount_total as "planAmountTotal",
               actual_amount_total as "actualAmountTotal",
               gap_amount_total as "gapAmountTotal",
               status_code as "statusCode",
               confirmed,
               confirmed_at as "confirmedAt",
               confirmed_by as "confirmedBy",
               memo,
               updated_at as "updatedAt"
          from crm.crm_cost_plan_internal_monthly_d
         where owner_organization_id is not distinct from ${organizationId}
           and target_year = ${targetYear}
           and business_type = ${businessType}
           and industry_line = ${industryLine}
           and owner_name = ${ownerName}
           and region_code = ${region}
           and wbs_code = ${wbsCode}
         limit 1
      `;
      return rows[0];
    });

    if (!saved) {
      throw new ServiceUnavailableException('CRM 내부원가 월별 입력 저장 결과를 확인할 수 없습니다.');
    }

    return {
      input: this.toInternalMonthlyInput(saved),
      boundaryNotice: CRM_COST_PLAN_INTERNAL_INPUT_BOUNDARY_NOTICE,
    };
  }

  async saveInternalSourceGrid(
    dto: CrmCostPlanInternalSourceGridRequest,
    currentUserId?: bigint,
  ): Promise<CrmCostPlanInternalSourceGridResult> {
    const client = this.db?.client;
    if (!client) {
      throw new ServiceUnavailableException('CRM 원본 호환 내부원가 저장 DB 연결이 필요합니다.');
    }

    const { organizationId } = await this.crmAccess!.resolveWriteOrganization(currentUserId, dto.ownerOrganizationId, 'canWriteCostPlan');
    const targetYear = this.normalizeInputYear(dto.targetYear);
    if (!Array.isArray(dto.items) || dto.items.length !== CRM_COST_PLAN_INTERNAL_SOURCE_ITEMS.length) {
      throw new BadRequestException('원본 호환 내부원가는 고정 5개 항목을 모두 포함해야 합니다.');
    }
    const incomingByCode = new Map<CrmCostPlanInternalSourceItemCode, { monthlyPlanAmounts: number[]; monthlyActualAmounts: number[] }>();
    dto.items.forEach((item) => {
      const definition = CRM_COST_PLAN_INTERNAL_SOURCE_ITEMS.find((candidate) => candidate.code === item.itemCode);
      if (!definition) {
        throw new BadRequestException(`지원하지 않는 내부원가 항목입니다: ${String(item.itemCode)}`);
      }
      if (incomingByCode.has(definition.code)) {
        throw new BadRequestException(`내부원가 항목이 중복되었습니다: ${definition.name}`);
      }
      incomingByCode.set(definition.code, {
        monthlyPlanAmounts: this.normalizeSignedMonthlyAmounts(item.monthlyPlanAmounts, definition.name, '계획'),
        monthlyActualAmounts: this.normalizeSignedMonthlyAmounts(item.monthlyActualAmounts, definition.name, '실적'),
      });
    });
    const missing = CRM_COST_PLAN_INTERNAL_SOURCE_ITEMS.find((item) => !incomingByCode.has(item.code));
    if (missing) {
      throw new BadRequestException(`내부원가 필수 항목이 누락되었습니다: ${missing.name}`);
    }

    const transactionId = randomUUID();
    const rows = await client.$transaction(async (tx: RawCostPlanWriter) => {
      for (const [sortOrder, definition] of CRM_COST_PLAN_INTERNAL_SOURCE_ITEMS.entries()) {
        const incoming = incomingByCode.get(definition.code)!;
        const planAmountTotal = incoming.monthlyPlanAmounts.reduce((sum, value) => sum + value, 0);
        const actualAmountTotal = incoming.monthlyActualAmounts.reduce((sum, value) => sum + value, 0);
        const differenceAmountTotal = planAmountTotal - actualAmountTotal;
        await tx.$executeRaw`
          insert into crm.crm_cost_plan_internal_item_monthly_d (
            owner_organization_id, target_year, item_code, item_name,
            monthly_plan_amounts, monthly_actual_amounts,
            plan_amount_total, actual_amount_total, difference_amount_total,
            sort_order, is_active, created_by, updated_by,
            last_source, last_activity, transaction_id
          ) values (
            ${organizationId}, ${targetYear}, ${definition.code}, ${definition.name},
            ${JSON.stringify(incoming.monthlyPlanAmounts)}::jsonb,
            ${JSON.stringify(incoming.monthlyActualAmounts)}::jsonb,
            ${BigInt(planAmountTotal)}, ${BigInt(actualAmountTotal)}, ${BigInt(differenceAmountTotal)},
            ${sortOrder}, true, ${currentUserId ?? null}, ${currentUserId ?? null},
            'crm.cost-plan', 'internal-source-grid-save', ${transactionId}::uuid
          )
          on conflict (owner_organization_id, target_year, item_code)
          do update
             set item_name = excluded.item_name,
                 monthly_plan_amounts = excluded.monthly_plan_amounts,
                 monthly_actual_amounts = excluded.monthly_actual_amounts,
                 plan_amount_total = excluded.plan_amount_total,
                 actual_amount_total = excluded.actual_amount_total,
                 difference_amount_total = excluded.difference_amount_total,
                 sort_order = excluded.sort_order,
                 is_active = true,
                 updated_by = ${currentUserId ?? null},
                 updated_at = now(),
                 last_source = 'crm.cost-plan',
                 last_activity = 'internal-source-grid-save',
                 transaction_id = ${transactionId}::uuid
        `;
      }
      return tx.$queryRaw<CostPlanInternalSourceItemLedgerRow[]>`
        select cost_plan_internal_item_monthly_id as "id",
               target_year as "targetYear",
               item_code as "itemCode",
               item_name as "itemName",
               monthly_plan_amounts as "monthlyPlanAmounts",
               monthly_actual_amounts as "monthlyActualAmounts",
               plan_amount_total as "planAmountTotal",
               actual_amount_total as "actualAmountTotal",
               difference_amount_total as "differenceAmountTotal",
               updated_at as "updatedAt"
          from crm.crm_cost_plan_internal_item_monthly_d
         where owner_organization_id is not distinct from ${organizationId}
           and target_year = ${targetYear}
           and is_active = true
         order by sort_order, cost_plan_internal_item_monthly_id
      `;
    });

    const grid = this.toInternalSourceGrid(targetYear, rows);
    return { grid, boundaryNotice: CRM_COST_PLAN_INTERNAL_SOURCE_GRID_BOUNDARY_NOTICE };
  }

  async createAmsSourceVendor(
    dto: CrmCostPlanAmsSourceVendorCreateRequest,
    currentUserId?: bigint,
  ): Promise<CrmCostPlanAmsSourceWorkspaceResult> {
    const client = this.db?.client;
    if (!client) throw new ServiceUnavailableException('CRM 원본 호환 AMS 저장 DB 연결이 필요합니다.');
    const { user: currentUser, organizationId } = await this.crmAccess!.resolveWriteOrganization(currentUserId, dto.ownerOrganizationId, 'canWriteCostPlan');
    const targetYear = this.normalizeInputYear(dto.targetYear);
    const vendorName = this.normalizeRequiredText(dto.vendorName, '공급업체명', 200);
    const transactionId = randomUUID();
    await client.$executeRaw`
      insert into crm.crm_cost_plan_ams_source_vendor_m (
        owner_organization_id, target_year, vendor_name, sort_order, is_active,
        created_by, updated_by, last_source, last_activity, transaction_id
      ) values (
        ${organizationId}, ${targetYear}, ${vendorName},
        (select coalesce(max(sort_order), -1) + 1 from crm.crm_cost_plan_ams_source_vendor_m where owner_organization_id is not distinct from ${organizationId}
           and target_year = ${targetYear} and is_active = true),
        true, ${currentUserId ?? null}, ${currentUserId ?? null},
        'crm.cost-plan', 'ams-source-vendor-create', ${transactionId}::uuid
      )
    `;
    return this.refreshAmsSourceWorkspaceResult(targetYear, organizationId, currentUser);
  }

  async deleteAmsSourceVendor(
    id: string,
    targetYearValue: number,
    currentUserId?: bigint,
  ): Promise<CrmCostPlanAmsSourceWorkspaceResult> {
    const client = this.db?.client;
    if (!client) throw new ServiceUnavailableException('CRM 원본 호환 AMS 저장 DB 연결이 필요합니다.');
    const targetYear = this.normalizeInputYear(targetYearValue);
    const vendorId = this.normalizeLedgerId(id, 'AMS 공급업체');
    const { user: currentUser, organizationId } = await this.authorizeSourceVendor(vendorId, currentUserId);
    const deleted = await client.$executeRaw`
      delete from crm.crm_cost_plan_ams_source_vendor_m
       where cost_plan_ams_source_vendor_id = ${vendorId}
         and target_year = ${targetYear}
    `;
    if (deleted === 0) throw new NotFoundException('삭제할 AMS 공급업체를 찾을 수 없습니다.');
    return this.refreshAmsSourceWorkspaceResult(targetYear, organizationId, currentUser);
  }

  async saveAmsSourceVendorWbs(
    id: string,
    dto: CrmCostPlanAmsSourceVendorWbsRequest,
    currentUserId?: bigint,
  ): Promise<CrmCostPlanAmsSourceWorkspaceResult> {
    const client = this.db?.client;
    if (!client) throw new ServiceUnavailableException('CRM 원본 호환 AMS 저장 DB 연결이 필요합니다.');
    const targetYear = this.normalizeInputYear(dto.targetYear);
    const vendorId = this.normalizeLedgerId(id, 'AMS 공급업체');
    const { user: currentUser, organizationId } = await this.authorizeSourceVendor(vendorId, currentUserId);
    const vendors = await this.loadAmsSourceVendors(targetYear, organizationId);
    if (!vendors.some((vendor) => vendor.id === vendorId)) throw new NotFoundException('AMS 공급업체를 찾을 수 없습니다.');
    if (!Array.isArray(dto.wbsCodes)) throw new BadRequestException('AMS WBS 목록은 배열이어야 합니다.');
    const contractResponse = await this.contractService.listResponse({ sort: 'start-asc' }, currentUser, organizationId ?? undefined);
    const eligibleWbs = this.getEligibleAmsSourceWbs(contractResponse.items);
    const eligibleByCode = new Map(eligibleWbs.map((item) => [item.wbsCode, item]));
    const wbsCodes = [...new Set(dto.wbsCodes.map((value) => this.normalizeRequiredText(value, 'WBS', 80)))];
    const existingMappings = new Map((await this.loadAmsSourceVendorWbs(targetYear, organizationId))
      .filter((mapping) => mapping.vendorId === vendorId).map((mapping) => [mapping.wbsCode, mapping]));
    const invalid = wbsCodes.find((code) => !eligibleByCode.has(code) && !existingMappings.has(code));
    if (invalid) throw new BadRequestException(`확정 AMS 계약 WBS가 아닙니다: ${invalid}`);
    const transactionId = randomUUID();
    await client.$transaction(async (tx: RawCostPlanWriter) => {
      await tx.$executeRaw`delete from crm.crm_cost_plan_ams_source_vendor_wbs_r where vendor_id = ${vendorId}`;
      for (const [sortOrder, wbsCode] of wbsCodes.entries()) {
        const eligible = eligibleByCode.get(wbsCode);
        await tx.$executeRaw`
          insert into crm.crm_cost_plan_ams_source_vendor_wbs_r (
            vendor_id, wbs_code, contract_id, sort_order,
            created_by, updated_by, last_source, last_activity, transaction_id
          ) values (
            ${vendorId}, ${wbsCode},
            coalesce((select contract_id from crm.crm_contract_m
              where contract_code = ${eligible?.contractId ?? null} and wbs_code = ${wbsCode}
                and owner_organization_id is not distinct from ${organizationId} and is_active = true limit 1),
              ${existingMappings.get(wbsCode)?.contractId ?? null}::bigint),
            ${sortOrder},
            ${currentUserId ?? null}, ${currentUserId ?? null},
            'crm.cost-plan', 'ams-source-vendor-wbs-save', ${transactionId}::uuid
          )
        `;
      }
    });
    return this.refreshAmsSourceWorkspaceResult(targetYear, organizationId, currentUser, contractResponse.items);
  }

  async saveAmsSourceExternalCost(
    dto: CrmCostPlanAmsSourceExternalCostRequest,
    currentUserId?: bigint,
  ): Promise<CrmCostPlanAmsSourceWorkspaceResult> {
    const client = this.db?.client;
    if (!client) throw new ServiceUnavailableException('CRM 원본 호환 AMS 저장 DB 연결이 필요합니다.');
    const { user: currentUser, organizationId } = await this.crmAccess!.resolveWriteOrganization(currentUserId, dto.ownerOrganizationId, 'canWriteCostPlan');
    const targetYear = this.normalizeInputYear(dto.targetYear);
    const vendors = await this.loadAmsSourceVendors(targetYear, organizationId);
    const vendorIds = new Set(vendors.map((vendor) => vendor.id.toString()));
    const mappings = await this.loadAmsSourceVendorWbs(targetYear, organizationId);
    const expectedKeys = new Set(mappings.map((mapping) => `${mapping.vendorId.toString()}\u0000${mapping.wbsCode}`));
    if (!Array.isArray(dto.rows) || dto.rows.length !== expectedKeys.size) {
      throw new BadRequestException('AMS 외부원가는 현재 업체-WBS 매핑 행을 모두 포함해야 합니다.');
    }
    const normalizedRows = dto.rows.map((row) => {
      const vendorId = this.normalizeLedgerId(row.vendorId, 'AMS 공급업체');
      const wbsCode = this.normalizeRequiredText(row.wbsCode, 'WBS', 80);
      const key = `${vendorId.toString()}\u0000${wbsCode}`;
      if (!vendorIds.has(vendorId.toString()) || !expectedKeys.has(key)) {
        throw new BadRequestException(`현재 매핑되지 않은 업체-WBS입니다: ${wbsCode}`);
      }
      return {
        key,
        vendorId,
        wbsCode,
        monthlyPlanAmounts: this.normalizeSignedMonthlyAmounts(row.monthlyPlanAmounts, wbsCode, '계획'),
        monthlyActualAmounts: this.normalizeSignedMonthlyAmounts(row.monthlyActualAmounts, wbsCode, '실적'),
      };
    });
    if (new Set(normalizedRows.map((row) => row.key)).size !== normalizedRows.length) {
      throw new BadRequestException('AMS 업체-WBS 외부원가 행이 중복되었습니다.');
    }
    const transactionId = randomUUID();
    await client.$transaction(async (tx: RawCostPlanWriter) => {
      for (const [sortOrder, row] of normalizedRows.entries()) {
        const planAmountTotal = row.monthlyPlanAmounts.reduce((sum, value) => sum + value, 0);
        const actualAmountTotal = row.monthlyActualAmounts.reduce((sum, value) => sum + value, 0);
        await tx.$executeRaw`
          insert into crm.crm_cost_plan_ams_source_external_monthly_d (
            vendor_id, wbs_code, monthly_plan_amounts, monthly_actual_amounts,
            plan_amount_total, actual_amount_total, difference_amount_total,
            sort_order, is_active, created_by, updated_by,
            last_source, last_activity, transaction_id
          ) values (
            ${row.vendorId}, ${row.wbsCode},
            ${JSON.stringify(row.monthlyPlanAmounts)}::jsonb, ${JSON.stringify(row.monthlyActualAmounts)}::jsonb,
            ${BigInt(planAmountTotal)}, ${BigInt(actualAmountTotal)}, ${BigInt(actualAmountTotal - planAmountTotal)},
            ${sortOrder}, true, ${currentUserId ?? null}, ${currentUserId ?? null},
            'crm.cost-plan', 'ams-source-external-cost-save', ${transactionId}::uuid
          )
          on conflict (vendor_id, wbs_code)
          do update set monthly_plan_amounts = excluded.monthly_plan_amounts,
                        monthly_actual_amounts = excluded.monthly_actual_amounts,
                        plan_amount_total = excluded.plan_amount_total,
                        actual_amount_total = excluded.actual_amount_total,
                        difference_amount_total = excluded.difference_amount_total,
                        sort_order = excluded.sort_order,
                        is_active = true,
                        updated_by = ${currentUserId ?? null},
                        updated_at = now(),
                        last_source = 'crm.cost-plan',
                        last_activity = 'ams-source-external-cost-save',
                        transaction_id = ${transactionId}::uuid
        `;
      }
    });
    return this.refreshAmsSourceWorkspaceResult(targetYear, organizationId, currentUser);
  }

  async confirmInternalMonthlyInput(
    id: string,
    currentUserId?: bigint,
  ): Promise<CrmCostPlanInternalMonthlyWorkflowResult> {
    const client = this.db?.client;
    if (!client) {
      throw new ServiceUnavailableException('CRM 원가/AMS 저장 DB 연결이 필요합니다.');
    }

    const existing = await this.findInternalMonthlyInputById(id, currentUserId);
    if (!existing) {
      throw new NotFoundException('CRM 내부원가 월별 입력을 찾을 수 없습니다.');
    }
    if (existing.confirmed) {
      return {
        input: this.toInternalMonthlyInput(existing),
        boundaryNotice: CRM_COST_PLAN_INTERNAL_CONFIRM_BOUNDARY_NOTICE,
      };
    }

    const confirmedAt = new Date();
    await client.$executeRaw`
      update crm.crm_cost_plan_internal_monthly_d
         set status_code = 'confirmed',
             confirmed = true,
             confirmed_at = ${confirmedAt},
             confirmed_by = ${currentUserId ?? null},
             updated_by = ${currentUserId ?? null},
             updated_at = now(),
             last_source = 'crm.cost-plan',
             last_activity = 'internal-monthly-confirm'
       where cost_plan_internal_monthly_id = ${existing.id}
         and is_active = true
    `;

    return {
      input: this.toInternalMonthlyInput({
        ...existing,
        statusCode: 'confirmed',
        confirmed: true,
        confirmedAt,
        confirmedBy: currentUserId ?? null,
        updatedAt: confirmedAt,
      }),
      boundaryNotice: CRM_COST_PLAN_INTERNAL_CONFIRM_BOUNDARY_NOTICE,
    };
  }

  async reopenInternalMonthlyInput(
    id: string,
    currentUserId?: bigint,
  ): Promise<CrmCostPlanInternalMonthlyWorkflowResult> {
    const client = this.db?.client;
    if (!client) {
      throw new ServiceUnavailableException('CRM 원가/AMS 저장 DB 연결이 필요합니다.');
    }

    const existing = await this.findInternalMonthlyInputById(id, currentUserId);
    if (!existing) {
      throw new NotFoundException('CRM 내부원가 월별 입력을 찾을 수 없습니다.');
    }
    if (!existing.confirmed) {
      throw new BadRequestException('미확정 내부원가 월별 입력은 확정 해제할 수 없습니다.');
    }

    const reopenedAt = new Date();
    await client.$executeRaw`
      update crm.crm_cost_plan_internal_monthly_d
         set status_code = 'draft',
             confirmed = false,
             confirmed_at = null,
             confirmed_by = null,
             updated_by = ${currentUserId ?? null},
             updated_at = now(),
             last_source = 'crm.cost-plan',
             last_activity = 'internal-monthly-reopen'
       where cost_plan_internal_monthly_id = ${existing.id}
         and is_active = true
    `;

    return {
      input: this.toInternalMonthlyInput({
        ...existing,
        statusCode: 'draft',
        confirmed: false,
        confirmedAt: null,
        confirmedBy: null,
        updatedAt: reopenedAt,
      }),
      boundaryNotice: CRM_COST_PLAN_INTERNAL_CONFIRM_BOUNDARY_NOTICE,
    };
  }

  async saveAmsVendorWbsMapping(
    dto: CrmCostPlanAmsVendorWbsMappingRequest,
    currentUserId?: bigint,
  ): Promise<CrmCostPlanAmsVendorWbsMappingResult> {
    const client = this.db?.client;
    if (!client) {
      throw new ServiceUnavailableException('CRM 원가/AMS 저장 DB 연결이 필요합니다.');
    }

    const { organizationId } = await this.crmAccess!.resolveWriteOrganization(currentUserId, dto.ownerOrganizationId, 'canWriteCostPlan');
    const targetYear = this.normalizeInputYear(dto.targetYear);
    const businessType = this.normalizeRequiredText(dto.businessType, '사업구분', 120);
    const industryLine = this.normalizeRequiredText(dto.industryLine, '계열/산업', 120);
    const ownerName = this.normalizeRequiredText(dto.ownerName, '담당자', 100);
    const region = this.normalizeInputRegion(dto.region);
    const wbsCode = this.normalizeRequiredText(dto.wbsCode, 'WBS', 80);
    const vendorName = this.normalizeRequiredText(dto.vendorName, 'AMS 업체', 200);
    const vendorContractNo = dto.vendorContractNo?.trim().slice(0, 120) || undefined;
    const memo = dto.memo?.trim() || undefined;
    const transactionId = randomUUID();

    const saved = await client.$transaction(async (tx: RawCostPlanWriter) => {
      await tx.$executeRaw`
        insert into crm.crm_cost_plan_ams_vendor_wbs_r (
          owner_organization_id, target_year, business_type, industry_line, owner_name, region_code, wbs_code,
          vendor_name, vendor_contract_no, sort_order, is_active, memo,
          created_by, updated_by, last_source, last_activity, transaction_id
        )
        values (
          ${organizationId}, ${targetYear}, ${businessType}, ${industryLine}, ${ownerName}, ${region}, ${wbsCode},
          ${vendorName}, ${vendorContractNo ?? null}, 0, true, ${memo ?? null},
          ${currentUserId ?? null}, ${currentUserId ?? null}, 'crm.cost-plan', 'ams-vendor-wbs-mapping', ${transactionId}::uuid
        )
        on conflict (owner_organization_id, target_year, business_type, industry_line, owner_name, region_code, wbs_code)
        do update
           set vendor_name = excluded.vendor_name,
               vendor_contract_no = excluded.vendor_contract_no,
               is_active = true,
               memo = coalesce(excluded.memo, crm.crm_cost_plan_ams_vendor_wbs_r.memo),
               updated_by = ${currentUserId ?? null},
               updated_at = now(),
               last_source = 'crm.cost-plan',
               last_activity = 'ams-vendor-wbs-mapping',
               transaction_id = ${transactionId}::uuid
      `;

      const rows = await tx.$queryRaw<CostPlanAmsVendorWbsMappingLedgerRow[]>`
        select cost_plan_ams_vendor_wbs_mapping_id as "id",
             owner_organization_id as "ownerOrganizationId",
               target_year as "targetYear",
               business_type as "businessType",
               industry_line as "industryLine",
               owner_name as "ownerName",
               region_code as "regionCode",
               wbs_code as "wbsCode",
               vendor_name as "vendorName",
               vendor_contract_no as "vendorContractNo",
               memo,
               updated_at as "updatedAt"
          from crm.crm_cost_plan_ams_vendor_wbs_r
         where owner_organization_id is not distinct from ${organizationId}
           and target_year = ${targetYear}
           and business_type = ${businessType}
           and industry_line = ${industryLine}
           and owner_name = ${ownerName}
           and region_code = ${region}
           and wbs_code = ${wbsCode}
         limit 1
      `;
      return rows[0];
    });

    if (!saved) {
      throw new ServiceUnavailableException('CRM AMS 업체-WBS 매핑 저장 결과를 확인할 수 없습니다.');
    }

    return {
      mapping: this.toAmsVendorMapping(saved),
      boundaryNotice: CRM_COST_PLAN_AMS_MAPPING_BOUNDARY_NOTICE,
    };
  }

  async saveAmsExternalMonthlyInput(
    dto: CrmCostPlanAmsExternalMonthlyInputRequest,
    currentUserId?: bigint,
  ): Promise<CrmCostPlanAmsExternalMonthlyInputResult> {
    const client = this.db?.client;
    if (!client) {
      throw new ServiceUnavailableException('CRM 원가/AMS 저장 DB 연결이 필요합니다.');
    }

    const { organizationId } = await this.crmAccess!.resolveWriteOrganization(currentUserId, dto.ownerOrganizationId, 'canWriteCostPlan');
    const targetYear = this.normalizeInputYear(dto.targetYear);
    const businessType = this.normalizeRequiredText(dto.businessType, '사업구분', 120);
    const industryLine = this.normalizeRequiredText(dto.industryLine, '계열/산업', 120);
    const ownerName = this.normalizeRequiredText(dto.ownerName, '담당자', 100);
    const region = this.normalizeInputRegion(dto.region);
    const wbsCode = this.normalizeRequiredText(dto.wbsCode, 'WBS', 80);
    const vendorName = this.normalizeRequiredText(dto.vendorName, 'AMS 업체', 200);
    const vendorContractNo = dto.vendorContractNo?.trim().slice(0, 120) || undefined;
    const monthlyPlanAmounts = this.normalizeMonthlyAmounts(dto.monthlyPlanAmounts, 'AMS 외부원가', '계획');
    const monthlyActualAmounts = this.normalizeMonthlyAmounts(dto.monthlyActualAmounts, 'AMS 외부원가', '실적');
    const planAmountTotal = monthlyPlanAmounts.reduce((sum, amount) => sum + amount, 0);
    const actualAmountTotal = monthlyActualAmounts.reduce((sum, amount) => sum + amount, 0);
    const gapAmountTotal = actualAmountTotal - planAmountTotal;
    const memo = dto.memo?.trim() || undefined;
    const transactionId = randomUUID();
    const existing = await this.findAmsExternalMonthlyInputByBasis(
      targetYear,
      businessType,
      industryLine,
      ownerName,
      region,
      wbsCode,
      vendorName,
      organizationId,
    );
    if (existing?.confirmed) {
      throw new BadRequestException('확정된 AMS 외부원가 월별 입력은 확정 해제 후 수정할 수 있습니다.');
    }

    const saved = await client.$transaction(async (tx: RawCostPlanWriter) => {
      await tx.$executeRaw`
        insert into crm.crm_cost_plan_ams_external_monthly_d (
          owner_organization_id, target_year, business_type, industry_line, owner_name, region_code, wbs_code,
          vendor_name, vendor_contract_no,
          monthly_plan_amounts, monthly_actual_amounts,
          plan_amount_total, actual_amount_total, gap_amount_total,
          status_code, confirmed, confirmed_at, confirmed_by,
          sort_order, is_active, memo,
          created_by, updated_by, last_source, last_activity, transaction_id
        )
        values (
          ${organizationId}, ${targetYear}, ${businessType}, ${industryLine}, ${ownerName}, ${region}, ${wbsCode},
          ${vendorName}, ${vendorContractNo ?? null},
          ${JSON.stringify(monthlyPlanAmounts)}::jsonb, ${JSON.stringify(monthlyActualAmounts)}::jsonb,
          ${BigInt(planAmountTotal)}, ${BigInt(actualAmountTotal)}, ${BigInt(gapAmountTotal)},
          'draft', false, null, null,
          0, true, ${memo ?? null},
          ${currentUserId ?? null}, ${currentUserId ?? null}, 'crm.cost-plan', 'ams-external-monthly-input', ${transactionId}::uuid
        )
        on conflict (owner_organization_id, target_year, business_type, industry_line, owner_name, region_code, wbs_code, vendor_name)
        do update
           set vendor_contract_no = excluded.vendor_contract_no,
               monthly_plan_amounts = excluded.monthly_plan_amounts,
               monthly_actual_amounts = excluded.monthly_actual_amounts,
               plan_amount_total = excluded.plan_amount_total,
               actual_amount_total = excluded.actual_amount_total,
               gap_amount_total = excluded.gap_amount_total,
               status_code = 'draft',
               confirmed = false,
               confirmed_at = null,
               confirmed_by = null,
               is_active = true,
               memo = coalesce(excluded.memo, crm.crm_cost_plan_ams_external_monthly_d.memo),
               updated_by = ${currentUserId ?? null},
               updated_at = now(),
               last_source = 'crm.cost-plan',
               last_activity = 'ams-external-monthly-input',
               transaction_id = ${transactionId}::uuid
      `;

      const rows = await tx.$queryRaw<CostPlanAmsExternalMonthlyLedgerRow[]>`
        select cost_plan_ams_external_monthly_id as "id",
             owner_organization_id as "ownerOrganizationId",
               target_year as "targetYear",
               business_type as "businessType",
               industry_line as "industryLine",
               owner_name as "ownerName",
               region_code as "regionCode",
               wbs_code as "wbsCode",
               vendor_name as "vendorName",
               vendor_contract_no as "vendorContractNo",
               monthly_plan_amounts as "monthlyPlanAmounts",
               monthly_actual_amounts as "monthlyActualAmounts",
               plan_amount_total as "planAmountTotal",
               actual_amount_total as "actualAmountTotal",
               gap_amount_total as "gapAmountTotal",
               status_code as "statusCode",
               confirmed,
               confirmed_at as "confirmedAt",
               confirmed_by as "confirmedBy",
               memo,
               updated_at as "updatedAt"
          from crm.crm_cost_plan_ams_external_monthly_d
         where owner_organization_id is not distinct from ${organizationId}
           and target_year = ${targetYear}
           and business_type = ${businessType}
           and industry_line = ${industryLine}
           and owner_name = ${ownerName}
           and region_code = ${region}
           and wbs_code = ${wbsCode}
           and vendor_name = ${vendorName}
         limit 1
      `;
      return rows[0];
    });

    if (!saved) {
      throw new ServiceUnavailableException('CRM AMS 외부원가 월별 입력 저장 결과를 확인할 수 없습니다.');
    }

    return {
      input: this.toAmsExternalMonthlyInput(saved),
      boundaryNotice: CRM_COST_PLAN_AMS_EXTERNAL_INPUT_BOUNDARY_NOTICE,
    };
  }

  async confirmAmsExternalMonthlyInput(
    id: string,
    currentUserId?: bigint,
  ): Promise<CrmCostPlanAmsExternalMonthlyWorkflowResult> {
    const client = this.db?.client;
    if (!client) {
      throw new ServiceUnavailableException('CRM 원가/AMS 저장 DB 연결이 필요합니다.');
    }

    const existing = await this.findAmsExternalMonthlyInputById(id, currentUserId);
    if (!existing) {
      throw new NotFoundException('CRM AMS 외부원가 월별 입력을 찾을 수 없습니다.');
    }
    if (existing.confirmed) {
      return {
        input: this.toAmsExternalMonthlyInput(existing),
        boundaryNotice: CRM_COST_PLAN_AMS_EXTERNAL_CONFIRM_BOUNDARY_NOTICE,
      };
    }

    const confirmedAt = new Date();
    await client.$executeRaw`
      update crm.crm_cost_plan_ams_external_monthly_d
         set status_code = 'confirmed',
             confirmed = true,
             confirmed_at = ${confirmedAt},
             confirmed_by = ${currentUserId ?? null},
             updated_by = ${currentUserId ?? null},
             updated_at = now(),
             last_source = 'crm.cost-plan',
             last_activity = 'ams-external-monthly-confirm'
       where cost_plan_ams_external_monthly_id = ${existing.id}
         and is_active = true
    `;

    return {
      input: this.toAmsExternalMonthlyInput({
        ...existing,
        statusCode: 'confirmed',
        confirmed: true,
        confirmedAt,
        confirmedBy: currentUserId ?? null,
        updatedAt: confirmedAt,
      }),
      boundaryNotice: CRM_COST_PLAN_AMS_EXTERNAL_CONFIRM_BOUNDARY_NOTICE,
    };
  }

  async reopenAmsExternalMonthlyInput(
    id: string,
    currentUserId?: bigint,
  ): Promise<CrmCostPlanAmsExternalMonthlyWorkflowResult> {
    const client = this.db?.client;
    if (!client) {
      throw new ServiceUnavailableException('CRM 원가/AMS 저장 DB 연결이 필요합니다.');
    }

    const existing = await this.findAmsExternalMonthlyInputById(id, currentUserId);
    if (!existing) {
      throw new NotFoundException('CRM AMS 외부원가 월별 입력을 찾을 수 없습니다.');
    }
    if (!existing.confirmed) {
      throw new BadRequestException('미확정 AMS 외부원가 월별 입력은 확정 해제할 수 없습니다.');
    }

    const reopenedAt = new Date();
    await client.$executeRaw`
      update crm.crm_cost_plan_ams_external_monthly_d
         set status_code = 'draft',
             confirmed = false,
             confirmed_at = null,
             confirmed_by = null,
             updated_by = ${currentUserId ?? null},
             updated_at = now(),
             last_source = 'crm.cost-plan',
             last_activity = 'ams-external-monthly-reopen'
       where cost_plan_ams_external_monthly_id = ${existing.id}
         and is_active = true
    `;

    return {
      input: this.toAmsExternalMonthlyInput({
        ...existing,
        statusCode: 'draft',
        confirmed: false,
        confirmedAt: null,
        confirmedBy: null,
        updatedAt: reopenedAt,
      }),
      boundaryNotice: CRM_COST_PLAN_AMS_EXTERNAL_CONFIRM_BOUNDARY_NOTICE,
    };
  }

  private applyOpportunity(
    groups: Map<string, CostPlanGroup>,
    opportunity: CrmOpportunity,
    year: number,
  ) {
    const month = this.toYearMonth(opportunity.expectedStartDate);
    if (!month || month.year !== year) {
      return;
    }
    const split = this.splitCostLines(opportunity.costLines);
    if (split.internalAmount === 0 && split.externalAmount === 0) {
      return;
    }
    const group = this.getOrCreateGroup(groups, {
      businessType: opportunity.businessType,
      industryLine: opportunity.industryLine,
      ownerName: opportunity.ownerName,
      region: opportunity.region,
    });
    const target = group.months.get(month.month);
    if (!target) {
      return;
    }
    target.pipelineInternalCostAmount += split.internalAmount;
    target.pipelineExternalCostAmount += split.externalAmount;
    target.externalCostPlanCandidateAmount += split.externalAmount;
    target.externalCostGapAmount = target.contractExternalActualAmount - target.externalCostPlanCandidateAmount;
  }

  private applyContract(
    groups: Map<string, CostPlanGroup>,
    contract: CrmContract,
    year: number,
    amsVendorMappingLookup: Map<string, CostPlanAmsVendorWbsMappingLedgerRow>,
  ) {
    const month = this.toYearMonth(contract.contractStartDate);
    const group = this.getOrCreateGroup(groups, {
      businessType: contract.businessType,
      industryLine: contract.industryLine,
      ownerName: contract.ownerName,
      region: contract.region,
      wbsCode: contract.wbsCode,
    });
    this.applyAmsReadiness(group, contract, amsVendorMappingLookup.get(group.key));
    if (!month || month.year !== year) {
      return;
    }
    const split = this.splitCostLines(contract.costLines);
    if (split.internalAmount === 0) {
      return;
    }
    const target = group.months.get(month.month);
    if (!target) {
      return;
    }
    target.contractInternalCostAmount += split.internalAmount;
  }

  private applyPerformanceRow(groups: Map<string, CostPlanGroup>, row: CrmContractPerformanceRow) {
    const group = this.getOrCreateGroup(groups, {
      businessType: row.businessType,
      industryLine: row.industryLine,
      ownerName: row.ownerName,
      region: row.region,
      wbsCode: row.wbsCode,
    });
    row.months.forEach((month) => {
      const target = group.months.get(month.month);
      if (!target) {
        return;
      }
      target.contractExternalPlanAmount += month.planExternalCostAmount;
      target.contractExternalActualAmount += month.actualExternalCostAmount;
      target.externalCostPlanCandidateAmount += month.planExternalCostAmount;
      target.externalCostGapAmount = target.contractExternalActualAmount - target.externalCostPlanCandidateAmount;
    });
  }

  private applyInternalMonthlyRow(groups: Map<string, CostPlanGroup>, row: CostPlanInternalMonthlyLedgerRow) {
    const group = this.getOrCreateGroup(groups, {
      businessType: row.businessType,
      industryLine: row.industryLine,
      ownerName: row.ownerName,
      region: this.toRegion(row.regionCode),
      wbsCode: row.wbsCode?.trim() || undefined,
    });
    const monthlyPlanAmounts = this.resolveMonthlyAmounts(row.monthlyPlanAmounts);
    const monthlyActualAmounts = this.resolveMonthlyAmounts(row.monthlyActualAmounts);
    group.internalCostInputId = row.id.toString();
    group.internalCostInputStatus = row.confirmed || row.statusCode === 'confirmed' ? 'confirmed' : 'draft';
    group.internalCostConfirmedAt = row.confirmedAt ? this.toIsoString(row.confirmedAt) : undefined;
    monthlyPlanAmounts.forEach((planAmount, index) => {
      const target = group.months.get(index + 1);
      if (!target) {
        return;
      }
      const actualAmount = monthlyActualAmounts[index] ?? 0;
      target.internalCostPlanInputAmount += planAmount;
      target.internalCostActualInputAmount += actualAmount;
      target.internalCostGapAmount = target.internalCostActualInputAmount - target.internalCostPlanInputAmount;
    });
  }

  private applyAmsVendorMappingRow(groups: Map<string, CostPlanGroup>, row: CostPlanAmsVendorWbsMappingLedgerRow) {
    const group = this.getOrCreateGroup(groups, {
      businessType: row.businessType,
      industryLine: row.industryLine,
      ownerName: row.ownerName,
      region: this.toRegion(row.regionCode),
      wbsCode: row.wbsCode,
    });
    this.applyAmsVendorMappingToGroup(group, row);
  }

  private applyAmsExternalMonthlyRow(groups: Map<string, CostPlanGroup>, row: CostPlanAmsExternalMonthlyLedgerRow) {
    const group = this.getOrCreateGroup(groups, {
      businessType: row.businessType,
      industryLine: row.industryLine,
      ownerName: row.ownerName,
      region: this.toRegion(row.regionCode),
      wbsCode: row.wbsCode,
    });
    const monthlyPlanAmounts = this.resolveMonthlyAmounts(row.monthlyPlanAmounts);
    const monthlyActualAmounts = this.resolveMonthlyAmounts(row.monthlyActualAmounts);
    group.amsExternalCostInputId = row.id.toString();
    group.amsExternalCostInputStatus = row.confirmed || row.statusCode === 'confirmed' ? 'confirmed' : 'draft';
    group.amsExternalCostConfirmedAt = row.confirmedAt ? this.toIsoString(row.confirmedAt) : undefined;
    group.amsVendorName = group.amsVendorName ?? row.vendorName;
    group.amsVendorContractNo = group.amsVendorContractNo ?? (row.vendorContractNo?.trim() || undefined);
    group.wbsCode = group.wbsCode ?? row.wbsCode;
    monthlyPlanAmounts.forEach((planAmount, index) => {
      const target = group.months.get(index + 1);
      if (!target) {
        return;
      }
      const actualAmount = monthlyActualAmounts[index] ?? 0;
      target.amsExternalCostPlanInputAmount += planAmount;
      target.amsExternalCostActualInputAmount += actualAmount;
      target.amsExternalCostGapAmount = target.amsExternalCostActualInputAmount - target.amsExternalCostPlanInputAmount;
    });
  }

  private applyAmsReadiness(
    group: CostPlanGroup,
    contract: CrmContract,
    amsVendorMapping?: CostPlanAmsVendorWbsMappingLedgerRow,
  ) {
    if (contract.externalCostTotal <= 0) {
      return;
    }
    if (contract.confirmed && contract.wbsCode?.trim() && amsVendorMapping) {
      this.applyAmsVendorMappingToGroup(group, amsVendorMapping);
      group.amsReadyCount += 1;
      return;
    }
    group.amsBlockedCount += 1;
    if (!contract.confirmed) {
      group.blockedReasons.add('계약 확정 필요');
    }
    if (!contract.wbsCode?.trim()) {
      group.blockedReasons.add('WBS 필요');
    }
    if (contract.confirmed && contract.wbsCode?.trim() && !amsVendorMapping) {
      group.blockedReasons.add('AMS 업체 매핑 필요');
    }
  }

  private applyAmsVendorMappingToGroup(group: CostPlanGroup, row: CostPlanAmsVendorWbsMappingLedgerRow) {
    group.amsMappingId = row.id.toString();
    group.amsVendorName = row.vendorName;
    group.amsVendorContractNo = row.vendorContractNo?.trim() || undefined;
    group.wbsCode = group.wbsCode ?? row.wbsCode;
  }

  private filterOpportunities(
    opportunities: CrmOpportunity[],
    query: NormalizedCostPlanPreviewQuery,
  ): CrmOpportunity[] {
    const search = query.search.toLowerCase();
    return opportunities.filter((opportunity) => {
      if (opportunity.status === 'lost' || opportunity.status === 'hold') {
        return false;
      }
      if (query.businessType && opportunity.businessType !== query.businessType) {
        return false;
      }
      if (query.industryLine && opportunity.industryLine !== query.industryLine) {
        return false;
      }
      if (query.region !== 'all' && opportunity.region !== query.region) {
        return false;
      }
      if (!search) {
        return true;
      }
      return [
        opportunity.customerName,
        opportunity.opportunityName,
        opportunity.ownerName,
        opportunity.businessType,
        opportunity.industryLine,
        opportunity.contractCode ?? '',
      ].some((value) => value.toLowerCase().includes(search));
    });
  }

  private filterContracts(
    contracts: CrmContract[],
    query: NormalizedCostPlanPreviewQuery,
  ): CrmContract[] {
    const search = query.search.toLowerCase();
    return contracts.filter((contract) => {
      if (query.businessType && contract.businessType !== query.businessType) {
        return false;
      }
      if (query.industryLine && contract.industryLine !== query.industryLine) {
        return false;
      }
      if (query.region !== 'all' && contract.region !== query.region) {
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
    });
  }

  private getOrCreateGroup(
    groups: Map<string, CostPlanGroup>,
    seed: {
      businessType: string;
      industryLine: string;
      ownerName: string;
      region: Exclude<CrmCostPlanPreviewRegion, 'all'>;
      wbsCode?: string;
    },
  ): CostPlanGroup {
    const businessType = seed.businessType.trim() || '미분류 사업';
    const industryLine = seed.industryLine.trim() || '미분류 계열';
    const ownerName = seed.ownerName.trim() || '담당 미지정';
    const wbsCode = seed.wbsCode?.trim() || undefined;
    const key = this.createGroupKey({ businessType, industryLine, ownerName, region: seed.region, wbsCode });
    const existing = groups.get(key);
    if (existing) {
      return existing;
    }
    const group: CostPlanGroup = {
      key,
      businessType,
      industryLine,
      ownerName,
      region: seed.region,
      wbsCode,
      amsReadyCount: 0,
      amsBlockedCount: 0,
      blockedReasons: new Set(),
      months: new Map(Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        return [month, this.createEmptyMonth(month)];
      })),
    };
    groups.set(key, group);
    return group;
  }

  private createGroupKey(seed: {
    businessType: string;
    industryLine: string;
    ownerName: string;
    region: Exclude<CrmCostPlanPreviewRegion, 'all'>;
    wbsCode?: string;
  }): string {
    return [
      seed.businessType.trim() || '미분류 사업',
      seed.industryLine.trim() || '미분류 계열',
      seed.ownerName.trim() || '담당 미지정',
      seed.region,
      seed.wbsCode?.trim() || 'pipeline',
    ].join('::');
  }

  private toResponseRow(group: CostPlanGroup): CrmCostPlanPreviewRow {
    const months = [...group.months.values()];
    const totals = this.sumMonths(months);
    return {
      key: group.key,
      businessType: group.businessType,
      industryLine: group.industryLine,
      ownerName: group.ownerName,
      region: group.region,
      wbsCode: group.wbsCode,
      pipelineInternalCostAmount: totals.pipelineInternalCostAmount,
      pipelineExternalCostAmount: totals.pipelineExternalCostAmount,
      contractInternalCostAmount: totals.contractInternalCostAmount,
      contractExternalPlanAmount: totals.contractExternalPlanAmount,
      contractExternalActualAmount: totals.contractExternalActualAmount,
      internalCostCandidateAmount: totals.pipelineInternalCostAmount + totals.contractInternalCostAmount,
      internalCostPlanInputAmount: totals.internalCostPlanInputAmount,
      internalCostActualInputAmount: totals.internalCostActualInputAmount,
      internalCostGapAmount: totals.internalCostGapAmount,
      internalCostInputMode: group.internalCostInputId ? 'manual' : 'candidate',
      internalCostInputStatus: group.internalCostInputId ? group.internalCostInputStatus ?? 'draft' : 'candidate',
      internalCostInputId: group.internalCostInputId,
      internalCostConfirmedAt: group.internalCostConfirmedAt,
      externalCostPlanCandidateAmount: totals.externalCostPlanCandidateAmount,
      externalCostGapAmount: totals.externalCostGapAmount,
      amsExternalCostInputMode: group.amsExternalCostInputId ? 'manual' : 'candidate',
      amsExternalCostInputId: group.amsExternalCostInputId,
      amsExternalCostInputStatus: group.amsExternalCostInputId ? group.amsExternalCostInputStatus ?? 'draft' : 'candidate',
      amsExternalCostConfirmedAt: group.amsExternalCostConfirmedAt,
      amsExternalCostPlanInputAmount: totals.amsExternalCostPlanInputAmount,
      amsExternalCostActualInputAmount: totals.amsExternalCostActualInputAmount,
      amsExternalCostGapAmount: totals.amsExternalCostGapAmount,
      amsMappingStatus: group.amsMappingId ? 'mapped' : group.amsBlockedCount > 0 || group.amsReadyCount > 0 ? 'unmapped' : 'not-required',
      amsMappingId: group.amsMappingId,
      amsVendorName: group.amsVendorName,
      amsVendorContractNo: group.amsVendorContractNo,
      amsReadiness: this.toAmsReadiness(group),
      amsReadyCount: group.amsReadyCount,
      amsBlockedCount: group.amsBlockedCount,
      blockedReasons: [...group.blockedReasons],
      months,
    };
  }

  private sumMonth(rows: CrmCostPlanPreviewRow[], month: number): CrmCostPlanPreviewMonth {
    return this.sumMonths(rows.map((row) => row.months.find((item) => item.month === month) ?? this.createEmptyMonth(month)), month);
  }

  private buildSummary(
    rows: CrmCostPlanPreviewRow[],
    months: CrmCostPlanPreviewMonth[],
    query: NormalizedCostPlanPreviewQuery,
    businessTypeOptions: string[],
    industryLineOptions: string[],
  ): CrmCostPlanPreviewSummary {
    const totals = this.sumMonths(months, 0);
    return {
      year: query.year,
      rowCount: rows.length,
      pipelineInternalCostTotal: totals.pipelineInternalCostAmount,
      pipelineExternalCostTotal: totals.pipelineExternalCostAmount,
      contractInternalCostTotal: totals.contractInternalCostAmount,
      contractExternalPlanTotal: totals.contractExternalPlanAmount,
      contractExternalActualTotal: totals.contractExternalActualAmount,
      internalCostCandidateTotal: totals.pipelineInternalCostAmount + totals.contractInternalCostAmount,
      internalCostPlanInputTotal: totals.internalCostPlanInputAmount,
      internalCostActualInputTotal: totals.internalCostActualInputAmount,
      internalCostGapTotal: totals.internalCostGapAmount,
      internalCostInputRowCount: rows.filter((row) => row.internalCostInputMode === 'manual').length,
      internalCostConfirmedRowCount: rows.filter((row) => row.internalCostInputStatus === 'confirmed').length,
      externalCostPlanCandidateTotal: totals.externalCostPlanCandidateAmount,
      externalCostGapTotal: totals.externalCostGapAmount,
      amsExternalCostPlanInputTotal: totals.amsExternalCostPlanInputAmount,
      amsExternalCostActualInputTotal: totals.amsExternalCostActualInputAmount,
      amsExternalCostGapTotal: totals.amsExternalCostGapAmount,
      amsExternalCostInputRowCount: rows.filter((row) => row.amsExternalCostInputMode === 'manual').length,
      amsExternalCostConfirmedRowCount: rows.filter((row) => row.amsExternalCostInputStatus === 'confirmed').length,
      amsMappedCount: rows.filter((row) => row.amsMappingStatus === 'mapped').length,
      amsReadyCount: rows.reduce((sum, row) => sum + row.amsReadyCount, 0),
      amsBlockedCount: rows.reduce((sum, row) => sum + row.amsBlockedCount, 0),
      activeFilters: {
        ownerOrganizationId: query.ownerOrganizationId,
        year: query.year,
        businessType: query.businessType,
        industryLine: query.industryLine,
        region: query.region,
        search: query.search,
      },
      businessTypeOptions,
      industryLineOptions,
      sourceTypes: ['opportunity-cost', 'contract-cost', 'contract-billing-actual', 'internal-cost-input', 'ams-vendor-mapping', 'ams-external-cost-input', 'ams-readiness'],
      boundaryNotice: CRM_COST_PLAN_PREVIEW_BOUNDARY_NOTICE,
      unavailableActions: CRM_COST_PLAN_UNAVAILABLE_ACTIONS,
    };
  }

  private async buildAccountingPaymentPreview(
    normalized: NormalizedCostPlanPreviewQuery,
    currentUser?: TokenPayload,
  ): Promise<CrmCostPlanAccountingPaymentPreview> {
    const [preview, latestHandoff] = await Promise.all([
      this.getPreview(normalized, currentUser),
      this.loadLatestAccountingPaymentHandoff(normalized),
    ]);
    const lines = this.toAccountingPaymentLines(preview.rows, normalized.year);
    const internalLineCount = lines.filter((line) => line.source === 'internal-cost').length;
    const amsExternalLineCount = lines.filter((line) => line.source === 'ams-external-cost').length;
    const settlementAmountTotal = lines.reduce((sum, line) => sum + line.settlementAmount, 0);
    const readiness = lines.length > 0 ? 'ready' : 'blocked';

    return {
      targetYear: normalized.year,
      readiness,
      blockedReasons: readiness === 'ready' ? [] : [CRM_COST_PLAN_ACCOUNTING_PAYMENT_BLOCKED_REASON],
      lineCount: lines.length,
      internalLineCount,
      amsExternalLineCount,
      settlementAmountTotal,
      lines,
      latestHandoff,
      boundaryNotice: CRM_COST_PLAN_ACCOUNTING_PAYMENT_BOUNDARY_NOTICE,
      unavailableActions: CRM_COST_PLAN_ACCOUNTING_PAYMENT_UNAVAILABLE_ACTIONS,
      nextAction: readiness === 'ready'
        ? '회계·지급 handoff snapshot을 기록할 수 있습니다.'
        : '내부원가 확정 또는 AMS 정산 확정을 먼저 완료하세요.',
    };
  }

  private toAccountingPaymentLines(
    rows: CrmCostPlanPreviewRow[],
    targetYear: number,
  ): CrmCostPlanAccountingPaymentLine[] {
    return rows.flatMap((row) => {
      const lines: CrmCostPlanAccountingPaymentLine[] = [];
      if (row.internalCostInputId && row.internalCostInputStatus === 'confirmed') {
        lines.push({
          key: `${row.key}::internal-cost::${row.internalCostInputId}`,
          source: 'internal-cost',
          sourceId: row.internalCostInputId,
          targetYear,
          businessType: row.businessType,
          industryLine: row.industryLine,
          ownerName: row.ownerName,
          region: this.toRegion(row.region),
          wbsCode: row.wbsCode,
          planAmountTotal: row.internalCostPlanInputAmount,
          actualAmountTotal: row.internalCostActualInputAmount,
          gapAmountTotal: row.internalCostGapAmount,
          settlementAmount: row.internalCostActualInputAmount,
          confirmedAt: row.internalCostConfirmedAt,
          memo: 'CRM 내부원가 확정 row',
        });
      }
      if (row.amsExternalCostInputId && row.amsExternalCostInputStatus === 'confirmed') {
        lines.push({
          key: `${row.key}::ams-external-cost::${row.amsExternalCostInputId}`,
          source: 'ams-external-cost',
          sourceId: row.amsExternalCostInputId,
          targetYear,
          businessType: row.businessType,
          industryLine: row.industryLine,
          ownerName: row.ownerName,
          region: this.toRegion(row.region),
          wbsCode: row.wbsCode,
          vendorName: row.amsVendorName,
          vendorContractNo: row.amsVendorContractNo,
          planAmountTotal: row.amsExternalCostPlanInputAmount,
          actualAmountTotal: row.amsExternalCostActualInputAmount,
          gapAmountTotal: row.amsExternalCostGapAmount,
          settlementAmount: row.amsExternalCostActualInputAmount,
          confirmedAt: row.amsExternalCostConfirmedAt,
          memo: 'CRM AMS 외부원가 정산 확정 row',
        });
      }
      return lines;
    }).sort((left, right) => {
      if (left.source !== right.source) {
        return left.source.localeCompare(right.source);
      }
      const amountDelta = right.settlementAmount - left.settlementAmount;
      if (amountDelta !== 0) {
        return amountDelta;
      }
      return left.key.localeCompare(right.key, 'ko-KR');
    });
  }

  private async loadLatestAccountingPaymentHandoff(
    normalized: NormalizedCostPlanPreviewQuery,
  ): Promise<CrmCostPlanAccountingPaymentHandoffSummary | null> {
    const client = this.db?.client;
    if (!client) {
      return null;
    }

    const rows = await client.$queryRaw<CostPlanAccountingPaymentHandoffLedgerRow[]>`
      select cost_plan_accounting_handoff_id as "id",
             owner_organization_id as "ownerOrganizationId",
             target_year as "targetYear",
             business_type_filter as "businessTypeFilter",
             industry_line_filter as "industryLineFilter",
             region_filter as "regionFilter",
             search_filter as "searchFilter",
             status_code as "statusCode",
             line_count as "lineCount",
             settlement_amount_total as "settlementAmountTotal",
             preview_snapshot as "previewSnapshot",
             lines_snapshot as "linesSnapshot",
             execution_evidence_snapshot as "executionEvidenceSnapshot",
             execution_evidence_updated_at as "executionEvidenceUpdatedAt",
             memo,
             saved_by as "savedBy",
             saved_at as "savedAt",
             updated_at as "updatedAt"
        from crm.crm_cost_plan_accounting_handoff_m
       where owner_organization_id is not distinct from ${normalized.ownerOrganizationId ? BigInt(normalized.ownerOrganizationId) : null}
           and target_year = ${normalized.year}
         and business_type_filter = ${normalized.businessType}
         and industry_line_filter = ${normalized.industryLine}
         and region_filter = ${normalized.region}
         and search_filter = ${normalized.search}
         and status_code in ('snapshot-created', 'execution-evidence-updated')
         and is_active = true
       order by saved_at desc, cost_plan_accounting_handoff_id desc
       limit 1
    `;

    return rows[0] ? this.toAccountingPaymentHandoffSummary(rows[0]) : null;
  }

  private async loadActiveAccountingPaymentHandoffById(
    handoffId: string,
    currentUserId?: bigint,
  ): Promise<CostPlanAccountingPaymentHandoffLedgerRow | null> {
    const client = this.db?.client;
    if (!client) {
      return null;
    }
    const id = this.normalizeLedgerId(handoffId, '회계·지급 handoff');
    const rows = await client.$queryRaw<CostPlanAccountingPaymentHandoffLedgerRow[]>`
      select cost_plan_accounting_handoff_id as "id",
             owner_organization_id as "ownerOrganizationId",
             target_year as "targetYear",
             business_type_filter as "businessTypeFilter",
             industry_line_filter as "industryLineFilter",
             region_filter as "regionFilter",
             search_filter as "searchFilter",
             status_code as "statusCode",
             line_count as "lineCount",
             settlement_amount_total as "settlementAmountTotal",
             preview_snapshot as "previewSnapshot",
             lines_snapshot as "linesSnapshot",
             execution_evidence_snapshot as "executionEvidenceSnapshot",
             execution_evidence_updated_at as "executionEvidenceUpdatedAt",
             memo,
             saved_by as "savedBy",
             saved_at as "savedAt",
             updated_at as "updatedAt"
        from crm.crm_cost_plan_accounting_handoff_m
       where cost_plan_accounting_handoff_id = ${id}
         and status_code in ('snapshot-created', 'execution-evidence-updated')
         and is_active = true
       limit 1
    `;
    const row = rows[0];
    if (row) await this.crmAccess!.assertOrganizationCapability(await this.crmAccess!.actorForUser(currentUserId), 'canConfirmCostPlan', row.ownerOrganizationId ?? null);
    return row ?? null;
  }

  private toAccountingPaymentHandoffSummary(
    row: CostPlanAccountingPaymentHandoffLedgerRow,
  ): CrmCostPlanAccountingPaymentHandoffSummary {
    return {
      ownerOrganizationId: row.ownerOrganizationId?.toString(),
      id: this.toIdString(row.id),
      status: row.statusCode,
      targetYear: row.targetYear,
      lineCount: this.toNumber(row.lineCount),
      settlementAmountTotal: this.toNumber(row.settlementAmountTotal),
      savedAt: this.toIsoString(row.savedAt),
      savedBy: this.toOptionalIdString(row.savedBy),
      memo: row.memo ?? undefined,
      executionEvidence: this.resolveAccountingPaymentExecutionEvidence(row.executionEvidenceSnapshot),
      executionEvidenceUpdatedAt: row.executionEvidenceUpdatedAt ? this.toIsoString(row.executionEvidenceUpdatedAt) : undefined,
    };
  }

  private toAccountingPaymentHandoff(
    row: CostPlanAccountingPaymentHandoffLedgerRow,
    previewSnapshot: Omit<CrmCostPlanAccountingPaymentPreview, 'latestHandoff'>,
    linesSnapshot: CrmCostPlanAccountingPaymentLine[],
  ): CrmCostPlanAccountingPaymentHandoff {
    return {
      ...this.toAccountingPaymentHandoffSummary(row),
      previewSnapshot,
      linesSnapshot,
      boundaryNotice: CRM_COST_PLAN_ACCOUNTING_PAYMENT_BOUNDARY_NOTICE,
      nextAction: '외부 회계·지급 시스템 반영 전 CRM handoff snapshot을 검토하세요.',
    };
  }

  private buildAccountingPaymentExecutionArtifacts(
    row: CostPlanAccountingPaymentHandoffLedgerRow,
    executionId: string,
    settlementAmountTotal: number,
    executedAt: Date,
  ): CrmCostPlanAccountingPaymentExecutionArtifact[] {
    const handoffId = this.toIdString(row.id);
    const basePath = `crm-demo-accounting://handoffs/${handoffId}/executions/${executionId}`;
    const executedAtIso = executedAt.toISOString();
    return [
      {
        key: 'accounting-voucher',
        label: 'CRM demo accounting voucher',
        evidencePath: `${basePath}/voucher`,
        referenceNo: this.toAccountingPaymentExecutionReference('VCH', row.targetYear, handoffId),
        amount: settlementAmountTotal,
        executedAt: executedAtIso,
      },
      {
        key: 'payment-request',
        label: 'CRM demo payment request',
        evidencePath: `${basePath}/payment-request`,
        referenceNo: this.toAccountingPaymentExecutionReference('PAYREQ', row.targetYear, handoffId),
        amount: settlementAmountTotal,
        executedAt: executedAtIso,
      },
      {
        key: 'payment-execution',
        label: 'CRM demo payment execution',
        evidencePath: `${basePath}/payment-execution`,
        referenceNo: this.toAccountingPaymentExecutionReference('PAYEXE', row.targetYear, handoffId),
        amount: settlementAmountTotal,
        executedAt: executedAtIso,
      },
      {
        key: 'external-system-sync',
        label: 'CRM demo external system sync',
        evidencePath: `${basePath}/external-sync`,
        referenceNo: this.toAccountingPaymentExecutionReference('SYNC', row.targetYear, handoffId),
        amount: settlementAmountTotal,
        executedAt: executedAtIso,
      },
    ];
  }

  private toAccountingPaymentExecutionReference(prefix: string, targetYear: number, handoffId: string): string {
    return `${prefix}-${targetYear}-${handoffId.padStart(6, '0')}`;
  }

  private toAccountingPaymentExecutionNote(
    artifact: CrmCostPlanAccountingPaymentExecutionArtifact,
    lineCount: number,
  ): string {
    return `${artifact.referenceNo} · ${lineCount}개 확정 원가 line · ${artifact.amount}원`;
  }

  private normalizeAccountingPaymentExecutionMode(
    mode: CrmCostPlanAccountingPaymentExecutionMode | undefined,
  ): CrmCostPlanAccountingPaymentExecutionMode {
    return mode === 'external-api' ? 'external-api' : 'demo';
  }

  private normalizeAccountingPaymentExecutionEvidenceSteps(
    steps: CrmCostPlanAccountingPaymentExecutionEvidenceStep[],
    recordedAt: Date,
  ): CrmCostPlanAccountingPaymentExecutionEvidenceStep[] {
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new BadRequestException('회계·지급 실행 evidence는 최소 1개 이상 필요합니다.');
    }
    const seen = new Set<CrmCostPlanAccountingPaymentExecutionStepKey>();
    return steps.map((step) => {
      if (!CRM_COST_PLAN_ACCOUNTING_PAYMENT_EXECUTION_STEP_KEYS.has(step.key)) {
        throw new BadRequestException('지원하지 않는 회계·지급 실행 evidence 단계입니다.');
      }
      if (seen.has(step.key)) {
        throw new BadRequestException('회계·지급 실행 evidence 단계는 중복될 수 없습니다.');
      }
      seen.add(step.key);
      const evidencePath = step.evidencePath?.trim().slice(0, 500);
      if (!evidencePath) {
        throw new BadRequestException('회계·지급 실행 evidence path가 필요합니다.');
      }
      return {
        key: step.key,
        evidencePath,
        evidenceLabel: step.evidenceLabel?.trim().slice(0, 120) || undefined,
        note: step.note?.trim().slice(0, 500) || undefined,
        recordedAt: recordedAt.toISOString(),
      };
    });
  }

  private mergeAccountingPaymentExecutionEvidence(
    existing: CrmCostPlanAccountingPaymentExecutionEvidenceStep[],
    incoming: CrmCostPlanAccountingPaymentExecutionEvidenceStep[],
  ): CrmCostPlanAccountingPaymentExecutionEvidenceStep[] {
    const byKey = new Map<CrmCostPlanAccountingPaymentExecutionStepKey, CrmCostPlanAccountingPaymentExecutionEvidenceStep>();
    existing.forEach((step) => byKey.set(step.key, step));
    incoming.forEach((step) => byKey.set(step.key, step));
    return [...CRM_COST_PLAN_ACCOUNTING_PAYMENT_EXECUTION_STEP_KEYS]
      .map((key) => byKey.get(key))
      .filter((step): step is CrmCostPlanAccountingPaymentExecutionEvidenceStep => Boolean(step));
  }

  private resolveAccountingPaymentExecutionEvidence(value: unknown): CrmCostPlanAccountingPaymentExecutionEvidenceStep[] {
    const source = typeof value === 'string' ? this.tryParseJson(value) : value;
    if (!Array.isArray(source)) {
      return [];
    }
    return source.flatMap((item) => {
      if (!item || typeof item !== 'object') {
        return [];
      }
      const candidate = item as Partial<CrmCostPlanAccountingPaymentExecutionEvidenceStep>;
      if (!candidate.key || !CRM_COST_PLAN_ACCOUNTING_PAYMENT_EXECUTION_STEP_KEYS.has(candidate.key)) {
        return [];
      }
      const evidencePath = typeof candidate.evidencePath === 'string' ? candidate.evidencePath.trim() : '';
      if (!evidencePath) {
        return [];
      }
      return [{
        key: candidate.key,
        evidencePath,
        evidenceLabel: typeof candidate.evidenceLabel === 'string' ? candidate.evidenceLabel : undefined,
        note: typeof candidate.note === 'string' ? candidate.note : undefined,
        recordedAt: typeof candidate.recordedAt === 'string' ? candidate.recordedAt : undefined,
      }];
    });
  }

  private resolveAccountingPaymentPreviewSnapshot(
    value: unknown,
  ): Omit<CrmCostPlanAccountingPaymentPreview, 'latestHandoff'> {
    const source = typeof value === 'string' ? this.tryParseJson(value) : value;
    if (source && typeof source === 'object' && !Array.isArray(source)) {
      return source as Omit<CrmCostPlanAccountingPaymentPreview, 'latestHandoff'>;
    }
    return {
      targetYear: new Date().getFullYear(),
      readiness: 'blocked',
      blockedReasons: [CRM_COST_PLAN_ACCOUNTING_PAYMENT_BLOCKED_REASON],
      lineCount: 0,
      internalLineCount: 0,
      amsExternalLineCount: 0,
      settlementAmountTotal: 0,
      lines: [],
      boundaryNotice: CRM_COST_PLAN_ACCOUNTING_PAYMENT_BOUNDARY_NOTICE,
      unavailableActions: CRM_COST_PLAN_ACCOUNTING_PAYMENT_UNAVAILABLE_ACTIONS,
      nextAction: '내부원가 확정 또는 AMS 정산 확정을 먼저 완료하세요.',
    };
  }

  private resolveAccountingPaymentLinesSnapshot(value: unknown): CrmCostPlanAccountingPaymentLine[] {
    const source = typeof value === 'string' ? this.tryParseJson(value) : value;
    return Array.isArray(source) ? source as CrmCostPlanAccountingPaymentLine[] : [];
  }

  private toAccountingPaymentHandoffQuery(row: CostPlanAccountingPaymentHandoffLedgerRow): NormalizedCostPlanPreviewQuery {
    return this.normalizeQuery({
      ownerOrganizationId: row.ownerOrganizationId?.toString(),
      year: row.targetYear,
      businessType: row.businessTypeFilter,
      industryLine: row.industryLineFilter,
      region: row.regionFilter,
      search: row.searchFilter,
    });
  }

  private splitCostLines(lines: Array<CrmOpportunityLine | CrmContractLine>): CostSplit {
    return lines.reduce((sum, line: CostLineLike) => {
      if (this.isExternalCostLine(line)) {
        return { ...sum, externalAmount: sum.externalAmount + line.amount };
      }
      return { ...sum, internalAmount: sum.internalAmount + line.amount };
    }, { internalAmount: 0, externalAmount: 0 });
  }

  private isExternalCostLine(line: CostLineLike): boolean {
    return line.category === 'product'
      || line.category === 'external-cost'
      || line.serviceType === 'external';
  }

  private sumMonths(months: CrmCostPlanPreviewMonth[], month = 0): CrmCostPlanPreviewMonth {
    const totals = months.reduce((sum, item) => ({
      pipelineInternalCostAmount: sum.pipelineInternalCostAmount + item.pipelineInternalCostAmount,
      pipelineExternalCostAmount: sum.pipelineExternalCostAmount + item.pipelineExternalCostAmount,
      contractInternalCostAmount: sum.contractInternalCostAmount + item.contractInternalCostAmount,
      internalCostPlanInputAmount: sum.internalCostPlanInputAmount + item.internalCostPlanInputAmount,
      internalCostActualInputAmount: sum.internalCostActualInputAmount + item.internalCostActualInputAmount,
      internalCostGapAmount: sum.internalCostGapAmount + item.internalCostGapAmount,
      contractExternalPlanAmount: sum.contractExternalPlanAmount + item.contractExternalPlanAmount,
      contractExternalActualAmount: sum.contractExternalActualAmount + item.contractExternalActualAmount,
      amsExternalCostPlanInputAmount: sum.amsExternalCostPlanInputAmount + item.amsExternalCostPlanInputAmount,
      amsExternalCostActualInputAmount: sum.amsExternalCostActualInputAmount + item.amsExternalCostActualInputAmount,
      amsExternalCostGapAmount: sum.amsExternalCostGapAmount + item.amsExternalCostGapAmount,
      externalCostPlanCandidateAmount: sum.externalCostPlanCandidateAmount + item.externalCostPlanCandidateAmount,
      externalCostGapAmount: sum.externalCostGapAmount + item.externalCostGapAmount,
    }), {
      pipelineInternalCostAmount: 0,
      pipelineExternalCostAmount: 0,
      contractInternalCostAmount: 0,
      internalCostPlanInputAmount: 0,
      internalCostActualInputAmount: 0,
      internalCostGapAmount: 0,
      contractExternalPlanAmount: 0,
      contractExternalActualAmount: 0,
      amsExternalCostPlanInputAmount: 0,
      amsExternalCostActualInputAmount: 0,
      amsExternalCostGapAmount: 0,
      externalCostPlanCandidateAmount: 0,
      externalCostGapAmount: 0,
    });
    return { month, ...totals };
  }

  private toAmsReadiness(group: CostPlanGroup): CrmCostPlanAmsReadiness {
    if (group.amsReadyCount > 0 && group.amsBlockedCount === 0) {
      return 'ready';
    }
    if (group.amsBlockedCount > 0) {
      return 'blocked';
    }
    return 'planned';
  }

  private async authorizeSourceVendor(vendorId: bigint, currentUserId?: bigint) {
    const user = await this.crmAccess!.actorForUser(currentUserId);
    const row = await this.db!.client.crmCostPlanAmsSourceVendor.findUnique({ where: { id: vendorId }, select: { ownerOrganizationId: true } });
    if (!row) throw new NotFoundException('AMS 공급업체를 찾을 수 없습니다.');
    await this.crmAccess!.assertOrganizationCapability(user, 'canWriteCostPlan', row.ownerOrganizationId);
    return { user, organizationId: row.ownerOrganizationId };
  }

  private async loadInternalMonthlyRows(query: NormalizedCostPlanPreviewQuery): Promise<CostPlanInternalMonthlyLedgerRow[]> {
    const client = this.db?.client;
    if (!client) {
      return [];
    }
    const search = `%${query.search.toLowerCase()}%`;
    return client.$queryRaw<CostPlanInternalMonthlyLedgerRow[]>`
      select cost_plan_internal_monthly_id as "id",
             owner_organization_id as "ownerOrganizationId",
             target_year as "targetYear",
             business_type as "businessType",
             industry_line as "industryLine",
             owner_name as "ownerName",
             region_code as "regionCode",
             wbs_code as "wbsCode",
             monthly_plan_amounts as "monthlyPlanAmounts",
             monthly_actual_amounts as "monthlyActualAmounts",
             plan_amount_total as "planAmountTotal",
             actual_amount_total as "actualAmountTotal",
             gap_amount_total as "gapAmountTotal",
             status_code as "statusCode",
             confirmed,
             confirmed_at as "confirmedAt",
             confirmed_by as "confirmedBy",
             memo,
             updated_at as "updatedAt"
        from crm.crm_cost_plan_internal_monthly_d
       where is_active = true
         and target_year = ${query.year}
         and owner_organization_id is not distinct from ${query.ownerOrganizationId ? BigInt(query.ownerOrganizationId) : null}
         and (${query.businessType} = '' or business_type = ${query.businessType})
         and (${query.industryLine} = '' or industry_line = ${query.industryLine})
         and (${query.region} = 'all' or region_code = ${query.region})
         and (
           ${query.search} = ''
           or lower(business_type) like ${search}
           or lower(industry_line) like ${search}
           or lower(owner_name) like ${search}
           or lower(wbs_code) like ${search}
         )
       order by business_type, industry_line, owner_name, wbs_code
    `;
  }

  private async loadInternalSourceItemRows(targetYear: number, organizationId: bigint | null = null): Promise<CostPlanInternalSourceItemLedgerRow[]> {
    const client = this.db?.client;
    if (!client) {
      return [];
    }
    return client.$queryRaw<CostPlanInternalSourceItemLedgerRow[]>`
      select cost_plan_internal_item_monthly_id as "id",
             target_year as "targetYear",
             item_code as "itemCode",
             item_name as "itemName",
             monthly_plan_amounts as "monthlyPlanAmounts",
             monthly_actual_amounts as "monthlyActualAmounts",
             plan_amount_total as "planAmountTotal",
             actual_amount_total as "actualAmountTotal",
             difference_amount_total as "differenceAmountTotal",
             updated_at as "updatedAt"
        from crm.crm_cost_plan_internal_item_monthly_d
       where owner_organization_id is not distinct from ${organizationId}
         and target_year = ${targetYear}
         and is_active = true
       order by sort_order, cost_plan_internal_item_monthly_id
    `;
  }

  private async loadAmsSourceVendors(targetYear: number, organizationId: bigint | null = null): Promise<CostPlanAmsSourceVendorLedgerRow[]> {
    const client = this.db?.client;
    if (!client) return [];
    return client.$queryRaw<CostPlanAmsSourceVendorLedgerRow[]>`
      select cost_plan_ams_source_vendor_id as "id",
             target_year as "targetYear",
             vendor_name as "vendorName",
             sort_order as "sortOrder",
             updated_at as "updatedAt"
        from crm.crm_cost_plan_ams_source_vendor_m
       where owner_organization_id is not distinct from ${organizationId}
         and target_year = ${targetYear}
         and is_active = true
       order by sort_order, cost_plan_ams_source_vendor_id
    `;
  }

  private async loadAmsSourceVendorWbs(targetYear: number, organizationId: bigint | null = null): Promise<CostPlanAmsSourceVendorWbsLedgerRow[]> {
    const client = this.db?.client;
    if (!client) return [];
    return client.$queryRaw<CostPlanAmsSourceVendorWbsLedgerRow[]>`
      select r.cost_plan_ams_source_vendor_wbs_id as "id",
             r.vendor_id as "vendorId",
             r.wbs_code as "wbsCode",
             r.contract_id as "contractId",
             r.sort_order as "sortOrder"
        from crm.crm_cost_plan_ams_source_vendor_wbs_r r
        join crm.crm_cost_plan_ams_source_vendor_m v
          on v.cost_plan_ams_source_vendor_id = r.vendor_id
       where v.owner_organization_id is not distinct from ${organizationId}
         and v.target_year = ${targetYear}
         and v.is_active = true
       order by v.sort_order, r.sort_order, r.cost_plan_ams_source_vendor_wbs_id
    `;
  }

  private async loadAmsSourceExternalRows(targetYear: number, organizationId: bigint | null = null): Promise<CostPlanAmsSourceExternalLedgerRow[]> {
    const client = this.db?.client;
    if (!client) return [];
    return client.$queryRaw<CostPlanAmsSourceExternalLedgerRow[]>`
      select d.cost_plan_ams_source_external_monthly_id as "id",
             d.vendor_id as "vendorId",
             d.wbs_code as "wbsCode",
             d.monthly_plan_amounts as "monthlyPlanAmounts",
             d.monthly_actual_amounts as "monthlyActualAmounts",
             d.plan_amount_total as "planAmountTotal",
             d.actual_amount_total as "actualAmountTotal",
             d.difference_amount_total as "differenceAmountTotal",
             d.updated_at as "updatedAt"
        from crm.crm_cost_plan_ams_source_external_monthly_d d
        join crm.crm_cost_plan_ams_source_vendor_m v
          on v.cost_plan_ams_source_vendor_id = d.vendor_id
       where v.owner_organization_id is not distinct from ${organizationId}
         and v.target_year = ${targetYear}
         and v.is_active = true
         and d.is_active = true
       order by v.sort_order, d.sort_order, d.cost_plan_ams_source_external_monthly_id
    `;
  }

  private async loadAmsSourceWorkspace(targetYear: number, contracts: CrmContract[], organizationId: bigint | null = null): Promise<CrmCostPlanAmsSourceWorkspace> {
    const [vendors, mappings, costs] = await Promise.all([
      this.loadAmsSourceVendors(targetYear, organizationId),
      this.loadAmsSourceVendorWbs(targetYear, organizationId),
      this.loadAmsSourceExternalRows(targetYear, organizationId),
    ]);
    const mappingsByVendor = new Map<string, CostPlanAmsSourceVendorWbsLedgerRow[]>();
    mappings.forEach((mapping) => {
      const key = mapping.vendorId.toString();
      mappingsByVendor.set(key, [...(mappingsByVendor.get(key) ?? []), mapping]);
    });
    const costByKey = new Map(costs.map((cost) => [`${cost.vendorId.toString()}\u0000${cost.wbsCode}`, cost]));
    const vendorById = new Map(vendors.map((vendor) => [vendor.id.toString(), vendor]));
    return {
      targetYear,
      eligibleWbs: this.getEligibleAmsSourceWbs(contracts),
      vendors: vendors.map((vendor) => ({
        id: vendor.id.toString(),
        targetYear: vendor.targetYear,
        vendorName: vendor.vendorName,
        wbs: (mappingsByVendor.get(vendor.id.toString()) ?? []).map((mapping) => ({
          id: mapping.id.toString(),
          wbsCode: mapping.wbsCode,
          ...(mapping.contractId ? { contractId: mapping.contractId.toString() } : {}),
        })),
        updatedAt: this.toIsoString(vendor.updatedAt),
      })),
      externalCostRows: mappings.map((mapping) => {
        const vendor = vendorById.get(mapping.vendorId.toString());
        const cost = costByKey.get(`${mapping.vendorId.toString()}\u0000${mapping.wbsCode}`);
        const monthlyPlanAmounts = this.resolveSignedMonthlyAmounts(cost?.monthlyPlanAmounts);
        const monthlyActualAmounts = this.resolveSignedMonthlyAmounts(cost?.monthlyActualAmounts);
        const planAmountTotal = monthlyPlanAmounts.reduce((sum, value) => sum + value, 0);
        const actualAmountTotal = monthlyActualAmounts.reduce((sum, value) => sum + value, 0);
        return {
          ...(cost ? { id: cost.id.toString(), updatedAt: this.toIsoString(cost.updatedAt) } : {}),
          vendorId: mapping.vendorId.toString(),
          vendorName: vendor?.vendorName ?? '',
          wbsCode: mapping.wbsCode,
          monthlyPlanAmounts,
          monthlyActualAmounts,
          planAmountTotal,
          actualAmountTotal,
          differenceAmountTotal: actualAmountTotal - planAmountTotal,
        };
      }),
      boundaryNotice: CRM_COST_PLAN_AMS_SOURCE_BOUNDARY_NOTICE,
    };
  }

  private getEligibleAmsSourceWbs(contracts: CrmContract[]) {
    const unique = new Map<string, CrmContract>();
    contracts.forEach((contract) => {
      if (contract.confirmed && contract.businessType === 'AMS' && contract.wbsCode && !unique.has(contract.wbsCode)) {
        unique.set(contract.wbsCode, contract);
      }
    });
    return [...unique.values()]
      .sort((left, right) => (left.wbsCode ?? '').localeCompare(right.wbsCode ?? ''))
      .map((contract) => ({
        wbsCode: contract.wbsCode!,
        contractId: contract.id,
        contractCode: contract.code,
        customerName: contract.customerName,
        contractName: contract.contractName,
        label: `${contract.wbsCode} (${contract.customerName} · ${contract.contractName})`,
      }));
  }

  private async refreshAmsSourceWorkspaceResult(
    targetYear: number,
    organizationId: bigint | null,
    currentUser: TokenPayload,
    contracts?: CrmContract[],
  ): Promise<CrmCostPlanAmsSourceWorkspaceResult> {
    const sourceContracts = contracts ?? (await this.contractService.listResponse({ sort: 'start-asc' }, currentUser, organizationId ?? undefined)).items;
    return {
      workspace: await this.loadAmsSourceWorkspace(targetYear, sourceContracts, organizationId),
      boundaryNotice: CRM_COST_PLAN_AMS_SOURCE_BOUNDARY_NOTICE,
    };
  }

  private async findInternalMonthlyInputById(id: string, currentUserId?: bigint): Promise<CostPlanInternalMonthlyLedgerRow | null> {
    const client = this.db?.client;
    if (!client) {
      return null;
    }
    const inputId = this.normalizeLedgerId(id, '내부원가 월별 입력');
    const rows = await client.$queryRaw<CostPlanInternalMonthlyLedgerRow[]>`
      select cost_plan_internal_monthly_id as "id",
             owner_organization_id as "ownerOrganizationId",
             target_year as "targetYear",
             business_type as "businessType",
             industry_line as "industryLine",
             owner_name as "ownerName",
             region_code as "regionCode",
             wbs_code as "wbsCode",
             monthly_plan_amounts as "monthlyPlanAmounts",
             monthly_actual_amounts as "monthlyActualAmounts",
             plan_amount_total as "planAmountTotal",
             actual_amount_total as "actualAmountTotal",
             gap_amount_total as "gapAmountTotal",
             status_code as "statusCode",
             confirmed,
             confirmed_at as "confirmedAt",
             confirmed_by as "confirmedBy",
             memo,
             updated_at as "updatedAt"
        from crm.crm_cost_plan_internal_monthly_d
       where cost_plan_internal_monthly_id = ${inputId}
         and is_active = true
       limit 1
    `;
    const row = rows[0];
    if (row) await this.crmAccess!.assertOrganizationCapability(await this.crmAccess!.actorForUser(currentUserId), 'canConfirmCostPlan', row.ownerOrganizationId ?? null);
    return row ?? null;
  }

  private async findInternalMonthlyInputByBasis(
    targetYear: number,
    businessType: string,
    industryLine: string,
    ownerName: string,
    regionCode: Exclude<CrmCostPlanPreviewRegion, 'all'>,
    wbsCode: string,
    organizationId: bigint,
  ): Promise<CostPlanInternalMonthlyLedgerRow | null> {
    const client = this.db?.client;
    if (!client) {
      return null;
    }
    const rows = await client.$queryRaw<CostPlanInternalMonthlyLedgerRow[]>`
      select cost_plan_internal_monthly_id as "id",
             owner_organization_id as "ownerOrganizationId",
             target_year as "targetYear",
             business_type as "businessType",
             industry_line as "industryLine",
             owner_name as "ownerName",
             region_code as "regionCode",
             wbs_code as "wbsCode",
             monthly_plan_amounts as "monthlyPlanAmounts",
             monthly_actual_amounts as "monthlyActualAmounts",
             plan_amount_total as "planAmountTotal",
             actual_amount_total as "actualAmountTotal",
             gap_amount_total as "gapAmountTotal",
             status_code as "statusCode",
             confirmed,
             confirmed_at as "confirmedAt",
             confirmed_by as "confirmedBy",
             memo,
             updated_at as "updatedAt"
        from crm.crm_cost_plan_internal_monthly_d
       where owner_organization_id = ${organizationId}
         and target_year = ${targetYear}
         and business_type = ${businessType}
         and industry_line = ${industryLine}
         and owner_name = ${ownerName}
         and region_code = ${regionCode}
         and wbs_code = ${wbsCode}
         and is_active = true
       limit 1
    `;
    return rows[0] ?? null;
  }

  private async loadAmsVendorMappingRows(query: NormalizedCostPlanPreviewQuery): Promise<CostPlanAmsVendorWbsMappingLedgerRow[]> {
    const client = this.db?.client;
    if (!client) {
      return [];
    }
    const search = `%${query.search.toLowerCase()}%`;
    return client.$queryRaw<CostPlanAmsVendorWbsMappingLedgerRow[]>`
      select cost_plan_ams_vendor_wbs_mapping_id as "id",
             owner_organization_id as "ownerOrganizationId",
             target_year as "targetYear",
             business_type as "businessType",
             industry_line as "industryLine",
             owner_name as "ownerName",
             region_code as "regionCode",
             wbs_code as "wbsCode",
             vendor_name as "vendorName",
             vendor_contract_no as "vendorContractNo",
             memo,
             updated_at as "updatedAt"
        from crm.crm_cost_plan_ams_vendor_wbs_r
       where is_active = true
         and target_year = ${query.year}
         and owner_organization_id is not distinct from ${query.ownerOrganizationId ? BigInt(query.ownerOrganizationId) : null}
         and (${query.businessType} = '' or business_type = ${query.businessType})
         and (${query.industryLine} = '' or industry_line = ${query.industryLine})
         and (${query.region} = 'all' or region_code = ${query.region})
         and (
           ${query.search} = ''
           or lower(business_type) like ${search}
           or lower(industry_line) like ${search}
           or lower(owner_name) like ${search}
           or lower(wbs_code) like ${search}
           or lower(vendor_name) like ${search}
           or lower(coalesce(vendor_contract_no, '')) like ${search}
         )
       order by business_type, industry_line, owner_name, wbs_code
    `;
  }

  private async loadAmsExternalMonthlyRows(query: NormalizedCostPlanPreviewQuery): Promise<CostPlanAmsExternalMonthlyLedgerRow[]> {
    const client = this.db?.client;
    if (!client) {
      return [];
    }
    const search = `%${query.search.toLowerCase()}%`;
    return client.$queryRaw<CostPlanAmsExternalMonthlyLedgerRow[]>`
      select cost_plan_ams_external_monthly_id as "id",
             owner_organization_id as "ownerOrganizationId",
             target_year as "targetYear",
             business_type as "businessType",
             industry_line as "industryLine",
             owner_name as "ownerName",
             region_code as "regionCode",
             wbs_code as "wbsCode",
             vendor_name as "vendorName",
             vendor_contract_no as "vendorContractNo",
             monthly_plan_amounts as "monthlyPlanAmounts",
             monthly_actual_amounts as "monthlyActualAmounts",
             plan_amount_total as "planAmountTotal",
             actual_amount_total as "actualAmountTotal",
             gap_amount_total as "gapAmountTotal",
             status_code as "statusCode",
             confirmed,
             confirmed_at as "confirmedAt",
             confirmed_by as "confirmedBy",
             memo,
             updated_at as "updatedAt"
        from crm.crm_cost_plan_ams_external_monthly_d
       where is_active = true
         and target_year = ${query.year}
         and owner_organization_id is not distinct from ${query.ownerOrganizationId ? BigInt(query.ownerOrganizationId) : null}
         and (${query.businessType} = '' or business_type = ${query.businessType})
         and (${query.industryLine} = '' or industry_line = ${query.industryLine})
         and (${query.region} = 'all' or region_code = ${query.region})
         and (
           ${query.search} = ''
           or lower(business_type) like ${search}
           or lower(industry_line) like ${search}
           or lower(owner_name) like ${search}
           or lower(wbs_code) like ${search}
           or lower(vendor_name) like ${search}
           or lower(coalesce(vendor_contract_no, '')) like ${search}
         )
       order by business_type, industry_line, owner_name, wbs_code, vendor_name
    `;
  }

  private async findAmsExternalMonthlyInputById(id: string, currentUserId?: bigint): Promise<CostPlanAmsExternalMonthlyLedgerRow | null> {
    const client = this.db?.client;
    if (!client) {
      return null;
    }
    const inputId = this.normalizeLedgerId(id, 'AMS 외부원가 월별 입력');
    const rows = await client.$queryRaw<CostPlanAmsExternalMonthlyLedgerRow[]>`
      select cost_plan_ams_external_monthly_id as "id",
             owner_organization_id as "ownerOrganizationId",
             target_year as "targetYear",
             business_type as "businessType",
             industry_line as "industryLine",
             owner_name as "ownerName",
             region_code as "regionCode",
             wbs_code as "wbsCode",
             vendor_name as "vendorName",
             vendor_contract_no as "vendorContractNo",
             monthly_plan_amounts as "monthlyPlanAmounts",
             monthly_actual_amounts as "monthlyActualAmounts",
             plan_amount_total as "planAmountTotal",
             actual_amount_total as "actualAmountTotal",
             gap_amount_total as "gapAmountTotal",
             status_code as "statusCode",
             confirmed,
             confirmed_at as "confirmedAt",
             confirmed_by as "confirmedBy",
             memo,
             updated_at as "updatedAt"
        from crm.crm_cost_plan_ams_external_monthly_d
       where cost_plan_ams_external_monthly_id = ${inputId}
         and is_active = true
       limit 1
    `;
    const row = rows[0];
    if (row) await this.crmAccess!.assertOrganizationCapability(await this.crmAccess!.actorForUser(currentUserId), 'canConfirmCostPlan', row.ownerOrganizationId ?? null);
    return row ?? null;
  }

  private async findAmsExternalMonthlyInputByBasis(
    targetYear: number,
    businessType: string,
    industryLine: string,
    ownerName: string,
    regionCode: Exclude<CrmCostPlanPreviewRegion, 'all'>,
    wbsCode: string,
    vendorName: string,
    organizationId: bigint,
  ): Promise<CostPlanAmsExternalMonthlyLedgerRow | null> {
    const client = this.db?.client;
    if (!client) {
      return null;
    }
    const rows = await client.$queryRaw<CostPlanAmsExternalMonthlyLedgerRow[]>`
      select cost_plan_ams_external_monthly_id as "id",
             owner_organization_id as "ownerOrganizationId",
             target_year as "targetYear",
             business_type as "businessType",
             industry_line as "industryLine",
             owner_name as "ownerName",
             region_code as "regionCode",
             wbs_code as "wbsCode",
             vendor_name as "vendorName",
             vendor_contract_no as "vendorContractNo",
             monthly_plan_amounts as "monthlyPlanAmounts",
             monthly_actual_amounts as "monthlyActualAmounts",
             plan_amount_total as "planAmountTotal",
             actual_amount_total as "actualAmountTotal",
             gap_amount_total as "gapAmountTotal",
             status_code as "statusCode",
             confirmed,
             confirmed_at as "confirmedAt",
             confirmed_by as "confirmedBy",
             memo,
             updated_at as "updatedAt"
        from crm.crm_cost_plan_ams_external_monthly_d
       where owner_organization_id = ${organizationId}
         and target_year = ${targetYear}
         and business_type = ${businessType}
         and industry_line = ${industryLine}
         and owner_name = ${ownerName}
         and region_code = ${regionCode}
         and wbs_code = ${wbsCode}
         and vendor_name = ${vendorName}
         and is_active = true
       limit 1
    `;
    return rows[0] ?? null;
  }

  private createAmsVendorMappingLookup(rows: CostPlanAmsVendorWbsMappingLedgerRow[]): Map<string, CostPlanAmsVendorWbsMappingLedgerRow> {
    return new Map(rows.map((row) => [
      this.createGroupKey({
        businessType: row.businessType,
        industryLine: row.industryLine,
        ownerName: row.ownerName,
        region: this.toRegion(row.regionCode),
        wbsCode: row.wbsCode,
      }),
      row,
    ]));
  }

  private toInternalMonthlyInput(row: CostPlanInternalMonthlyLedgerRow): CrmCostPlanInternalMonthlyInput {
    return {
      ownerOrganizationId: row.ownerOrganizationId?.toString(),
      id: row.id.toString(),
      targetYear: row.targetYear,
      businessType: row.businessType,
      industryLine: row.industryLine,
      ownerName: row.ownerName,
      region: this.toRegion(row.regionCode),
      wbsCode: row.wbsCode?.trim() || undefined,
      monthlyPlanAmounts: this.resolveMonthlyAmounts(row.monthlyPlanAmounts),
      monthlyActualAmounts: this.resolveMonthlyAmounts(row.monthlyActualAmounts),
      planAmountTotal: this.toNumber(row.planAmountTotal),
      actualAmountTotal: this.toNumber(row.actualAmountTotal),
      gapAmountTotal: this.toNumber(row.gapAmountTotal),
      status: row.confirmed || row.statusCode === 'confirmed' ? 'confirmed' : 'draft',
      confirmed: Boolean(row.confirmed),
      confirmedAt: row.confirmedAt ? this.toIsoString(row.confirmedAt) : undefined,
      memo: row.memo ?? undefined,
      updatedAt: this.toIsoString(row.updatedAt),
    };
  }

  private toInternalSourceGrid(
    targetYear: number,
    rows: CostPlanInternalSourceItemLedgerRow[],
  ): CrmCostPlanInternalSourceGrid {
    const rowByCode = new Map(rows.map((row) => [row.itemCode, row]));
    return {
      targetYear,
      items: CRM_COST_PLAN_INTERNAL_SOURCE_ITEMS.map((definition) => {
        const row = rowByCode.get(definition.code);
        const monthlyPlanAmounts = this.resolveSignedMonthlyAmounts(row?.monthlyPlanAmounts);
        const monthlyActualAmounts = this.resolveSignedMonthlyAmounts(row?.monthlyActualAmounts);
        const planAmountTotal = monthlyPlanAmounts.reduce((sum, amount) => sum + amount, 0);
        const actualAmountTotal = monthlyActualAmounts.reduce((sum, amount) => sum + amount, 0);
        return {
          ...(row ? { id: row.id.toString() } : {}),
          itemCode: definition.code,
          itemName: definition.name,
          monthlyPlanAmounts,
          monthlyActualAmounts,
          planAmountTotal,
          actualAmountTotal,
          differenceAmountTotal: planAmountTotal - actualAmountTotal,
          ...(row ? { updatedAt: this.toIsoString(row.updatedAt) } : {}),
        };
      }),
      boundaryNotice: CRM_COST_PLAN_INTERNAL_SOURCE_GRID_BOUNDARY_NOTICE,
    };
  }

  private toAmsVendorMapping(row: CostPlanAmsVendorWbsMappingLedgerRow): CrmCostPlanAmsVendorWbsMapping {
    return {
      ownerOrganizationId: row.ownerOrganizationId?.toString(),
      id: row.id.toString(),
      targetYear: row.targetYear,
      businessType: row.businessType,
      industryLine: row.industryLine,
      ownerName: row.ownerName,
      region: this.toRegion(row.regionCode),
      wbsCode: row.wbsCode,
      vendorName: row.vendorName,
      vendorContractNo: row.vendorContractNo?.trim() || undefined,
      memo: row.memo ?? undefined,
      updatedAt: this.toIsoString(row.updatedAt),
    };
  }

  private toAmsExternalMonthlyInput(row: CostPlanAmsExternalMonthlyLedgerRow): CrmCostPlanAmsExternalMonthlyInput {
    return {
      ownerOrganizationId: row.ownerOrganizationId?.toString(),
      id: row.id.toString(),
      targetYear: row.targetYear,
      businessType: row.businessType,
      industryLine: row.industryLine,
      ownerName: row.ownerName,
      region: this.toRegion(row.regionCode),
      wbsCode: row.wbsCode,
      vendorName: row.vendorName,
      vendorContractNo: row.vendorContractNo?.trim() || undefined,
      monthlyPlanAmounts: this.resolveMonthlyAmounts(row.monthlyPlanAmounts),
      monthlyActualAmounts: this.resolveMonthlyAmounts(row.monthlyActualAmounts),
      planAmountTotal: this.toNumber(row.planAmountTotal),
      actualAmountTotal: this.toNumber(row.actualAmountTotal),
      gapAmountTotal: this.toNumber(row.gapAmountTotal),
      status: row.confirmed || row.statusCode === 'confirmed' ? 'confirmed' : 'draft',
      confirmed: Boolean(row.confirmed),
      confirmedAt: row.confirmedAt ? this.toIsoString(row.confirmedAt) : undefined,
      memo: row.memo ?? undefined,
      updatedAt: this.toIsoString(row.updatedAt),
    };
  }

  private normalizeInputYear(value: number): number {
    const year = Number(value);
    if (!Number.isFinite(year) || year < 2000) {
      throw new BadRequestException('사업년도는 2000년 이후 숫자여야 합니다.');
    }
    return Math.trunc(year);
  }

  private normalizeLedgerId(value: string, label: string): bigint {
    try {
      const id = BigInt(value);
      if (id <= 0n) {
        throw new Error('invalid id');
      }
      return id;
    } catch {
      throw new BadRequestException(`${label} ID가 올바르지 않습니다.`);
    }
  }

  private normalizeRequiredText(value: string, label: string, maxLength: number): string {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`${label} 값이 필요합니다.`);
    }
    return normalized.slice(0, maxLength);
  }

  private normalizeInputRegion(value: Exclude<CrmCostPlanPreviewRegion, 'all'>): Exclude<CrmCostPlanPreviewRegion, 'all'> {
    if (value === 'domestic' || value === 'overseas' || value === 'unspecified') {
      return value;
    }
    throw new BadRequestException('원가/AMS 입력 지역은 domestic, overseas 또는 unspecified여야 합니다.');
  }

  private normalizeMonthlyAmounts(values: number[], subject: string, label: string): number[] {
    if (!Array.isArray(values) || values.length !== 12) {
      throw new BadRequestException(`${subject} ${label} 금액은 12개월 배열이어야 합니다.`);
    }
    return values.map((value, index) => {
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount < 0) {
        throw new BadRequestException(`${subject} ${label} ${index + 1}월 금액은 0 이상 숫자여야 합니다.`);
      }
      return Math.round(amount);
    });
  }

  private normalizeSignedMonthlyAmounts(values: number[], subject: string, label: string): number[] {
    if (!Array.isArray(values) || values.length !== 12) {
      throw new BadRequestException(`${subject} ${label} 금액은 12개월 배열이어야 합니다.`);
    }
    return values.map((value, index) => {
      const amount = Number(value);
      if (!Number.isFinite(amount) || !Number.isSafeInteger(Math.round(amount))) {
        throw new BadRequestException(`${subject} ${label} ${index + 1}월 금액은 안전한 숫자여야 합니다.`);
      }
      return Math.round(amount);
    });
  }

  private resolveMonthlyAmounts(value: unknown): number[] {
    const source = typeof value === 'string' ? this.tryParseJson(value) : value;
    if (!Array.isArray(source)) {
      return Array.from({ length: 12 }, () => 0);
    }
    return Array.from({ length: 12 }, (_, index) => {
      const amount = Number(source[index] ?? 0);
      return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : 0;
    });
  }

  private resolveSignedMonthlyAmounts(value: unknown): number[] {
    const source = typeof value === 'string' ? this.tryParseJson(value) : value;
    if (!Array.isArray(source)) {
      return Array.from({ length: 12 }, () => 0);
    }
    return Array.from({ length: 12 }, (_, index) => {
      const amount = Number(source[index] ?? 0);
      return Number.isFinite(amount) && Number.isSafeInteger(Math.round(amount)) ? Math.round(amount) : 0;
    });
  }

  private tryParseJson(value: string): unknown {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }

  private toRegion(value: string): Exclude<CrmCostPlanPreviewRegion, 'all'> {
    return value === 'unspecified' ? 'unspecified' : value === 'overseas' ? 'overseas' : 'domestic';
  }

  private toIdString(value: bigint | number | string): string {
    return value.toString();
  }

  private toOptionalIdString(value: bigint | number | string | null | undefined): string | undefined {
    return value === null || value === undefined ? undefined : value.toString();
  }

  private toNumber(value: bigint | number | string | null | undefined): number {
    if (typeof value === 'bigint') {
      return Number(value);
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private toIsoString(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
  }

  private normalizeQuery(query: CrmCostPlanPreviewQuery): NormalizedCostPlanPreviewQuery {
    const rawYear = Number(query.year ?? new Date().getFullYear());
    const year = Number.isFinite(rawYear) && rawYear >= 2000 ? Math.trunc(rawYear) : new Date().getFullYear();
    const region = query.region && ['all', 'domestic', 'overseas', 'unspecified'].includes(query.region) ? query.region : 'all';
    return {
      ownerOrganizationId: query.ownerOrganizationId ?? '',
      year,
      businessType: query.businessType?.trim() ?? '',
      industryLine: query.industryLine?.trim() ?? '',
      region,
      search: query.search?.trim() ?? '',
    };
  }

  private createEmptyMonth(month: number): CrmCostPlanPreviewMonth {
    return {
      month,
      pipelineInternalCostAmount: 0,
      pipelineExternalCostAmount: 0,
      contractInternalCostAmount: 0,
      internalCostPlanInputAmount: 0,
      internalCostActualInputAmount: 0,
      internalCostGapAmount: 0,
      contractExternalPlanAmount: 0,
      contractExternalActualAmount: 0,
      amsExternalCostPlanInputAmount: 0,
      amsExternalCostActualInputAmount: 0,
      amsExternalCostGapAmount: 0,
      externalCostPlanCandidateAmount: 0,
      externalCostGapAmount: 0,
    };
  }

  private toYearMonth(value: string): { year: number; month: number } | null {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
    };
  }

  private toSortedUniqueOptions(values: string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, 'ko-KR'));
  }
}
