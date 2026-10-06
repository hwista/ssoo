import crypto from 'node:crypto';
import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { getRequestContext, runWithContext, type Prisma } from '@ssoo/database';
import type {
  CrmOperationAttempt,
  CrmOperationAttemptAction,
  CrmOperationAttemptListQuery,
  CrmOperationAttemptListResponse,
  CrmOperationRecoveryStatus,
  CrmOperationAttemptStatus,
  CrmOperationAttemptTarget,
} from '@ssoo/types/crm';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmAccessService } from '../access/access.service.js';
import { DatabaseService } from '../../../database/database.service.js';
import { redactSecretsInText, redactSecretsInValue } from '../../../common/security/secret-redaction.js';

type AttemptRow = Prisma.CrmOperationAttemptGetPayload<Record<string, never>>;

export interface CrmOperationRunContext {
  idempotencyKey?: string;
  retryOfAttemptId?: string;
  correlationId?: string;
}

interface RecoveryChainState {
  hasFailure: boolean;
  hasRunning: boolean;
  hasSucceeded: boolean;
}

interface CrmOperationRunInput<T> {
  target: CrmOperationAttemptTarget;
  action: CrmOperationAttemptAction;
  sourceEntityType: string;
  sourceEntityId: string;
  requestedBy: bigint;
  fingerprintInput: Record<string, unknown>;
  context?: CrmOperationRunContext;
  execute: () => Promise<T>;
  evidence: (result: T) => Record<string, unknown>;
}

@Injectable()
export class CrmOperationAttemptService {
  constructor(private readonly db: DatabaseService, private readonly access?: CrmAccessService) {}

  async run<T>(input: CrmOperationRunInput<T>): Promise<T> {
    const correlationId = input.context?.correlationId ?? crypto.randomUUID();
    return runWithContext(
      { ...getRequestContext(), transactionId: correlationId },
      async () => {
        const attempt = await this.begin({
          ...input,
          context: { ...input.context, correlationId },
        });
        try {
          const result = await input.execute();
          await this.finish(attempt.id, 'succeeded', {
            evidenceJson: redactSecretsInValue(input.evidence(result)) as Prisma.InputJsonValue,
            errorCode: null,
            errorMessage: null,
          });
          return result;
        } catch (error) {
          await this.finish(attempt.id, 'failed', {
            evidenceJson: { failed: true },
            errorCode: this.errorCode(error),
            errorMessage: this.sanitizeError(error),
          });
          throw this.toSafeHttpException(error);
        }
      },
    );
  }

  async list(query: CrmOperationAttemptListQuery = {}, currentUser?: TokenPayload): Promise<CrmOperationAttemptListResponse> {
    const limit = Math.min(Math.max(query.limit ?? 100, 1), 200);
    const baseWhere: Prisma.CrmOperationAttemptWhereInput = {
      ...await this.sourceScope(currentUser),
      isActive: true,
      ...(query.target ? { targetTypeCode: query.target } : {}),
      ...(query.sourceEntityId?.trim() ? { sourceEntityId: query.sourceEntityId.trim() } : {}),
    };
    const where: Prisma.CrmOperationAttemptWhereInput = {
      ...baseWhere,
      ...(query.status ? { statusCode: query.status } : {}),
    };
    const config = await this.db.client.crmConfig.findUnique({
      where: { configCode: 'default' },
      select: { stalledAfterMinutes: true },
    });
    const stalledAfterMinutes = config?.stalledAfterMinutes ?? 30;
    const stalledBefore = new Date(Date.now() - stalledAfterMinutes * 60_000);
    const [rows, chainRows, totalCount, failedCount, runningCount, stalledCount] = await Promise.all([
      this.db.client.crmOperationAttempt.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit }),
      this.db.client.crmOperationAttempt.findMany({
        where: baseWhere,
        select: { id: true, rootAttemptId: true, statusCode: true },
      }),
      this.db.client.crmOperationAttempt.count({ where }),
      this.db.client.crmOperationAttempt.count({ where: { ...where, statusCode: 'failed' } }),
      this.db.client.crmOperationAttempt.count({ where: { ...where, statusCode: 'running' } }),
      this.db.client.crmOperationAttempt.count({
        where: { ...where, statusCode: { in: ['queued', 'running'] }, updatedAt: { lte: stalledBefore } },
      }),
    ]);
    const recoveryByRoot = this.buildRecoveryChainState(chainRows);
    const failureChains = this.summarizeFailureChains(recoveryByRoot);
    return {
      items: rows.map((row) => this.toContract(row, recoveryByRoot.get(this.rootId(row)))),
      totalCount,
      failedCount,
      ...failureChains,
      runningCount,
      stalledCount,
      stalledAfterMinutes,
    };
  }

  private buildRecoveryChainState(
    rows: Array<{ id: bigint; rootAttemptId: bigint | null; statusCode: string }>,
  ): Map<string, RecoveryChainState> {
    const byRoot = new Map<string, RecoveryChainState>();
    for (const row of rows) {
      const rootId = (row.rootAttemptId ?? row.id).toString();
      const state = byRoot.get(rootId) ?? { hasFailure: false, hasRunning: false, hasSucceeded: false };
      state.hasFailure ||= row.statusCode === 'failed';
      state.hasRunning ||= row.statusCode === 'running' || row.statusCode === 'queued';
      state.hasSucceeded ||= row.statusCode === 'succeeded';
      byRoot.set(rootId, state);
    }
    return byRoot;
  }

  private summarizeFailureChains(byRoot: Map<string, RecoveryChainState>): {
    unresolvedFailedCount: number;
    recoveringFailedCount: number;
    recoveredFailedCount: number;
  } {
    let unresolvedFailedCount = 0;
    let recoveringFailedCount = 0;
    let recoveredFailedCount = 0;
    for (const state of byRoot.values()) {
      if (!state.hasFailure) continue;
      if (state.hasSucceeded) recoveredFailedCount += 1;
      else if (state.hasRunning) recoveringFailedCount += 1;
      else unresolvedFailedCount += 1;
    }
    return { unresolvedFailedCount, recoveringFailedCount, recoveredFailedCount };
  }

  async get(id: string, currentUser?: TokenPayload): Promise<CrmOperationAttempt> {
    const sourceScope = await this.sourceScope(currentUser);
    const row = await this.findRow(id);
    if (row && currentUser && !await this.db.client.crmOperationAttempt.findFirst({ where: { ...sourceScope, id: row.id, isActive: true }, select: { id: true } })) throw new NotFoundException('CRM 운영 attempt를 찾을 수 없습니다.');
    if (!row) {
      throw new NotFoundException('CRM 운영 attempt를 찾을 수 없습니다.');
    }
    const rootAttemptId = row.rootAttemptId ?? row.id;
    const chainRows = await this.db.client.crmOperationAttempt.findMany({
      where: { AND: [sourceScope, { OR: [{ id: rootAttemptId }, { rootAttemptId }] }] },
      select: { id: true, rootAttemptId: true, statusCode: true },
    });
    const recoveryByRoot = this.buildRecoveryChainState(chainRows);
    return this.toContract(row, recoveryByRoot.get(rootAttemptId.toString()));
  }

  private async begin<T>(input: CrmOperationRunInput<T>): Promise<AttemptRow> {
    const retry = input.context?.retryOfAttemptId
      ? await this.findRow(input.context.retryOfAttemptId)
      : null;
    if (input.context?.retryOfAttemptId && !retry) {
      throw new NotFoundException('재시도할 CRM 운영 attempt를 찾을 수 없습니다.');
    }
    if (retry && retry.statusCode !== 'failed') {
      throw new BadRequestException('실패 상태의 CRM 운영 attempt만 재시도할 수 있습니다.');
    }
    if (retry && (retry.targetTypeCode !== input.target || retry.actionCode !== input.action
      || retry.sourceEntityType !== input.sourceEntityType || retry.sourceEntityId !== input.sourceEntityId)) {
      throw new BadRequestException('재시도 대상과 원본 attempt의 업무 경계가 일치하지 않습니다.');
    }

    const rootAttemptId = retry ? (retry.rootAttemptId ?? retry.id) : null;
    if (rootAttemptId) {
      const completedOrRunning = await this.db.client.crmOperationAttempt.findFirst({
        where: {
          OR: [{ id: rootAttemptId }, { rootAttemptId }],
          statusCode: { in: ['running', 'succeeded'] },
          isActive: true,
        },
        select: { id: true, statusCode: true },
      });
      if (completedOrRunning) {
        throw new ConflictException(`같은 retry chain에 ${completedOrRunning.statusCode} attempt가 있어 중복 실행을 차단했습니다.`);
      }
    }

    const attemptNumber = retry
      ? ((await this.db.client.crmOperationAttempt.aggregate({
        where: { OR: [{ id: rootAttemptId ?? retry.id }, { rootAttemptId: rootAttemptId ?? retry.id }] },
        _max: { attemptNumber: true },
      }))._max.attemptNumber ?? retry.attemptNumber) + 1
      : 1;
    const idempotencyKey = this.idempotencyKey(input, input.context?.idempotencyKey);
    const duplicate = await this.db.client.crmOperationAttempt.findUnique({
      where: { idempotencyKey },
      select: { id: true, statusCode: true },
    });
    if (duplicate) {
      throw new ConflictException(`동일 idempotency key의 attempt ${duplicate.id.toString()}가 이미 ${duplicate.statusCode} 상태입니다.`);
    }

    return this.db.client.crmOperationAttempt.create({
      data: {
        targetTypeCode: input.target,
        actionCode: input.action,
        sourceEntityType: input.sourceEntityType,
        sourceEntityId: input.sourceEntityId,
        statusCode: 'running',
        rootAttemptId,
        retryOfAttemptId: retry?.id ?? null,
        attemptNumber,
        idempotencyKey,
        payloadFingerprint: this.fingerprint(input.fingerprintInput),
        requestedBy: input.requestedBy,
        transactionId: retry?.transactionId ?? input.context?.correlationId ?? crypto.randomUUID(),
        startedAt: new Date(),
        createdBy: input.requestedBy,
        updatedBy: input.requestedBy,
        lastSource: 'crm.operation-attempt',
        lastActivity: retry ? 'operation-retry-start' : 'operation-start',
      },
    });
  }

  private async finish(
    id: bigint,
    status: Extract<CrmOperationAttemptStatus, 'succeeded' | 'failed'>,
    detail: { evidenceJson: Prisma.InputJsonValue; errorCode: string | null; errorMessage: string | null },
  ): Promise<void> {
    await this.db.client.crmOperationAttempt.update({
      where: { id },
      data: {
        statusCode: status,
        finishedAt: new Date(),
        ...detail,
        lastSource: 'crm.operation-attempt',
        lastActivity: status === 'succeeded' ? 'operation-succeeded' : 'operation-failed',
      },
    });
  }

  private async sourceScope(currentUser?: TokenPayload): Promise<Prisma.CrmOperationAttemptWhereInput> {
    if (!currentUser) return {};
    const scope = await this.access!.businessOrganizationScope(currentUser);
    if (scope === null) return {};
    const where = { isActive: true, ownerOrganizationId: { in: scope } };
    const [opportunities, contracts, handoffs] = await Promise.all([
      this.db.client.crmOpportunity.findMany({ where, select: { id: true, opportunityCode: true } }),
      this.db.client.crmContract.findMany({ where, select: { id: true, contractCode: true } }),
      // Replaced snapshots still own their historical execution attempts.
      this.db.client.crmCostPlanAccountingHandoff.findMany({ where: { ownerOrganizationId: { in: scope } }, select: { id: true } }),
    ]);
    return { OR: [
      { sourceEntityType: 'crm.opportunity', sourceEntityId: { in: opportunities.flatMap(row => [row.id.toString(), row.opportunityCode]) } },
      { sourceEntityType: 'crm.contract', sourceEntityId: { in: contracts.flatMap(row => [row.id.toString(), row.contractCode]) } },
      { sourceEntityType: 'crm.cost-plan-accounting-handoff', sourceEntityId: { in: handoffs.map(row => row.id.toString()) } },
    ] };
  }

  private async findRow(id: string): Promise<AttemptRow | null> {
    if (!/^\d+$/.test(id.trim())) {
      throw new BadRequestException('CRM 운영 attempt ID가 올바르지 않습니다.');
    }
    return this.db.client.crmOperationAttempt.findUnique({ where: { id: BigInt(id) } });
  }

  private idempotencyKey<T>(input: CrmOperationRunInput<T>, callerKey?: string): string {
    const normalized = callerKey?.trim() || crypto.randomUUID();
    return crypto.createHash('sha256')
      .update(`${input.target}:${input.action}:${input.sourceEntityType}:${input.sourceEntityId}:${normalized}`)
      .digest('hex');
  }

  private fingerprint(value: Record<string, unknown>): string {
    return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private errorCode(error: unknown): string {
    if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
      return error.code.slice(0, 80);
    }
    return error instanceof Error ? error.name.slice(0, 80) : 'OperationError';
  }

  private sanitizeError(error: unknown): string {
    const raw = error instanceof Error ? error.message : '운영 작업 실행에 실패했습니다.';
    return redactSecretsInText(raw).slice(0, 1000);
  }

  private toSafeHttpException(error: unknown): HttpException {
    const message = this.sanitizeError(error);
    const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    return new HttpException(message, status);
  }

  private rootId(row: Pick<AttemptRow, 'id' | 'rootAttemptId'>): string {
    return (row.rootAttemptId ?? row.id).toString();
  }

  private recoveryStatus(row: AttemptRow, chain?: RecoveryChainState): CrmOperationRecoveryStatus {
    if (!chain?.hasFailure) return 'not-needed';
    if (chain.hasSucceeded) return 'recovered';
    if (chain.hasRunning) return 'recovering';
    return 'unresolved';
  }

  private sourceHref(row: AttemptRow): string {
    const selected = encodeURIComponent(row.sourceEntityId);
    if (row.sourceEntityType === 'crm.opportunity') return `/?selected=${selected}`;
    if (row.sourceEntityType === 'crm.contract') return `/contracts?selected=${selected}`;
    if (row.sourceEntityType === 'crm.cost-plan-accounting-handoff') return '/cost-plan';
    return '/operations';
  }

  private ownerHref(row: AttemptRow): string {
    if (row.targetTypeCode === 'dms') return '/settings/operations/git';
    if (row.targetTypeCode === 'pms') return '/';
    return '/operations/settings';
  }

  private supportsRetry(action: string): boolean {
    return [
      'quote-dms-lifecycle',
      'opportunity-contract-document-lifecycle',
      'contract-dms-lifecycle',
      'accounting-payment-execution',
    ].includes(action);
  }

  private recoverySummary(status: CrmOperationRecoveryStatus, correlationId: string): string {
    if (status === 'recovered') return `${correlationId} retry chain이 성공 attempt로 복구되었습니다.`;
    if (status === 'recovering') return `${correlationId} retry chain을 실행 중입니다.`;
    if (status === 'unresolved') return `${correlationId} 원인을 owner 화면에서 수정한 뒤 안전 재시도하세요.`;
    return `${correlationId} 복구가 필요한 실패 chain이 없습니다.`;
  }

  private toContract(row: AttemptRow, chain?: RecoveryChainState): CrmOperationAttempt {
    const evidence = row.evidenceJson && typeof row.evidenceJson === 'object' && !Array.isArray(row.evidenceJson)
      ? redactSecretsInValue(row.evidenceJson) as Record<string, unknown>
      : undefined;
    const correlationId = row.transactionId ?? `legacy-attempt-${this.rootId(row)}`;
    const recoveryStatus = this.recoveryStatus(row, chain);
    return {
      id: row.id.toString(),
      target: row.targetTypeCode as CrmOperationAttemptTarget,
      action: row.actionCode as CrmOperationAttemptAction,
      sourceEntityType: row.sourceEntityType,
      sourceEntityId: row.sourceEntityId,
      status: row.statusCode as CrmOperationAttemptStatus,
      rootAttemptId: row.rootAttemptId?.toString(),
      retryOfAttemptId: row.retryOfAttemptId?.toString(),
      attemptNumber: row.attemptNumber,
      correlationId,
      ownerHref: this.ownerHref(row),
      sourceHref: this.sourceHref(row),
      retryable: row.statusCode === 'failed' && recoveryStatus === 'unresolved' && this.supportsRetry(row.actionCode),
      recoveryStatus,
      recoverySummary: this.recoverySummary(recoveryStatus, correlationId),
      idempotencyKey: row.idempotencyKey,
      payloadFingerprint: row.payloadFingerprint,
      errorCode: row.errorCode ?? undefined,
      errorMessage: row.errorMessage ? redactSecretsInText(row.errorMessage) : undefined,
      evidence,
      requestedBy: row.requestedBy?.toString(),
      startedAt: row.startedAt?.toISOString(),
      finishedAt: row.finishedAt?.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
