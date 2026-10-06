import { PlatformAdmissionService } from '../../common/onboarding/platform-admission.service.js';
import { CrmAccessService } from '../access/access.service.js';
import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import type {
  CrmCustomer,
  CrmCustomerActivity,
  CrmCustomerActivityCreateRequest,
  CrmCustomerAiIndexBackfillItem,
  CrmCustomerAiIndexBackfillRequest,
  CrmCustomerAiIndexBackfillResponse,
  CrmCustomerActivityListQuery,
  CrmCustomerActivityListResponse,
  CrmCustomerActivityStatus,
  CrmCustomerActivityType,
  CrmCustomerListQuery,
  CrmCustomerListResponse,
  CrmCustomerRegion,
  CrmCustomerSort,
  CrmCustomerType,
  CrmCustomerUpsertRequest,
} from '@ssoo/types/crm';
import type { AiIndexJobType, AiIndexJsonObject } from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import { AiIndexingService } from '../../common/ai-index/ai-indexing.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';

const CUSTOMER_TYPES: CrmCustomerType[] = ['prospect', 'active', 'partner', 'inactive'];
const CUSTOMER_ACTIVITY_TYPES: CrmCustomerActivityType[] = [
  'call',
  'meeting',
  'email',
  'proposal',
  'contract',
  'support',
  'opportunity-next-action',
];
const CUSTOMER_ACTIVITY_STATUSES: CrmCustomerActivityStatus[] = ['planned', 'done', 'cancelled'];
const CUSTOMER_SORTS: CrmCustomerSort[] = ['updated-desc', 'activity-desc', 'name-asc'];
const DEFAULT_CUSTOMER_SORT: CrmCustomerSort = 'updated-desc';
const DEFAULT_CUSTOMER_LIMIT = 50;
const MAX_CUSTOMER_LIMIT = 200;
const DEFAULT_ACTIVITY_LIMIT = 30;
const MAX_ACTIVITY_LIMIT = 100;
const DEFAULT_CUSTOMER_AI_INDEX_BACKFILL_LIMIT = 100;
const MAX_CUSTOMER_AI_INDEX_BACKFILL_LIMIT = 500;
const DEFAULT_CUSTOMER_AI_INDEX_BACKFILL_REASON = 'crm_customer_activity_backfill_requested';

interface DecimalLike {
  toString(): string;
}

interface CrmCustomerActivityLedgerRow {
  id: bigint;
  activityCode: string;
  customerId: bigint;
  sourceOpportunityId: bigint | null;
  sourceOpportunityCode: string | null;
  activityTypeCode: string;
  activityStatusCode: string;
  subject: string;
  occurredAt: Date;
  dueAt: Date | null;
  ownerName: string;
  ownerUserId: bigint | null;
  summary: string;
  nextAction: string | null;
  updatedAt: Date;
}

interface CrmCustomerLedgerRow {
  ownerOrganizationId: bigint | null;
  id: bigint;
  customerCode: string;
  customerName: string;
  customerTypeCode: string;
  industryLine: string;
  regionCode: string;
  ownerName: string;
  ownerUserId: bigint | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  sourceOpportunityId: bigint | null;
  latestOpportunityCode: string | null;
  latestActivityAt: Date | null;
  lastInteractionSummary: string | null;
  nextAction: string;
  adminBoundaryCode: string;
  updatedAt: Date;
  activities: CrmCustomerActivityLedgerRow[];
}

interface NormalizedCustomerPayload {
  customerName: string;
  type: CrmCustomerType;
  industryLine: string;
  region: CrmCustomerRegion;
  ownerName: string;
  ownerUserId: bigint | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  sourceOpportunityId: bigint | null;
  latestOpportunityCode: string | null;
  lastInteractionSummary: string | null;
  nextAction: string;
}

interface NormalizedActivityPayload {
  sourceOpportunityId: bigint | null;
  sourceOpportunityCode: string | null;
  type: CrmCustomerActivityType;
  status: CrmCustomerActivityStatus;
  subject: string;
  occurredAt: Date;
  dueAt: Date | null;
  ownerName: string;
  ownerUserId: bigint | null;
  summary: string;
  nextAction: string | null;
}

interface CrmAiIndexQueueResult {
  status: 'queued' | 'failed' | 'skipped';
  errorMessage?: string;
}

interface CrmAiIndexQueueOptions {
  currentUser?: TokenPayload;
  priority?: number;
  payload?: AiIndexJsonObject;
}

interface CrmCustomerAiIndexBackfillRow {
  id: bigint;
  updatedAt: Date;
}

interface CrmCustomerActivityAiIndexBackfillRow {
  id: bigint;
  customerId: bigint;
  updatedAt: Date;
}

interface NormalizedCustomerListQuery {
  search: string;
  type: CrmCustomerType | 'all';
  sort: CrmCustomerSort;
  limit: number;
}

interface NormalizedActivityListQuery {
  type: CrmCustomerActivityType | 'all';
  limit: number;
}

function toNumber(value: bigint | number | DecimalLike | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  return Number(value.toString());
}

function toIsoString(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined;
}

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    private readonly db: DatabaseService,
    @Optional() private readonly aiIndexingService?: AiIndexingService,
    private readonly admission: PlatformAdmissionService = new PlatformAdmissionService(db),
    private readonly crmAccess?: CrmAccessService,
  ) {}

  async listCustomers(query: CrmCustomerListQuery = {}, currentUser?: TokenPayload): Promise<CrmCustomer[]> {
    const normalized = this.normalizeListQuery(query);
    const rows = await this.loadActiveCustomerRows(currentUser);
    const customers = rows.map((row) => this.toCustomer(row));
    return this.filterAndSortCustomers(customers, normalized).slice(0, normalized.limit);
  }

  async listResponse(query: CrmCustomerListQuery = {}, currentUser?: TokenPayload): Promise<CrmCustomerListResponse> {
    const normalized = this.normalizeListQuery(query);
    const rows = await this.loadActiveCustomerRows(currentUser);
    const customers = rows.map((row) => this.toCustomer(row));
    const filtered = this.filterAndSortCustomers(customers, normalized).slice(0, normalized.limit);

    return {
      summary: {
        totalCount: customers.length,
        filteredCount: filtered.length,
        prospectCount: customers.filter((customer) => customer.type === 'prospect').length,
        activeCount: customers.filter((customer) => customer.type === 'active').length,
        partnerCount: customers.filter((customer) => customer.type === 'partner').length,
        inactiveCount: customers.filter((customer) => customer.type === 'inactive').length,
        activityBackfillCount: customers.reduce((count, customer) => (
          count + customer.recentActivities.filter((activity) => activity.type === 'opportunity-next-action').length
        ), 0),
        activeFilters: {
          search: normalized.search,
          type: normalized.type,
          sort: normalized.sort,
        },
      },
      items: filtered,
    };
  }

  async getCustomer(id: string): Promise<CrmCustomer> {
    const row = await this.findCustomerRow(id);
    if (!row) {
      throw new NotFoundException('CRM customer not found');
    }

    return this.toCustomer(row);
  }

  async createCustomer(dto: CrmCustomerUpsertRequest, currentUserId?: bigint): Promise<CrmCustomer> {
    const payload = this.normalizeCustomerPayload(dto);
    if (!currentUserId) throw new BadRequestException('업무 조직을 확인할 사용자 정보가 필요합니다.');
    const ownerOrganizationId = await this.admission.resolveBusinessOrganization(currentUserId, 'crm', dto.ownerOrganizationId);
    await this.assertSourceOrganization(payload.sourceOpportunityId, ownerOrganizationId);
    const row = await this.db.client.crmCustomer.create({
      data: {
        customerCode: this.createCustomerCode(),
        ownerOrganizationId,
        customerName: payload.customerName,
        customerTypeCode: payload.type,
        industryLine: payload.industryLine,
        regionCode: payload.region,
        ownerName: payload.ownerName,
        ownerUserId: payload.ownerUserId,
        contactName: payload.contactName,
        contactEmail: payload.contactEmail,
        contactPhone: payload.contactPhone,
        sourceOpportunityId: payload.sourceOpportunityId,
        latestOpportunityCode: payload.latestOpportunityCode,
        latestActivityAt: null,
        lastInteractionSummary: payload.lastInteractionSummary,
        nextAction: payload.nextAction,
        adminBoundaryCode: 'shared-admin',
        createdBy: currentUserId,
        updatedBy: currentUserId,
        lastSource: 'crm.customer',
        lastActivity: 'create',
      },
    }) as { id: bigint };

    await this.queueCrmAiIndexJob('customer', row.id, 'upsert', 'customer_created');
    return this.getCustomer(row.id.toString());
  }

  async updateCustomer(id: string, dto: CrmCustomerUpsertRequest, currentUserId?: bigint): Promise<CrmCustomer> {
    const existing = await this.findCustomerRow(id);
    if (!existing) {
      throw new NotFoundException('CRM customer not found');
    }

    if (dto.ownerOrganizationId !== undefined && dto.ownerOrganizationId !== existing.ownerOrganizationId?.toString()) {
      throw new BadRequestException('고객과 연결 자료의 업무 조직은 일반 수정에서 변경할 수 없습니다.');
    }
    const payload = this.normalizeCustomerPayload(dto);
    await this.assertSourceOrganization(payload.sourceOpportunityId, existing.ownerOrganizationId);
    await this.db.client.crmCustomer.update({
      where: { id: existing.id },
      data: {
        customerName: payload.customerName,
        customerTypeCode: payload.type,
        industryLine: payload.industryLine,
        regionCode: payload.region,
        ownerName: payload.ownerName,
        ownerUserId: payload.ownerUserId,
        contactName: payload.contactName,
        contactEmail: payload.contactEmail,
        contactPhone: payload.contactPhone,
        sourceOpportunityId: payload.sourceOpportunityId,
        latestOpportunityCode: payload.latestOpportunityCode,
        lastInteractionSummary: payload.lastInteractionSummary,
        nextAction: payload.nextAction,
        updatedBy: currentUserId,
        lastSource: 'crm.customer',
        lastActivity: 'update',
      },
    });

    await this.queueCrmAiIndexJob('customer', existing.id, 'upsert', 'customer_updated');
    return this.getCustomer(existing.id.toString());
  }

  async listActivities(
    customerId: string,
    query: CrmCustomerActivityListQuery = {},
  ): Promise<CrmCustomerActivityListResponse> {
    const customer = await this.findCustomerRow(customerId);
    if (!customer) {
      throw new NotFoundException('CRM customer not found');
    }

    const normalized = this.normalizeActivityListQuery(query);
    const activities = customer.activities
      .map((row) => this.toActivity(row))
      .filter((activity) => normalized.type === 'all' || activity.type === normalized.type)
      .slice(0, normalized.limit);

    return {
      customerId: customer.id.toString(),
      customerCode: customer.customerCode,
      items: activities,
    };
  }

  async addActivity(
    customerId: string,
    dto: CrmCustomerActivityCreateRequest,
    currentUserId?: bigint,
  ): Promise<CrmCustomerActivity> {
    const customer = await this.findCustomerRow(customerId);
    if (!customer) {
      throw new NotFoundException('CRM customer not found');
    }

    const payload = this.normalizeActivityPayload(dto);
    await this.assertSourceOrganization(payload.sourceOpportunityId, customer.ownerOrganizationId);
    const activity = await this.db.client.$transaction(async (tx) => {
      const created = await tx.crmCustomerActivity.create({
        data: {
          activityCode: this.createActivityCode(),
          customerId: customer.id,
          sourceOpportunityId: payload.sourceOpportunityId,
          sourceOpportunityCode: payload.sourceOpportunityCode,
          activityTypeCode: payload.type,
          activityStatusCode: payload.status,
          subject: payload.subject,
          occurredAt: payload.occurredAt,
          dueAt: payload.dueAt,
          ownerName: payload.ownerName,
          ownerUserId: payload.ownerUserId,
          summary: payload.summary,
          nextAction: payload.nextAction,
          createdBy: currentUserId,
          updatedBy: currentUserId,
          lastSource: 'crm.customer',
          lastActivity: 'activity-create',
        },
      }) as { id: bigint };

      await tx.crmCustomer.update({
        where: { id: customer.id },
        data: {
          latestActivityAt: payload.occurredAt,
          lastInteractionSummary: payload.summary,
          nextAction: payload.nextAction ?? customer.nextAction,
          ownerName: payload.ownerName,
          ownerUserId: payload.ownerUserId,
          updatedBy: currentUserId,
          lastSource: 'crm.customer',
          lastActivity: 'activity-create',
        },
      });

      return created;
    });

    await this.queueCrmAiIndexJob('activity', activity.id, 'upsert', 'customer_activity_created');
    await this.queueCrmAiIndexJob('customer', customer.id, 'upsert', 'customer_activity_created');

    const activities = await this.listActivities(customer.id.toString(), { limit: 1 });
    const createdActivity = activities.items.find((item) => item.id === activity.id.toString()) ?? activities.items[0];
    if (!createdActivity) {
      throw new NotFoundException('CRM customer activity not found after create');
    }

    return createdActivity;
  }

  async queueAiIndexBackfill(
    request: CrmCustomerAiIndexBackfillRequest = {},
    currentUser?: TokenPayload,
  ): Promise<CrmCustomerAiIndexBackfillResponse> {
    const limit = this.normalizeAiIndexBackfillLimit(request.limit);
    const requestedCustomerIds = this.normalizeAiIndexBackfillIds(request.customerIds, 'CRM 고객');
    const requestedActivityIds = this.normalizeAiIndexBackfillIds(request.activityIds, 'CRM 고객 활동');
    const reasonCode = request.reasonCode?.trim() || DEFAULT_CUSTOMER_AI_INDEX_BACKFILL_REASON;
    const includeInactive = request.includeInactive === true;
    const limitedCustomerIds = requestedCustomerIds.slice(0, limit);
    const limitedActivityIds = requestedActivityIds.slice(0, limit);

    const customerRows = await this.db.client.crmCustomer.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(limitedCustomerIds.length > 0 ? { id: { in: limitedCustomerIds } } : {}),
      },
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: [
        { updatedAt: 'desc' },
        { id: 'asc' },
      ],
      take: limit,
    }) as CrmCustomerAiIndexBackfillRow[];

    const activityRows = await this.db.client.crmCustomerActivity.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true, customer: { isActive: true } }),
        ...(limitedActivityIds.length > 0
          ? { id: { in: limitedActivityIds } }
          : limitedCustomerIds.length > 0
            ? { customerId: { in: customerRows.map((row) => row.id) } }
            : {}),
      },
      select: {
        id: true,
        customerId: true,
        updatedAt: true,
      },
      orderBy: [
        { updatedAt: 'desc' },
        { id: 'asc' },
      ],
      take: limit,
    }) as CrmCustomerActivityAiIndexBackfillRow[];

    const items: CrmCustomerAiIndexBackfillItem[] = [];

    for (const row of customerRows) {
      const result = await this.queueCrmAiIndexJob('customer', row.id, 'backfill', reasonCode, {
        currentUser,
        priority: 30,
        payload: {
          backfill: true,
          includeInactive,
          selectedLimit: limit,
          customerUpdatedAt: row.updatedAt.toISOString(),
        },
      });
      items.push({
        entityType: 'customer',
        entityId: row.id.toString(),
        customerId: row.id.toString(),
        status: result.status,
        ...(result.errorMessage ? { errorMessage: result.errorMessage } : {}),
      });
    }

    for (const row of activityRows) {
      const result = await this.queueCrmAiIndexJob('activity', row.id, 'backfill', reasonCode, {
        currentUser,
        priority: 30,
        payload: {
          backfill: true,
          includeInactive,
          selectedLimit: limit,
          customerId: row.customerId.toString(),
          activityUpdatedAt: row.updatedAt.toISOString(),
        },
      });
      items.push({
        entityType: 'activity',
        entityId: row.id.toString(),
        customerId: row.customerId.toString(),
        activityId: row.id.toString(),
        status: result.status,
        ...(result.errorMessage ? { errorMessage: result.errorMessage } : {}),
      });
    }

    const queuedCount = items.filter((item) => item.status === 'queued').length;
    const failedCount = items.filter((item) => item.status === 'failed').length;
    const skippedCount = items.filter((item) => item.status === 'skipped').length;

    return {
      sourceApp: 'crm',
      entityTypes: ['customer', 'activity'],
      jobType: 'backfill',
      requestedCustomerCount: requestedCustomerIds.length,
      requestedActivityCount: requestedActivityIds.length,
      selectedCustomerCount: customerRows.length,
      selectedActivityCount: activityRows.length,
      queuedCount,
      failedCount,
      skippedCount,
      limit,
      includeInactive,
      reasonCode,
      items,
    };
  }

  private async assertSourceOrganization(sourceId: bigint | null, organizationId: bigint | null) {
    if (sourceId === null) return;
    const source = await this.db.client.crmOpportunity.findFirst({ where: { id: sourceId, isActive: true }, select: { ownerOrganizationId: true } });
    if (!source || source.ownerOrganizationId !== organizationId) {
      throw new BadRequestException('같은 업무 조직의 영업기회만 연결할 수 있습니다.');
    }
  }

  private async loadActiveCustomerRows(currentUser?: TokenPayload): Promise<CrmCustomerLedgerRow[]> {
    const scope = currentUser ? await this.crmAccess!.businessOrganizationScope(currentUser) : null;
    return this.db.client.crmCustomer.findMany({
      where: { isActive: true, ...(scope === null ? {} : { ownerOrganizationId: { in: scope } }) },
      include: {
        activities: {
          where: { isActive: true },
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { customerName: 'asc' }],
    }) as Promise<CrmCustomerLedgerRow[]>;
  }

  private async findCustomerRow(id: string): Promise<CrmCustomerLedgerRow | null> {
    const normalizedId = id.trim();
    const numericId = this.parsePositiveBigIntId(normalizedId);

    return this.db.client.crmCustomer.findFirst({
      where: {
        isActive: true,
        OR: [
          { customerCode: normalizedId },
          ...(numericId ? [{ id: numericId }] : []),
        ],
      },
      include: {
        activities: {
          where: { isActive: true },
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        },
      },
    }) as Promise<CrmCustomerLedgerRow | null>;
  }

  private filterAndSortCustomers(
    customers: CrmCustomer[],
    query: NormalizedCustomerListQuery,
  ): CrmCustomer[] {
    const search = query.search.toLowerCase();
    const filtered = customers.filter((customer) => {
      if (query.type !== 'all' && customer.type !== query.type) {
        return false;
      }

      if (!search) {
        return true;
      }

      const searchable = [
        customer.customerName,
        customer.industryLine,
        customer.ownerName,
        customer.contactName,
        customer.latestOpportunityCode,
        customer.lastInteractionSummary,
        customer.nextAction,
        ...customer.recentActivities.flatMap((activity) => [activity.subject, activity.summary, activity.nextAction]),
      ].filter(Boolean).join(' ').toLowerCase();

      return searchable.includes(search);
    });

    return filtered.sort((left, right) => {
      if (query.sort === 'name-asc') {
        return left.customerName.localeCompare(right.customerName, 'ko');
      }
      if (query.sort === 'activity-desc') {
        return (Date.parse(right.latestActivityAt ?? '') || 0) - (Date.parse(left.latestActivityAt ?? '') || 0);
      }
      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    });
  }

  private toCustomer(row: CrmCustomerLedgerRow): CrmCustomer {
    const recentActivities = row.activities.map((activity) => this.toActivity(activity));

    return {
      id: row.id.toString(),
      code: row.customerCode,
      customerName: row.customerName,
      type: this.toCustomerType(row.customerTypeCode),
      industryLine: row.industryLine,
      region: this.toCustomerRegion(row.regionCode),
      ownerName: row.ownerName,
      ownerUserId: row.ownerUserId?.toString(),
      ownerOrganizationId: row.ownerOrganizationId?.toString(),
      contactName: row.contactName ?? undefined,
      contactEmail: row.contactEmail ?? undefined,
      contactPhone: row.contactPhone ?? undefined,
      sourceOpportunityId: row.sourceOpportunityId?.toString(),
      latestOpportunityCode: row.latestOpportunityCode ?? undefined,
      latestActivityAt: toIsoString(row.latestActivityAt),
      lastInteractionSummary: row.lastInteractionSummary ?? undefined,
      nextAction: row.nextAction,
      adminBoundary: 'shared-admin',
      activityCount: recentActivities.length,
      recentActivities,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toActivity(row: CrmCustomerActivityLedgerRow): CrmCustomerActivity {
    return {
      id: row.id.toString(),
      code: row.activityCode,
      customerId: row.customerId.toString(),
      sourceOpportunityId: row.sourceOpportunityId?.toString(),
      sourceOpportunityCode: row.sourceOpportunityCode ?? undefined,
      type: this.toActivityType(row.activityTypeCode),
      status: this.toActivityStatus(row.activityStatusCode),
      subject: row.subject,
      occurredAt: row.occurredAt.toISOString(),
      dueAt: toIsoString(row.dueAt),
      ownerName: row.ownerName,
      ownerUserId: row.ownerUserId?.toString(),
      summary: row.summary,
      nextAction: row.nextAction ?? undefined,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private normalizeListQuery(query: CrmCustomerListQuery): NormalizedCustomerListQuery {
    const type = query.type && CUSTOMER_TYPES.includes(query.type as CrmCustomerType) ? query.type : 'all';
    const sort = query.sort && CUSTOMER_SORTS.includes(query.sort) ? query.sort : DEFAULT_CUSTOMER_SORT;
    const limit = Math.min(Math.max(Math.floor(toNumber(query.limit) || DEFAULT_CUSTOMER_LIMIT), 1), MAX_CUSTOMER_LIMIT);

    return {
      search: query.search?.trim() ?? '',
      type,
      sort,
      limit,
    };
  }

  private normalizeActivityListQuery(query: CrmCustomerActivityListQuery): NormalizedActivityListQuery {
    const type = query.type && CUSTOMER_ACTIVITY_TYPES.includes(query.type as CrmCustomerActivityType)
      ? query.type
      : 'all';
    const limit = Math.min(Math.max(Math.floor(toNumber(query.limit) || DEFAULT_ACTIVITY_LIMIT), 1), MAX_ACTIVITY_LIMIT);

    return {
      type,
      limit,
    };
  }

  private normalizeCustomerPayload(dto: CrmCustomerUpsertRequest): NormalizedCustomerPayload {
    return {
      customerName: this.requiredText(dto.customerName, '고객사명', 200),
      type: this.toCustomerType(dto.type ?? 'prospect'),
      industryLine: this.requiredText(dto.industryLine, '계열/산업 구분', 120),
      region: this.toCustomerRegion(dto.region),
      ownerName: this.requiredText(dto.ownerName, '담당자명', 100),
      ownerUserId: this.normalizeOptionalUserId(dto.ownerUserId, '담당자 사용자 ID'),
      contactName: this.optionalText(dto.contactName, 120),
      contactEmail: this.optionalText(dto.contactEmail, 200),
      contactPhone: this.optionalText(dto.contactPhone, 80),
      sourceOpportunityId: this.normalizeOptionalUserId(dto.sourceOpportunityId, '원천 영업기회 ID'),
      latestOpportunityCode: this.optionalText(dto.latestOpportunityCode, 80),
      lastInteractionSummary: this.optionalText(dto.lastInteractionSummary, 1000),
      nextAction: this.requiredText(dto.nextAction, '다음 행동', 1000),
    };
  }

  private normalizeActivityPayload(dto: CrmCustomerActivityCreateRequest): NormalizedActivityPayload {
    const occurredAt = this.normalizeDateTime(dto.occurredAt, '활동 일시') ?? new Date();
    const dueAt = this.normalizeDateTime(dto.dueAt, '후속 예정 일시');
    if (dueAt && dueAt < occurredAt) {
      throw new BadRequestException('후속 예정 일시는 활동 일시보다 빠를 수 없습니다.');
    }

    return {
      sourceOpportunityId: this.normalizeOptionalUserId(dto.sourceOpportunityId, '원천 영업기회 ID'),
      sourceOpportunityCode: this.optionalText(dto.sourceOpportunityCode, 80),
      type: this.toActivityType(dto.type),
      status: this.toActivityStatus(dto.status ?? 'done'),
      subject: this.requiredText(dto.subject, '활동 제목', 300),
      occurredAt,
      dueAt,
      ownerName: this.requiredText(dto.ownerName, '담당자명', 100),
      ownerUserId: this.normalizeOptionalUserId(dto.ownerUserId, '담당자 사용자 ID'),
      summary: this.requiredText(dto.summary, '활동 요약', 1000),
      nextAction: this.optionalText(dto.nextAction, 1000),
    };
  }

  private toCustomerType(value: string): CrmCustomerType {
    return CUSTOMER_TYPES.includes(value as CrmCustomerType) ? value as CrmCustomerType : 'prospect';
  }

  private toCustomerRegion(value: string): CrmCustomerRegion {
    return value === 'overseas' ? 'overseas' : 'domestic';
  }

  private toActivityType(value: string): CrmCustomerActivityType {
    return CUSTOMER_ACTIVITY_TYPES.includes(value as CrmCustomerActivityType)
      ? value as CrmCustomerActivityType
      : 'meeting';
  }

  private toActivityStatus(value: string): CrmCustomerActivityStatus {
    return CUSTOMER_ACTIVITY_STATUSES.includes(value as CrmCustomerActivityStatus)
      ? value as CrmCustomerActivityStatus
      : 'done';
  }

  private normalizeDateTime(value: string | undefined, fieldName: string): Date | null {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }

    const dateInput = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
      ? `${normalized}T00:00:00.000Z`
      : normalized;
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName}이 올바른 날짜가 아닙니다.`);
    }

    return date;
  }

  private normalizeOptionalUserId(value: string | undefined, fieldName: string): bigint | null {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }

    const id = this.parsePositiveBigIntId(normalized);
    if (!id) {
      throw new BadRequestException(`${fieldName}는 양의 정수 문자열이어야 합니다.`);
    }

    return id;
  }

  private parsePositiveBigIntId(value: string): bigint | null {
    if (!/^\d+$/.test(value)) {
      return null;
    }

    const id = BigInt(value);
    return id > 0n ? id : null;
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

  private optionalText(value: string | undefined, maxLength: number): string | null {
    const normalized = value?.trim() ?? '';
    if (!normalized) {
      return null;
    }

    if (normalized.length > maxLength) {
      throw new BadRequestException(`${maxLength}자 이하로 입력해야 합니다.`);
    }

    return normalized;
  }

  private createCustomerCode(): string {
    return `crm-cust-${randomUUID().slice(0, 8)}`;
  }

  private createActivityCode(): string {
    return `crm-act-${randomUUID().slice(0, 8)}`;
  }

  private async queueCrmAiIndexJob(
    entityType: 'customer' | 'activity',
    entityId: bigint,
    jobType: AiIndexJobType,
    reasonCode: string,
    options: CrmAiIndexQueueOptions = {},
  ): Promise<CrmAiIndexQueueResult> {
    if (!this.aiIndexingService) {
      return { status: 'skipped' };
    }

    try {
      const payload = {
        source: 'crm.customer',
        reasonCode,
        ...(options.payload ?? {}),
      } satisfies AiIndexJsonObject;

      await this.aiIndexingService.queueJob({
        sourceApp: 'crm',
        entityType,
        entityId: entityId.toString(),
        jobType,
        priority: options.priority ?? this.resolveCrmAiIndexJobPriority(jobType),
        payload,
      }, options.currentUser);
      return { status: 'queued' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `CRM ${entityType} AI index job queue failed (${entityId.toString()}, ${reasonCode}): ${errorMessage}`,
      );
      return {
        status: 'failed',
        errorMessage,
      };
    }
  }

  private resolveCrmAiIndexJobPriority(jobType: AiIndexJobType): number {
    if (jobType === 'delete') {
      return 10;
    }

    if (jobType === 'backfill') {
      return 30;
    }

    return 25;
  }

  private normalizeAiIndexBackfillLimit(limit: number | undefined): number {
    const parsedLimit = Number(limit);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      return DEFAULT_CUSTOMER_AI_INDEX_BACKFILL_LIMIT;
    }

    return Math.min(Math.floor(parsedLimit), MAX_CUSTOMER_AI_INDEX_BACKFILL_LIMIT);
  }

  private normalizeAiIndexBackfillIds(ids: string[] | undefined, label: string): bigint[] {
    if (!ids || ids.length === 0) {
      return [];
    }

    const normalizedIds = new Set<bigint>();
    for (const value of ids) {
      const trimmedValue = value.trim();
      if (!/^\d+$/.test(trimmedValue)) {
        throw new BadRequestException(`유효한 ${label} 식별자 목록이 아닙니다.`);
      }
      normalizedIds.add(BigInt(trimmedValue));
    }

    return [...normalizedIds];
  }
}
