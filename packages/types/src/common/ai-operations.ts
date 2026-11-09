export interface ManagedAiJob {
  id: string;
  sourceApp: string;
  entityType: string;
  entityId: string;
  jobType: string;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  requestedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  nextRetryAt: string | null;
  lastError: string | null;
  requestedBy: string | null;
  reason: string | null;
  retryJobId: string | null;
  retryOfJobId: string | null;
  canRetry: boolean;
  revision: string;
}
