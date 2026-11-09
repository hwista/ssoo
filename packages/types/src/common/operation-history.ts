export interface CommonOperationEvent {
  id: string;
  category: string;
  categoryLabel: string;
  subjectId: string;
  historySequence: string;
  eventType: string;
  eventAt: string;
  operatorUserId: string | null;
  source: string | null;
  activity: string | null;
  transactionId: string | null;
  result: string;
  details: Record<string, string | null>;
  programPath: string;
}

export interface CommonOperationHistoryPage {
  snapshotAt: string;
  items: CommonOperationEvent[];
  total: number;
  page: number;
  pageSize: number;
  categories: Array<{ id: string; label: string }>;
}

export interface CommonOperationHistoryFilter {
  scope?: 'business' | 'all';
  asOf?: string;
  category?: string;
  subjectId?: string;
  userId?: string;
  organizationId?: string;
  roleId?: string;
  operatorUserId?: string;
  from?: string;
  to?: string;
  result?: string;
  page?: number;
  pageSize?: number;
}

export interface CommonOperationHistoryDetail {
  current: CommonOperationEvent;
  previous: CommonOperationEvent | null;
  changedFields: string[];
}
