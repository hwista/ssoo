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
import { OpportunityService } from '../opportunity/opportunity.service.js';

@Injectable()
export class CrmCommonSearchProvider implements CommonSearchProvider, OnModuleInit {
  readonly sourceApp = 'crm';
  readonly label = 'CRM';

  constructor(
    private readonly opportunityService: OpportunityService,
    private readonly registry: CommonSearchRegistryService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async search({ query, entityTypes }: CommonSearchProviderContext): Promise<CommonSearchProviderResult> {
    if (shouldSkipEntityTypes(entityTypes, ['opportunity'])) {
      return { results: [] };
    }

    const opportunities = this.opportunityService.listOpportunities({ search: query }).slice(0, 12);

    return {
      capabilities: {
        keyword: true,
        metadata: true,
        semantic: false,
        vector: false,
        ragContext: false,
      },
      results: opportunities.map((opportunity): CommonSearchResult => ({
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
      })),
    };
  }
}
