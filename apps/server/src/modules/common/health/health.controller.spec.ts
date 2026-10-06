import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { DatabaseService } from '../../../database/database.service.js';
import { SettingsService } from '../../dms/settings/settings.service.js';
import { HealthController } from './health.controller.js';
import { PLATFORM_APPS, PlatformReadinessService } from './platform-readiness.service.js';

const ready = (app: string) => ({ app, status: 'ready', code: 'READY', checkedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30_000).toISOString() });
function fixture(failing?: string) {
  const core = { ...ready('server'), status: failing === 'server' ? 'unknown' : 'ready' };
  const apps = PLATFORM_APPS.map((app) => ({ ...ready(app), status: app === failing ? 'blocked' : 'ready' }));
  return new HealthController({
    core: jest.fn<() => Promise<unknown>>().mockResolvedValue(core),
    app: jest.fn<(app: string) => Promise<unknown>>().mockImplementation(async (app) => apps.find((entry) => entry.app === app)),
    all: jest.fn<() => Promise<unknown>>().mockResolvedValue({ core, apps }),
  } as never);
}

describe('HealthController', () => {
  it('reports all five app owners on success', async () => {
    const result = await fixture().checkReadiness();
    expect(result.data?.services.map((entry) => entry.app)).toEqual(PLATFORM_APPS);
    expect(result.data?.dms).toBe('ready');
  });
  it.each(PLATFORM_APPS)('blocks full readiness when %s fails but preserves core access', async (app) => {
    const controller = fixture(app);
    await expect(controller.checkReadiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(controller.checkCoreReadiness()).resolves.toMatchObject({ success: true });
    await expect(controller.checkAppReadiness(app)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('keeps liveness separate and rejects unknown app names', async () => {
    const controller = fixture('server');
    expect(controller.check().data?.status).toBe('ok');
    await expect(controller.checkCoreReadiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(controller.checkAppReadiness('other')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('PlatformReadinessService', () => {
  function service() {
    const query = jest.fn<(sql: string) => Promise<unknown>>().mockResolvedValue([]);
    const dms = jest.fn<() => Promise<unknown>>().mockResolvedValue(ready('dms'));
    return { query, dms, instance: new PlatformReadinessService({ client: { $queryRawUnsafe: query } } as never, { getReadiness: dms } as never) };
  }
  it('checks all domain schemas and preserves DMS runtime readiness', async () => {
    const { instance, query, dms } = service();
    const report = await instance.all();
    expect(report.apps.map((entry) => entry.status)).toEqual(Array(5).fill('ready'));
    expect(query).toHaveBeenCalledWith('SELECT project_id FROM pms.pr_project_m LIMIT 0');
    expect(query).toHaveBeenCalledWith('SELECT post_id FROM sns.sns_post_m LIMIT 0');
    expect(query).toHaveBeenCalledWith('SELECT opportunity_id FROM crm.crm_opportunity_m LIMIT 0');
    expect(dms).toHaveBeenCalledTimes(1);
  });
  it('serves CRM and aggregate readiness without business launch services or setup data', async () => {
    const { query, dms } = service();
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        PlatformReadinessService,
        { provide: DatabaseService, useValue: { client: { $queryRawUnsafe: query } } },
        { provide: SettingsService, useValue: { getReadiness: dms } },
      ],
    }).compile();
    try {
      const controller = module.get(HealthController);
      await expect(controller.checkAppReadiness('crm')).resolves.toMatchObject({ success: true, data: { status: 'ready' } });
      await expect(controller.checkReadiness()).resolves.toMatchObject({ success: true });
    } finally { await module.close(); }
  });
  it('blocks CRM and aggregate readiness on a CRM schema failure while core remains ready', async () => {
    const { instance, query } = service();
    query.mockImplementation(async (sql) => {
      if (sql.includes('crm.crm_opportunity_m')) throw new Error('missing relation or denied access');
      return [];
    });
    const controller = new HealthController(instance);
    await expect(controller.checkCoreReadiness()).resolves.toMatchObject({ success: true });
    await expect(controller.checkAppReadiness('crm')).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(controller.checkReadiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('continues blocking deployment for DMS storage or Git runtime failure', async () => {
    const { instance, dms } = service();
    dms.mockResolvedValue({ ...ready('dms'), status: 'blocked' });
    expect((await instance.app('crm')).status).toBe('ready');
    await expect(new HealthController(instance).checkReadiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('rejects stale owner evidence', async () => {
    const { instance, dms } = service();
    dms.mockResolvedValue({ ...ready('dms'), expiresAt: '2000-01-01T00:00:00Z' });
    expect((await instance.app('dms')).status).toBe('unknown');
  });
  it('never extends the lifetime of owner evidence', async () => {
    const { instance, dms } = service();
    const expiresAt = new Date(Date.now() + 500).toISOString();
    dms.mockResolvedValue({ ...ready('dms'), expiresAt });
    expect((await instance.app('dms')).expiresAt).toBe(expiresAt);
  });
  it('does not disclose SQL errors or credentials', async () => {
    const { instance, query } = service();
    query.mockRejectedValue(new Error('postgres://secret:password@private'));
    const report = await instance.all();
    expect(report.core.status).toBe('unknown');
    expect(report.apps.every((entry) => entry.status === 'blocked')).toBe(true);
    expect(JSON.stringify(report)).not.toContain('password');
  });
  it('coalesces concurrent probes and bounds a stuck DB request', async () => {
    jest.useFakeTimers();
    try {
      const { instance, query } = service();
      query.mockImplementation(() => new Promise(() => {}));
      const pending = Promise.all([instance.core(), instance.core()]);
      await jest.advanceTimersByTimeAsync(3_001);
      const results = await pending;
      expect(results[0].status).toBe('unknown');
      expect(query).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(10_000);
      expect((await instance.core()).status).toBe('unknown');
      expect(query).toHaveBeenCalledTimes(1);
    } finally { jest.useRealTimers(); }
  });
});
