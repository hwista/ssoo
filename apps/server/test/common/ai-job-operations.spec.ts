import { jest } from '@jest/globals';
import { AiJobOperationsService } from '../../src/modules/common/ai-index/ai-job-operations.service.js';
import { AiIndexingService } from '../../src/modules/common/ai-index/ai-indexing.service.js';

describe('AI failed job operations', () => {
  function setup() {
    const now = new Date('2026-11-04T00:00:00Z');
    const original = { aiIndexJobId: 5n, aiSourceId: null, aiObjectId: null, sourceAppCode: 'admin', entityTypeCode: 'fixture', entityId: 'owned', jobTypeCode: 'upsert', jobStatusCode: 'failed', priorityNo: 100, attemptCount: 3, maxAttempts: 3, sourceVersion: null, requestedBy: 1n, requestedAt: now, startedAt: now, finishedAt: now, nextRetryAt: null, lastErrorMessage: 'provider unavailable', payloadJson: { secret: 'must-not-be-returned' }, metadataJson: { internal: 'must-not-be-returned' }, isActive: true, memo: 'original', updatedAt: now };
    const create = jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({ ...original, aiIndexJobId: 6n, attemptCount: 0, jobStatusCode: 'pending', metadataJson: { manualRetryOfJobId: '5' } });
    const update = jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(original);
    const tx = { aiIndexJob: { findUnique: async () => original, create, update } };
    const transaction = jest.fn<(fn: (tx: unknown) => Promise<unknown>, options: unknown) => Promise<unknown>>().mockImplementation(fn => fn(tx));
    const service = new AiJobOperationsService({ client: { ...tx, $transaction: transaction } } as never, { isPlatformAdmin: async () => true } as never);
    return { service, original, create, update, transaction };
  }

  it('returns execution status without exposing payload or internal metadata', async () => {
    const { service } = setup();
    const result = await service.detail('5');
    expect(result).toMatchObject({ canRetry: true, attemptCount: 3, status: 'failed' });
    expect(JSON.stringify(result)).not.toContain('must-not-be-returned');
    await expect(service.detail('-1')).rejects.toThrow();
  });

  it('preserves the failed execution and creates a linked bounded retry', async () => {
    const fixture = setup();
    const current = await fixture.service.detail('5');
    const result = await fixture.service.retry('5', { reason: 'provider 복구 확인', expectedRevision: current.revision }, 1n);
    expect(result).toMatchObject({ id: '6', retryOfJobId: '5', status: 'pending', attemptCount: 0 });
    expect(fixture.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ maxAttempts: 3, memo: 'provider 복구 확인', requestedBy: 1n }) }));
    const change = fixture.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(change.data).not.toHaveProperty('attemptCount');
    expect(change.data).not.toHaveProperty('jobStatusCode');
    expect(fixture.transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'Serializable' });
  });

  it('rejects a stale revision and a job already linked to a retry', async () => {
    const fixture = setup();
    await expect(fixture.service.retry('5', { reason: '재시도', expectedRevision: '0'.repeat(64) }, 1n)).rejects.toThrow('상태가 변경');
    Object.assign(fixture.original.metadataJson, { manualRetryJobId: '6' });
    const current = await fixture.service.detail('5');
    expect(current.canRetry).toBe(false);
    await expect(fixture.service.retry('5', { reason: '중복 재시도', expectedRevision: current.revision }, 1n)).rejects.toThrow('실패 작업');
    expect(fixture.create).not.toHaveBeenCalled();
  });

  it('rejects running work instead of resetting its execution state', async () => {
    const fixture = setup();
    fixture.original.jobStatusCode = 'running';
    const current = await fixture.service.detail('5');
    await expect(fixture.service.retry('5', { reason: '재시도', expectedRevision: current.revision }, 1n)).rejects.toThrow('실패 작업');
    expect(fixture.create).not.toHaveBeenCalled();
  });

  it('reports concurrent retry transaction conflicts without enqueueing again', async () => {
    const fixture = setup();
    fixture.transaction.mockRejectedValue(Object.assign(new Error('serialization'), { code: 'P2034' }));
    await expect(fixture.service.retry('5', { reason: '재시도', expectedRevision: (await fixture.service.detail('5')).revision }, 1n)).rejects.toThrow('다른 운영자');
    expect(fixture.transaction).toHaveBeenCalledTimes(1);
  });
});

describe('AI worker competing claims', () => {
  it('runs an adapter once when two workers read the same pending job', async () => {
    const row = { ai_index_job_id: 5n, ai_object_id: null, source_app_code: 'admin', entity_type_code: 'fixture', entity_id: 'owned', job_type_code: 'upsert', job_status_code: 'pending', priority_no: 100, attempt_count: 0, max_attempts: 3, source_version: null, requested_at: new Date(), next_retry_at: null, last_error_message: null, payload_jsonb: null, metadata_jsonb: null };
    let claimed = false;
    const execute = jest.fn<(sql: string, ...args: unknown[]) => Promise<number>>().mockImplementation(async sql => {
      if (sql.includes("SET job_status_code = 'running'")) {
        expect(sql).toContain("job_status_code = 'pending'");
        expect(sql).toContain('attempt_count < max_attempts');
        if (claimed) return 0;
        claimed = true;
      }
      return 1;
    });
    const service = new AiIndexingService({ client: { $queryRawUnsafe: async () => [row], $executeRawUnsafe: execute } } as never, {} as never, {} as never);
    const adapter = jest.spyOn(service, 'syncObject').mockResolvedValue({ objectId: '0', status: 'skipped' } as never);
    const results = await Promise.all([service.runPendingJobs(1), service.runPendingJobs(1)]);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(results.reduce((sum, result) => sum + result.processedCount, 0)).toBe(1);
    expect(results.reduce((sum, result) => sum + result.skippedCount, 0)).toBe(1);
  });
});
