import type { CrmAccessService } from '../access/access.service.js';
import type { CustomerService } from '../customer/customer.service.js';
import type { OpportunityService } from '../opportunity/opportunity.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CommonSearchRegistryService } from '../../common/search/search-registry.service.js';
import { CrmCommonSearchProvider } from './crm-common-search.provider.js';

const user: TokenPayload = { userId: '71', loginId: 'search-test' };

function fixture() {
  let allowed = true;
  const checkedUsers: TokenPayload[] = [];
  const opportunities = ['permitted', 'restricted'].map((id) => ({
    id, opportunityName: id, nextAction: `${id} confidential next action`,
    customerName: 'Customer', businessType: 'SI', status: 'lead', ownerName: 'Owner',
    industryLine: 'Manufacturing', priority: 'normal', updatedAt: '2026-10-01T00:00:00Z',
  }));
  const customers = ['permitted', 'restricted'].map((id) => ({
    id, code: id, customerName: id, ownerName: 'Owner', industryLine: 'Manufacturing',
    nextAction: `${id} confidential next action`, type: 'active', recentActivities: [], activityCount: 0,
    updatedAt: '2026-10-01T00:00:00Z',
  }));
  const access = {
    getOpportunityAccess: async (id: string, actor: TokenPayload) => {
      checkedUsers.push(actor);
      return { features: { canViewOpportunity: allowed && id === 'permitted' } };
    },
    getCustomerAccess: async (id: string, actor: TokenPayload) => {
      checkedUsers.push(actor);
      return { features: { canViewCustomer: allowed && id === 'permitted' } };
    },
  } as unknown as CrmAccessService;
  const provider = new CrmCommonSearchProvider(
    { listOpportunities: async () => opportunities } as unknown as OpportunityService,
    { listCustomers: async () => customers } as unknown as CustomerService,
    new CommonSearchRegistryService(), access,
  );
  return { provider, checkedUsers, revoke: () => { allowed = false; } };
}

describe('CRM common search current object permission', () => {
  it('excludes restricted titles, excerpts, and metadata using the authenticated user', async () => {
    const { provider, checkedUsers } = fixture();
    const result = await provider.search({ query: 'Customer', currentUser: user });
    expect(result.results.map((entry) => entry.id).sort()).toEqual(['crm:customer:permitted', 'crm:opportunity:permitted']);
    expect(JSON.stringify(result)).not.toContain('restricted');
    expect(checkedUsers).toEqual([user, user, user, user]);
  });

  it('rechecks grants on subsequent searches after permission revocation', async () => {
    const { provider, revoke } = fixture();
    expect((await provider.search({ query: 'Customer', currentUser: user })).results).toHaveLength(2);
    revoke();
    expect((await provider.search({ query: 'Customer', currentUser: user })).results).toEqual([]);
  });
});
