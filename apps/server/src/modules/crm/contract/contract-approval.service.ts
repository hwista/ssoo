import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Prisma } from '@ssoo/database';
import type { CrmContractApproval, CrmContractApprovalCandidates, CrmContractApprovalDecision, CrmContractApprovalInbox, CrmContractApprovalRequest, CrmContractApprovalSource, CrmContractApprovalStatus, CrmContractApprovalWorkspace } from '@ssoo/types/crm';
import { DatabaseService } from '../../../database/database.service.js';
import { AccessFoundationService } from '../../common/access/access-foundation.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { AccessService as DmsAccessService } from '../../dms/access/access.service.js';
import { FileCrudService } from '../../dms/file/file-crud.service.js';
import { CrmAccessService } from '../access/access.service.js';

type Contract = Prisma.CrmContractGetPayload<object>;
type Approval = Prisma.CrmContractApprovalGetPayload<{ include: { contract: true } }>;
interface Source extends CrmContractApprovalSource { documentId: string; path: string }
const PAGE_SIZE = 20;
const positiveId = (value: string) => {
  if (!/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) throw new BadRequestException('잘못된 식별자입니다.');
  return BigInt(value);
};

@Injectable()
export class ContractApprovalService {
  constructor(
    private readonly db: DatabaseService,
    private readonly crmAccess: CrmAccessService,
    private readonly dmsAccess: DmsAccessService,
    private readonly foundation: AccessFoundationService,
    private readonly files: FileCrudService,
  ) {}

  private async actor(id: string): Promise<TokenPayload> {
    const account = await this.db.client.user.findFirst({
      where: { id: positiveId(id), isActive: true, authAccount: { accountStatusCode: 'active' } },
      select: { id: true, userName: true, authAccount: { select: { loginId: true, lockedUntil: true } } },
    });
    if (!account?.authAccount || (account.authAccount.lockedUntil && account.authAccount.lockedUntil > new Date())) {
      throw new ForbiddenException('사용 가능한 계정이 아닙니다.');
    }
    return {
      userId: account.id.toString(), loginId: account.authAccount.loginId, userName: account.userName,
      organizationIds: (await this.foundation.getUserOrganizationIds(account.id)).map(String),
    };
  }

  private async reader(user: TokenPayload): Promise<TokenPayload> {
    const actor = await this.actor(user.userId);
    await this.crmAccess.assertDomainCapability(actor, 'canReadContract');
    return actor;
  }

  private async contract(code: string): Promise<Contract> {
    const contract = await this.db.client.crmContract.findFirst({ where: { contractCode: code, isActive: true } });
    if (!contract) throw new NotFoundException('계약을 찾을 수 없습니다.');
    return contract;
  }

  private async document(documentId: bigint, actor: TokenPayload) {
    await this.dmsAccess.assertFeatures(actor, ['canReadDocuments']);
    const document = await this.db.client.dmsDocument.findFirst({ where: { documentId, isActive: true, documentStatusCode: 'active' } });
    if (!document) throw new ConflictException('원본 문서를 찾을 수 없습니다.');
    const result = await this.files.read(document.relativePath, actor);
    if (!result.success) {
      if (result.status === 403) throw new ForbiddenException('계약 초안을 읽을 권한이 없습니다.');
      throw new ConflictException('원본 문서를 읽을 수 없습니다.');
    }
    if (result.data.lockedPreview) throw new ForbiddenException('계약 초안을 읽을 권한이 없습니다.');
    if (result.data.metadata.document?.documentId !== documentId.toString()) {
      throw new ConflictException('원본 문서가 변경되었습니다. 초안을 다시 저장해 주세요.');
    }
    return { document, file: result.data };
  }

  private async source(contract: Contract, actor: TokenPayload): Promise<Source> {
    const handoff = await this.db.client.crmContractDmsHandoff.findFirst({
      where: { contractId: contract.id, isActive: true }, orderBy: [{ savedAt: 'desc' }, { id: 'desc' }],
    });
    if (!handoff) throw new ConflictException('계약 초안을 먼저 저장해 주세요.');
    const record = await this.db.client.dmsDocument.findFirst({ where: { relativePath: handoff.draftPath, isActive: true } });
    if (!record) throw new ConflictException('저장된 계약 초안을 찾을 수 없습니다. 초안을 다시 저장해 주세요.');
    const { document, file } = await this.document(record.documentId, actor);
    // Export evidence updates audit timestamps, but do not change the approved draft.
    const businessRevision = await this.db.client.crmContractHistory.findFirst({
      where: { contractId: contract.id, OR: [{ lastActivity: null }, { lastActivity: { not: 'dms-execution-evidence-update' } }] },
      select: { historySeq: true }, orderBy: { historySeq: 'desc' },
    });
    // Bind exact text and its revision. Reverting text does not reuse an old approval.
    const versionKey = createHash('sha256').update(JSON.stringify([
      contract.id.toString(), businessRevision?.historySeq.toString() ?? contract.updatedAt.toISOString(), handoff.documentTitle, handoff.templateKey,
      document.documentId.toString(), file.metadata.document?.revisionSeq, file.content,
    ])).digest('hex');
    return { title: handoff.documentTitle, content: file.content, versionKey, documentId: document.documentId.toString(), path: document.relativePath };
  }

  private async optionalSource(contract: Contract, actor: TokenPayload) {
    try { return { source: await this.source(contract, actor), message: null }; }
    catch (error) {
      if (error instanceof ConflictException || error instanceof ForbiddenException) return { source: null, message: error.message };
      throw error;
    }
  }

  private present(row: Approval, actor: TokenPayload, source: Source | null): CrmContractApproval {
    const currentVersion = source?.versionKey === row.versionKey;
    return {
      id: row.id.toString(), contractCode: row.contract.contractCode, contractName: row.contract.contractName,
      documentTitle: row.documentTitle, requesterId: row.requesterId.toString(), requesterName: row.requesterName,
      approverId: row.approverId.toString(), approverName: row.approverName,
      status: row.statusCode as CrmContractApprovalStatus, reason: row.reason,
      requestedAt: row.createdAt.toISOString(), decidedAt: row.decidedAt?.toISOString() ?? null,
      currentVersion, canDecide: row.statusCode === 'pending' && row.approverId.toString() === actor.userId && currentVersion,
      canWithdraw: row.statusCode === 'pending' && row.requesterId.toString() === actor.userId,
    };
  }

  async workspace(code: string, user: TokenPayload, cursor?: string): Promise<CrmContractApprovalWorkspace> {
    const actor = await this.reader(user);
    const contract = await this.contract(code);
    const { source, message } = await this.optionalSource(contract, actor);
    const where = { contractId: contract.id, isActive: true };
    const [rows, pending, access] = await Promise.all([
      this.db.client.crmContractApproval.findMany({ where: { ...where, ...(cursor ? { id: { lt: positiveId(cursor) } } : {}) }, include: { contract: true }, orderBy: { id: 'desc' }, take: PAGE_SIZE + 1 }),
      this.db.client.crmContractApproval.findFirst({ where: { ...where, statusCode: 'pending' }, include: { contract: true } }),
      this.crmAccess.getDomainAccess(actor),
    ]);
    return {
      source: source ? { title: source.title, content: source.content, versionKey: source.versionKey } : null,
      sourceMessage: message, canRequest: Boolean(source && access.features.canWriteContract && !pending),
      pending: pending ? this.present(pending, actor, source) : null,
      items: rows.slice(0, PAGE_SIZE).map(row => this.present(row, actor, source)),
      nextCursor: rows.length > PAGE_SIZE ? rows[PAGE_SIZE - 1].id.toString() : null,
    };
  }

  async candidates(code: string, user: TokenPayload, cursor?: string): Promise<CrmContractApprovalCandidates> {
    const actor = await this.reader(user);
    await this.crmAccess.assertDomainCapability(actor, 'canWriteContract');
    const source = await this.source(await this.contract(code), actor);
    const users = await this.db.client.user.findMany({
      where: { isActive: true, id: { not: positiveId(actor.userId), ...(cursor ? { gt: positiveId(cursor) } : {}) }, authAccount: { accountStatusCode: 'active' } },
      select: { id: true }, orderBy: { id: 'asc' }, take: 51,
    });
    const items: CrmContractApprovalCandidates['items'] = [];
    for (const candidate of users.slice(0, 50)) {
      try {
        const person = await this.reader({ userId: candidate.id.toString(), loginId: '' });
        await this.document(BigInt(source.documentId), person);
        items.push({ id: person.userId, name: person.userName!, loginId: person.loginId });
      } catch (error) {
        if (!(error instanceof ForbiddenException || error instanceof ConflictException)) throw error;
      }
    }
    return { items, nextCursor: users.length > 50 ? users[49].id.toString() : null };
  }

  async inbox(user: TokenPayload, cursor?: string): Promise<CrmContractApprovalInbox> {
    const actor = await this.reader(user);
    const rows = await this.db.client.crmContractApproval.findMany({
      where: { approverId: BigInt(actor.userId), statusCode: 'pending', isActive: true, contract: { isActive: true }, ...(cursor ? { id: { lt: positiveId(cursor) } } : {}) },
      include: { contract: true }, orderBy: { id: 'desc' }, take: PAGE_SIZE + 1,
    });
    const items = [];
    for (const row of rows.slice(0, PAGE_SIZE)) {
      const { source } = await this.optionalSource(row.contract, actor);
      items.push(this.present(row, actor, source));
    }
    return { items, nextCursor: rows.length > PAGE_SIZE ? rows[PAGE_SIZE - 1].id.toString() : null };
  }

  async snapshot(id: string, user: TokenPayload): Promise<CrmContractApprovalSource> {
    const actor = await this.reader(user);
    const row = await this.db.client.crmContractApproval.findFirst({ where: { id: positiveId(id), isActive: true, contract: { isActive: true } } });
    if (!row) throw new NotFoundException('승인 요청을 찾을 수 없습니다.');
    await this.document(row.documentId, actor);
    const snapshot = row.snapshot as unknown as Source;
    return { title: row.documentTitle, content: snapshot.content, versionKey: row.versionKey };
  }

  async request(code: string, dto: CrmContractApprovalRequest, user: TokenPayload): Promise<{ id: string }> {
    const actor = await this.reader(user);
    await this.crmAccess.assertDomainCapability(actor, 'canWriteContract');
    if (dto.approverId === actor.userId) throw new BadRequestException('본인에게 승인을 요청할 수 없습니다.');
    const contract = await this.contract(code);
    return this.db.client.$transaction(async tx => {
      await tx.$queryRaw`SELECT contract_id FROM crm.crm_contract_m WHERE contract_id = ${contract.id} FOR UPDATE`;
      const current = await tx.crmContract.findFirst({ where: { id: contract.id, isActive: true } });
      if (!current) throw new NotFoundException('계약을 찾을 수 없습니다.');
      const existing = await tx.crmContractApproval.findUnique({ where: { requestKey: dto.requestKey } });
      if (existing) {
        if (existing.contractId !== contract.id || existing.requesterId.toString() !== actor.userId || existing.approverId.toString() !== dto.approverId || existing.versionKey !== dto.versionKey) throw new ConflictException('같은 요청 식별자를 다른 요청에 사용할 수 없습니다.');
        return { id: existing.id.toString() };
      }
      if (await tx.crmContractApproval.findFirst({ where: { contractId: contract.id, isActive: true, statusCode: 'pending' } })) throw new ConflictException('진행 중인 승인 요청이 있습니다. 요청자가 철회한 후 다시 요청해 주세요.');
      const source = await this.source(current, actor);
      if (source.versionKey !== dto.versionKey) throw new ConflictException('계약 또는 초안이 변경되었습니다. 새로고침 후 내용을 다시 확인해 주세요.');
      const approver = await this.reader({ userId: dto.approverId, loginId: '' });
      await this.document(BigInt(source.documentId), approver);
      const row = await tx.crmContractApproval.create({ data: {
        contractId: contract.id, requestKey: dto.requestKey, requesterId: BigInt(actor.userId), requesterName: actor.userName!,
        approverId: BigInt(approver.userId), approverName: approver.userName!, documentId: BigInt(source.documentId),
        documentTitle: source.title, snapshot: { ...source }, versionKey: source.versionKey, statusCode: 'pending',
        createdBy: BigInt(actor.userId), updatedBy: BigInt(actor.userId), lastSource: 'crm', lastActivity: 'approval-request',
      } });
      return { id: row.id.toString() };
    }, { timeout: 15000 }).catch((error: unknown) => {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('이미 사용된 요청 식별자이거나 진행 중인 요청이 있습니다. 새로고침 후 확인해 주세요.');
      }
      throw error;
    });
  }

  async decide(id: string, dto: CrmContractApprovalDecision, user: TokenPayload): Promise<{ id: string }> {
    const actor = await this.reader(user);
    const reason = dto.reason?.trim() || null;
    if (dto.action === 'reject' && !reason) throw new BadRequestException('반려 사유를 입력해 주세요.');
    const initial = await this.db.client.crmContractApproval.findFirst({ where: { id: positiveId(id), isActive: true } });
    if (!initial) throw new NotFoundException('승인 요청을 찾을 수 없습니다.');
    return this.db.client.$transaction(async tx => {
      await tx.$queryRaw`SELECT contract_id FROM crm.crm_contract_m WHERE contract_id = ${initial.contractId} FOR UPDATE`;
      const row = await tx.crmContractApproval.findFirst({ where: { id: initial.id, isActive: true, contract: { isActive: true } }, include: { contract: true } });
      if (!row) throw new NotFoundException('승인 요청을 찾을 수 없습니다.');
      const allowedId = dto.action === 'withdraw' ? row.requesterId : row.approverId;
      if (allowedId.toString() !== actor.userId) throw new ForbiddenException(dto.action === 'withdraw' ? '요청자만 철회할 수 있습니다.' : '지정된 승인자 본인만 처리할 수 있습니다.');
      const status = dto.action === 'approve' ? 'approved' : dto.action === 'reject' ? 'rejected' : 'withdrawn';
      if (row.statusCode !== 'pending') {
        if (row.statusCode === status && row.reason === reason) return { id: row.id.toString() };
        throw new ConflictException('이미 처리된 요청입니다. 처리 결과를 새로고침해 주세요.');
      }
      if (dto.action !== 'withdraw') {
        const source = await this.source(row.contract, actor);
        if (source.versionKey !== row.versionKey) throw new ConflictException('요청 후 계약 또는 초안이 변경되었습니다. 요청자가 철회한 후 다시 요청해야 합니다.');
      }
      await tx.crmContractApproval.update({ where: { id: row.id }, data: {
        statusCode: status, reason, decidedAt: new Date(), updatedBy: BigInt(actor.userId), lastSource: 'crm', lastActivity: `approval-${dto.action}`,
      } });
      return { id: row.id.toString() };
    }, { timeout: 15000 });
  }
}
