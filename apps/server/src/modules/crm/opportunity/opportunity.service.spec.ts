import { OpportunityService } from './opportunity.service.js';

describe('OpportunityService', () => {
  it('returns seeded CRM opportunities with read-only integration boundaries', () => {
    const service = new OpportunityService();

    const opportunities = service.listOpportunities();

    expect(opportunities).toHaveLength(5);
    expect(opportunities[0]).toMatchObject({
      id: 'crm-opp-001',
      customerName: 'LS Electric',
      pmsHandoffStatus: 'planned',
      dmsLinkStatus: 'planned',
    });
    expect(opportunities.every((item) => item.adminBoundary === 'shared-admin')).toBe(true);
  });

  it('calculates summary totals from revenue and cost without claiming contract handoff completion', () => {
    const service = new OpportunityService();

    const summary = service.getSummary();

    expect(summary.totalCount).toBe(5);
    expect(summary.totalRevenue).toBeGreaterThan(summary.totalCost);
    expect(summary.grossMarginRate).toBeGreaterThan(0);
    expect(summary.boundaryNotice).toContain('PMS');
    expect(summary.unimplementedIntegrations).toEqual(['견적 생성', '계약 전환', 'DMS 연결', 'PMS 인계']);
  });

  it('filters and sorts opportunities for the first CRM list surface without mutating ledger totals', () => {
    const service = new OpportunityService();

    const response = service.listResponse({ search: 'LS', status: 'proposal', sort: 'margin-desc' });

    expect(response.items).toHaveLength(1);
    expect(response.items[0]?.id).toBe('crm-opp-001');
    expect(response.summary.totalCount).toBe(5);
    expect(response.summary.filteredCount).toBe(1);
    expect(response.summary.activeFilters).toEqual({ search: 'LS', status: 'proposal', sort: 'margin-desc' });
  });
});
