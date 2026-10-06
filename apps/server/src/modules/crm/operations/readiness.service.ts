import { Injectable } from '@nestjs/common';
import type { CrmReadiness, CrmReadinessCheck, CrmSettings } from '@ssoo/types/crm';
import { DatabaseService } from '../../../database/database.service.js';
import { TemplateService } from '../../dms/templates/template.service.js';
import { QuoteSettingsService } from '../quote-settings/quote-settings.service.js';
import { CrmSettingsService } from './settings.service.js';

const REQUIRED_PERMISSION_ASSIGNMENTS = [
  'admin:crm.operations.read',
  'admin:crm.operations.execute',
  'admin:crm.settings.manage',
  'manager:crm.operations.read',
];
const REQUIRED_CODE_GROUPS = ['biz_type', 'group_type', 'payment_term'];

@Injectable()
export class CrmReadinessService {
  constructor(
    private readonly db: DatabaseService,
    private readonly settingsService: CrmSettingsService,
    private readonly quoteSettingsService: QuoteSettingsService,
    private readonly templateService: TemplateService,
  ) {}

  async getReadiness(): Promise<CrmReadiness> {
    const checkedAt = new Date().toISOString();
    const settings = await this.settingsService.findDefault().catch(() => null);
    const checks = await Promise.all([
      this.checkDatabase(checkedAt),
      this.checkSettings(settings, checkedAt),
      this.checkAccessPolicy(checkedAt),
      this.checkRequiredCodes(checkedAt),
      this.checkBusinessYear(checkedAt),
      this.checkSellerProfile(checkedAt),
      this.checkTemplate(settings, 'quote', checkedAt),
      this.checkTemplate(settings, 'contract', checkedAt),
      this.checkPms(settings, checkedAt),
      this.checkAccounting(settings, checkedAt),
    ]);
    const blockerCount = checks.filter((check) => check.status === 'blocked').length;
    const degradedCount = checks.filter((check) => check.status === 'degraded').length;
    return {
      status: blockerCount > 0 ? 'blocked' : degradedCount > 0 ? 'degraded' : 'ready',
      checkedAt,
      blockerCount,
      degradedCount,
      checks,
    };
  }

  private async checkDatabase(checkedAt: string): Promise<CrmReadinessCheck> {
    try {
      await this.db.client.$queryRawUnsafe('SELECT 1');
      return this.result('database', 'Database', 'ready', 'DB query probe가 성공했습니다.', 'crm', checkedAt);
    } catch {
      return this.result('database', 'Database', 'blocked', 'DB query probe에 실패했습니다.', 'crm', checkedAt);
    }
  }

  private async checkSettings(settings: CrmSettings | null, checkedAt: string): Promise<CrmReadinessCheck> {
    return settings
      ? this.result('settings-persistence', 'CRM 설정 영속성', 'ready', `DB config ${settings.configCode}를 조회했습니다.`, 'crm', checkedAt, '/settings')
      : this.result('settings-persistence', 'CRM 설정 영속성', 'blocked', '기본 CRM 설정 row가 없습니다. migration과 seed를 적용하세요.', 'crm', checkedAt, '/settings');
  }

  private async checkAccessPolicy(checkedAt: string): Promise<CrmReadinessCheck> {
    try {
      const rows = await this.db.client.rolePermission.findMany({
        where: {
          isActive: true,
          permission: { permissionCode: { in: REQUIRED_PERMISSION_ASSIGNMENTS.map((item) => item.split(':')[1]) }, isActive: true },
          role: { roleCode: { in: ['admin', 'manager'] }, isActive: true },
        },
        select: {
          role: { select: { roleCode: true } },
          permission: { select: { permissionCode: true } },
        },
      });
      const actual = new Set(rows.map((row) => `${row.role.roleCode}:${row.permission.permissionCode}`));
      const missing = REQUIRED_PERMISSION_ASSIGNMENTS.filter((item) => !actual.has(item));
      return missing.length === 0
        ? this.result('access-policy', 'CRM 운영 권한 seed', 'ready', 'Admin/Manager 운영 권한 matrix가 준비되었습니다.', 'shared-admin', checkedAt, '/roles')
        : this.result('access-policy', 'CRM 운영 권한 seed', 'blocked', `누락된 권한 연결 ${missing.length}건이 있습니다.`, 'shared-admin', checkedAt, '/roles');
    } catch {
      return this.result('access-policy', 'CRM 운영 권한 seed', 'blocked', '운영 권한 matrix를 조회하지 못했습니다.', 'shared-admin', checkedAt, '/roles');
    }
  }

  private async checkRequiredCodes(checkedAt: string): Promise<CrmReadinessCheck> {
    try {
      const rows = await this.db.client.cmCode.groupBy({
        by: ['codeGroup'],
        where: { codeGroup: { in: REQUIRED_CODE_GROUPS }, isActive: true },
        _count: { codeGroup: true },
      });
      const readyGroups = new Set(rows.filter((row) => row._count.codeGroup > 0).map((row) => row.codeGroup));
      const missing = REQUIRED_CODE_GROUPS.filter((group) => !readyGroups.has(group));
      return missing.length === 0
        ? this.result('required-codes', 'CRM 필수 코드', 'ready', '사업구분·계열·수금조건 코드가 준비되었습니다.', 'shared-admin', checkedAt, '/codes')
        : this.result('required-codes', 'CRM 필수 코드', 'blocked', `활성 코드가 없는 필수 그룹 ${missing.length}개가 있습니다.`, 'shared-admin', checkedAt, '/codes');
    } catch {
      return this.result('required-codes', 'CRM 필수 코드', 'blocked', '필수 공통코드를 조회하지 못했습니다.', 'shared-admin', checkedAt, '/codes');
    }
  }

  private async checkBusinessYear(checkedAt: string): Promise<CrmReadinessCheck> {
    const currentYear = new Date().getFullYear();
    try {
      const row = await this.db.client.crmBusinessYear.findFirst({
        where: { year: currentYear, isActive: true },
        select: { id: true },
      });
      return row
        ? this.result('business-year', '현재 사업연도', 'ready', `${currentYear}년이 활성 상태입니다.`, 'crm', checkedAt, '/business-years')
        : this.result('business-year', '현재 사업연도', 'blocked', `${currentYear}년 활성 사업연도가 없습니다.`, 'crm', checkedAt, '/business-years');
    } catch {
      return this.result('business-year', '현재 사업연도', 'blocked', '현재 사업연도를 조회하지 못했습니다.', 'crm', checkedAt, '/business-years');
    }
  }

  private async checkSellerProfile(checkedAt: string): Promise<CrmReadinessCheck> {
    try {
      const profile = await this.quoteSettingsService.getSellerProfile();
      const missing = [profile.companyName, profile.ceoName, profile.businessRegistrationNo, profile.address]
        .filter((value) => !value?.trim()).length;
      return missing === 0 && this.quoteSettingsService.toSellerInfoStatus(profile) === 'configured'
        ? this.result('seller-profile', '공급자 회사정보·CI', 'ready', '견적/계약 필수 회사정보와 CI 참조가 준비되었습니다.', 'crm', checkedAt, '/settings')
        : this.result('seller-profile', '공급자 회사정보·CI', 'blocked', `공급자 필수 정보 또는 CI 준비 항목 ${missing || 1}건이 남았습니다.`, 'crm', checkedAt, '/settings');
    } catch {
      return this.result('seller-profile', '공급자 회사정보·CI', 'blocked', '공급자 회사정보를 조회하지 못했습니다.', 'crm', checkedAt, '/settings');
    }
  }

  private async checkTemplate(
    settings: CrmSettings | null,
    kind: 'quote' | 'contract',
    checkedAt: string,
  ): Promise<CrmReadinessCheck> {
    const key = kind === 'quote' ? 'dms-quote-template' : 'dms-contract-template';
    const label = kind === 'quote' ? 'DMS 견적 템플릿' : 'DMS 계약 템플릿';
    if (!settings) {
      return this.result(key, label, 'blocked', 'CRM 설정을 읽을 수 없어 템플릿을 확인하지 못했습니다.', 'dms', checkedAt, '/settings');
    }
    if (!settings.dmsHandoffEnabled) {
      return this.result(key, label, 'not-required', 'DMS handoff가 명시적으로 비활성화되었습니다.', 'dms', checkedAt, '/settings');
    }
    const templateKey = kind === 'quote' ? settings.quoteTemplateKey : settings.contractTemplateKey;
    try {
      const template = await this.templateService.get(templateKey, 'global', 'system');
      if (!template || template.status !== 'active' || template.kind !== 'document') {
        return this.result(key, label, 'blocked', `${templateKey} active 문서 템플릿을 찾을 수 없습니다.`, 'dms', checkedAt, '/settings');
      }
      if (template.reviewConfirmation?.status !== 'confirmed') {
        return this.result(key, label, 'blocked', `${templateKey} 템플릿 검토 확정이 필요합니다.`, 'dms', checkedAt, '/settings');
      }
      this.templateService.readDocxBinary(template);
      return this.result(key, label, 'ready', `${templateKey} registry·검토·DOCX checksum을 확인했습니다.`, 'dms', checkedAt, '/settings');
    } catch {
      return this.result(key, label, 'blocked', `${templateKey} DOCX binary 또는 checksum 검증에 실패했습니다.`, 'dms', checkedAt, '/settings');
    }
  }

  private async checkPms(settings: CrmSettings | null, checkedAt: string): Promise<CrmReadinessCheck> {
    if (!settings?.pmsHandoffEnabled) {
      return this.result('pms-handoff', 'PMS handoff', 'not-required', 'PMS handoff가 명시적으로 비활성화되었습니다.', 'pms', checkedAt, '/settings');
    }
    return this.result('pms-handoff', 'PMS handoff', 'blocked', 'PMS handoff가 활성화됐지만 운영 attempt 성공 증거가 없습니다.', 'pms', checkedAt, '/operations');
  }

  private async checkAccounting(settings: CrmSettings | null, checkedAt: string): Promise<CrmReadinessCheck> {
    if (!settings?.accountingHandoffEnabled) {
      return this.result('accounting-handoff', '회계·지급 handoff', 'not-required', '회계·지급 handoff가 명시적으로 비활성화되었습니다.', 'crm', checkedAt, '/settings');
    }
    const providerConfigured = Boolean(process.env.CRM_ACCOUNTING_PAYMENT_API_URL || process.env.CRM_ACCOUNTING_PAYMENT_API_BASE_URL);
    if (settings.accountingProviderMode !== 'external-api' || !providerConfigured) {
      return this.result('accounting-handoff', '회계·지급 handoff', 'blocked', '활성 회계 handoff에는 external-api mode와 provider URL이 필요합니다.', 'crm', checkedAt, '/settings');
    }
    return this.result('accounting-handoff', '회계·지급 handoff', 'blocked', 'Provider는 설정됐지만 운영 성공 attempt 증거가 없습니다.', 'crm', checkedAt, '/operations');
  }

  private result(
    key: CrmReadinessCheck['key'],
    label: string,
    status: CrmReadinessCheck['status'],
    reason: string,
    owner: CrmReadinessCheck['owner'],
    checkedAt: string,
    targetSurface?: string,
  ): CrmReadinessCheck {
    return { key, label, status, reason, owner, checkedAt, targetSurface };
  }
}
