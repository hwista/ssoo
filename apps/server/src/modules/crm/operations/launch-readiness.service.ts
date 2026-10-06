import { randomUUID } from 'node:crypto';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { Injectable } from '@nestjs/common';
import type { CrmLaunchReadinessSnapshot } from '@ssoo/types/crm';
import { CrmDataQualityService } from './data-quality.service.js';
import { CrmOperationAttemptService } from './operation-attempt.service.js';
import { CrmReadinessService } from './readiness.service.js';

export const CRM_READINESS_REFRESH_WINDOW_MS = 5_000;
export const CRM_READINESS_MAX_AGE_MS = 30_000;
const CRM_READINESS_PROBE_TIMEOUT_MS = 10_000;

@Injectable()
export class CrmLaunchReadinessService {
  private cached: { refreshAfter: number; snapshot: CrmLaunchReadinessSnapshot } | null = null;
  private inFlight: Promise<CrmLaunchReadinessSnapshot> | null = null;

  constructor(
    private readonly readinessService: CrmReadinessService,
    private readonly dataQualityService: CrmDataQualityService,
    private readonly attemptService: CrmOperationAttemptService,
  ) {}

  async getSnapshot(currentUser?: TokenPayload): Promise<CrmLaunchReadinessSnapshot> {
    // User-visible counts always re-evaluate current grants; the system probe cache is not shared with users.
    if (currentUser) return this.probe(currentUser);
    const now = Date.now();
    if (this.cached && now < this.cached.refreshAfter) {
      return this.cached.snapshot;
    }
    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = this.probe().then((snapshot) => {
      this.cached = {
        refreshAfter: Date.now() + CRM_READINESS_REFRESH_WINDOW_MS,
        snapshot,
      };
      return snapshot;
    }).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  invalidate(): void {
    this.cached = null;
  }

  private async probe(currentUser?: TokenPayload): Promise<CrmLaunchReadinessSnapshot> {
    const checkedAtDate = new Date();
    const identity = {
      owner: 'crm' as const,
      snapshotId: `crm-${randomUUID()}`,
      checkedAt: checkedAtDate.toISOString(),
      expiresAt: new Date(checkedAtDate.getTime() + CRM_READINESS_MAX_AGE_MS).toISOString(),
      refreshWindowSeconds: CRM_READINESS_REFRESH_WINDOW_MS / 1_000,
      source: 'crm.operations.live-probe' as const,
      ownerHref: '/operations',
    };

    try {
      const [dependencies, dataQuality, attempts] = await this.withTimeout(Promise.all([
        this.readinessService.getReadiness(),
        this.dataQualityService.getReport(currentUser),
        this.attemptService.list({ limit: 1 }, currentUser),
      ]), CRM_READINESS_PROBE_TIMEOUT_MS);
      const blockerCount = dependencies.blockerCount
        + (dataQuality.status === 'blocked' ? dataQuality.violationCount : 0)
        + attempts.stalledCount;
      const degradedCount = dependencies.degradedCount
        + (dataQuality.status === 'degraded' ? dataQuality.findingCount : 0)
        + attempts.unresolvedFailedCount;
      const status = blockerCount > 0 ? 'blocked' : degradedCount > 0 ? 'degraded' : 'ready';
      return {
        ...identity,
        status,
        reason: status === 'ready'
          ? 'CRM 의존성, 데이터 품질, operation attempt live probe가 모두 준비 상태입니다.'
          : `CRM live probe에서 차단 ${blockerCount}건, 주의 ${degradedCount}건을 확인했습니다.`,
        blockerCount,
        degradedCount,
        totalCount: dependencies.checks.length + dataQuality.checks.length + 2,
      };
    } catch {
      return {
        ...identity,
        status: 'unknown',
        reason: 'CRM readiness 구성 probe 중 하나 이상을 완료하지 못했습니다. owner 화면에서 새로고침 후 원인을 확인하세요.',
        blockerCount: null,
        degradedCount: null,
        totalCount: null,
      };
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('CRM readiness probe timeout')), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
