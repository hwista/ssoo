import { jest, describe, it, expect } from '@jest/globals';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import type { DatabaseService } from '../../../database/database.service.js';
import type { AccessFoundationService } from '../../common/access/access-foundation.service.js';
import type { AccessService } from '../../dms/access/access.service.js';
import type { FileCrudService } from '../../dms/file/file-crud.service.js';
import type { CrmAccessService } from '../access/access.service.js';
import { ContractApprovalService } from './contract-approval.service.js';

function fixture() {
  const now = new Date('2026-09-17T00:00:00Z');
  const contract = { id: 10n, contractCode: 'crm-ct-test', contractName: '검증 계약', updatedAt: now, isActive: true };
  const row = { id: 20n, contractId: 10n, contract, requesterId: 1n, requesterName: '요청자', approverId: 2n, approverName: '승인자', documentId: 30n, documentTitle: '계약 초안', snapshot: { content: '원본' }, versionKey: '', statusCode: 'pending', reason: null as string | null, decidedAt: null as Date | null, createdAt: now, requestKey: '9840f9ca-f13d-4789-8cb6-8e7237bc2e63' };
  let pending = false;
  let replay = false;
  let locked = false;
  let inactive = false;
  let content = '원본';
  let businessRevision: bigint | null = null;
  const update = jest.fn(async ({ data }: { data: Partial<typeof row> }) => Object.assign(row, data));
  const create = jest.fn(async ({ data }: { data: Partial<typeof row> }) => { pending = true; return Object.assign(row, data); });
  const client = {
    user: { findFirst: jest.fn(async ({ where }: { where: { id: bigint } }) => inactive && where.id === 2n ? null : ({ id: where.id, userName: where.id === 1n ? '요청자' : '승인자', authAccount: { loginId: `user${where.id}`, lockedUntil: null } })) },
    crmContract: { findFirst: jest.fn(async () => contract) },
    crmContractHistory: { findFirst: jest.fn(async () => businessRevision === null ? null : { historySeq: businessRevision }) },
    crmContractDmsHandoff: { findFirst: jest.fn(async () => ({ id: 40n, draftPath: '계약/초안.md', savedAt: now, documentTitle: '계약 초안' })) },
    dmsDocument: { findFirst: jest.fn(async () => ({ documentId: 30n, relativePath: '계약/초안.md' })) },
    crmContractApproval: {
      findFirst: jest.fn(async ({ where }: { where: { statusCode?: string } }) => where.statusCode ? (pending ? row : null) : row),
      findMany: jest.fn(async () => pending ? [row] : []),
      findUnique: jest.fn(async () => replay ? row : null), create, update,
    },
    $queryRaw: jest.fn(async () => []),
    $transaction: async <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => callback(client),
  };
  const crmAccess = { assertDomainCapability: jest.fn(async () => ({})), getDomainAccess: jest.fn(async () => ({ features: { canWriteContract: true } })) };
  const dmsAccess = { assertFeatures: jest.fn(async () => ({})) };
  const files = { read: jest.fn(async () => ({ success: true, data: { content, metadata: { document: { documentId: '30', revisionSeq: 1 } }, ...(locked ? { lockedPreview: {} } : {}) } })) };
  const service = new ContractApprovalService({ client } as unknown as DatabaseService, crmAccess as unknown as CrmAccessService, dmsAccess as unknown as AccessService, { getUserOrganizationIds: async () => [] } as unknown as AccessFoundationService, files as unknown as FileCrudService);
  const actor = (id = '1') => ({ userId: id, loginId: `user${id}` });
  const request = async () => {
    const workspace = await service.workspace(contract.contractCode, actor());
    return { approverId: '2', versionKey: workspace.source!.versionKey, requestKey: row.requestKey };
  };
  return { setBusinessRevision: (value: bigint) => { businessRevision = value; }, service, row, contract, client, create, update, actor, request, setContent: (value: string) => { content = value; }, setLocked: () => { locked = true; }, setInactive: () => { inactive = true; }, setReplay: () => { replay = true; } };
}

describe('ContractApprovalService — actual internal decisions', () => {
  it('stores the exact requested text and assigns a different actual user', async () => {
    const f = fixture(); await f.service.request(f.contract.contractCode, await f.request(), f.actor());
    expect(f.row.snapshot.content).toBe('원본'); expect(f.row.approverId).toBe(2n); expect(f.row.statusCode).toBe('pending');
  });
  it('rejects self-approval requests', async () => {
    const f = fixture(); await expect(f.service.request(f.contract.contractCode, { ...await f.request(), approverId: '1' }, f.actor())).rejects.toBeInstanceOf(BadRequestException);
    expect(f.create).not.toHaveBeenCalled();
  });
  it('rejects inactive approvers', async () => {
    const f = fixture(); const dto = await f.request(); f.setInactive();
    await expect(f.service.request(f.contract.contractCode, dto, f.actor())).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('does not mistake a successful locked preview for permission to view the snapshot', async () => {
    const f = fixture(); f.setLocked();
    await expect(f.service.snapshot('20', f.actor())).rejects.toBeInstanceOf(ForbiddenException);
    expect((await f.service.workspace(f.contract.contractCode, f.actor())).source).toBeNull();
  });
  it('rejects requests made from an outdated preview', async () => {
    const f = fixture(); const dto = await f.request(); f.setContent('변경된 원본');
    await expect(f.service.request(f.contract.contractCode, dto, f.actor())).rejects.toBeInstanceOf(ConflictException);
  });
  it('does not create duplicate pending requests', async () => {
    const f = fixture(); const dto = await f.request(); await f.service.request(f.contract.contractCode, dto, f.actor());
    await expect(f.service.request(f.contract.contractCode, dto, f.actor())).rejects.toBeInstanceOf(ConflictException);
    expect(f.create).toHaveBeenCalledTimes(1);
  });
  it('replays an identical request and rejects changed payload under the same key', async () => {
    const f = fixture(); const dto = await f.request(); await f.service.request(f.contract.contractCode, dto, f.actor()); f.setReplay();
    await expect(f.service.request(f.contract.contractCode, dto, f.actor())).resolves.toEqual({ id: '20' });
    await expect(f.service.request(f.contract.contractCode, { ...dto, approverId: '3' }, f.actor())).rejects.toBeInstanceOf(ConflictException);
    expect(f.create).toHaveBeenCalledTimes(1);
  });
  it('turns a cross-contract request-key race into a conflict without leaking an internal error', async () => {
    const f = fixture(); f.create.mockRejectedValueOnce({ code: 'P2002' });
    await expect(f.service.request(f.contract.contractCode, await f.request(), f.actor())).rejects.toBeInstanceOf(ConflictException);
  });
  it('allows only the assigned person to decide, including when the requester has write access', async () => {
    const f = fixture(); await f.service.request(f.contract.contractCode, await f.request(), f.actor());
    for (const id of ['1', '3']) await expect(f.service.decide('20', { action: 'approve' }, f.actor(id))).rejects.toBeInstanceOf(ForbiddenException);
    await f.service.decide('20', { action: 'approve' }, f.actor('2')); expect(f.row.statusCode).toBe('approved');
  });
  it('requires a nonblank rejection reason and records the actual actor', async () => {
    const f = fixture(); await f.service.request(f.contract.contractCode, await f.request(), f.actor());
    await expect(f.service.decide('20', { action: 'reject', reason: '  ' }, f.actor('2'))).rejects.toBeInstanceOf(BadRequestException);
    await f.service.decide('20', { action: 'reject', reason: '금액 확인 필요' }, f.actor('2'));
    expect(f.row.reason).toBe('금액 확인 필요'); expect(f.update.mock.calls[0][0].data).toMatchObject({ updatedBy: 2n });
  });
  it('blocks stale decisions but allows the requester to withdraw', async () => {
    const f = fixture(); await f.service.request(f.contract.contractCode, await f.request(), f.actor()); f.setContent('새 초안');
    await expect(f.service.decide('20', { action: 'approve' }, f.actor('2'))).rejects.toBeInstanceOf(ConflictException);
    await expect(f.service.decide('20', { action: 'withdraw' }, f.actor('2'))).rejects.toBeInstanceOf(ForbiddenException);
    await f.service.decide('20', { action: 'withdraw' }, f.actor()); expect(f.row.statusCode).toBe('withdrawn');
  });
  it('replays the same decision without another write and rejects conflicting decisions', async () => {
    const f = fixture(); await f.service.request(f.contract.contractCode, await f.request(), f.actor());
    await f.service.decide('20', { action: 'approve' }, f.actor('2')); await f.service.decide('20', { action: 'approve' }, f.actor('2'));
    await expect(f.service.decide('20', { action: 'reject', reason: '변경' }, f.actor('2'))).rejects.toBeInstanceOf(ConflictException);
    expect(f.update).toHaveBeenCalledTimes(1);
  });
  it('preserves approval when only document export evidence changes the contract audit timestamp', async () => {
    const f = fixture(); f.setBusinessRevision(7n);
    await f.service.request(f.contract.contractCode, await f.request(), f.actor());
    await f.service.decide('20', { action: 'approve' }, f.actor('2'));
    f.contract.updatedAt = new Date('2026-09-18T00:00:00Z');
    expect((await f.service.workspace(f.contract.contractCode, f.actor())).items[0].currentVersion).toBe(true);
    f.setBusinessRevision(9n);
    expect((await f.service.workspace(f.contract.contractCode, f.actor())).items[0].currentVersion).toBe(false);
  });
  it('keeps the original snapshot and invalidates current approval when the contract changes', async () => {
    const f = fixture(); await f.service.request(f.contract.contractCode, await f.request(), f.actor()); await f.service.decide('20', { action: 'approve' }, f.actor('2'));
    f.contract.updatedAt = new Date('2026-09-18T00:00:00Z');
    expect((await f.service.workspace(f.contract.contractCode, f.actor())).items[0].currentVersion).toBe(false);
    f.setContent('수정'); expect((await f.service.snapshot('20', f.actor())).content).toBe('원본');
  });
});
