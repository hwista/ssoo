import { CrmAccessService } from '../access/access.service.js';
import type { AiIndexObjectRef } from '@ssoo/types/common';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { createHash } from 'crypto';
import { Injectable, OnModuleInit } from '@nestjs/common';
import type {
  AiIndexAdapterSyncRequest,
  AiIndexAdapterSyncResult,
  AiIndexChunkProjection,
  AiIndexJsonObject,
  AiIndexSensitivityCode,
} from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { AiIndexAdapter } from '../../common/ai-index/ai-index-adapter.js';
import { AiEmbeddingProviderService } from '../../common/ai-index/ai-embedding-provider.service.js';
import { AiIndexRegistryService } from '../../common/ai-index/ai-index-registry.service.js';

interface CrmOpportunityLineProjection {
  lineCode: string;
  lineKindCode: string;
  categoryCode: string;
  lineLabel: string;
  amount: bigint;
  sortOrder: number;
}

interface CrmOpportunityProjection {
  id: bigint;
  opportunityCode: string;
  customerName: string;
  opportunityName: string;
  ownerName: string;
  businessType: string;
  industryLine: string;
  regionCode: string;
  statusCode: string;
  priorityCode: string;
  versionNo: number;
  confirmed: boolean;
  expectedStartDate: Date | null;
  expectedEndDate: Date | null;
  revenueTotal: bigint;
  costTotal: bigint;
  pmsHandoffStatusCode: string;
  dmsLinkStatusCode: string;
  adminBoundaryCode: string;
  nextAction: string;
  updatedAt: Date;
  lines: CrmOpportunityLineProjection[];
}

interface CrmCustomerActivityProjection {
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

interface CrmCustomerProjection {
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
  activities: CrmCustomerActivityProjection[];
}

interface CrmCustomerActivityWithCustomerProjection extends CrmCustomerActivityProjection {
  customer: {
    id: bigint;
    customerCode: string;
    customerName: string;
    customerTypeCode: string;
    industryLine: string;
    regionCode: string;
    ownerName: string;
    ownerUserId: bigint | null;
    adminBoundaryCode: string;
    isActive: boolean;
  };
}

interface ProjectionSection {
  key: string;
  title: string;
  text: string;
}

type CrmAiIndexEntityType = 'opportunity' | 'customer' | 'activity';

function parsePositiveBigIntId(value: string): bigint | null {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const id = BigInt(normalized);
  return id > 0n ? id : null;
}

function toSupportedEntityType(value: string): CrmAiIndexEntityType | null {
  if (value === 'opportunity' || value === 'customer' || value === 'activity') {
    return value;
  }

  return null;
}

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function formatDate(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString().slice(0, 10) : undefined;
}

function formatAmount(value: bigint | null | undefined): string | undefined {
  return value === null || value === undefined ? undefined : value.toString();
}

function appendLine(lines: string[], label: string, value: string | undefined): void {
  if (value && value.trim().length > 0) {
    lines.push(`${label}: ${value}`);
  }
}

function uniqueNonEmptyStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(
    values
      .map((value) => value?.trim() ?? '')
      .filter((value) => value.length > 0),
  )];
}

function createSection(key: string, title: string, lines: string[]): ProjectionSection | null {
  const textLines = lines.filter((line) => line.trim().length > 0);
  if (textLines.length === 0) {
    return null;
  }

  return {
    key,
    title,
    text: [`## ${title}`, ...textLines].join('\n'),
  };
}

function buildSummary(opportunity: CrmOpportunityProjection): string {
  return `${opportunity.customerName} · ${opportunity.businessType} · ${opportunity.statusCode}`;
}

function buildSections(opportunity: CrmOpportunityProjection): ProjectionSection[] {
  const overviewLines: string[] = [];
  appendLine(overviewLines, 'Opportunity code', opportunity.opportunityCode);
  appendLine(overviewLines, 'Customer', opportunity.customerName);
  appendLine(overviewLines, 'Opportunity', opportunity.opportunityName);
  appendLine(overviewLines, 'Owner', opportunity.ownerName);
  appendLine(overviewLines, 'Business type', opportunity.businessType);
  appendLine(overviewLines, 'Industry line', opportunity.industryLine);
  appendLine(overviewLines, 'Region', opportunity.regionCode);
  appendLine(overviewLines, 'Status', opportunity.statusCode);
  appendLine(overviewLines, 'Priority', opportunity.priorityCode);
  appendLine(overviewLines, 'Expected start', formatDate(opportunity.expectedStartDate));
  appendLine(overviewLines, 'Expected end', formatDate(opportunity.expectedEndDate));
  appendLine(overviewLines, 'Next action', opportunity.nextAction);

  const financialLines: string[] = [];
  appendLine(financialLines, 'Revenue total', formatAmount(opportunity.revenueTotal));
  appendLine(financialLines, 'Cost total', formatAmount(opportunity.costTotal));
  appendLine(financialLines, 'Margin total', (opportunity.revenueTotal - opportunity.costTotal).toString());
  for (const line of opportunity.lines) {
    appendLine(
      financialLines,
      `${line.lineKindCode}.${line.categoryCode}`,
      `${line.lineLabel} ${line.amount.toString()}`,
    );
  }

  const integrationLines: string[] = [];
  appendLine(integrationLines, 'PMS handoff status', opportunity.pmsHandoffStatusCode);
  appendLine(integrationLines, 'DMS link status', opportunity.dmsLinkStatusCode);
  appendLine(integrationLines, 'Admin boundary', opportunity.adminBoundaryCode);
  appendLine(integrationLines, 'Confirmed', opportunity.confirmed ? 'true' : 'false');

  return [
    createSection('overview', 'CRM Opportunity Overview', overviewLines),
    createSection('financials', 'CRM Revenue and Cost Lines', financialLines),
    createSection('integration', 'CRM Boundary and Integration State', integrationLines),
  ].filter((section): section is ProjectionSection => Boolean(section));
}

function buildAclSnapshot(opportunity: CrmOpportunityProjection): AiIndexJsonObject {
  return {
    policy: 'crm.opportunity.read',
    access: 'authenticated',
    adminBoundary: opportunity.adminBoundaryCode,
    ownerName: opportunity.ownerName,
  };
}

function buildMetadata(opportunity: CrmOpportunityProjection, sourceVersion: string): AiIndexJsonObject {
  return {
    opportunityId: opportunity.id.toString(),
    opportunityCode: opportunity.opportunityCode,
    customerName: opportunity.customerName,
    ownerName: opportunity.ownerName,
    businessType: opportunity.businessType,
    industryLine: opportunity.industryLine,
    regionCode: opportunity.regionCode,
    statusCode: opportunity.statusCode,
    priorityCode: opportunity.priorityCode,
    versionNo: opportunity.versionNo,
    confirmed: opportunity.confirmed,
    revenueTotal: Number(opportunity.revenueTotal),
    costTotal: Number(opportunity.costTotal),
    marginTotal: Number(opportunity.revenueTotal - opportunity.costTotal),
    pmsHandoffStatusCode: opportunity.pmsHandoffStatusCode,
    dmsLinkStatusCode: opportunity.dmsLinkStatusCode,
    adminBoundaryCode: opportunity.adminBoundaryCode,
    sourceVersion,
    updatedAt: opportunity.updatedAt.toISOString(),
  };
}

function buildChunks(
  opportunity: CrmOpportunityProjection,
  sections: ProjectionSection[],
): AiIndexChunkProjection[] {
  return sections.map((section, index) => ({
    chunkKey: `crm-opportunity-${section.key}`,
    chunkSeq: index + 1,
    chunkText: section.text,
    chunkHash: hashText(section.text),
    citationLabel: `${opportunity.opportunityCode} ${section.title}`,
    metadata: {
      section: section.key,
      opportunityCode: opportunity.opportunityCode,
    },
  }));
}

function buildCustomerSummary(customer: CrmCustomerProjection): string {
  return `${customer.customerName} · ${customer.industryLine} · ${customer.customerTypeCode}`;
}

function buildCustomerSections(customer: CrmCustomerProjection): ProjectionSection[] {
  const overviewLines: string[] = [];
  appendLine(overviewLines, 'Customer code', customer.customerCode);
  appendLine(overviewLines, 'Customer', customer.customerName);
  appendLine(overviewLines, 'Customer type', customer.customerTypeCode);
  appendLine(overviewLines, 'Industry line', customer.industryLine);
  appendLine(overviewLines, 'Region', customer.regionCode);
  appendLine(overviewLines, 'Latest opportunity', customer.latestOpportunityCode ?? undefined);
  appendLine(overviewLines, 'Latest activity at', customer.latestActivityAt?.toISOString());
  appendLine(overviewLines, 'Next action', customer.nextAction);

  const contactLines: string[] = [];
  appendLine(contactLines, 'Owner', customer.ownerName);
  appendLine(contactLines, 'Owner user id', customer.ownerUserId?.toString());
  appendLine(contactLines, 'Contact name', customer.contactName ?? undefined);
  appendLine(contactLines, 'Contact email', customer.contactEmail ?? undefined);
  appendLine(contactLines, 'Contact phone', customer.contactPhone ?? undefined);
  appendLine(contactLines, 'Admin boundary', customer.adminBoundaryCode);

  const activityLines: string[] = [];
  appendLine(activityLines, 'Last interaction', customer.lastInteractionSummary ?? undefined);
  for (const activity of customer.activities) {
    appendLine(
      activityLines,
      `${activity.activityTypeCode}.${activity.activityStatusCode}`,
      `${activity.subject} · ${activity.summary}`,
    );
  }

  return [
    createSection('overview', 'CRM Customer Overview', overviewLines),
    createSection('contact', 'CRM Customer Contact and Ownership', contactLines),
    createSection('activities', 'CRM Customer Recent Activities', activityLines),
  ].filter((section): section is ProjectionSection => Boolean(section));
}

function buildCustomerAclSnapshot(customer: CrmCustomerProjection): AiIndexJsonObject {
  return {
    policy: 'crm.customer.read',
    objectType: 'crm.customer',
    objectId: customer.customerCode,
    access: 'crm-policy-or-owner',
    adminBoundary: customer.adminBoundaryCode,
    ownerName: customer.ownerName,
    ownerUserId: customer.ownerUserId?.toString() ?? null,
    ownerNames: uniqueNonEmptyStrings([customer.ownerName]),
    ownerUserIds: uniqueNonEmptyStrings([customer.ownerUserId?.toString()]),
  };
}

function buildCustomerMetadata(customer: CrmCustomerProjection, sourceVersion: string): AiIndexJsonObject {
  return {
    customerId: customer.id.toString(),
    customerCode: customer.customerCode,
    customerName: customer.customerName,
    customerTypeCode: customer.customerTypeCode,
    industryLine: customer.industryLine,
    regionCode: customer.regionCode,
    ownerName: customer.ownerName,
    ownerUserId: customer.ownerUserId?.toString() ?? null,
    latestOpportunityCode: customer.latestOpportunityCode,
    latestActivityAt: customer.latestActivityAt?.toISOString() ?? null,
    activityCount: customer.activities.length,
    sourceVersion,
    updatedAt: customer.updatedAt.toISOString(),
  };
}

function buildCustomerChunks(
  customer: CrmCustomerProjection,
  sections: ProjectionSection[],
): AiIndexChunkProjection[] {
  return sections.map((section, index) => ({
    chunkKey: `crm-customer-${section.key}`,
    chunkSeq: index + 1,
    chunkText: section.text,
    chunkHash: hashText(section.text),
    citationLabel: `${customer.customerCode} ${section.title}`,
    metadata: {
      section: section.key,
      customerCode: customer.customerCode,
    },
  }));
}

function buildActivitySummary(activity: CrmCustomerActivityWithCustomerProjection): string {
  return `${activity.customer.customerName} · ${activity.activityTypeCode} · ${activity.activityStatusCode}`;
}

function buildActivitySections(activity: CrmCustomerActivityWithCustomerProjection): ProjectionSection[] {
  const overviewLines: string[] = [];
  appendLine(overviewLines, 'Activity code', activity.activityCode);
  appendLine(overviewLines, 'Customer', activity.customer.customerName);
  appendLine(overviewLines, 'Subject', activity.subject);
  appendLine(overviewLines, 'Activity type', activity.activityTypeCode);
  appendLine(overviewLines, 'Activity status', activity.activityStatusCode);
  appendLine(overviewLines, 'Occurred at', activity.occurredAt.toISOString());
  appendLine(overviewLines, 'Due at', activity.dueAt?.toISOString());

  const detailLines: string[] = [];
  appendLine(detailLines, 'Owner', activity.ownerName);
  appendLine(detailLines, 'Owner user id', activity.ownerUserId?.toString());
  appendLine(detailLines, 'Summary', activity.summary);
  appendLine(detailLines, 'Next action', activity.nextAction ?? undefined);

  const sourceLines: string[] = [];
  appendLine(sourceLines, 'Source opportunity id', activity.sourceOpportunityId?.toString());
  appendLine(sourceLines, 'Source opportunity code', activity.sourceOpportunityCode ?? undefined);
  appendLine(sourceLines, 'Customer code', activity.customer.customerCode);
  appendLine(sourceLines, 'Customer type', activity.customer.customerTypeCode);
  appendLine(sourceLines, 'Industry line', activity.customer.industryLine);
  appendLine(sourceLines, 'Region', activity.customer.regionCode);

  return [
    createSection('overview', 'CRM Customer Activity Overview', overviewLines),
    createSection('detail', 'CRM Customer Activity Detail', detailLines),
    createSection('source', 'CRM Customer Activity Source Context', sourceLines),
  ].filter((section): section is ProjectionSection => Boolean(section));
}

function buildActivityAclSnapshot(activity: CrmCustomerActivityWithCustomerProjection): AiIndexJsonObject {
  return {
    policy: 'crm.customer.activity.read',
    objectType: 'crm.customer.activity',
    objectId: activity.activityCode,
    parentObjectType: 'crm.customer',
    parentObjectId: activity.customer.customerCode,
    access: 'crm-policy-or-owner',
    adminBoundary: activity.customer.adminBoundaryCode,
    ownerName: activity.ownerName,
    ownerUserId: activity.ownerUserId?.toString() ?? null,
    customerOwnerName: activity.customer.ownerName,
    customerOwnerUserId: activity.customer.ownerUserId?.toString() ?? null,
    ownerNames: uniqueNonEmptyStrings([activity.ownerName, activity.customer.ownerName]),
    ownerUserIds: uniqueNonEmptyStrings([
      activity.ownerUserId?.toString(),
      activity.customer.ownerUserId?.toString(),
    ]),
  };
}

function buildActivityMetadata(
  activity: CrmCustomerActivityWithCustomerProjection,
  sourceVersion: string,
): AiIndexJsonObject {
  return {
    activityId: activity.id.toString(),
    activityCode: activity.activityCode,
    customerId: activity.customerId.toString(),
    customerCode: activity.customer.customerCode,
    customerName: activity.customer.customerName,
    sourceOpportunityId: activity.sourceOpportunityId?.toString() ?? null,
    sourceOpportunityCode: activity.sourceOpportunityCode,
    activityTypeCode: activity.activityTypeCode,
    activityStatusCode: activity.activityStatusCode,
    ownerName: activity.ownerName,
    ownerUserId: activity.ownerUserId?.toString() ?? null,
    sourceVersion,
    updatedAt: activity.updatedAt.toISOString(),
  };
}

function buildActivityChunks(
  activity: CrmCustomerActivityWithCustomerProjection,
  sections: ProjectionSection[],
): AiIndexChunkProjection[] {
  return sections.map((section, index) => ({
    chunkKey: `crm-customer-activity-${section.key}`,
    chunkSeq: index + 1,
    chunkText: section.text,
    chunkHash: hashText(section.text),
    citationLabel: `${activity.activityCode} ${section.title}`,
    metadata: {
      section: section.key,
      activityCode: activity.activityCode,
      customerCode: activity.customer.customerCode,
    },
  }));
}

@Injectable()
export class CrmAiIndexAdapter implements AiIndexAdapter, OnModuleInit {
  readonly sourceApp = 'crm';
  readonly label = 'CRM';
  readonly sourceKind = 'domain';
  readonly adapterCode = 'crm.opportunity.ai-index';

  get capabilities() {
    const embeddingReady = this.embeddingProvider.getStatus('default').ready;

    return {
      keyword: true,
      metadata: true,
      semantic: embeddingReady,
      vector: embeddingReady,
      ragContext: embeddingReady,
      indexing: true,
    };
  }

  constructor(
    private readonly db: DatabaseService,
    private readonly registry: AiIndexRegistryService,
    private readonly embeddingProvider: AiEmbeddingProviderService,
    private readonly access: CrmAccessService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async canRead(request: AiIndexObjectRef, user: TokenPayload): Promise<boolean> {
    if (!/^\d+$/.test(request.entityId)) return false;
    const id = BigInt(request.entityId);
    if (request.entityType === 'opportunity') {
      if (!await this.db.client.crmOpportunity.count({ where: { id, isActive: true } })) return false;
      return (await this.access.getOpportunityAccess(request.entityId, user)).features.canViewOpportunity;
    }
    if (request.entityType === 'customer') {
      if (!await this.db.client.crmCustomer.count({ where: { id, isActive: true } })) return false;
      return (await this.access.getCustomerAccess(request.entityId, user)).features.canViewCustomer;
    }
    if (request.entityType === 'activity') {
      const activity = await this.db.client.crmCustomerActivity.findUnique({ where: { id }, select: { customerId: true, isActive: true } });
      return Boolean(activity?.isActive && (await this.access.getCustomerAccess(activity.customerId.toString(), user)).features.canViewCustomerActivity);
    }
    return false;
  }

  async syncObject(request: AiIndexAdapterSyncRequest): Promise<AiIndexAdapterSyncResult> {
    const entityType = toSupportedEntityType(request.entityType);
    if (!entityType) {
      return {
        status: 'skipped',
        reasonCode: 'unsupported_entity_type',
        reasonMessage: `CRM AI index supports opportunity, customer, and activity entities only: ${request.entityType}`,
      };
    }

    const entityId = parsePositiveBigIntId(request.entityId);
    if (!entityId) {
      return {
        status: 'skipped',
        reasonCode: `invalid_${entityType}_id`,
        reasonMessage: `CRM AI index ${entityType} id is invalid: ${request.entityId}`,
      };
    }

    if (request.jobType === 'delete') {
      return {
        status: 'deleted',
        reasonCode: 'deleted_by_source',
        reasonMessage: `CRM ${entityType} source requested AI index deletion.`,
      };
    }

    if (entityType === 'customer') {
      return this.syncCustomer(entityId, request);
    }

    if (entityType === 'activity') {
      return this.syncActivity(entityId, request);
    }

    return this.syncOpportunity(entityId, request);
  }

  private async syncOpportunity(
    opportunityId: bigint,
    request: AiIndexAdapterSyncRequest,
  ): Promise<AiIndexAdapterSyncResult> {
    const opportunity = await this.findOpportunityProjection(opportunityId);
    if (!opportunity) {
      return {
        status: 'skipped',
        reasonCode: 'missing_opportunity',
        reasonMessage: `CRM opportunity does not exist or is inactive: ${request.entityId}`,
      };
    }

    const sourceVersion = request.sourceVersion ?? opportunity.updatedAt.toISOString();
    const sections = buildSections(opportunity);
    const bodyText = sections.map((section) => section.text).join('\n\n');
    const sensitivity: AiIndexSensitivityCode = 'internal';
    const aclSnapshot = buildAclSnapshot(opportunity);

    return {
      status: 'indexed',
      projection: {
        sourceApp: 'crm',
        sourceName: 'CRM',
        sourceKind: 'domain',
        adapterCode: this.adapterCode,
        embeddingProfileCode: 'default',
        capabilities: this.capabilities,
        entityType: 'opportunity',
        entityId: opportunity.id.toString(),
        sourceVersion,
        title: opportunity.opportunityName,
        bodyText,
        summary: buildSummary(opportunity),
        target: {
          sourceApp: 'crm',
          path: `/?selected=${encodeURIComponent(opportunity.opportunityCode)}`,
        },
        metadata: buildMetadata(opportunity, sourceVersion),
        contentHash: hashText(bodyText),
        sensitivity,
        acl: {
          accessScope: 'policy',
          sensitivity,
          searchEligible: true,
          contextEligible: true,
          policyHash: hashText(JSON.stringify(aclSnapshot)),
          snapshot: aclSnapshot,
        },
        chunks: buildChunks(opportunity, sections),
      },
    };
  }

  private async syncCustomer(
    customerId: bigint,
    request: AiIndexAdapterSyncRequest,
  ): Promise<AiIndexAdapterSyncResult> {
    const customer = await this.findCustomerProjection(customerId);
    if (!customer) {
      return {
        status: 'skipped',
        reasonCode: 'missing_customer',
        reasonMessage: `CRM customer does not exist or is inactive: ${request.entityId}`,
      };
    }

    const sourceVersion = request.sourceVersion ?? customer.updatedAt.toISOString();
    const sections = buildCustomerSections(customer);
    const bodyText = sections.map((section) => section.text).join('\n\n');
    const sensitivity: AiIndexSensitivityCode = 'internal';
    const aclSnapshot = buildCustomerAclSnapshot(customer);

    return {
      status: 'indexed',
      projection: {
        sourceApp: 'crm',
        sourceName: 'CRM',
        sourceKind: 'domain',
        adapterCode: this.adapterCode,
        embeddingProfileCode: 'default',
        capabilities: this.capabilities,
        entityType: 'customer',
        entityId: customer.id.toString(),
        sourceVersion,
        title: customer.customerName,
        bodyText,
        summary: buildCustomerSummary(customer),
        target: {
          sourceApp: 'crm',
          path: `/?search=${encodeURIComponent(customer.customerName)}`,
        },
        metadata: buildCustomerMetadata(customer, sourceVersion),
        contentHash: hashText(bodyText),
        sensitivity,
        acl: {
          accessScope: 'policy',
          sensitivity,
          searchEligible: true,
          contextEligible: true,
          policyHash: hashText(JSON.stringify(aclSnapshot)),
          snapshot: aclSnapshot,
        },
        chunks: buildCustomerChunks(customer, sections),
      },
    };
  }

  private async syncActivity(
    activityId: bigint,
    request: AiIndexAdapterSyncRequest,
  ): Promise<AiIndexAdapterSyncResult> {
    const activity = await this.findActivityProjection(activityId);
    if (!activity || !activity.customer.isActive) {
      return {
        status: 'skipped',
        reasonCode: 'missing_activity',
        reasonMessage: `CRM customer activity does not exist or is inactive: ${request.entityId}`,
      };
    }

    const sourceVersion = request.sourceVersion ?? activity.updatedAt.toISOString();
    const sections = buildActivitySections(activity);
    const bodyText = sections.map((section) => section.text).join('\n\n');
    const sensitivity: AiIndexSensitivityCode = 'internal';
    const aclSnapshot = buildActivityAclSnapshot(activity);

    return {
      status: 'indexed',
      projection: {
        sourceApp: 'crm',
        sourceName: 'CRM',
        sourceKind: 'domain',
        adapterCode: this.adapterCode,
        embeddingProfileCode: 'default',
        capabilities: this.capabilities,
        entityType: 'activity',
        entityId: activity.id.toString(),
        sourceVersion,
        title: `${activity.customer.customerName} · ${activity.subject}`,
        bodyText,
        summary: buildActivitySummary(activity),
        target: {
          sourceApp: 'crm',
          path: `/?search=${encodeURIComponent(activity.customer.customerName)}`,
        },
        metadata: buildActivityMetadata(activity, sourceVersion),
        contentHash: hashText(bodyText),
        sensitivity,
        acl: {
          accessScope: 'policy',
          sensitivity,
          searchEligible: true,
          contextEligible: true,
          policyHash: hashText(JSON.stringify(aclSnapshot)),
          snapshot: aclSnapshot,
        },
        chunks: buildActivityChunks(activity, sections),
      },
    };
  }

  private async findOpportunityProjection(opportunityId: bigint): Promise<CrmOpportunityProjection | null> {
    return this.db.client.crmOpportunity.findUnique({
      where: {
        id: opportunityId,
        isActive: true,
      },
      include: {
        lines: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { lineCode: 'asc' }],
        },
      },
    }) as Promise<CrmOpportunityProjection | null>;
  }

  private async findCustomerProjection(customerId: bigint): Promise<CrmCustomerProjection | null> {
    return this.db.client.crmCustomer.findUnique({
      where: {
        id: customerId,
        isActive: true,
      },
      include: {
        activities: {
          where: { isActive: true },
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          take: 8,
        },
      },
    }) as Promise<CrmCustomerProjection | null>;
  }

  private async findActivityProjection(activityId: bigint): Promise<CrmCustomerActivityWithCustomerProjection | null> {
    return this.db.client.crmCustomerActivity.findUnique({
      where: {
        id: activityId,
        isActive: true,
      },
      include: {
        customer: true,
      },
    }) as Promise<CrmCustomerActivityWithCustomerProjection | null>;
  }
}
