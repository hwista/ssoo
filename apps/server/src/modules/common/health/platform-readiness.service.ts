import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { SettingsService } from '../../dms/settings/settings.service.js';

export const PLATFORM_APPS = ['admin', 'crm', 'pms', 'dms', 'sns'] as const;
export type PlatformApp = typeof PLATFORM_APPS[number];
export type ReadinessStatus = 'ready' | 'blocked' | 'degraded' | 'unknown';
export interface AppReadiness {
  app: PlatformApp | 'server';
  status: ReadinessStatus;
  code: string;
  checkedAt: string;
  expiresAt: string;
}

// Constant, read-only probes: verify the deployed model can access each domain.
// CRM business launch readiness is separate from deployment readiness.
// DMS retains its storage/Git runtime checks through its owning service.
const SCHEMA_PROBES = {
  admin: 'SELECT user_id FROM common.cm_user_m LIMIT 0',
  crm: 'SELECT opportunity_id FROM crm.crm_opportunity_m LIMIT 0',
  pms: 'SELECT project_id FROM pms.pr_project_m LIMIT 0',
  sns: 'SELECT post_id FROM sns.sns_post_m LIMIT 0',
} as const;

@Injectable()
export class PlatformReadinessService {
  private readonly cache = new Map<string, { until: number; value: AppReadiness }>();
  private readonly inFlight = new Map<string, Promise<AppReadiness>>();

  constructor(
    private readonly db: DatabaseService,
    private readonly dms: SettingsService,
  ) {}

  core(): Promise<AppReadiness> {
    return this.probe('server', async () => {
      await this.db.client.$queryRawUnsafe('SELECT 1');
      await this.db.client.$queryRawUnsafe('SELECT session_id FROM common.cm_user_session_m LIMIT 0');
      await this.db.client.$queryRawUnsafe('SELECT setting_key FROM common.cm_auth_provider_setting_m LIMIT 0');
      return 'ready';
    }, 3_000);
  }

  app(app: PlatformApp): Promise<AppReadiness> {
    return this.probe(app, async () => {
      if ((await this.core()).status !== 'ready') return 'blocked';
      if (app === 'dms') {
        const snapshot = await this.dms.getReadiness();
        if (!snapshot.checkedAt || !snapshot.expiresAt
          || !Number.isFinite(Date.parse(snapshot.checkedAt))
          || !Number.isFinite(Date.parse(snapshot.expiresAt))
          || Date.parse(snapshot.expiresAt) <= Date.now()) return 'unknown';
        if (!['ready', 'blocked', 'degraded', 'unknown'].includes(snapshot.status)
          || Date.parse(snapshot.checkedAt) > Date.now() + 1_000) return 'unknown';
        return { status: snapshot.status, expiresAt: snapshot.expiresAt };
      }
      await this.db.client.$queryRawUnsafe(SCHEMA_PROBES[app]);
      return 'ready';
    }, 12_000);
  }

  async all(): Promise<{ core: AppReadiness; apps: AppReadiness[] }> {
    const core = await this.core();
    const apps = await Promise.all(PLATFORM_APPS.map((app) => this.app(app)));
    return { core, apps };
  }

  private probe(
    app: AppReadiness['app'],
    operation: () => Promise<ReadinessStatus | Pick<AppReadiness, 'status' | 'expiresAt'>>,
    timeoutMs: number,
  ): Promise<AppReadiness> {
    const cached = this.cache.get(app);
    if (cached && cached.until > Date.now()) return Promise.resolve(cached.value);
    const running = this.inFlight.get(app);
    if (running) return running;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const work = Promise.resolve().then(operation);
    // A timed-out SQL/owner call may still be running. Do not accumulate a new
    // operation on every HTTP probe while the underlying dependency is stuck.
    void work.then(() => this.inFlight.delete(app), () => this.inFlight.delete(app));
    const pending = Promise.race([
      work,
      new Promise<ReadinessStatus>((resolve) => { timer = setTimeout(() => resolve('unknown'), timeoutMs); }),
    ]).catch(() => 'unknown' as const).then((result) => {
      const now = Date.now();
      const status = typeof result === 'string' ? result : result.status;
      const until = typeof result === 'string' ? now + 5_000 : Math.min(now + 5_000, Date.parse(result.expiresAt));
      const value: AppReadiness = {
        app, status, code: status === 'ready' ? 'READY' : `${app.toUpperCase()}_NOT_READY`,
        checkedAt: new Date(now).toISOString(), expiresAt: new Date(until).toISOString(),
      };
      this.cache.set(app, { until, value });
      return value;
    }).finally(() => {
      if (timer) clearTimeout(timer);
    });
    this.inFlight.set(app, pending);
    return pending;
  }
}
