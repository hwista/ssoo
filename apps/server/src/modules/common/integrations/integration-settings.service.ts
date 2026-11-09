import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import Joi from 'joi';
import type { IntegrationConfigMap, IntegrationKind, IntegrationSettings } from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { UpdateIntegrationSettingsDto } from './integration-settings.dto.js';

const schemas = {
  mail: Joi.object({
    provider: Joi.string().valid('environment', 'local', 'smtp', 'microsoft-graph').required(),
    enabled: Joi.boolean().required(), fromAddress: Joi.string().email({ tlds: { allow: false } }).allow('').required(),
    host: Joi.string().hostname().allow('').max(253).required(), port: Joi.number().integer().min(1).max(65535).required(),
    tls: Joi.string().valid('starttls', 'tls', 'none').required(), username: Joi.string().allow('').max(320).required(),
    tenantId: Joi.string().guid().allow('').required(), clientId: Joi.string().guid().allow('').required(),
  }),
  embedding: Joi.object({
    provider: Joi.string().valid('environment', 'local', 'azure-openai').required(), enabled: Joi.boolean().required(),
    endpoint: Joi.string().uri({ scheme: ['https'] }).allow('').max(1000).required(),
    deployment: Joi.string().pattern(/^[A-Za-z0-9_.-]*$/).max(160).allow('').required(),
    dimension: Joi.number().integer().min(1).max(2000).required(), apiVersion: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}(-preview)?$/).required(),
  }),
};
const defaults: IntegrationConfigMap = {
  mail: { provider: 'environment', enabled: false, fromAddress: '', host: '', port: 587, tls: 'starttls', username: '', tenantId: '', clientId: '' },
  embedding: { provider: 'environment', enabled: false, endpoint: '', deployment: '', dimension: 1536, apiVersion: '2024-10-21' },
};
type SettingRecord = NonNullable<Awaited<ReturnType<DatabaseService['client']['integrationSetting']['findUnique']>>>;

export interface IntegrationRuntime<K extends IntegrationKind> {
  config: IntegrationConfigMap[K];
  secret: string;
  updatedAt: string | null;
  activatedAt: string | null;
}

@Injectable()
export class IntegrationSettingsService {
  constructor(private readonly db: DatabaseService, private readonly env: ConfigService) {}

  private key(): Buffer {
    const value = this.env.get<string>('AUTH_CONFIG_ENCRYPTION_KEY')?.trim();
    if (!value) throw new BadRequestException('서버에 AUTH_CONFIG_ENCRYPTION_KEY를 설정해야 비밀값을 저장하거나 사용할 수 있습니다.');
    return createHash('sha256').update(value).digest();
  }

  private secrets(record: SettingRecord | null): Record<string, string> {
    if (!record?.secretsCiphertext) return {};
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(record.secretsNonce!, 'base64url'));
      decipher.setAuthTag(Buffer.from(record.secretsTag!, 'base64url'));
      return JSON.parse(Buffer.concat([decipher.update(Buffer.from(record.secretsCiphertext, 'base64url')), decipher.final()]).toString('utf8')) as Record<string, string>;
    } catch { throw new BadRequestException('저장된 비밀값을 복호화하지 못했습니다. 서버 암호화 키를 확인하세요.'); }
  }

  private encrypt(secrets: Record<string, string>) {
    if (!Object.keys(secrets).length) return { secretsCiphertext: null, secretsNonce: null, secretsTag: null };
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), nonce);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(secrets), 'utf8'), cipher.final()]);
    return { secretsCiphertext: ciphertext.toString('base64url'), secretsNonce: nonce.toString('base64url'), secretsTag: cipher.getAuthTag().toString('base64url') };
  }

  async runtime<K extends IntegrationKind>(kind: K): Promise<IntegrationRuntime<K>> {
    const record = await this.db.client.integrationSetting.findUnique({ where: { kind: String(kind) } });
    const config = (record?.config ?? defaults[kind]) as unknown as IntegrationConfigMap[K];
    return { config, secret: this.secrets(record)[config.provider] ?? '', updatedAt: record?.updatedAt.toISOString() ?? null, activatedAt: record?.activatedAt?.toISOString() ?? null };
  }

  async admin<K extends IntegrationKind>(kind: K): Promise<IntegrationSettings<K>> {
    const { secret, ...runtime } = await this.runtime(kind);
    return { kind, ...runtime, secretConfigured: Boolean(secret) };
  }

  async candidate<K extends IntegrationKind>(kind: K, dto: UpdateIntegrationSettingsDto): Promise<IntegrationRuntime<K>> {
    if (!dto.reason.trim()) throw new BadRequestException('변경 사유를 입력해 주세요.');
    const { error, value } = schemas[kind].validate(dto.config, { convert: false, allowUnknown: false });
    if (error) throw new BadRequestException(`연결 설정을 확인해 주세요: ${error.details.map(item => item.path.join('.')).join(', ')}`);
    const config = value as IntegrationConfigMap[K];
    const record = await this.db.client.integrationSetting.findUnique({ where: { kind: String(kind) } });
    if ((record?.updatedAt.toISOString() ?? null) !== dto.expectedUpdatedAt) throw new ConflictException('다른 운영자가 설정을 변경했습니다. 다시 조회해 주세요.');
    const secret = dto.secret === null ? '' : dto.secret?.trim() || this.secrets(record)[config.provider] || '';
    return { config, secret, updatedAt: dto.expectedUpdatedAt, activatedAt: record?.activatedAt?.toISOString() ?? null };
  }

  async save<K extends IntegrationKind>(kind: K, dto: UpdateIntegrationSettingsDto, actor: bigint): Promise<IntegrationSettings<K>> {
    const candidate = await this.candidate(kind, dto);
    try {
      await this.db.client.$transaction(async tx => {
        // The row lock also serializes provider-specific secret preservation and the history sequence.
        await tx.$queryRawUnsafe('SELECT kind FROM common.cm_integration_setting_m WHERE kind=$1 FOR UPDATE', kind);
        const record = await tx.integrationSetting.findUnique({ where: { kind: String(kind) } });
        if ((record?.updatedAt.toISOString() ?? null) !== dto.expectedUpdatedAt) throw new ConflictException('설정이 변경됐습니다. 다시 조회해 주세요.');
        const secrets = this.secrets(record);
        if (candidate.secret) secrets[candidate.config.provider] = candidate.secret;
        else delete secrets[candidate.config.provider];
        const previous = record?.config as unknown as IntegrationConfigMap[K] | undefined;
        const activate = candidate.config.enabled && (!previous?.enabled || previous.provider !== candidate.config.provider);
        const data = {
          config: JSON.parse(JSON.stringify(candidate.config)) as Record<string, string | number | boolean>,
          ...this.encrypt(secrets),
          activatedAt: activate ? new Date() : record?.activatedAt ?? null,
          updatedBy: actor, lastSource: 'admin.integrations', lastActivity: dto.reason.trim(),
        };
        if (record) await tx.integrationSetting.update({ where: { kind: String(kind) }, data });
        else await tx.integrationSetting.create({ data: { kind, ...data, createdBy: actor } });
      });
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') throw new ConflictException('다른 운영자가 먼저 설정을 저장했습니다. 다시 조회해 주세요.');
      throw error;
    }
    return this.admin(kind);
  }
}
