import { Injectable, OnModuleInit } from '@nestjs/common';
import type { CommonSearchResult } from '@ssoo/types/common';
import { CommonSearchRegistryService } from '../../common/search/search-registry.service.js';
import type {
  CommonSearchProvider,
  CommonSearchProviderContext,
  CommonSearchProviderResult,
} from '../../common/search/search-provider.js';
import { shouldSkipEntityTypes } from '../../common/search/search-provider.js';
import { scoreCommonSearchValues } from '../../common/search/search-utils.js';
import { CustomerService } from '../customer/customer.service.js';
import { OpportunityService } from '../opportunity/opportunity.service.js';
import { CrmAccessService } from '../access/access.service.js';

@Injectable()
export class CrmCommonSearchProvider implements CommonSearchProvider, OnModuleInit {
  readonly sourceApp = 'crm';
  readonly label = 'CRM';

  constructor(
    private readonly opportunityService: OpportunityService,
    private readonly customerService: CustomerService,
    private readonly registry: CommonSearchRegistryService,
    private readonly access: CrmAccessService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async search({ query, entityTypes, currentUser }: CommonSearchProviderContext): Promise<CommonSearchProviderResult> {
    if (shouldSkipEntityTypes(entityTypes, ['opportunity', 'customer'])) {
      return { results: [] };
    }

    const includeOpportunities = !shouldSkipEntityTypes(entityTypes, ['opportunity']);
    const includeCustomers = !shouldSkipEntityTypes(entityTypes, ['customer']);
    const [opportunities, customers] = await Promise.all([
      includeOpportunities
        ? this.opportunityService.listOpportunities({ search: query }, currentUser)
        : Promise.resolve([]),
      includeCustomers
        ? this.customerService.listCustomers({ search: query, limit: 12 }, currentUser)
        : Promise.resolve([]),
    ]);
    // Recheck the original records before returning any title, excerpt or metadata.
    // App admission alone does not imply permission to every CRM object.
    const [opportunityAccess, customerAccess] = await Promise.all([
      Promise.all(opportunities.map((entry) => this.access.getOpportunityAccess(entry.id, currentUser))),
      Promise.all(customers.map((entry) => this.access.getCustomerAccess(entry.id, currentUser))),
    ]);
    const opportunityResults = opportunities.filter((_, index) => opportunityAccess[index].features.canViewOpportunity).slice(0, 12).map((opportunity): CommonSearchResult => ({
      id: `crm:opportunity:${opportunity.id}`,
      sourceApp: 'crm',
      entityType: 'opportunity',
      title: opportunity.opportunityName,
      excerpt: opportunity.nextAction,
      summary: `${opportunity.customerName} · ${opportunity.businessType} · ${opportunity.status}`,
      snippets: [
        opportunity.customerName,
        opportunity.ownerName,
        opportunity.businessType,
        opportunity.industryLine,
        opportunity.nextAction,
      ].filter((value) => value.trim().length > 0),
      score: scoreCommonSearchValues(query, [
        opportunity.opportunityName,
        opportunity.customerName,
        opportunity.ownerName,
        opportunity.businessType,
        opportunity.industryLine,
        opportunity.nextAction,
      ]) + 8,
      ranker: 'keyword',
      matchReason: '영업기회명/고객/담당자',
      target: {
        sourceApp: 'crm',
        path: `/?selected=${encodeURIComponent(opportunity.id)}`,
      },
      permissionState: 'readable',
      badges: [
        { label: opportunity.status, tone: opportunity.status === 'won' ? 'success' : 'primary' },
        { label: opportunity.priority, tone: opportunity.priority === 'high' ? 'warning' : 'muted' },
      ],
      updatedAt: opportunity.updatedAt,
      ownerLabel: opportunity.ownerName,
      metadata: {
        opportunityId: opportunity.id,
        customerName: opportunity.customerName,
        status: opportunity.status,
        priority: opportunity.priority,
      },
    }));
    const customerResults = customers.filter((_, index) => customerAccess[index].features.canViewCustomer).slice(0, 12).map((customer): CommonSearchResult => ({
      id: `crm:customer:${customer.id}`,
      sourceApp: 'crm',
      entityType: 'customer',
      title: customer.customerName,
      excerpt: customer.lastInteractionSummary ?? customer.nextAction,
      summary: `${customer.industryLine} · ${customer.ownerName} · ${customer.type}`,
      snippets: [
        customer.industryLine,
        customer.ownerName,
        customer.contactName,
        customer.latestOpportunityCode,
        customer.lastInteractionSummary,
        customer.nextAction,
        ...customer.recentActivities.flatMap((activity) => [activity.subject, activity.summary, activity.nextAction]),
      ].filter((value): value is string => Boolean(value?.trim())),
      score: scoreCommonSearchValues(query, [
        customer.customerName,
        customer.industryLine,
        customer.ownerName,
        customer.contactName ?? '',
        customer.latestOpportunityCode ?? '',
        customer.lastInteractionSummary ?? '',
        customer.nextAction,
        ...customer.recentActivities.flatMap((activity) => [activity.subject, activity.summary, activity.nextAction ?? '']),
      ]) + 6,
      ranker: 'keyword',
      matchReason: '고객명/담당자/최근 활동',
      target: {
        sourceApp: 'crm',
        path: `/?search=${encodeURIComponent(customer.customerName)}`,
      },
      permissionState: 'readable',
      badges: [
        { label: customer.type, tone: customer.type === 'active' ? 'success' : 'primary' },
        { label: `${customer.activityCount} activities`, tone: 'muted' },
      ],
      updatedAt: customer.updatedAt,
      ownerLabel: customer.ownerName,
      metadata: {
        customerId: customer.id,
        customerCode: customer.code,
        customerType: customer.type,
        ownerName: customer.ownerName,
      },
    }));

    return {
      capabilities: {
        keyword: true,
        metadata: true,
        semantic: false,
        vector: false,
        ragContext: false,
      },
      results: [...opportunityResults, ...customerResults]
        .sort((left, right) => right.score - left.score)
        .slice(0, 12),
    };
  }
}
