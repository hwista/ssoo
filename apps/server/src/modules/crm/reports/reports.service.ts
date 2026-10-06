import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import type {
  CrmContractPerformanceQuery,
  CrmContractPerformanceRow,
  CrmOpportunity,
  CrmReportsAttentionItem,
  CrmReportsBreakdown,
  CrmReportsBreakdownKind,
  CrmReportsConfirmation,
  CrmReportsConfirmationSummary,
  CrmReportsConfirmRequest,
  CrmReportsMonthlyTrend,
  CrmReportsPreviewQuery,
  CrmReportsPreviewRegion,
  CrmReportsPreviewResponse,
  CrmReportsPreviewSummary,
} from '@ssoo/types/crm';
import { CrmAccessService } from '../access/access.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { DatabaseService } from '../../../database/database.service.js';
import { ContractService } from '../contract/contract.service.js';
import { OpportunityService } from '../opportunity/opportunity.service.js';

const REPORT_REGIONS: CrmReportsPreviewRegion[] = ['all', 'domestic', 'overseas', 'unspecified'];
const CRM_REPORTS_BOUNDARY_NOTICE = 'CRM 보고 Preview는 영업기회 pipeline과 확정 계약 청구계획/실적 read model을 집계합니다. 보고 확정은 CRM snapshot 원장만 저장하며 전자결재, 회계 전표, PMS 수행 지표, DMS 문서 저장 상태는 이 화면에서 확정하지 않습니다.';
const CRM_REPORTS_CONFIRMATION_BOUNDARY_NOTICE = 'CRM 보고 확정은 현재 Preview 결과를 CRM 보고 snapshot 원장으로 저장합니다. 회계 전표, PMS 수행 KPI, DMS 문서 저장 확정은 별도 후속 경계입니다.';
const CRM_REPORTS_UNAVAILABLE_ACTIONS = ['회계 전표 생성', 'PMS 수행 KPI 편집', 'DMS 문서 저장 확정', '사업계획 원장 확정'];

type NormalizedReportsQuery = Required<Omit<CrmReportsPreviewQuery, 'ownerOrganizationId'>> & Pick<CrmReportsPreviewQuery, 'ownerOrganizationId'>;

interface BreakdownDraft {
  id: string;
  kind: CrmReportsBreakdownKind;
  label: string;
  opportunityCount: number;
  contractIds: Set<string>;
  pipelineRevenueTotal: number;
  pipelineMarginTotal: number;
  planRevenueTotal: number;
  planMarginTotal: number;
  actualRevenueTotal: number;
  actualMarginTotal: number;
}

interface CrmReportConfirmationLedgerRow {
  ownerOrganizationId: bigint | null;
  id: bigint | number | string;
  targetYear: number;
  businessType: string;
  industryLine: string;
  regionCode: CrmReportsPreviewRegion;
  searchText: string;
  statusCode: 'confirmed' | 'reopened';
  querySnapshot: unknown;
  summarySnapshot: unknown;
  monthlyTrendSnapshot: unknown;
  breakdownsSnapshot: unknown;
  attentionItemsSnapshot: unknown;
  opportunityCount: number | bigint;
  contractCount: number | bigint;
  breakdownCount: number | bigint;
  attentionItemCount: number | bigint;
  pipelineRevenueTotal: number | bigint;
  planRevenueTotal: number | bigint;
  actualRevenueTotal: number | bigint;
  revenueDelta: number | bigint;
  marginDelta: number | bigint;
  memo: string | null;
  confirmedAt: Date | string;
  reopenedAt: Date | string | null;
  updatedAt: Date | string;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly opportunityService: OpportunityService,
    private readonly contractService: ContractService,
    @Optional() private readonly db?: DatabaseService,
    private readonly crmAccess?: CrmAccessService,
  ) {}

  async getPreview(query: CrmReportsPreviewQuery = {}, currentUser?: TokenPayload): Promise<CrmReportsPreviewResponse> {
    const organizationId = currentUser ? await this.crmAccess!.resolveReadOrganization(currentUser, query.ownerOrganizationId) : null;
    if (currentUser) await this.crmAccess!.assertOrganizationCapability(currentUser, 'canReadReport', organizationId);
    const normalized = this.normalizeQuery({ ...query, ownerOrganizationId: organizationId?.toString() });
    const [preview, latestConfirmation] = await Promise.all([
      this.buildPreview(normalized, currentUser, organizationId ?? undefined),
      this.loadLatestConfirmation(normalized),
    ]);

    return {
      ...preview,
      summary: {
        ...preview.summary,
        latestConfirmation,
      },
    };
  }

  async confirmReport(
    request: CrmReportsConfirmRequest,
    currentUserId?: bigint,
  ): Promise<{ confirmation: CrmReportsConfirmation; boundaryNotice: string }> {
    const db = this.requireDb();
    const { user, organizationId } = await this.crmAccess!.resolveWriteOrganization(currentUserId, request.ownerOrganizationId, 'canConfirmReport');
    const normalized = this.normalizeQuery({ ...request, ownerOrganizationId: organizationId.toString() });
    const preview = await this.buildPreview(normalized, user, organizationId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { latestConfirmation: _latestConfirmation, ...summarySnapshot } = preview.summary;
    const memo = this.optionalText(request.memo, 1000);
    const transactionId = randomUUID();

    const rows = await db.$transaction(async (tx) => {
      await tx.$executeRaw`
        update crm.crm_report_confirmation_m
           set status_code = 'reopened',
               is_active = false,
               reopened_by = ${currentUserId ?? null},
               reopened_at = now(),
               updated_at = now(),
               last_source = 'crm.reports',
               last_activity = 'report-confirm-replaced',
               transaction_id = ${transactionId}::uuid
         where owner_organization_id is not distinct from ${normalized.ownerOrganizationId ? BigInt(normalized.ownerOrganizationId) : null}
           and target_year = ${normalized.year}
           and business_type = ${normalized.businessType}
           and industry_line = ${normalized.industryLine}
           and region_code = ${normalized.region}
           and search_text = ${normalized.search}
           and status_code = 'confirmed'
           and is_active = true
      `;

      return tx.$queryRaw<CrmReportConfirmationLedgerRow[]>`
        insert into crm.crm_report_confirmation_m (
          owner_organization_id, target_year, business_type, industry_line, region_code, search_text, status_code,
          query_snapshot, summary_snapshot, monthly_trend_snapshot, breakdowns_snapshot, attention_items_snapshot,
          opportunity_count, contract_count, breakdown_count, attention_item_count,
          pipeline_revenue_total, plan_revenue_total, actual_revenue_total, revenue_delta, margin_delta,
          memo, confirmed_by, last_source, last_activity, transaction_id
        )
        values (
          ${organizationId}, ${normalized.year}, ${normalized.businessType}, ${normalized.industryLine}, ${normalized.region}, ${normalized.search}, 'confirmed',
          ${JSON.stringify(normalized)}::jsonb,
          ${JSON.stringify(summarySnapshot)}::jsonb,
          ${JSON.stringify(preview.monthlyTrend)}::jsonb,
          ${JSON.stringify(preview.breakdowns)}::jsonb,
          ${JSON.stringify(preview.attentionItems)}::jsonb,
          ${preview.summary.opportunityCount}, ${preview.summary.contractCount}, ${preview.breakdowns.length}, ${preview.attentionItems.length},
          ${BigInt(preview.summary.pipelineRevenueTotal)}, ${BigInt(preview.summary.planRevenueTotal)}, ${BigInt(preview.summary.actualRevenueTotal)},
          ${BigInt(preview.summary.revenueDelta)}, ${BigInt(preview.summary.marginDelta)},
          ${memo}, ${currentUserId ?? null}, 'crm.reports', 'report-confirm', ${transactionId}::uuid
        )
        returning
          report_confirmation_id as "id",
          owner_organization_id as "ownerOrganizationId",
          target_year as "targetYear",
          business_type as "businessType",
          industry_line as "industryLine",
          region_code as "regionCode",
          search_text as "searchText",
          status_code as "statusCode",
          query_snapshot as "querySnapshot",
          summary_snapshot as "summarySnapshot",
          monthly_trend_snapshot as "monthlyTrendSnapshot",
          breakdowns_snapshot as "breakdownsSnapshot",
          attention_items_snapshot as "attentionItemsSnapshot",
          opportunity_count as "opportunityCount",
          contract_count as "contractCount",
          breakdown_count as "breakdownCount",
          attention_item_count as "attentionItemCount",
          pipeline_revenue_total as "pipelineRevenueTotal",
          plan_revenue_total as "planRevenueTotal",
          actual_revenue_total as "actualRevenueTotal",
          revenue_delta as "revenueDelta",
          margin_delta as "marginDelta",
          memo,
          confirmed_at as "confirmedAt",
          reopened_at as "reopenedAt",
          updated_at as "updatedAt"
      `;
    });

    return {
      confirmation: this.toConfirmation(rows[0]),
      boundaryNotice: CRM_REPORTS_CONFIRMATION_BOUNDARY_NOTICE,
    };
  }

  async reopenReportConfirmation(
    confirmationId: string,
    currentUserId?: bigint,
  ): Promise<{ confirmation: CrmReportsConfirmation; boundaryNotice: string }> {
    const db = this.requireDb();
    const id = this.toBigIntId(confirmationId);
    const user = await this.crmAccess!.actorForUser(currentUserId);
    const target = await db.client.crmReportConfirmation.findUnique({ where: { id }, select: { ownerOrganizationId: true } });
    if (!target) throw new NotFoundException('CRM report confirmation not found');
    await this.crmAccess!.assertOrganizationCapability(user, 'canConfirmReport', target.ownerOrganizationId);
    const transactionId = randomUUID();
    const rows = await db.$queryRaw<CrmReportConfirmationLedgerRow[]>`
      update crm.crm_report_confirmation_m
         set status_code = 'reopened',
             is_active = false,
             reopened_by = ${currentUserId ?? null},
             reopened_at = now(),
             updated_at = now(),
             last_source = 'crm.reports',
             last_activity = 'report-reopen',
             transaction_id = ${transactionId}::uuid
       where report_confirmation_id = ${id}
         and status_code = 'confirmed'
         and is_active = true
      returning
        report_confirmation_id as "id",
          owner_organization_id as "ownerOrganizationId",
        target_year as "targetYear",
        business_type as "businessType",
        industry_line as "industryLine",
        region_code as "regionCode",
        search_text as "searchText",
        status_code as "statusCode",
        query_snapshot as "querySnapshot",
        summary_snapshot as "summarySnapshot",
        monthly_trend_snapshot as "monthlyTrendSnapshot",
        breakdowns_snapshot as "breakdownsSnapshot",
        attention_items_snapshot as "attentionItemsSnapshot",
        opportunity_count as "opportunityCount",
        contract_count as "contractCount",
        breakdown_count as "breakdownCount",
        attention_item_count as "attentionItemCount",
        pipeline_revenue_total as "pipelineRevenueTotal",
        plan_revenue_total as "planRevenueTotal",
        actual_revenue_total as "actualRevenueTotal",
        revenue_delta as "revenueDelta",
        margin_delta as "marginDelta",
        memo,
        confirmed_at as "confirmedAt",
        reopened_at as "reopenedAt",
        updated_at as "updatedAt"
    `;
    if (rows.length === 0) {
      throw new NotFoundException('CRM report confirmation not found');
    }

    return {
      confirmation: this.toConfirmation(rows[0]),
      boundaryNotice: CRM_REPORTS_CONFIRMATION_BOUNDARY_NOTICE,
    };
  }

  private async buildPreview(normalized: NormalizedReportsQuery, currentUser?: TokenPayload, organizationId?: bigint): Promise<CrmReportsPreviewResponse> {
    const [opportunityResponse, performanceResponse] = await Promise.all([
      this.opportunityService.listResponse({ sort: 'updated-desc' }, currentUser, organizationId),
      this.contractService.getMonthlyPerformance(this.toPerformanceQuery(normalized), currentUser, organizationId),
    ]);
    const opportunities = this.filterOpportunities(opportunityResponse.items, normalized);
    const performanceRows = performanceResponse.items;
    const monthlyTrend = this.buildMonthlyTrend(performanceRows);
    const breakdowns = this.buildBreakdowns(opportunities, performanceRows);

    return {
      summary: {
        year: normalized.year,
        opportunityCount: opportunities.length,
        contractCount: performanceResponse.summary.contractCount,
        pipelineRevenueTotal: opportunities.reduce((sum, item) => sum + item.revenueTotal, 0),
        pipelineMarginTotal: opportunities.reduce((sum, item) => sum + item.marginTotal, 0),
        planRevenueTotal: performanceResponse.summary.planRevenueTotal,
        planMarginTotal: performanceResponse.summary.planMarginTotal,
        actualRevenueTotal: performanceResponse.summary.actualRevenueTotal,
        actualMarginTotal: performanceResponse.summary.actualMarginTotal,
        revenueDelta: performanceResponse.summary.revenueDelta,
        marginDelta: performanceResponse.summary.marginDelta,
        revenueAchievementRate: performanceResponse.summary.revenueAchievementRate,
        marginAchievementRate: this.toAchievementRate(performanceResponse.summary.actualMarginTotal, performanceResponse.summary.planMarginTotal),
        activeFilters: normalized,
        businessTypeOptions: performanceResponse.summary.businessTypeOptions,
        industryLineOptions: performanceResponse.summary.industryLineOptions,
        boundaryNotice: CRM_REPORTS_BOUNDARY_NOTICE,
        unavailableActions: CRM_REPORTS_UNAVAILABLE_ACTIONS,
        latestConfirmation: null,
      },
      monthlyTrend,
      breakdowns,
      attentionItems: this.buildAttentionItems(opportunities, performanceRows, normalized.year),
    };
  }

  private async loadLatestConfirmation(normalized: NormalizedReportsQuery): Promise<CrmReportsConfirmationSummary | null> {
    if (!this.db) {
      return null;
    }
    const rows = await this.db.$queryRaw<CrmReportConfirmationLedgerRow[]>`
      select report_confirmation_id as "id",
          owner_organization_id as "ownerOrganizationId",
             target_year as "targetYear",
             business_type as "businessType",
             industry_line as "industryLine",
             region_code as "regionCode",
             search_text as "searchText",
             status_code as "statusCode",
             query_snapshot as "querySnapshot",
             summary_snapshot as "summarySnapshot",
             monthly_trend_snapshot as "monthlyTrendSnapshot",
             breakdowns_snapshot as "breakdownsSnapshot",
             attention_items_snapshot as "attentionItemsSnapshot",
             opportunity_count as "opportunityCount",
             contract_count as "contractCount",
             breakdown_count as "breakdownCount",
             attention_item_count as "attentionItemCount",
             pipeline_revenue_total as "pipelineRevenueTotal",
             plan_revenue_total as "planRevenueTotal",
             actual_revenue_total as "actualRevenueTotal",
             revenue_delta as "revenueDelta",
             margin_delta as "marginDelta",
             memo,
             confirmed_at as "confirmedAt",
             reopened_at as "reopenedAt",
             updated_at as "updatedAt"
        from crm.crm_report_confirmation_m
       where owner_organization_id is not distinct from ${normalized.ownerOrganizationId ? BigInt(normalized.ownerOrganizationId) : null}
           and target_year = ${normalized.year}
         and business_type = ${normalized.businessType}
         and industry_line = ${normalized.industryLine}
         and region_code = ${normalized.region}
         and search_text = ${normalized.search}
         and status_code = 'confirmed'
         and is_active = true
       order by confirmed_at desc, report_confirmation_id desc
       limit 1
    `;
    return rows[0] ? this.toConfirmationSummary(rows[0]) : null;
  }

  private buildMonthlyTrend(rows: CrmContractPerformanceRow[]): CrmReportsMonthlyTrend[] {
    return Array.from({ length: 12 }, (_, index) => {
      const month = rows.reduce((total, row) => {
        const current = row.months[index];
        if (!current) {
          return total;
        }
        total.planRevenueAmount += current.planRevenueAmount;
        total.planExternalCostAmount += current.planExternalCostAmount;
        total.planMarginAmount += current.planMarginAmount;
        total.actualRevenueAmount += current.actualRevenueAmount;
        total.actualExternalCostAmount += current.actualExternalCostAmount;
        total.actualMarginAmount += current.actualMarginAmount;
        total.revenueDelta += current.revenueDelta;
        total.marginDelta += current.marginDelta;
        return total;
      }, this.createTrendMonth(index + 1));

      return {
        ...month,
        revenueAchievementRate: this.toAchievementRate(month.actualRevenueAmount, month.planRevenueAmount),
      };
    });
  }

  private buildBreakdowns(
    opportunities: CrmOpportunity[],
    rows: CrmContractPerformanceRow[],
  ): CrmReportsBreakdown[] {
    const drafts = new Map<string, BreakdownDraft>();

    for (const opportunity of opportunities) {
      for (const key of this.getOpportunityBreakdownKeys(opportunity)) {
        const draft = this.getBreakdownDraft(drafts, key.kind, key.label);
        draft.opportunityCount += 1;
        draft.pipelineRevenueTotal += opportunity.revenueTotal;
        draft.pipelineMarginTotal += opportunity.marginTotal;
      }
    }

    for (const row of rows) {
      for (const key of this.getContractBreakdownKeys(row)) {
        const draft = this.getBreakdownDraft(drafts, key.kind, key.label);
        draft.contractIds.add(row.contractId);
        draft.planRevenueTotal += row.total.planRevenueAmount;
        draft.planMarginTotal += row.total.planMarginAmount;
        draft.actualRevenueTotal += row.total.actualRevenueAmount;
        draft.actualMarginTotal += row.total.actualMarginAmount;
      }
    }

    return [...drafts.values()]
      .map((draft) => this.toBreakdown(draft))
      .filter((item) => (
        item.opportunityCount > 0
        || item.contractCount > 0
        || item.planRevenueTotal > 0
        || item.actualRevenueTotal > 0
      ))
      .sort((left, right) => {
        const leftAmount = left.pipelineRevenueTotal + left.planRevenueTotal + left.actualRevenueTotal;
        const rightAmount = right.pipelineRevenueTotal + right.planRevenueTotal + right.actualRevenueTotal;
        if (rightAmount !== leftAmount) {
          return rightAmount - leftAmount;
        }
        return left.label.localeCompare(right.label, 'ko');
      })
      .slice(0, 18);
  }

  private buildAttentionItems(
    opportunities: CrmOpportunity[],
    rows: CrmContractPerformanceRow[],
    year: number,
  ): CrmReportsAttentionItem[] {
    const opportunityItems = opportunities
      .filter((item) => !item.confirmed && item.revenueTotal > 0 && item.status !== 'lost' && item.status !== 'hold')
      .map((item): CrmReportsAttentionItem => ({
        id: item.id,
        kind: 'opportunity',
        title: item.opportunityName,
        customerName: item.customerName,
        ownerName: item.ownerName,
        statusLabel: this.toOpportunityStatusLabel(item.status),
        reason: 'pipeline 계획 후보이나 아직 확정되지 않았습니다.',
        amount: item.revenueTotal,
        href: `/?selected=${encodeURIComponent(item.id)}`,
        updatedAt: item.updatedAt,
      }));
    const contractItems = rows
      .filter((row) => row.total.planRevenueAmount > 0 && row.total.actualRevenueAmount < row.total.planRevenueAmount)
      .map((row): CrmReportsAttentionItem => ({
        id: row.contractId,
        kind: 'contract',
        title: row.contractName,
        customerName: row.customerName,
        ownerName: row.ownerName,
        statusLabel: '계약 실적 Gap',
        reason: '확정 계약 청구실적이 계획보다 낮습니다.',
        amount: row.total.revenueDelta,
        href: `/contract-performance?year=${year}&search=${encodeURIComponent(row.contractName)}`,
        updatedAt: row.contractEndDate,
      }));

    return [...opportunityItems, ...contractItems]
      .sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount))
      .slice(0, 8);
  }

  private filterOpportunities(opportunities: CrmOpportunity[], query: NormalizedReportsQuery): CrmOpportunity[] {
    const search = query.search.toLowerCase();
    return opportunities.filter((item) => {
      if (item.status === 'lost' || item.status === 'hold') {
        return false;
      }
      if (query.businessType && item.businessType !== query.businessType) {
        return false;
      }
      if (query.industryLine && item.industryLine !== query.industryLine) {
        return false;
      }
      if (query.region !== 'all' && item.region !== query.region) {
        return false;
      }
      if (!this.isDateInYear(item.expectedStartDate, query.year) && !this.isDateInYear(item.expectedEndDate, query.year)) {
        return false;
      }
      if (!search) {
        return true;
      }
      return [
        item.id,
        item.customerName,
        item.opportunityName,
        item.ownerName,
        item.businessType,
        item.industryLine,
        item.contractCode ?? '',
      ].some((value) => value.toLowerCase().includes(search));
    });
  }

  private toPerformanceQuery(query: NormalizedReportsQuery): Required<CrmContractPerformanceQuery> {
    return {
      mode: 'operations',
      year: query.year,
      businessType: query.businessType,
      industryLine: query.industryLine,
      region: query.region,
      search: query.search,
    };
  }

  private normalizeQuery(query: CrmReportsPreviewQuery): NormalizedReportsQuery {
    const yearValue = Number(query.year ?? new Date().getFullYear());
    const year = Number.isFinite(yearValue) && yearValue >= 2000 && yearValue <= 2100
      ? Math.trunc(yearValue)
      : new Date().getFullYear();
    const region = REPORT_REGIONS.includes(query.region as CrmReportsPreviewRegion)
      ? query.region as CrmReportsPreviewRegion
      : 'all';

    return {
      ...(query.ownerOrganizationId ? { ownerOrganizationId: query.ownerOrganizationId } : {}),
      year,
      businessType: this.optionalText(query.businessType, 120) ?? '',
      industryLine: this.optionalText(query.industryLine, 120) ?? '',
      region,
      search: this.optionalText(query.search, 200) ?? '',
    };
  }

  private getOpportunityBreakdownKeys(item: CrmOpportunity): Array<{ kind: CrmReportsBreakdownKind; label: string }> {
    return [
      { kind: 'business-type', label: item.businessType || '미분류 사업구분' },
      { kind: 'owner', label: item.ownerName || '담당자 미지정' },
      { kind: 'wbs', label: item.contractCode || '계약 전 pipeline' },
    ];
  }

  private getContractBreakdownKeys(row: CrmContractPerformanceRow): Array<{ kind: CrmReportsBreakdownKind; label: string }> {
    return [
      { kind: 'business-type', label: row.businessType || '미분류 사업구분' },
      { kind: 'owner', label: row.ownerName || '담당자 미지정' },
      { kind: 'wbs', label: row.wbsCode || 'WBS 미지정' },
    ];
  }

  private getBreakdownDraft(
    drafts: Map<string, BreakdownDraft>,
    kind: CrmReportsBreakdownKind,
    label: string,
  ): BreakdownDraft {
    const normalizedLabel = label.trim() || '미지정';
    const id = `${kind}:${normalizedLabel}`;
    const existing = drafts.get(id);
    if (existing) {
      return existing;
    }
    const draft: BreakdownDraft = {
      id,
      kind,
      label: normalizedLabel,
      opportunityCount: 0,
      contractIds: new Set<string>(),
      pipelineRevenueTotal: 0,
      pipelineMarginTotal: 0,
      planRevenueTotal: 0,
      planMarginTotal: 0,
      actualRevenueTotal: 0,
      actualMarginTotal: 0,
    };
    drafts.set(id, draft);
    return draft;
  }

  private toBreakdown(draft: BreakdownDraft): CrmReportsBreakdown {
    const revenueDelta = draft.actualRevenueTotal - draft.planRevenueTotal;
    const marginDelta = draft.actualMarginTotal - draft.planMarginTotal;
    return {
      id: draft.id,
      kind: draft.kind,
      label: draft.label,
      opportunityCount: draft.opportunityCount,
      contractCount: draft.contractIds.size,
      pipelineRevenueTotal: draft.pipelineRevenueTotal,
      pipelineMarginTotal: draft.pipelineMarginTotal,
      planRevenueTotal: draft.planRevenueTotal,
      planMarginTotal: draft.planMarginTotal,
      actualRevenueTotal: draft.actualRevenueTotal,
      actualMarginTotal: draft.actualMarginTotal,
      revenueDelta,
      marginDelta,
      revenueAchievementRate: this.toAchievementRate(draft.actualRevenueTotal, draft.planRevenueTotal),
      marginAchievementRate: this.toAchievementRate(draft.actualMarginTotal, draft.planMarginTotal),
      href: this.toBreakdownHref(draft.kind, draft.label),
    };
  }

  private createTrendMonth(month: number): CrmReportsMonthlyTrend {
    return {
      month,
      planRevenueAmount: 0,
      planExternalCostAmount: 0,
      planMarginAmount: 0,
      actualRevenueAmount: 0,
      actualExternalCostAmount: 0,
      actualMarginAmount: 0,
      revenueDelta: 0,
      marginDelta: 0,
      revenueAchievementRate: 0,
    };
  }

  private toBreakdownHref(kind: CrmReportsBreakdownKind, label: string): string {
    if (kind === 'wbs') {
      return `/contract-performance?search=${encodeURIComponent(label)}`;
    }
    if (kind === 'owner') {
      return `/?search=${encodeURIComponent(label)}`;
    }
    return `/contract-performance?businessType=${encodeURIComponent(label)}`;
  }

  private isDateInYear(dateText: string | undefined, year: number): boolean {
    return Boolean(dateText?.startsWith(`${year}-`));
  }

  private optionalText(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, maxLength) : null;
  }

  private toAchievementRate(actual: number, plan: number): number {
    if (plan === 0) {
      return actual > 0 ? 100 : 0;
    }
    return Math.round((actual / plan) * 10000) / 100;
  }

  private toOpportunityStatusLabel(status: CrmOpportunity['status']): string {
    const labels: Record<CrmOpportunity['status'], string> = {
      draft: '초안',
      qualified: '검증',
      proposal: '제안',
      won: '수주',
      lost: '실주',
      hold: '보류',
    };
    return labels[status];
  }

  private requireDb(): DatabaseService {
    if (!this.db) {
      throw new BadRequestException('CRM report confirmation ledger is not available in this runtime.');
    }
    return this.db;
  }

  private toBigIntId(id: string): bigint {
    try {
      const value = BigInt(id);
      if (value > 0n) {
        return value;
      }
    } catch {
      // fall through
    }
    throw new NotFoundException('CRM report confirmation not found');
  }

  private toConfirmation(row: CrmReportConfirmationLedgerRow): CrmReportsConfirmation {
    return {
      ...this.toConfirmationSummary(row),
      summarySnapshot: this.fromJson<Omit<CrmReportsPreviewSummary, 'latestConfirmation'>>(row.summarySnapshot, {
        year: row.targetYear,
        opportunityCount: this.toNumber(row.opportunityCount),
        contractCount: this.toNumber(row.contractCount),
        pipelineRevenueTotal: this.toNumber(row.pipelineRevenueTotal),
        pipelineMarginTotal: 0,
        planRevenueTotal: this.toNumber(row.planRevenueTotal),
        planMarginTotal: 0,
        actualRevenueTotal: this.toNumber(row.actualRevenueTotal),
        actualMarginTotal: 0,
        revenueDelta: this.toNumber(row.revenueDelta),
        marginDelta: this.toNumber(row.marginDelta),
        revenueAchievementRate: 0,
        marginAchievementRate: 0,
        activeFilters: this.toConfirmationQuery(row),
        businessTypeOptions: [],
        industryLineOptions: [],
        boundaryNotice: CRM_REPORTS_BOUNDARY_NOTICE,
        unavailableActions: CRM_REPORTS_UNAVAILABLE_ACTIONS,
      }),
      monthlyTrendSnapshot: this.fromJson<CrmReportsMonthlyTrend[]>(row.monthlyTrendSnapshot, []),
      breakdownsSnapshot: this.fromJson<CrmReportsBreakdown[]>(row.breakdownsSnapshot, []),
      attentionItemsSnapshot: this.fromJson<CrmReportsAttentionItem[]>(row.attentionItemsSnapshot, []),
    };
  }

  private toConfirmationSummary(row: CrmReportConfirmationLedgerRow): CrmReportsConfirmationSummary {
    return {
      id: row.id.toString(),
      ownerOrganizationId: row.ownerOrganizationId?.toString(),
      year: row.targetYear,
      status: row.statusCode,
      query: this.toConfirmationQuery(row),
      opportunityCount: this.toNumber(row.opportunityCount),
      contractCount: this.toNumber(row.contractCount),
      breakdownCount: this.toNumber(row.breakdownCount),
      attentionItemCount: this.toNumber(row.attentionItemCount),
      pipelineRevenueTotal: this.toNumber(row.pipelineRevenueTotal),
      planRevenueTotal: this.toNumber(row.planRevenueTotal),
      actualRevenueTotal: this.toNumber(row.actualRevenueTotal),
      revenueDelta: this.toNumber(row.revenueDelta),
      marginDelta: this.toNumber(row.marginDelta),
      memo: row.memo ?? undefined,
      confirmedAt: this.toIso(row.confirmedAt),
      reopenedAt: row.reopenedAt ? this.toIso(row.reopenedAt) : undefined,
      updatedAt: this.toIso(row.updatedAt),
    };
  }

  private toConfirmationQuery(row: CrmReportConfirmationLedgerRow): Required<Omit<CrmReportsPreviewQuery, 'ownerOrganizationId'>> & Pick<CrmReportsPreviewQuery, 'ownerOrganizationId'> {
    const query = this.fromJson<Required<Omit<CrmReportsPreviewQuery, 'ownerOrganizationId'>> & Pick<CrmReportsPreviewQuery, 'ownerOrganizationId'>>(row.querySnapshot, {
      year: row.targetYear,
      businessType: row.businessType,
      industryLine: row.industryLine,
      region: REPORT_REGIONS.includes(row.regionCode) ? row.regionCode : 'all',
      search: row.searchText,
    });
    return this.normalizeQuery({ ...query, ownerOrganizationId: row.ownerOrganizationId?.toString() });
  }

  private fromJson<T>(value: unknown, fallback: T): T {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        return fallback;
      }
    }
    return value && typeof value === 'object' ? value as T : fallback;
  }

  private toNumber(value: number | bigint): number {
    return typeof value === 'bigint' ? Number(value) : value;
  }

  private toIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : value;
  }
}
