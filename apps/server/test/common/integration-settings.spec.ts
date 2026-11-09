import { ConfigService } from '@nestjs/config';
import { IntegrationSettingsService } from '../../src/modules/common/integrations/integration-settings.service.js';
import type { UpdateIntegrationSettingsDto } from '../../src/modules/common/integrations/integration-settings.dto.js';

describe('runtime integration settings', () => {
  function fixture() {
    let record: Record<string, unknown> | null = null;
    let clock = 0;
    const model = {
      findUnique: async () => record,
      create: async ({ data }: { data: Record<string, unknown> }) => { record = { ...data, updatedAt: new Date(++clock * 1000) }; return record; },
      update: async ({ data }: { data: Record<string, unknown> }) => { record = { ...record, ...data, updatedAt: new Date(++clock * 1000) }; return record; },
    };
    const tx = { integrationSetting: model, $queryRawUnsafe: async () => [] };
    const service = new IntegrationSettingsService({ client: { ...tx, $transaction: async (fn: (value: typeof tx) => Promise<unknown>) => fn(tx) } } as never, new ConfigService({ AUTH_CONFIG_ENCRYPTION_KEY: 'test-key-only' }));
    const dto: UpdateIntegrationSettingsDto = { config: { provider: 'smtp', enabled: false, fromAddress: 'sender@example.invalid', host: 'smtp.example.invalid', port: 587, tls: 'starttls', username: 'sender', tenantId: '', clientId: '' }, secret: 'sensitive-fixture-value', expectedUpdatedAt: null, reason: 'configuration test' };
    return { service, dto, record: () => record };
  }

  it('encrypts secrets in the database and never returns them in admin responses', async () => {
    const { service, dto, record } = fixture();
    const saved = await service.save('mail', dto, 1n);
    expect(saved.secretConfigured).toBe(true);
    expect(JSON.stringify(saved)).not.toContain(dto.secret);
    expect(JSON.stringify(record(), (_key, value: unknown) => typeof value === 'bigint' ? String(value) : value)).not.toContain(dto.secret);
    expect((await service.runtime('mail')).secret).toBe(dto.secret);
  });

  it('rejects stale writes, preserves blank secrets and isolates provider credentials', async () => {
    const { service, dto } = fixture();
    let saved = await service.save('mail', dto, 1n);
    await expect(service.save('mail', dto, 2n)).rejects.toThrow('다른 운영자');
    saved = await service.save('mail', { ...dto, expectedUpdatedAt: saved.updatedAt, secret: '' }, 1n);
    expect((await service.runtime('mail')).secret).toBe(dto.secret);
    saved = await service.save('mail', { ...dto, config: { ...dto.config, provider: 'local' }, expectedUpdatedAt: saved.updatedAt, secret: '' }, 1n);
    expect(saved.secretConfigured).toBe(false);
    saved = await service.save('mail', { ...dto, expectedUpdatedAt: saved.updatedAt, secret: '' }, 1n);
    expect(saved.secretConfigured).toBe(true);
    await service.save('mail', { ...dto, expectedUpdatedAt: saved.updatedAt, secret: null }, 1n);
    expect((await service.runtime('mail')).secret).toBe('');
  });

  it('rejects secrets hidden inside public config and blank audit reasons', async () => {
    const { service, dto } = fixture();
    await expect(service.save('mail', { ...dto, config: { ...dto.config, password: 'must-not-store' } }, 1n)).rejects.toThrow('password');
    await expect(service.save('mail', { ...dto, reason: '   ' }, 1n)).rejects.toThrow('사유');
  });

  it('sets a new auto-delivery cutoff only when activating or switching providers', async () => {
    const { service, dto } = fixture();
    let saved = await service.save('mail', dto, 1n);
    expect(saved.activatedAt).toBeNull();
    saved = await service.save('mail', { ...dto, config: { ...dto.config, enabled: true }, expectedUpdatedAt: saved.updatedAt }, 1n);
    expect(saved.activatedAt).not.toBeNull();
    const cutoff = saved.activatedAt;
    saved = await service.save('mail', { ...dto, config: { ...dto.config, enabled: true, port: 465 }, expectedUpdatedAt: saved.updatedAt }, 1n);
    expect(saved.activatedAt).toBe(cutoff);
  });
});
