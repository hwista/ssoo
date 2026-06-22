import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AuthProviderSettings,
  AuthPublicLoginConfig,
  AuthEmailDeliveryMode,
} from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import { UpdateAuthProviderSettingsDto } from './dto/auth-policy.dto.js';

const DEFAULT_SETTING_KEY = 'default';
const DEFAULT_MICROSOFT_SCOPES = ['openid', 'profile', 'email', 'User.Read'];

interface SecretColumns {
  microsoftClientSecretCiphertext?: string | null;
  microsoftClientSecretNonce?: string | null;
  microsoftClientSecretTag?: string | null;
}

interface AuthProviderSettingRecord extends SecretColumns {
  settingKey: string;
  passwordLoginEnabled: boolean;
  passwordResetEnabled: boolean;
  passwordChangeEnabled: boolean;
  resetCodeTtlMinutes: number;
  resetCodeLength: number;
  internalSsoEnabled: boolean;
  internalSsoLoginUrl: string | null;
  microsoftLoginEnabled: boolean;
  microsoftSignupRequestEnabled: boolean;
  microsoftTenantId: string | null;
  microsoftClientId: string | null;
  microsoftRedirectUri: string | null;
  microsoftScopes: string[];
  allowedTenantIds: string[];
  allowedEmailDomains: string[];
  selfSignupEnabled: boolean;
  emailDeliveryMode: string;
  emailFromAddress: string | null;
  updatedAt: Date;
}

export interface MicrosoftRuntimeConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  allowedTenantIds: string[];
  allowedEmailDomains: string[];
  loginEnabled: boolean;
  signupRequestEnabled: boolean;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null) {
    return null;
  }

  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeStringList(values: string[] | undefined, lowercase = false): string[] | undefined {
  if (!values) {
    return undefined;
  }

  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => (lowercase ? value.toLowerCase() : value)),
    ),
  );
}

function normalizeEmailDomains(values: string[] | undefined): string[] | undefined {
  const normalized = normalizeStringList(
    values?.map((value) => value.replace(/^@/, '')),
    true,
  );
  return normalized;
}

function normalizeTenantId(value: string | null | undefined): string | null {
  return normalizeOptionalText(value)?.toLowerCase() ?? null;
}

function isBroadMicrosoftTenant(tenantId: string): boolean {
  return tenantId === 'common' || tenantId === 'organizations' || tenantId === 'consumers';
}

@Injectable()
export class AuthPolicyService {
  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  private getEncryptionKey(): Buffer | null {
    const configured = this.configService.get<string>('AUTH_CONFIG_ENCRYPTION_KEY', { infer: true })?.trim();
    if (!configured) {
      return null;
    }

    return createHash('sha256').update(configured).digest();
  }

  private encryptMicrosoftClientSecret(secret: string): SecretColumns {
    const key = this.getEncryptionKey();
    if (!key) {
      throw new BadRequestException('AUTH_CONFIG_ENCRYPTION_KEY가 설정되어야 Microsoft client secret을 저장할 수 있습니다.');
    }

    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, nonce);
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      microsoftClientSecretCiphertext: ciphertext.toString('base64url'),
      microsoftClientSecretNonce: nonce.toString('base64url'),
      microsoftClientSecretTag: tag.toString('base64url'),
    };
  }

  private decryptMicrosoftClientSecret(record: SecretColumns): string | null {
    if (
      !record.microsoftClientSecretCiphertext
      || !record.microsoftClientSecretNonce
      || !record.microsoftClientSecretTag
    ) {
      return null;
    }

    const key = this.getEncryptionKey();
    if (!key) {
      return null;
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(record.microsoftClientSecretNonce, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(record.microsoftClientSecretTag, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(record.microsoftClientSecretCiphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  async getOrCreateSettings(): Promise<AuthProviderSettingRecord> {
    const existing = await this.db.client.authProviderSetting.findUnique({
      where: { settingKey: DEFAULT_SETTING_KEY },
    });

    if (existing) {
      return existing;
    }

    return this.db.client.authProviderSetting.create({
      data: { settingKey: DEFAULT_SETTING_KEY },
    });
  }

  toAdminSettings(record: AuthProviderSettingRecord): AuthProviderSettings {
    return {
      settingKey: record.settingKey,
      passwordLoginEnabled: record.passwordLoginEnabled,
      passwordResetEnabled: record.passwordResetEnabled,
      passwordChangeEnabled: record.passwordChangeEnabled,
      resetCodeTtlMinutes: record.resetCodeTtlMinutes,
      resetCodeLength: record.resetCodeLength,
      internalSsoEnabled: record.internalSsoEnabled,
      internalSsoLoginUrl: record.internalSsoLoginUrl,
      microsoftLoginEnabled: record.microsoftLoginEnabled,
      microsoftSignupRequestEnabled: record.microsoftSignupRequestEnabled,
      microsoftTenantId: record.microsoftTenantId,
      microsoftClientId: record.microsoftClientId,
      microsoftClientSecretConfigured: Boolean(record.microsoftClientSecretCiphertext),
      microsoftRedirectUri: record.microsoftRedirectUri,
      microsoftScopes: record.microsoftScopes,
      allowedTenantIds: record.allowedTenantIds,
      allowedEmailDomains: record.allowedEmailDomains,
      selfSignupEnabled: record.selfSignupEnabled,
      emailDeliveryMode: record.emailDeliveryMode === 'disabled' ? 'disabled' : 'outbox',
      emailFromAddress: record.emailFromAddress,
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private isMicrosoftRuntimeReady(record: AuthProviderSettingRecord): boolean {
    return Boolean(
      record.microsoftTenantId
      && record.microsoftClientId
      && record.microsoftRedirectUri
      && this.decryptMicrosoftClientSecret(record)
      && (
        !isBroadMicrosoftTenant(record.microsoftTenantId)
        || record.allowedTenantIds.length > 0
        || record.allowedEmailDomains.length > 0
      ),
    );
  }

  toPublicLoginConfig(record: AuthProviderSettingRecord, apiBaseUrl: string): AuthPublicLoginConfig {
    const identityProviders: AuthPublicLoginConfig['identityProviders'] = [];
    const normalizedApiBaseUrl = apiBaseUrl.replace(/\/+$/, '');

    if (record.internalSsoEnabled && record.internalSsoLoginUrl) {
      identityProviders.push({
        key: 'sso',
        href: record.internalSsoLoginUrl,
        label: 'SSO 로그인',
        external: false,
      });
    }

    if (record.microsoftLoginEnabled && this.isMicrosoftRuntimeReady(record)) {
      identityProviders.push({
        key: 'microsoft',
        href: `${normalizedApiBaseUrl}/auth/microsoft/start?intent=login`,
        label: 'Microsoft 365 로그인',
        external: false,
      });
    }

    return {
      passwordLoginEnabled: record.passwordLoginEnabled,
      passwordResetHref: record.passwordResetEnabled ? '/password-reset' : undefined,
      registrationLink:
        record.microsoftSignupRequestEnabled && this.isMicrosoftRuntimeReady(record)
          ? {
              href: `${normalizedApiBaseUrl}/auth/microsoft/start?intent=signup`,
              label: '가입 요청',
              external: false,
            }
          : undefined,
      identityProviders,
    };
  }

  async getMicrosoftRuntimeConfig(): Promise<MicrosoftRuntimeConfig | null> {
    const record = await this.getOrCreateSettings();
    const clientSecret = this.decryptMicrosoftClientSecret(record);

    if (!record.microsoftTenantId || !record.microsoftClientId || !record.microsoftRedirectUri || !clientSecret) {
      return null;
    }

    if (
      isBroadMicrosoftTenant(record.microsoftTenantId)
      && record.allowedTenantIds.length === 0
      && record.allowedEmailDomains.length === 0
    ) {
      throw new BadRequestException('common/organizations tenant를 사용할 때는 허용 tenant 또는 이메일 도메인을 제한해야 합니다.');
    }

    return {
      tenantId: record.microsoftTenantId.toLowerCase(),
      clientId: record.microsoftClientId,
      clientSecret,
      redirectUri: record.microsoftRedirectUri,
      scopes: record.microsoftScopes.length > 0 ? record.microsoftScopes : DEFAULT_MICROSOFT_SCOPES,
      allowedTenantIds: record.allowedTenantIds,
      allowedEmailDomains: record.allowedEmailDomains,
      loginEnabled: record.microsoftLoginEnabled,
      signupRequestEnabled: record.microsoftSignupRequestEnabled,
    };
  }

  async updateSettings(dto: UpdateAuthProviderSettingsDto, currentUserId: bigint): Promise<AuthProviderSettings> {
    const updateData: Record<string, unknown> = {};

    if (dto.passwordLoginEnabled !== undefined) updateData.passwordLoginEnabled = dto.passwordLoginEnabled;
    if (dto.passwordResetEnabled !== undefined) updateData.passwordResetEnabled = dto.passwordResetEnabled;
    if (dto.passwordChangeEnabled !== undefined) updateData.passwordChangeEnabled = dto.passwordChangeEnabled;
    if (dto.resetCodeTtlMinutes !== undefined) updateData.resetCodeTtlMinutes = dto.resetCodeTtlMinutes;
    if (dto.resetCodeLength !== undefined) updateData.resetCodeLength = dto.resetCodeLength;
    if (dto.internalSsoEnabled !== undefined) updateData.internalSsoEnabled = dto.internalSsoEnabled;
    if (dto.internalSsoLoginUrl !== undefined) updateData.internalSsoLoginUrl = normalizeOptionalText(dto.internalSsoLoginUrl);
    if (dto.microsoftLoginEnabled !== undefined) updateData.microsoftLoginEnabled = dto.microsoftLoginEnabled;
    if (dto.microsoftSignupRequestEnabled !== undefined) {
      updateData.microsoftSignupRequestEnabled = dto.microsoftSignupRequestEnabled;
    }
    if (dto.microsoftTenantId !== undefined) updateData.microsoftTenantId = normalizeTenantId(dto.microsoftTenantId);
    if (dto.microsoftClientId !== undefined) updateData.microsoftClientId = normalizeOptionalText(dto.microsoftClientId);
    if (dto.microsoftRedirectUri !== undefined) updateData.microsoftRedirectUri = normalizeOptionalText(dto.microsoftRedirectUri);
    if (dto.microsoftScopes !== undefined) {
      updateData.microsoftScopes = normalizeStringList(dto.microsoftScopes) ?? DEFAULT_MICROSOFT_SCOPES;
    }
    if (dto.allowedTenantIds !== undefined) updateData.allowedTenantIds = normalizeStringList(dto.allowedTenantIds, true) ?? [];
    if (dto.allowedEmailDomains !== undefined) updateData.allowedEmailDomains = normalizeEmailDomains(dto.allowedEmailDomains) ?? [];
    if (dto.selfSignupEnabled !== undefined) updateData.selfSignupEnabled = dto.selfSignupEnabled;
    if (dto.emailDeliveryMode !== undefined) updateData.emailDeliveryMode = dto.emailDeliveryMode;
    if (dto.emailFromAddress !== undefined) updateData.emailFromAddress = normalizeOptionalText(dto.emailFromAddress);

    if (dto.microsoftClientSecret === null) {
      updateData.microsoftClientSecretCiphertext = null;
      updateData.microsoftClientSecretNonce = null;
      updateData.microsoftClientSecretTag = null;
    } else if (dto.microsoftClientSecret?.trim()) {
      Object.assign(updateData, this.encryptMicrosoftClientSecret(dto.microsoftClientSecret.trim()));
    }

    const existing = await this.getOrCreateSettings();
    const updated = await this.db.client.authProviderSetting.update({
      where: { settingKey: existing.settingKey },
      data: {
        ...updateData,
        updatedBy: currentUserId,
      },
    });

    return this.toAdminSettings(updated);
  }

  getEmailDeliveryMode(record: AuthProviderSettingRecord): AuthEmailDeliveryMode {
    return record.emailDeliveryMode === 'disabled' ? 'disabled' : 'outbox';
  }
}
