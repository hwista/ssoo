export type CrmCustomerType = 'prospect' | 'active' | 'partner' | 'inactive';
export type CrmCustomerActivityType =
  | 'call'
  | 'meeting'
  | 'email'
  | 'proposal'
  | 'contract'
  | 'support'
  | 'opportunity-next-action';
export type CrmCustomerActivityStatus = 'planned' | 'done' | 'cancelled';
export type CrmCustomerRegion = 'domestic' | 'overseas';
export type CrmCustomerSort = 'updated-desc' | 'activity-desc' | 'name-asc';

export interface CrmCustomerActivity {
  id: string;
  code: string;
  customerId: string;
  sourceOpportunityId?: string;
  sourceOpportunityCode?: string;
  type: CrmCustomerActivityType;
  status: CrmCustomerActivityStatus;
  subject: string;
  occurredAt: string;
  dueAt?: string;
  ownerName: string;
  ownerUserId?: string;
  summary: string;
  nextAction?: string;
  updatedAt: string;
}

export interface CrmCustomer {
  /** Owning business organization; absent only for preserved legacy records. */
  ownerOrganizationId?: string;
  id: string;
  code: string;
  customerName: string;
  type: CrmCustomerType;
  industryLine: string;
  region: CrmCustomerRegion;
  ownerName: string;
  ownerUserId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  sourceOpportunityId?: string;
  latestOpportunityCode?: string;
  latestActivityAt?: string;
  lastInteractionSummary?: string;
  nextAction: string;
  adminBoundary: 'shared-admin';
  activityCount: number;
  recentActivities: CrmCustomerActivity[];
  updatedAt: string;
}

export interface CrmCustomerListQuery {
  search?: string;
  type?: CrmCustomerType | 'all';
  sort?: CrmCustomerSort;
  limit?: number;
}

export interface CrmCustomerListSummary {
  totalCount: number;
  filteredCount: number;
  prospectCount: number;
  activeCount: number;
  partnerCount: number;
  inactiveCount: number;
  activityBackfillCount: number;
  activeFilters: Required<Pick<CrmCustomerListQuery, 'search' | 'type' | 'sort'>>;
}

export interface CrmCustomerListResponse {
  summary: CrmCustomerListSummary;
  items: CrmCustomer[];
}

export interface CrmCustomerUpsertRequest {
  /** Owning business organization; absent only for preserved legacy records. */
  ownerOrganizationId?: string;
  customerName: string;
  type?: CrmCustomerType;
  industryLine: string;
  region: CrmCustomerRegion;
  ownerName: string;
  ownerUserId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  sourceOpportunityId?: string;
  latestOpportunityCode?: string;
  lastInteractionSummary?: string;
  nextAction: string;
}

export interface CrmCustomerActivityListQuery {
  type?: CrmCustomerActivityType | 'all';
  limit?: number;
}

export interface CrmCustomerActivityCreateRequest {
  sourceOpportunityId?: string;
  sourceOpportunityCode?: string;
  type: CrmCustomerActivityType;
  status?: CrmCustomerActivityStatus;
  subject: string;
  occurredAt?: string;
  dueAt?: string;
  ownerName: string;
  ownerUserId?: string;
  summary: string;
  nextAction?: string;
}

export interface CrmCustomerActivityListResponse {
  customerId: string;
  customerCode: string;
  items: CrmCustomerActivity[];
}

export interface CrmCustomerAiIndexBackfillRequest {
  customerIds?: string[];
  activityIds?: string[];
  limit?: number;
  includeInactive?: boolean;
  reasonCode?: string;
}

export type CrmCustomerAiIndexBackfillEntityType = 'customer' | 'activity';

export interface CrmCustomerAiIndexBackfillItem {
  entityType: CrmCustomerAiIndexBackfillEntityType;
  entityId: string;
  customerId?: string;
  activityId?: string;
  status: 'queued' | 'failed' | 'skipped';
  errorMessage?: string;
}

export interface CrmCustomerAiIndexBackfillResponse {
  sourceApp: 'crm';
  entityTypes: CrmCustomerAiIndexBackfillEntityType[];
  jobType: 'backfill';
  requestedCustomerCount: number;
  requestedActivityCount: number;
  selectedCustomerCount: number;
  selectedActivityCount: number;
  queuedCount: number;
  failedCount: number;
  skippedCount: number;
  limit: number;
  includeInactive: boolean;
  reasonCode: string;
  items: CrmCustomerAiIndexBackfillItem[];
}
