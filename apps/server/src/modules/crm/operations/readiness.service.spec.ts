import type { DatabaseService } from '../../../database/database.service.js';
import type { TemplateService } from '../../dms/templates/template.service.js';
import type { QuoteSettingsService } from '../quote-settings/quote-settings.service.js';
import { CrmReadinessService } from './readiness.service.js';
import type { CrmSettingsService } from './settings.service.js';

const settings = {
  id: '1',
  configCode: 'default',
  quoteTemplateKey: 'crm-quote-v1',
  contractTemplateKey: 'crm-contract-v1',
  dmsHandoffEnabled: true,
  pmsHandoffEnabled: false,
  accountingHandoffEnabled: false,
  accountingProviderMode: 'disabled' as const,
  stalledAfterMinutes: 30,
  attemptRetentionDays: 90,
  updatedAt: '2026-08-13T00:00:00.000Z',
  source: { kind: 'database' as const, configCode: 'default' },
};

function createService(options?: { missingPermission?: boolean; missingTemplate?: boolean }) {
  const permissionPairs = [
    ['admin', 'crm.operations.read'],
    ['admin', 'crm.operations.execute'],
    ['admin', 'crm.settings.manage'],
    ['manager', 'crm.operations.read'],
  ].slice(options?.missingPermission ? 1 : 0);
  const db = {
    client: {
      $queryRawUnsafe: async () => [{ ok: 1 }],
      rolePermission: {
        findMany: async () => permissionPairs.map(([roleCode, permissionCode]) => ({
          role: { roleCode },
          permission: { permissionCode },
        })),
      },
      crmBusinessYear: { findFirst: async () => ({ id: 1n }) },
      cmCode: {
        groupBy: async () => ['biz_type', 'group_type', 'payment_term'].map((codeGroup) => ({ codeGroup, _count: { codeGroup: 1 } })),
        findFirst: async () => ({ id: 1n }),
      },
    },
  } as unknown as DatabaseService;
  const settingsService = { findDefault: async () => settings } as CrmSettingsService;
  const quoteSettingsService = {
    getSellerProfile: async () => ({
      id: '1',
      profileCode: 'default',
      companyName: 'SSOO',
      ceoName: '대표',
      businessRegistrationNo: '123-45-67890',
      address: '서울',
      ciStatus: 'configured' as const,
      updatedAt: '2026-08-13T00:00:00.000Z',
    }),
    toSellerInfoStatus: () => 'configured' as const,
  } as unknown as QuoteSettingsService;
  const templateService = {
    get: async (key: string) => options?.missingTemplate ? null : ({
      id: key,
      status: 'active',
      kind: 'document',
      reviewConfirmation: { status: 'confirmed' },
      docxTemplate: { sourcePath: `${key}.docx`, checksum: 'sha256' },
    }),
    readDocxBinary: () => Buffer.from('docx'),
  } as unknown as TemplateService;
  return new CrmReadinessService(db, settingsService, quoteSettingsService, templateService);
}

describe('CrmReadinessService', () => {
  it('returns ready only when every active launch dependency is proven', async () => {
    const result = await createService().getReadiness();

    expect(result.status).toBe('ready');
    expect(result.blockerCount).toBe(0);
    expect(result.checks.find((check) => check.key === 'pms-handoff')?.status).toBe('not-required');
    expect(result.checks.find((check) => check.key === 'accounting-handoff')?.status).toBe('not-required');
  });

  it('blocks launch for missing access policy or DMS template evidence', async () => {
    const result = await createService({ missingPermission: true, missingTemplate: true }).getReadiness();

    expect(result.status).toBe('blocked');
    expect(result.checks.find((check) => check.key === 'access-policy')?.status).toBe('blocked');
    expect(result.checks.find((check) => check.key === 'dms-quote-template')?.status).toBe('blocked');
  });
});
