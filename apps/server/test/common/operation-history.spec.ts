import { jest } from '@jest/globals';
import { OperationHistoryService } from '../../src/modules/common/access/operation-history.service.js';
import { OperationHistoryQueryDto } from '../../src/modules/common/access/dto/operation-history.dto.js';

const row = { category: 'membership', subject_id: '23', history_sequence: '2', event_type: 'U', event_at: new Date('2026-11-04T05:00:00Z'), operator_user_id: '2', source: 'admin', activity: 'membership.end', transaction_id: 'tx-example', result: 'inactive', details: { user_id: '9', org_id: '8', is_active: 'false', memo: '퇴사 처리' } };

describe('Common operation history', () => {
  function setup() {
    const query = jest.fn<(...args: unknown[]) => Promise<unknown[]>>().mockImplementation(async sql => String(sql).startsWith('SELECT COUNT') ? [{ total: 1n }] : [row]);
    return { query, service: new OperationHistoryService({ client: { $queryRawUnsafe: query } } as never) };
  }

  it('rejects a category outside the static registry before querying', async () => {
    const { service, query } = setup();
    await expect(service.list({ ...new OperationHistoryQueryDto(), category: "membership'; DROP TABLE common.cm_user" })).rejects.toThrow('분류');
    expect(query).not.toHaveBeenCalled();
  });

  it('binds all user controlled values and restricts fields to the audited allowlist', async () => {
    const { service, query } = setup();
    const injected = "23' OR TRUE --";
    const result = await service.list({ ...new OperationHistoryQueryDto(), category: 'membership', subjectId: injected, userId: '9', organizationId: '8', operatorUserId: '2', result: 'inactive', from: '2026-11-01T00:00:00Z', to: '2026-11-05T00:00:00Z', page: 2, pageSize: 10 });
    const [sql, ...parameters] = query.mock.calls[0];
    expect(sql).not.toContain(injected);
    expect(parameters).toContain(injected);
    expect(parameters.slice(-2)).toEqual([10, 10]);
    expect(sql).toContain('common.cm_user_org_h');
    expect(sql).not.toContain('common.cm_user_auth_h');
    expect(result.items[0]).toMatchObject({ categoryLabel: '소속', subjectId: '23', operatorUserId: '2', result: 'inactive', programPath: '/organizations' });
    expect(result.total).toBe(1);
  });

  it('covers common history sources without exposing credentials, reset codes or mail bodies', async () => {
    const { service, query } = setup();
    const result = await service.list(new OperationHistoryQueryDto());
    const sql = String(query.mock.calls[0][0]);
    expect(result.categories).toHaveLength(19);
    expect(sql).toContain('common.cm_auth_email_outbox_h');
    expect(sql).toContain('common.cm_approval_authority_h');
    expect(sql).not.toMatch(/password_hash|token_hash|code_hash|client_secret|body_text|body_html|raw_claims|encrypted/);
    expect(sql).toContain("WHEN h.event_type = 'D' THEN 'deleted'");
    expect(sql).not.toContain('to_jsonb(h)');
  });

  it('rejects invalid periods and identifiers', async () => {
    const { service, query } = setup();
    await expect(service.list({ ...new OperationHistoryQueryDto(), from: '2026-11-05', to: '2026-11-04' })).rejects.toThrow('시각');
    await expect(service.list({ ...new OperationHistoryQueryDto(), userId: '-1' })).rejects.toThrow();
    await expect(service.detail('membership', '23', 'zero')).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });

  it('uses the same business scope before counting and pagination, keeping full audit and explicit session lookup available', async () => {
    const { service, query } = setup();
    await service.list({ ...new OperationHistoryQueryDto(), scope: 'business' });
    for (const call of query.mock.calls) {
      const sql = String(call[0]);
      expect(sql).toMatch(/FROM common\.cm_user_session_h h WHERE[^]*?AND FALSE/);
      expect(sql).toContain('COALESCE(h.updated_by, h.created_by) IS NOT NULL');
      expect(sql).toContain("COALESCE(h.last_activity, '') NOT IN ('UserAuth.update', 'UserAuth.updateMany')");
    }
    query.mockClear();
    await service.list({ ...new OperationHistoryQueryDto(), scope: 'all' });
    expect(query.mock.calls[0][0]).not.toContain('AND FALSE');
    query.mockClear();
    await service.list({ ...new OperationHistoryQueryDto(), scope: 'business', category: 'session' });
    expect(query.mock.calls[0][0]).toContain('common.cm_user_session_h');
    expect(query.mock.calls[0][0]).not.toContain('AND FALSE');
  });

  it('compares with the immediate previous snapshot, keeping unchanged fields out of the change list', async () => {
    const { service, query } = setup();
    query.mockResolvedValueOnce([row, { ...row, history_sequence: '1', event_type: 'I', details: { ...row.details, is_active: 'true', memo: '입사 배치' } }]);
    const result = await service.detail('membership', '23', '2');
    expect(result.changedFields).toEqual(['is_active', 'memo']);
    expect(result.previous?.details.memo).toBe('입사 배치');
    expect(result.current.details.memo).toBe('퇴사 처리');
    expect(query.mock.calls[0].slice(1)).toEqual(['23', 2n]);
  });

  it('does not substitute an older snapshot when the requested sequence is absent', async () => {
    const { service } = setup();
    await expect(service.detail('membership', '23', '3')).rejects.toThrow('찾을 수 없습니다');
  });

  it('holds a snapshot boundary across pages while new session history is being recorded', async () => {
    const { service, query } = setup();
    const first = await service.list(new OperationHistoryQueryDto());
    const second = await service.list({ ...new OperationHistoryQueryDto(), page: 2, asOf: first.snapshotAt });
    expect(second.snapshotAt).toBe(first.snapshotAt);
    expect(query.mock.calls[2][0]).toContain('h.event_at <= $1');
    expect(query.mock.calls[2][1]).toEqual(new Date(first.snapshotAt));
  });

  it('handles first creation with no previous snapshot', async () => {
    const { service, query } = setup();
    query.mockResolvedValueOnce([{ ...row, history_sequence: '1', event_type: 'I' }]);
    const result = await service.detail('membership', '23', '1');
    expect(result.previous).toBeNull();
    expect(result.changedFields).toEqual(Object.keys(row.details));
  });

  it('preserves UTC semantics for timestamps whose database JSON omits a timezone', async () => {
    const { service, query } = setup();
    query.mockResolvedValueOnce([{ ...row, details: { expires_at: '2026-12-31T09:00:00', effective_from: '2026-11-04T13:00:00+09:00' } }]);
    const result = await service.detail('membership', '23', '2');
    expect(result.current.details.expires_at).toBe('2026-12-31T09:00:00.000Z');
    expect(result.current.details.effective_from).toBe('2026-11-04T04:00:00.000Z');
  });
});
