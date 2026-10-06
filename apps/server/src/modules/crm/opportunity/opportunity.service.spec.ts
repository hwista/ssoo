import type { PlatformAdmissionService } from '../../common/onboarding/platform-admission.service.js';
import { OpportunityService } from './opportunity.service.js';
import type { DatabaseService } from '../../../database/database.service.js';
import type { AiIndexingService } from '../../common/ai-index/ai-indexing.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import type { UserService } from '../../common/user/user.service.js';
import type { CodeService } from '../../common/code/code.service.js';
import type { FileCrudService } from '../../dms/file/file-crud.service.js';
import type { DmsCrmQuoteLifecycleService } from '../../dms/crm-quote-lifecycle/crm-quote-lifecycle.service.js';
import type { DmsCrmOpportunityContractLifecycleService } from '../../dms/crm-opportunity-contract-lifecycle/crm-opportunity-contract-lifecycle.service.js';
import type { TemplateService } from '../../dms/templates/template.service.js';
import type { ContractService } from '../contract/contract.service.js';
import type { QuoteSettingsService } from '../quote-settings/quote-settings.service.js';

interface OpportunityLineRow {
  id: bigint;
  lineCode: string;
  lineKindCode: string;
  categoryCode: string;
  lineLabel: string;
  quantity: number | null;
  unitPrice: bigint | null;
  amount: bigint;
  marginRate: number | null;
  truncUnit: bigint | null;
  department: string | null;
  memberName: string | null;
  grade: string | null;
  serviceTypeCode: string | null;
  revenueLinked: boolean;
  linkedCostLineCode: string | null;
  revenueUnitPrice: bigint | null;
  sortOrder: number;
}

interface OpportunityRow {
  id: bigint;
  opportunityCode: string;
  opportunityGroupCode: string;
  customerName: string;
  opportunityName: string;
  ownerName: string;
  ownerUserId: bigint | null;
  businessType: string;
  industryLine: string;
  regionCode: string;
  statusCode: string;
  priorityCode: string;
  versionNo: number;
  confirmed: boolean;
  contractCreated?: boolean;
  contractCreatedAt?: Date | null;
  contractCode?: string | null;
  expectedStartDate: Date;
  expectedEndDate: Date;
  paymentTermCode: string | null;
  quoteStatusCode?: string;
  quoteClientContactName?: string | null;
  quoteIssuedAt?: Date | null;
  quoteValidUntil?: Date | null;
  quoteMemo?: string | null;
  revenueSubtotal: bigint;
  specialDiscountTypeCode: string;
  specialDiscountValue: number | null;
  specialDiscountAmount: bigint;
  revenueTotal: bigint;
  costTotal: bigint;
  pmsHandoffStatusCode: string;
  dmsLinkStatusCode: string;
  adminBoundaryCode: string;
  nextAction: string;
  updatedAt: Date;
  lines: OpportunityLineRow[];
}

interface OpportunityHistoryRow {
  opportunityId: bigint;
  historySeq: bigint;
  eventType: string;
  eventAt: Date;
  eventBy: bigint | null;
  opportunityCode: string;
  opportunityGroupCode: string;
  statusCode: string;
  versionNo: number;
  confirmed: boolean;
  paymentTermCode: string | null;
  quoteStatusCode?: string;
  revenueSubtotal: bigint;
  specialDiscountAmount: bigint;
  revenueTotal: bigint;
  costTotal: bigint;
  lastSource: string | null;
  lastActivity: string | null;
}

function createOpportunityRows(): OpportunityRow[] {
  return [
    {
      id: 1n,
      opportunityCode: 'crm-opp-001',
      opportunityGroupCode: 'crm-opp-001',
      customerName: 'LS Electric',
      opportunityName: '스마트 배전반 통합 관제 고도화',
      ownerName: '김민준',
      ownerUserId: 77n,
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      regionCode: 'domestic',
      statusCode: 'proposal',
      priorityCode: 'high',
      versionNo: 3,
      confirmed: false,
      expectedStartDate: new Date('2026-07-01T00:00:00.000Z'),
      expectedEndDate: new Date('2026-12-31T00:00:00.000Z'),
      paymentTermCode: 'NET30',
      revenueSubtotal: 840000000n,
      specialDiscountTypeCode: 'amount',
      specialDiscountValue: 20000000,
      specialDiscountAmount: 20000000n,
      revenueTotal: 820000000n,
      costTotal: 592000000n,
      pmsHandoffStatusCode: 'planned',
      dmsLinkStatusCode: 'planned',
      adminBoundaryCode: 'shared-admin',
      nextAction: '제안 금액 검토 후 계약 후보 전환 여부 결정',
      updatedAt: new Date('2026-06-08T09:20:00.000Z'),
      lines: [
        {
          id: 11n,
          lineCode: 'rev-001-1',
          lineKindCode: 'revenue',
          categoryCode: 'product',
          lineLabel: '관제 플랫폼 라이선스',
          quantity: 3,
          unitPrice: 130000000n,
          amount: 390000000n,
          marginRate: null,
          truncUnit: 0n,
          department: null,
          memberName: null,
          grade: null,
          serviceTypeCode: null,
          revenueLinked: false,
          linkedCostLineCode: null,
          revenueUnitPrice: null,
          sortOrder: 10,
        },
        {
          id: 12n,
          lineCode: 'rev-001-2',
          lineKindCode: 'revenue',
          categoryCode: 'service',
          lineLabel: '구축/연동 서비스',
          quantity: 6,
          unitPrice: 75000000n,
          amount: 450000000n,
          marginRate: 22.67,
          truncUnit: 0n,
          department: 'DX센터',
          memberName: '구축팀',
          grade: 'Senior',
          serviceTypeCode: 'internal',
          revenueLinked: true,
          linkedCostLineCode: 'cost-001-1',
          revenueUnitPrice: null,
          sortOrder: 20,
        },
        {
          id: 13n,
          lineCode: 'cost-001-1',
          lineKindCode: 'cost',
          categoryCode: 'internal-cost',
          lineLabel: '내부 수행 원가',
          quantity: 6,
          unitPrice: 58000000n,
          amount: 348000000n,
          marginRate: null,
          truncUnit: 0n,
          department: 'DX센터',
          memberName: '수행팀',
          grade: 'Senior',
          serviceTypeCode: 'internal',
          revenueLinked: true,
          linkedCostLineCode: null,
          revenueUnitPrice: 75000000n,
          sortOrder: 30,
        },
        {
          id: 14n,
          lineCode: 'cost-001-2',
          lineKindCode: 'cost',
          categoryCode: 'external-cost',
          lineLabel: '외부 연동/장비 원가',
          quantity: 2,
          unitPrice: 122000000n,
          amount: 244000000n,
          marginRate: null,
          truncUnit: 0n,
          department: '파트너',
          memberName: '연동 장비',
          grade: 'Partner',
          serviceTypeCode: 'external',
          revenueLinked: false,
          linkedCostLineCode: null,
          revenueUnitPrice: null,
          sortOrder: 40,
        },
      ],
    },
    {
      id: 6n,
      opportunityCode: 'crm-opp-001-v2',
      opportunityGroupCode: 'crm-opp-001',
      customerName: 'LS Electric',
      opportunityName: '스마트 배전반 통합 관제 고도화',
      ownerName: '김민준',
      ownerUserId: 77n,
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      regionCode: 'domestic',
      statusCode: 'won',
      priorityCode: 'high',
      versionNo: 2,
      confirmed: true,
      expectedStartDate: new Date('2026-06-01T00:00:00.000Z'),
      expectedEndDate: new Date('2026-11-30T00:00:00.000Z'),
      paymentTermCode: 'NET30',
      revenueSubtotal: 790000000n,
      specialDiscountTypeCode: 'amount',
      specialDiscountValue: null,
      specialDiscountAmount: 0n,
      revenueTotal: 790000000n,
      costTotal: 560000000n,
      pmsHandoffStatusCode: 'planned',
      dmsLinkStatusCode: 'planned',
      adminBoundaryCode: 'shared-admin',
      nextAction: '2차 견적 기준 확정 보관',
      updatedAt: new Date('2026-06-01T09:20:00.000Z'),
      lines: [],
    },
    {
      id: 2n,
      opportunityCode: 'crm-opp-002',
      opportunityGroupCode: 'crm-opp-002',
      customerName: 'LS Cable & System',
      opportunityName: '해외 공장 품질 데이터 허브',
      ownerName: '박서연',
      ownerUserId: 77n,
      businessType: '데이터 플랫폼',
      industryLine: '제조/품질',
      regionCode: 'overseas',
      statusCode: 'qualified',
      priorityCode: 'high',
      versionNo: 2,
      confirmed: false,
      expectedStartDate: new Date('2026-08-15T00:00:00.000Z'),
      expectedEndDate: new Date('2027-02-28T00:00:00.000Z'),
      paymentTermCode: '분할납부',
      revenueSubtotal: 1260000000n,
      specialDiscountTypeCode: 'rate',
      specialDiscountValue: 2.5,
      specialDiscountAmount: 31500000n,
      revenueTotal: 1228500000n,
      costTotal: 884000000n,
      pmsHandoffStatusCode: 'planned',
      dmsLinkStatusCode: 'planned',
      adminBoundaryCode: 'shared-admin',
      nextAction: '해외 법인 범위와 수금조건 확정',
      updatedAt: new Date('2026-06-08T08:45:00.000Z'),
      lines: [
        {
          id: 21n,
          lineCode: 'rev-002-1',
          lineKindCode: 'revenue',
          categoryCode: 'service',
          lineLabel: '데이터 수집/정제/대시보드',
          quantity: 9,
          unitPrice: 140000000n,
          amount: 1260000000n,
          marginRate: null,
          truncUnit: 0n,
          department: 'Global Data',
          memberName: '데이터 플랫폼팀',
          grade: 'Principal',
          serviceTypeCode: 'internal',
          revenueLinked: false,
          linkedCostLineCode: null,
          revenueUnitPrice: null,
          sortOrder: 10,
        },
        {
          id: 22n,
          lineCode: 'cost-002-1',
          lineKindCode: 'cost',
          categoryCode: 'internal-cost',
          lineLabel: '전담 개발/PM 원가',
          quantity: 9,
          unitPrice: 78000000n,
          amount: 702000000n,
          marginRate: null,
          truncUnit: 0n,
          department: 'Global Data',
          memberName: '전담 개발/PM',
          grade: 'Senior',
          serviceTypeCode: 'internal',
          revenueLinked: false,
          linkedCostLineCode: null,
          revenueUnitPrice: null,
          sortOrder: 20,
        },
      ],
    },
    {
      id: 3n,
      opportunityCode: 'crm-opp-003',
      opportunityGroupCode: 'crm-opp-003',
      customerName: 'LS MnM',
      opportunityName: '설비 예방정비 모바일 업무화',
      ownerName: '이현우',
      ownerUserId: 77n,
      businessType: '업무 시스템',
      industryLine: '설비/정비',
      regionCode: 'domestic',
      statusCode: 'won',
      priorityCode: 'medium',
      versionNo: 4,
      confirmed: true,
      expectedStartDate: new Date('2026-07-15T00:00:00.000Z'),
      expectedEndDate: new Date('2026-11-30T00:00:00.000Z'),
      paymentTermCode: '계약즉시',
      revenueSubtotal: 520000000n,
      specialDiscountTypeCode: 'amount',
      specialDiscountValue: null,
      specialDiscountAmount: 0n,
      revenueTotal: 520000000n,
      costTotal: 361000000n,
      pmsHandoffStatusCode: 'planned',
      dmsLinkStatusCode: 'planned',
      adminBoundaryCode: 'shared-admin',
      nextAction: '계약 원장 확정 후 PMS 읽기용 인계 패킷 준비',
      updatedAt: new Date('2026-06-07T15:10:00.000Z'),
      lines: [],
    },
    {
      id: 4n,
      opportunityCode: 'crm-opp-004',
      opportunityGroupCode: 'crm-opp-004',
      customerName: 'LS Materials',
      opportunityName: '영업/생산 수요 예측 PoC',
      ownerName: '정다은',
      ownerUserId: 77n,
      businessType: 'AI/분석',
      industryLine: '소재/생산',
      regionCode: 'domestic',
      statusCode: 'draft',
      priorityCode: 'medium',
      versionNo: 1,
      confirmed: false,
      expectedStartDate: new Date('2026-09-01T00:00:00.000Z'),
      expectedEndDate: new Date('2026-10-31T00:00:00.000Z'),
      paymentTermCode: '납품후',
      revenueSubtotal: 180000000n,
      specialDiscountTypeCode: 'amount',
      specialDiscountValue: null,
      specialDiscountAmount: 0n,
      revenueTotal: 180000000n,
      costTotal: 129000000n,
      pmsHandoffStatusCode: 'planned',
      dmsLinkStatusCode: 'planned',
      adminBoundaryCode: 'shared-admin',
      nextAction: '성과 기준과 확장 옵션 정리',
      updatedAt: new Date('2026-06-06T11:00:00.000Z'),
      lines: [],
    },
    {
      id: 5n,
      opportunityCode: 'crm-opp-005',
      opportunityGroupCode: 'crm-opp-005',
      customerName: 'LS ITC',
      opportunityName: '그룹 공통 문서/계약 템플릿 체계',
      ownerName: '최윤서',
      ownerUserId: 77n,
      businessType: '공통 플랫폼',
      industryLine: '그룹 공통',
      regionCode: 'domestic',
      statusCode: 'hold',
      priorityCode: 'low',
      versionNo: 1,
      confirmed: false,
      expectedStartDate: new Date('2026-10-01T00:00:00.000Z'),
      expectedEndDate: new Date('2027-01-31T00:00:00.000Z'),
      paymentTermCode: 'NET60',
      revenueSubtotal: 310000000n,
      specialDiscountTypeCode: 'amount',
      specialDiscountValue: null,
      specialDiscountAmount: 0n,
      revenueTotal: 310000000n,
      costTotal: 245000000n,
      pmsHandoffStatusCode: 'planned',
      dmsLinkStatusCode: 'planned',
      adminBoundaryCode: 'shared-admin',
      nextAction: 'DMS 템플릿 소유권과 충돌 여부 확인',
      updatedAt: new Date('2026-06-05T16:30:00.000Z'),
      lines: [],
    },
  ];
}

function createOpportunityHistoryRows(rows = createOpportunityRows()): OpportunityHistoryRow[] {
  const row = rows.find((item) => item.opportunityCode === 'crm-opp-001') ?? rows[0];
  if (!row) {
    return [];
  }

  return [
    {
      opportunityId: row.id,
      historySeq: 1n,
      eventType: 'C',
      eventAt: new Date('2026-06-08T09:00:00.000Z'),
      eventBy: null,
      opportunityCode: row.opportunityCode,
      opportunityGroupCode: row.opportunityGroupCode,
      statusCode: 'qualified',
      versionNo: row.versionNo,
      confirmed: false,
      paymentTermCode: row.paymentTermCode,
      revenueSubtotal: row.revenueSubtotal,
      specialDiscountAmount: 0n,
      revenueTotal: row.revenueSubtotal,
      costTotal: row.costTotal,
      lastSource: 'SEED',
      lastActivity: 'crm.opportunity.seed',
    },
    {
      opportunityId: row.id,
      historySeq: 2n,
      eventType: 'U',
      eventAt: new Date('2026-06-08T09:20:00.000Z'),
      eventBy: 101n,
      opportunityCode: row.opportunityCode,
      opportunityGroupCode: row.opportunityGroupCode,
      statusCode: row.statusCode,
      versionNo: row.versionNo,
      confirmed: row.confirmed,
      paymentTermCode: row.paymentTermCode,
      revenueSubtotal: row.revenueSubtotal,
      specialDiscountAmount: row.specialDiscountAmount,
      revenueTotal: row.revenueTotal,
      costTotal: row.costTotal,
      lastSource: 'crm.opportunity',
      lastActivity: 'update',
    },
  ];
}

function createQuoteSettingsService(): QuoteSettingsService {
  return {
    getSellerProfile: async () => ({
      id: '1',
      profileCode: 'default',
      companyName: 'SSOO 영업팀',
      ceoName: '김대표',
      businessRegistrationNo: '000-00-00000',
      address: '서울시 강남구 테헤란로',
      tel: '02-0000-0000',
      fax: '02-0000-0001',
      website: 'https://ssoo.example.com',
      email: 'sales@ssoo.example.com',
      ciStatus: 'dms-planned',
      updatedAt: '2026-07-07T00:00:00.000Z',
    }),
    toSellerInfoStatus: () => 'dms-ci-planned',
  } as unknown as QuoteSettingsService;
}

const quotePreviewCurrentUser: TokenPayload = {
  userId: '77',
  loginId: 'sales.kim',
  userName: '김민준',
};

function createUserService(): UserService {
  return {
    findProfileById: async () => ({
      id: 77n,
      loginId: 'sales.kim',
      userName: '김민준',
      displayName: '김민준',
      email: 'minjun@ssoo.example.com',
      phone: '010-0000-0000',
      avatarUrl: null,
      departmentCode: 'DX센터',
      positionCode: null,
      lastLoginAt: null,
    }),
  } as unknown as UserService;
}

function createTemplateService(): TemplateService {
  const toTemplate = (templateKey: string) => ({
    id: templateKey,
    name: templateKey === 'crm-quote-v1'
      ? 'CRM 견적서 기본 템플릿'
      : templateKey === 'crm-opportunity-contract-v1'
        ? 'CRM 영업기회 계약서 원천 호환 템플릿'
        : '고객 지정 견적서',
    description: 'CRM 견적 테스트 템플릿',
    scope: 'global' as const,
    kind: 'document' as const,
    content: '# {{quoteNumber}} 견적서',
    ownerId: 'system',
    visibility: 'shared' as const,
    status: 'active' as const,
    sourceType: 'markdown-file' as const,
    originType: 'referenced' as const,
    referenceDocuments: [],
    generation: {
      source: 'manual' as const,
      taskKey: templateKey === 'crm-opportunity-contract-v1'
        ? 'crm-opportunity-contract-document'
        : 'crm-quote-document',
    },
    updatedAt: '2026-07-10T00:00:00.000Z',
    sourcePath: templateKey === 'crm-quote-v1'
      ? 'templates/system/crm-quote-v1.md'
      : `system/${templateKey}.md`,
    docxTemplate: {
      fileName: `${templateKey}.docx`,
      sourcePath: `system/${templateKey}.docx`,
      size: 2048,
      checksum: 'a'.repeat(64),
      uploadedAt: '2026-07-10T00:00:00.000Z',
      uploadedBy: 'admin',
      origin: templateKey === 'crm-quote-v1' ? 'generated' as const : 'uploaded' as const,
    },
  });
  return {
    get: async (templateKey: string) => toTemplate(templateKey),
    list: async () => ({
      global: [
        toTemplate('crm-quote-v1'),
        toTemplate('crm-quote-customer-a'),
        toTemplate('crm-opportunity-contract-v1'),
      ],
      personal: [],
    }),
  } as unknown as TemplateService;
}

function createDmsCrmQuoteLifecycleService(calls: { dmsQuoteExecute: unknown[] }): DmsCrmQuoteLifecycleService {
  return {
    execute: async (request: unknown) => {
      calls.dmsQuoteExecute.push(request);
      return {
        opportunityId: '1',
        opportunityCode: 'crm-opp-001',
        quoteNumber: 'Q-crm-opp-001-V3',
        templateKey: 'crm-quote-v1',
        executedAt: '2026-07-10T01:00:00.000Z',
        governance: {
          templateVersion: {
            templateKey: 'crm-quote-v1',
            templateName: 'CRM 견적서 기본 템플릿',
            status: 'active',
            sourcePath: 'templates/system/crm-quote-v1.md',
            versionId: 'crm-quote-v1@2026-07-10T00:00:00.000Z',
            capturedAt: '2026-07-10T01:00:00.000Z',
          },
          templateReviewPath: '_generated/crm-quote-lifecycle/Q-crm-opp-001-V3/template-review.md',
          reviewedAt: '2026-07-10T01:00:00.000Z',
          reviewerLoginId: 'sales.kim',
          boundaryNotice: 'DMS 견적 governance evidence',
        },
        artifacts: [
          {
            kind: 'template-version-snapshot',
            label: 'DMS quote template version snapshot',
            path: '_generated/crm-quote-lifecycle/Q-crm-opp-001-V3/template-version.md',
          },
          {
            kind: 'template-review-record',
            label: 'DMS quote template review record',
            path: '_generated/crm-quote-lifecycle/Q-crm-opp-001-V3/template-review.md',
          },
          {
            kind: 'word-export',
            label: 'DMS quote DOCX artifact',
            path: '_assets/crm-quote-lifecycle/Q-crm-opp-001-V3/quote.docx',
            storageUri: 'local://quote.docx',
          },
          {
            kind: 'pdf-export',
            label: 'DMS quote PDF artifact',
            path: '_assets/crm-quote-lifecycle/Q-crm-opp-001-V3/quote.pdf',
            storageUri: 'local://quote.pdf',
          },
        ],
        evidenceSteps: [
          {
            key: 'template-review',
            evidencePath: '_generated/crm-quote-lifecycle/Q-crm-opp-001-V3/template-review.md',
            evidenceLabel: 'DMS quote template review record',
          },
          {
            key: 'word-export',
            evidencePath: 'local://quote.docx',
            evidenceLabel: 'DMS quote DOCX artifact',
          },
          {
            key: 'pdf-export',
            evidencePath: 'local://quote.pdf',
            evidenceLabel: 'DMS quote PDF artifact',
          },
        ],
        boundaryNotice: 'DMS는 CRM 견적 handoff의 markdown 초안을 입력으로 받아 artifact를 생성합니다.',
        nextAction: 'CRM 견적 handoff에 DMS artifact evidence를 반영하세요.',
      };
    },
  } as unknown as DmsCrmQuoteLifecycleService;
}

function createDmsCrmOpportunityContractLifecycleService(
  calls: { dmsOpportunityContractExecute: unknown[] },
): DmsCrmOpportunityContractLifecycleService {
  return {
    execute: async (request: unknown) => {
      calls.dmsOpportunityContractExecute.push(request);
      return {
        opportunityId: '1',
        opportunityCode: 'crm-opp-001',
        templateKey: 'crm-opportunity-contract-v1',
        executedAt: '2026-08-14T01:00:00.000Z',
        governance: {
          templateVersion: {
            templateKey: 'crm-opportunity-contract-v1',
            templateName: 'CRM 영업기회 계약서 원천 호환 템플릿',
            status: 'active',
            versionId: 'crm-opportunity-contract-v1@2026-08-14',
            capturedAt: '2026-08-14T01:00:00.000Z',
          },
          templateReviewPath: '_generated/crm-opportunity-contract-lifecycle/crm-opp-001/template-review.md',
          reviewedAt: '2026-08-14T01:00:00.000Z',
          reviewerLoginId: 'sales.kim',
          boundaryNotice: 'DMS opportunity contract governance evidence',
        },
        artifacts: [
          {
            kind: 'template-version-snapshot',
            label: 'DMS opportunity contract template version snapshot',
            path: '_generated/crm-opportunity-contract-lifecycle/crm-opp-001/template-version.md',
          },
          {
            kind: 'template-review-record',
            label: 'DMS opportunity contract template review record',
            path: '_generated/crm-opportunity-contract-lifecycle/crm-opp-001/template-review.md',
          },
          {
            kind: 'word-export',
            label: 'DMS opportunity contract DOCX artifact',
            path: '_assets/crm-opportunity-contract-lifecycle/crm-opp-001/contract.docx',
            storageUri: 'local://contract.docx',
            checksum: 'docx-checksum',
            size: 2048,
          },
        ],
        boundaryNotice: 'DMS는 영업기회 계약서 DOCX 템플릿과 artifact를 소유합니다.',
        nextAction: 'CRM에서 생성된 DOCX를 내려받아 검토하세요.',
      };
    },
  } as unknown as DmsCrmOpportunityContractLifecycleService;
}

function createService(rows = createOpportunityRows(), historyRows = createOpportunityHistoryRows(rows), codeService?: CodeService) {
  const calls = {
    findMany: [] as unknown[],
    findFirst: [] as unknown[],
    historyFindMany: [] as unknown[],
    ownerLookupFindMany: [] as unknown[],
  };
  const findManyRows = ({ where }: { where?: { opportunityGroupCode?: string } }) => {
    if (where?.opportunityGroupCode) {
      return rows.filter((row) => row.opportunityGroupCode === where.opportunityGroupCode);
    }

    return rows;
  };
  const db = {
    client: {
      $queryRaw: async () => [],
      crmOpportunity: {
        findMany: async (args: { where?: { opportunityGroupCode?: string } }) => {
          calls.findMany.push(args);
          return findManyRows(args);
        },
        findFirst: async (args: unknown) => {
          calls.findFirst.push(args);
          return rows[0] ?? null;
        },
      },
      crmOpportunityHistory: {
        findMany: async (args: { where: { opportunityId: bigint } }) => {
          calls.historyFindMany.push(args);
          return historyRows
            .filter((history) => history.opportunityId === args.where.opportunityId)
            .sort((left, right) => Number(right.historySeq - left.historySeq));
        },
      },
      user: {
        findMany: async (args: unknown) => {
          calls.ownerLookupFindMany.push(args);
          return [
            {
              id: 77n,
              userName: '김민준',
              displayName: '김민준',
              email: 'minjun@ssoo.example.com',
              departmentCode: 'DX센터',
              positionCode: 'SALES_LEAD',
              authAccount: {
                loginId: 'sales.kim',
              },
              organizationRelations: [
                {
                  isPrimary: true,
                  organization: {
                    orgId: 700n,
                    orgCode: 'DX',
                    orgName: 'DX센터',
                    scope: 'internal',
                  },
                },
              ],
            },
          ];
        },
      },
    },
  } as unknown as DatabaseService;

  return {
    service: new OpportunityService(db, undefined, undefined, createQuoteSettingsService(), createUserService(), undefined, undefined, undefined, undefined, undefined, codeService, { resolveBusinessOrganization: async () => 13n } as unknown as PlatformAdmissionService),
    calls,
  };
}

function createWritableService(
  seedRows: OpportunityRow[] = [],
  contractService?: unknown,
  dmsCrmQuoteLifecycleService?: unknown,
  dmsCrmOpportunityContractLifecycleService?: unknown,
  templateService: TemplateService = createTemplateService(),
  sellerService: QuoteSettingsService = createQuoteSettingsService(),
  ownerService: UserService = createUserService(),
) {
  const rows = [...seedRows];
  const quoteHandoffs: Array<{
    id: bigint;
    opportunityId: bigint;
    opportunityCode: string;
    quoteNumber: string;
    documentTypeCode: string;
    documentTitle: string;
    templateKey: string;
    folderHint: string;
    fileNameHint: string;
    draftPath: string;
    statusCode: string;
    documentSnapshot: unknown;
    variablesSnapshot: unknown;
    memo: string | null;
    isActive: boolean;
    savedBy: bigint | null;
    savedAt: Date;
  }> = [];
  const contractDocumentHandoffs: Array<{
    id: bigint;
    opportunityId: bigint;
    opportunityCode: string;
    documentTitle: string;
    templateKey: string;
    folderHint: string;
    fileNameHint: string;
    draftPath: string;
    statusCode: string;
    documentSnapshot: unknown;
    variablesSnapshot: unknown;
    artifactSnapshot: unknown | null;
    memo: string | null;
    isActive: boolean;
    savedBy: bigint | null;
    savedAt: Date;
  }> = [];
  let nextId = 10n;
  let nextLineId = 100n;
  let nextQuoteHandoffId = 300n;
  let nextContractDocumentHandoffId = 400n;
  const calls = {
    queueJob: [] as unknown[],
    update: [] as unknown[],
    delete: [] as unknown[],
    rawExecute: [] as unknown[],
    rawQuery: [] as unknown[],
    fileWrite: [] as unknown[],
    dmsQuoteExecute: [] as unknown[],
    dmsOpportunityContractExecute: [] as unknown[],
  };
  const tx = {
    $executeRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = Array.from(strings).join('');
      calls.rawExecute.push({ sql, values });
      if (sql.includes('update crm.crm_quote_dms_handoff_m')) {
        const opportunityCode = values[0];
        quoteHandoffs
          .filter((handoff) => handoff.opportunityCode === opportunityCode && handoff.isActive)
          .forEach((handoff) => {
            handoff.statusCode = 'replaced';
            handoff.isActive = false;
          });
      }
      if (sql.includes('update crm.crm_opportunity_contract_dms_handoff_m')) {
        const opportunityId = values[0] as bigint;
        contractDocumentHandoffs
          .filter((handoff) => handoff.opportunityId === opportunityId && handoff.isActive)
          .forEach((handoff) => {
            handoff.statusCode = 'replaced';
            handoff.isActive = false;
          });
      }
      if (sql.includes('update crm.crm_opportunity_m')) {
        const opportunityId = values[1] as bigint;
        const row = rows.find((item) => item.id === opportunityId);
        if (row) {
          row.dmsLinkStatusCode = 'draft-created';
          row.updatedAt = new Date('2026-07-10T00:10:00.000Z');
        }
      }
      return 1;
    },
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = Array.from(strings).join('');
      calls.rawQuery.push({ sql, values });
      if (sql.includes('insert into crm.crm_quote_dms_handoff_m')) {
        const opportunityId = values[11] as bigint;
        const row = rows.find((item) => item.id === opportunityId);
        if (!row) {
          return [];
        }
        const statusCode = sql.includes('execution-evidence-updated')
          ? 'execution-evidence-updated'
          : 'draft-created';
        const handoff = {
          id: nextQuoteHandoffId++,
          opportunityId: row.id,
          opportunityCode: row.opportunityCode,
          quoteNumber: values[0] as string,
          documentTypeCode: values[1] as string,
          documentTitle: values[2] as string,
          templateKey: values[3] as string,
          folderHint: values[4] as string,
          fileNameHint: values[5] as string,
          draftPath: values[6] as string,
          statusCode,
          documentSnapshot: JSON.parse(values[7] as string) as unknown,
          variablesSnapshot: JSON.parse(values[8] as string) as unknown,
          memo: values[9] as string | null,
          isActive: true,
          savedBy: values[10] as bigint,
          savedAt: new Date('2026-07-10T00:20:00.000Z'),
        };
        quoteHandoffs.push(handoff);
        return [{
          id: handoff.id,
          opportunityId: handoff.opportunityId,
          opportunityCode: handoff.opportunityCode,
          quoteNumber: handoff.quoteNumber,
          documentTypeCode: handoff.documentTypeCode,
          documentTitle: handoff.documentTitle,
          templateKey: handoff.templateKey,
          folderHint: handoff.folderHint,
          fileNameHint: handoff.fileNameHint,
          draftPath: handoff.draftPath,
          statusCode: handoff.statusCode,
          documentSnapshot: handoff.documentSnapshot,
          variablesSnapshot: handoff.variablesSnapshot,
          memo: handoff.memo,
          savedBy: handoff.savedBy,
          savedAt: handoff.savedAt,
        }];
      }
      if (sql.includes('insert into crm.crm_opportunity_contract_dms_handoff_m')) {
        const handoff = {
          id: nextContractDocumentHandoffId++,
          opportunityId: values[0] as bigint,
          opportunityCode: values[1] as string,
          documentTitle: values[2] as string,
          templateKey: values[3] as string,
          folderHint: values[4] as string,
          fileNameHint: values[5] as string,
          draftPath: values[6] as string,
          statusCode: values[7] as string,
          documentSnapshot: JSON.parse(values[8] as string) as unknown,
          variablesSnapshot: JSON.parse(values[9] as string) as unknown,
          artifactSnapshot: values[10] ? JSON.parse(values[10] as string) as unknown : null,
          memo: values[11] as string | null,
          isActive: true,
          savedBy: values[12] as bigint,
          savedAt: new Date('2026-08-14T00:20:00.000Z'),
        };
        contractDocumentHandoffs.push(handoff);
        return [handoff];
      }
      return [];
    },
    crmOpportunity: {
      create: async ({ data }: { data: Partial<OpportunityRow> }) => {
        const row = {
          id: nextId++,
          opportunityCode: data.opportunityCode ?? 'crm-opp-generated',
          opportunityGroupCode: data.opportunityGroupCode ?? data.opportunityCode ?? 'crm-opp-generated',
          customerName: data.customerName ?? '',
          opportunityName: data.opportunityName ?? '',
          ownerName: data.ownerName ?? '',
          ownerUserId: data.ownerUserId ?? null,
          businessType: data.businessType ?? '',
          industryLine: data.industryLine ?? '',
          regionCode: data.regionCode ?? 'domestic',
          statusCode: data.statusCode ?? 'draft',
          priorityCode: data.priorityCode ?? 'medium',
          versionNo: data.versionNo ?? 1,
          confirmed: data.confirmed ?? false,
          contractCreated: data.contractCreated ?? false,
          contractCreatedAt: data.contractCreatedAt ?? null,
          contractCode: data.contractCode ?? null,
          expectedStartDate: data.expectedStartDate ?? new Date('2026-07-01T00:00:00.000Z'),
          expectedEndDate: data.expectedEndDate ?? new Date('2026-09-30T00:00:00.000Z'),
          paymentTermCode: data.paymentTermCode ?? null,
          quoteStatusCode: data.quoteStatusCode ?? 'draft',
          quoteClientContactName: data.quoteClientContactName ?? null,
          quoteIssuedAt: data.quoteIssuedAt ?? null,
          quoteValidUntil: data.quoteValidUntil ?? null,
          quoteMemo: data.quoteMemo ?? null,
          revenueSubtotal: data.revenueSubtotal ?? data.revenueTotal ?? 0n,
          specialDiscountTypeCode: data.specialDiscountTypeCode ?? 'amount',
          specialDiscountValue: data.specialDiscountValue ?? null,
          specialDiscountAmount: data.specialDiscountAmount ?? 0n,
          revenueTotal: data.revenueTotal ?? 0n,
          costTotal: data.costTotal ?? 0n,
          pmsHandoffStatusCode: data.pmsHandoffStatusCode ?? 'planned',
          dmsLinkStatusCode: data.dmsLinkStatusCode ?? 'planned',
          adminBoundaryCode: data.adminBoundaryCode ?? 'shared-admin',
          nextAction: data.nextAction ?? '',
          updatedAt: new Date('2026-07-03T00:00:00.000Z'),
          lines: [] as OpportunityRow['lines'],
        } satisfies OpportunityRow;
        rows.unshift(row);
        return row;
      },
      update: async ({ where, data }: { where: { id: bigint }; data: Partial<OpportunityRow> }) => {
        calls.update.push({ where, data });
        const row = rows.find((item) => item.id === where.id);
        if (!row) {
          throw new Error('missing row');
        }

        Object.assign(row, data, { updatedAt: new Date('2026-07-03T00:10:00.000Z') });
        return row;
      },
      delete: async ({ where }: { where: { id: bigint } }) => {
        calls.delete.push({ where });
        const rowIndex = rows.findIndex((item) => item.id === where.id);
        if (rowIndex < 0) {
          throw new Error('missing row');
        }
        return rows.splice(rowIndex, 1)[0];
      },
    },
    crmOpportunityLine: {
      deleteMany: async ({ where }: { where: { opportunityId: bigint } }) => {
        const row = rows.find((item) => item.id === where.opportunityId);
        if (row) {
          row.lines = [];
        }
        return { count: 1 };
      },
      createMany: async ({ data }: { data: Array<{
        opportunityId: bigint;
        lineCode: string;
        lineKindCode: string;
        categoryCode: string;
        lineLabel: string;
        quantity: number | null;
        unitPrice: bigint | null;
        amount: bigint;
        marginRate: number | null;
        truncUnit: bigint | null;
        department: string | null;
        memberName: string | null;
        grade: string | null;
        serviceTypeCode: string | null;
        revenueLinked: boolean;
        linkedCostLineCode: string | null;
        revenueUnitPrice: bigint | null;
        sortOrder: number;
      }> }) => {
        for (const line of data) {
          const row = rows.find((item) => item.id === line.opportunityId);
          if (row) {
            row.lines.push({
              id: nextLineId++,
              lineCode: line.lineCode,
              lineKindCode: line.lineKindCode,
              categoryCode: line.categoryCode,
              lineLabel: line.lineLabel,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              amount: line.amount,
              marginRate: line.marginRate,
              truncUnit: line.truncUnit,
              department: line.department,
              memberName: line.memberName,
              grade: line.grade,
              serviceTypeCode: line.serviceTypeCode,
              revenueLinked: line.revenueLinked,
              linkedCostLineCode: line.linkedCostLineCode,
              revenueUnitPrice: line.revenueUnitPrice,
              sortOrder: line.sortOrder,
            });
          }
        }
        return { count: data.length };
      },
    },
  };
  const db = {
    client: {
      $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
      $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const sql = Array.from(strings).join('');
        calls.rawQuery.push({ sql, values });
        if (sql.includes('from crm.crm_quote_dms_handoff_m')) {
          const opportunityCode = values[0] as string;
          const handoff = [...quoteHandoffs]
            .filter((item) => item.opportunityCode === opportunityCode && item.isActive)
            .sort((left, right) => Number(right.id - left.id))[0];
          return handoff ? [{
            id: handoff.id,
            opportunityId: handoff.opportunityId,
            opportunityCode: handoff.opportunityCode,
            quoteNumber: handoff.quoteNumber,
            documentTypeCode: handoff.documentTypeCode,
            documentTitle: handoff.documentTitle,
            templateKey: handoff.templateKey,
            folderHint: handoff.folderHint,
            fileNameHint: handoff.fileNameHint,
            draftPath: handoff.draftPath,
            statusCode: handoff.statusCode,
            documentSnapshot: handoff.documentSnapshot,
            variablesSnapshot: handoff.variablesSnapshot,
            memo: handoff.memo,
            savedBy: handoff.savedBy,
            savedAt: handoff.savedAt,
          }] : [];
        }
        if (sql.includes('from crm.crm_opportunity_contract_dms_handoff_m')) {
          const opportunityCode = values[0] as string;
          const handoff = [...contractDocumentHandoffs]
            .filter((item) => item.opportunityCode === opportunityCode && item.isActive)
            .sort((left, right) => Number(right.id - left.id))[0];
          return handoff ? [handoff] : [];
        }
        return [];
      },
      crmOpportunity: {
        findMany: async ({ where }: { where?: { opportunityGroupCode?: string } } = {}) => {
          if (where?.opportunityGroupCode) {
            return rows.filter((row) => row.opportunityGroupCode === where.opportunityGroupCode);
          }

          return rows;
        },
        findFirst: async ({ where }: { where: { OR: Array<{ opportunityCode?: string; id?: bigint }> } }) => {
          return rows.find((row) => where.OR.some((clause) => (
            clause.opportunityCode === row.opportunityCode || clause.id === row.id
          ))) ?? null;
        },
        update: async ({ where, data }: { where: { id: bigint }; data: Partial<OpportunityRow> }) => {
          calls.update.push({ where, data });
          const row = rows.find((item) => item.id === where.id);
          if (!row) {
            throw new Error('missing row');
          }

          Object.assign(row, data, { updatedAt: new Date('2026-07-03T00:10:00.000Z') });
          return row;
        },
        delete: async ({ where }: { where: { id: bigint } }) => {
          calls.delete.push({ where });
          const rowIndex = rows.findIndex((item) => item.id === where.id);
          if (rowIndex < 0) {
            throw new Error('missing row');
          }
          return rows.splice(rowIndex, 1)[0];
        },
      },
    },
  } as unknown as DatabaseService;
  const aiIndexingService = {
    queueJob: async (request: unknown) => {
      calls.queueJob.push(request);
      return {};
    },
  } as unknown as AiIndexingService;
  const fileCrudService = {
    write: async (filePath: string, content: string) => {
      calls.fileWrite.push({ filePath, content });
      return { success: true, data: { message: 'File saved' } };
    },
  } as unknown as FileCrudService;

  return {
    service: new OpportunityService(
      db,
      aiIndexingService,
      contractService as ContractService | undefined,
      sellerService,
      ownerService,
      fileCrudService,
      templateService,
      dmsCrmQuoteLifecycleService as DmsCrmQuoteLifecycleService | undefined,
      dmsCrmOpportunityContractLifecycleService as DmsCrmOpportunityContractLifecycleService | undefined,
      undefined, undefined, { resolveBusinessOrganization: async () => 13n } as unknown as PlatformAdmissionService,
    ),
    rows,
    quoteHandoffs,
    contractDocumentHandoffs,
    calls,
  };
}

const writablePayload = {
  customerName: 'LS 신규 고객',
  opportunityName: '영업관리 저장 API 1차',
  ownerName: '김영업',
  ownerUserId: '77',
  businessType: 'SI 구축',
  industryLine: '그룹 공통',
  region: 'domestic' as const,
  status: 'qualified' as const,
  priority: 'high' as const,
  paymentTermCode: 'NET30',
  expectedStartDate: '2026-07-01',
  expectedEndDate: '2026-09-30',
  nextAction: '매출/원가 라인 검토 후 제안 단계로 전환',
  revenueLines: [
    { category: 'product' as const, label: '플랫폼 라이선스', quantity: 3, unitPrice: 100000000 },
    {
      category: 'service' as const,
      label: '구축 서비스',
      quantity: 4,
      unitPrice: 50000000,
      department: 'DX센터',
      memberName: '구축팀',
      grade: 'Senior',
      serviceType: 'internal' as const,
    },
  ],
  costLines: [
    {
      category: 'internal-cost' as const,
      label: '내부 수행 원가',
      quantity: 4,
      unitPrice: 70000000,
      department: 'DX센터',
      memberName: '수행팀',
      grade: 'Senior',
      serviceType: 'internal' as const,
    },
  ],
};

describe('OpportunityService', () => {
  it('builds the source-exact 22-variable contract document from a confirmed latest opportunity', async () => {
    const rows = createOpportunityRows();
    rows[0].confirmed = true;
    rows[0].statusCode = 'won';
    const { service } = createService(rows);
    const contractDocumentService = service as unknown as {
      getOpportunityContractDocumentPreview(
        id: string,
        currentUser: TokenPayload,
      ): Promise<{
        readiness: string;
        variables: Array<{ key: string; value: string }>;
      }>;
    };

    expect(typeof contractDocumentService.getOpportunityContractDocumentPreview).toBe('function');
    const preview = await contractDocumentService.getOpportunityContractDocumentPreview(
      'crm-opp-001',
      quotePreviewCurrentUser,
    );
    const variables = Object.fromEntries(preview.variables.map((variable) => [variable.key, variable.value]));

    expect(Object.keys(variables)).toEqual([
      '공급자_회사명',
      '공급자_대표자',
      '공급자_사업자번호',
      '공급자_주소',
      '공급자_전화',
      '고객사명',
      '건명',
      '계약금액',
      '계약금액_한글',
      '외부원가',
      '순이익',
      '계약시작일',
      '계약종료일',
      '계약기간',
      '사업구분',
      '담당자명',
      '담당자부서',
      '담당자연락처',
      '담당자이메일',
      '수금조건',
      '작성일',
      '계약년도',
    ]);
    expect(variables).toMatchObject({
      공급자_회사명: 'SSOO 영업팀',
      고객사명: 'LS Electric',
      건명: '스마트 배전반 통합 관제 고도화',
      계약금액: '820,000,000',
      외부원가: '592,000,000',
      순이익: '228,000,000',
      계약시작일: '2026.07.01',
      계약종료일: '2026.12.31',
      계약기간: '2026.07.01 ~ 2026.12.31',
      담당자명: '김민준',
      담당자부서: 'DX센터',
      담당자연락처: '010-0000-0000',
      담당자이메일: 'minjun@ssoo.example.com',
      수금조건: '계약 후 30일 이내',
      계약년도: '2026',
    });
    expect(variables.계약금액_한글).toMatch(/원$/);
    expect(variables.작성일).toMatch(/^\d{4}년 \d{1,2}월 \d{1,2}일$/);
  });

  it('persists and reloads an exact 22-variable DMS draft handoff for a confirmed latest opportunity', async () => {
    const rows = createOpportunityRows();
    rows[0].confirmed = true;
    rows[0].statusCode = 'won';
    const { service, contractDocumentHandoffs, calls } = createWritableService(rows);

    const result = await service.createOpportunityContractDocumentDraft(
      'crm-opp-001',
      { templateKey: 'crm-opportunity-contract-v1', memo: '원천 변수 검토' },
      quotePreviewCurrentUser,
    );

    expect(result.handoff.status).toBe('draft-created');
    expect(result.preview.latestHandoff?.id).toBe(result.handoff.id);
    expect(result.preview.variables).toHaveLength(22);
    expect(contractDocumentHandoffs).toHaveLength(1);
    expect(contractDocumentHandoffs[0].variablesSnapshot).toHaveLength(22);
    expect(calls.fileWrite).toHaveLength(1);
    expect(calls.fileWrite[0]).toMatchObject({
      content: expect.stringContaining('| 공급자_회사명 | SSOO 영업팀 | seller-profile |'),
    });
  });

  it('executes the DMS DOCX lifecycle from the persisted 22-variable snapshot and records artifact evidence', async () => {
    const rows = createOpportunityRows();
    rows[0].confirmed = true;
    rows[0].statusCode = 'won';
    const lifecycleCalls = { dmsOpportunityContractExecute: [] as unknown[] };
    const dmsLifecycle = createDmsCrmOpportunityContractLifecycleService(lifecycleCalls);
    const { service, contractDocumentHandoffs } = createWritableService(
      rows,
      undefined,
      undefined,
      dmsLifecycle,
    );
    await service.createOpportunityContractDocumentDraft(
      'crm-opp-001',
      { templateKey: 'crm-opportunity-contract-v1' },
      quotePreviewCurrentUser,
    );

    const result = await service.executeOpportunityContractDocumentLifecycle(
      'crm-opp-001',
      { memo: 'DOCX 산출' },
      quotePreviewCurrentUser,
    );

    expect(lifecycleCalls.dmsOpportunityContractExecute).toHaveLength(1);
    expect(lifecycleCalls.dmsOpportunityContractExecute[0]).toMatchObject({
      templateKey: 'crm-opportunity-contract-v1',
      variables: expect.arrayContaining([
        expect.objectContaining({ key: '계약금액', value: '820,000,000' }),
        expect.objectContaining({ key: '외부원가', value: '592,000,000' }),
      ]),
    });
    expect(result.handoff.status).toBe('execution-completed');
    expect(result.artifact.storageUri).toBe('local://contract.docx');
    expect(result.preview.latestHandoff?.artifact?.checksum).toBe('docx-checksum');
    expect(contractDocumentHandoffs.filter((handoff) => handoff.isActive)).toHaveLength(1);
  });

  it('selects an active replacement and evaluates an explicitly selected template independently of a blocked default', async () => {
    const rows = createOpportunityRows(); rows[0].confirmed = true;
    const templates = createTemplateService();
    const original = (await templates.list('system')).global.find((item) => item.id === 'crm-opportunity-contract-v1')!;
    templates.list = async () => ({ global: [
      { ...original, status: 'archived' },
      { ...original, id: 'contract-b', name: '고객 지정 B' },
      { ...original, id: 'contract-empty', docxTemplate: undefined },
    ], personal: [] });
    const { service } = createWritableService(rows, undefined, undefined, undefined, templates);
    const automatic = await service.getOpportunityContractDocumentPreview('crm-opp-001');
    expect(automatic).toMatchObject({ templateKey: 'contract-b', readiness: 'ready' });
    const blocked = await service.getOpportunityContractDocumentPreview('crm-opp-001', quotePreviewCurrentUser, original.id);
    expect(blocked.readiness).toBe('blocked');
    const selected = await service.getOpportunityContractDocumentPreview('crm-opp-001', quotePreviewCurrentUser, 'contract-b');
    expect(selected).toMatchObject({ templateKey: 'contract-b', readiness: 'ready' });
    expect(selected.fileNameHint).toContain('고객_지정_B');
    const draft = await service.createOpportunityContractDocumentDraft('crm-opp-001', { templateKey: 'contract-b' }, quotePreviewCurrentUser);
    expect(draft.handoff.templateKey).toBe('contract-b');
    await expect(service.createOpportunityContractDocumentDraft('crm-opp-001', { templateKey: 'contract-empty' }, quotePreviewCurrentUser)).rejects.toThrow('DOCX binary');
  });

  it('allows optional source variables to stay empty but keeps the contract business prerequisites', async () => {
    const rows = createOpportunityRows(); rows[0].confirmed = true; rows[0].ownerUserId = null; rows[0].paymentTermCode = null;
    const seller = createQuoteSettingsService(); seller.getSellerProfile = async () => null as unknown as Awaited<ReturnType<QuoteSettingsService['getSellerProfile']>>;
    const { service } = createWritableService(rows, undefined, undefined, undefined, createTemplateService(), seller);
    const preview = await service.getOpportunityContractDocumentPreview('crm-opp-001');
    expect(preview.readiness).toBe('ready');
    for (const key of ['공급자_회사명', '공급자_대표자', '공급자_사업자번호', '공급자_주소', '공급자_전화', '담당자명', '담당자부서', '담당자연락처', '담당자이메일', '수금조건']) {
      expect(preview.variables.find((item) => item.key === key)).toMatchObject({ value: '', required: false });
    }
    expect(preview.variables).toHaveLength(22);
    rows[0].confirmed = false;
    expect((await service.getOpportunityContractDocumentPreview('crm-opp-001')).readiness).toBe('blocked');
    rows[0].confirmed = true; rows[0].revenueTotal = 0n;
    expect((await service.getOpportunityContractDocumentPreview('crm-opp-001')).blockedReasons.join(' ')).toContain('0원');
    rows[0].revenueTotal = 100n; rows[0].customerName = ' ';
    expect((await service.getOpportunityContractDocumentPreview('crm-opp-001')).blockedReasons.join(' ')).toContain('고객사명');
  });

  it('refreshes the saved template and variable snapshot when generating again after a template or source change', async () => {
    const rows = createOpportunityRows(); rows[0].confirmed = true;
    const templates = createTemplateService();
    const original = (await templates.list('system')).global.find((item) => item.id === 'crm-opportunity-contract-v1')!;
    templates.list = async () => ({ global: [original, { ...original, id: 'contract-b', name: '고객 B' }], personal: [] });
    const calls = { dmsOpportunityContractExecute: [] as unknown[] };
    const { service } = createWritableService(rows, undefined, undefined, createDmsCrmOpportunityContractLifecycleService(calls), templates);
    await service.createOpportunityContractDocumentDraft('crm-opp-001', { templateKey: original.id }, quotePreviewCurrentUser);
    rows[0].opportunityName = '변경된 계약 건명';
    await service.createOpportunityContractDocumentDraft('crm-opp-001', { templateKey: 'contract-b' }, quotePreviewCurrentUser);
    await service.executeOpportunityContractDocumentLifecycle('crm-opp-001', {}, quotePreviewCurrentUser);
    expect(calls.dmsOpportunityContractExecute[0]).toMatchObject({ templateKey: 'contract-b', variables: expect.arrayContaining([{ key: '건명', label: '건명', value: '변경된 계약 건명', required: true, source: 'opportunity' }]) });
    templates.list = async () => ({ global: [original, { ...original, id: 'contract-b', status: 'archived' }], personal: [] });
    await expect(service.executeOpportunityContractDocumentLifecycle('crm-opp-001', {}, quotePreviewCurrentUser)).rejects.toThrow('archived');
  });

  it('selects the highest confirmed version separately from the newest draft for the dashboard', async () => {
    const base = createOpportunityRows()[0];
    const rows = [
      { ...base, id: 3n, opportunityCode: 'a-v3', versionNo: 3, confirmed: false },
      { ...base, id: 1n, opportunityCode: 'a-v1', versionNo: 1, confirmed: true },
      { ...base, id: 2n, opportunityCode: 'a-v2', versionNo: 2, confirmed: true },
      { ...base, id: 4n, opportunityCode: 'b-v1', opportunityGroupCode: 'b', versionNo: 1, confirmed: false },
    ];
    const { service } = createService(rows);
    const result = await service.listSourceDashboardOpportunities();
    expect(result.latest.map((item) => item.id)).toEqual(['a-v3', 'b-v1']);
    expect(result.confirmed).toHaveLength(1);
    expect(result.confirmed[0]).toMatchObject({ id: 'a-v2', version: 2, isLatest: false, versionCount: 3 });
  });

  it('keeps group registration order when an old group receives a new version or edit', async () => {
    const base = createOpportunityRows()[0];
    const rows = [
      { ...base, id: 50n, opportunityCode: 'a-v2', opportunityGroupCode: 'z-old', versionNo: 2 },
      { ...base, id: 20n, opportunityCode: 'b-v1', opportunityGroupCode: 'a-new', versionNo: 1 },
      { ...base, id: 10n, opportunityCode: 'a-v1', opportunityGroupCode: 'z-old', versionNo: 1, updatedAt: new Date('2026-09-30T00:00:00Z') },
    ];
    const { service } = createService(rows);
    expect((await service.listSourceDashboardOpportunities()).latest.map((item) => item.id)).toEqual(['a-v2', 'b-v1']);
    expect((await createService([]).service.listSourceDashboardOpportunities())).toEqual({ latest: [], confirmed: [] });
  });

  it('returns seeded CRM opportunities from the CRM RDB ledger with read-only integration boundaries', async () => {
    const { service, calls } = createService();

    const opportunities = await service.listOpportunities();
    const latestLsElectric = opportunities.find((item) => item.id === 'crm-opp-001');

    expect(opportunities).toHaveLength(5);
    expect(opportunities.map((item) => item.customerName)).toEqual([...opportunities]
      .map((item) => item.customerName)
      .sort((left, right) => left.localeCompare(right, 'ko')));
    expect(latestLsElectric).toMatchObject({
      id: 'crm-opp-001',
      groupId: 'crm-opp-001',
      customerName: 'LS Electric',
      version: 3,
      versionCount: 2,
      isLatest: true,
      pmsHandoffStatus: 'planned',
      dmsLinkStatus: 'planned',
    });
    expect(latestLsElectric?.revenueLines).toHaveLength(2);
    expect(latestLsElectric?.costLines).toHaveLength(2);
    expect(opportunities.every((item) => item.adminBoundary === 'shared-admin')).toBe(true);
    expect(calls.findMany[0]).toMatchObject({
      where: { isActive: true },
      include: {
        lines: {
          where: { isActive: true },
        },
      },
    });
  });

  it('finds CRM owner lookup candidates from common active users', async () => {
    const { service, calls } = createService();

    const owners = await service.findOwnerLookup({ search: 'sales', limit: 10 });

    expect(owners).toEqual([
      {
        userId: '77',
        userName: '김민준',
        displayName: '김민준',
        loginId: 'sales.kim',
        email: 'minjun@ssoo.example.com',
        departmentCode: 'DX센터',
        positionCode: 'SALES_LEAD',
        primaryOrganizationId: '700',
        primaryOrganizationCode: 'DX',
        primaryOrganizationName: 'DX센터',
        primaryOrganizationScope: 'internal',
      },
    ]);
    expect(calls.ownerLookupFindMany[0]).toMatchObject({
      where: {
        isActive: true,
        OR: expect.any(Array),
      },
      take: 10,
    });
    expect(calls.ownerLookupFindMany[0]).toMatchObject({ where: { OR: expect.arrayContaining([
      { departmentCode: { contains: 'sales', mode: 'insensitive' } },
      { organizationRelations: { some: { isActive: true, organization: {
        isActive: true, orgClass: 'permanent', OR: [
          { orgName: { contains: 'sales', mode: 'insensitive' } },
          { orgCode: { contains: 'sales', mode: 'insensitive' } },
        ],
      } } } },
    ]) } });
  });

  it('resolves renamed inactive payment codes through the platform in quote and contract document output', async () => {
    const groups: string[] = [];
    const codeService = { findByGroup: async (group: string) => {
      groups.push(group);
      return [{ codeValue: 'NET30', displayNameKo: '검수 후 익월 말', isActive: false }];
    } } as unknown as CodeService;
    const { service } = createService(undefined, undefined, codeService);
    expect((await service.getQuotePreview('crm-opp-001')).workflow.paymentTermLabel).toBe('검수 후 익월 말');
    const document = await service.getOpportunityContractDocumentPreview('crm-opp-001');
    expect(document.variables.find((variable) => variable.key === '수금조건')?.value).toBe('검수 후 익월 말');
    expect(groups).toEqual(['payment_term', 'payment_term']);
  });

  it.each([['CUSTOM-TERM', 'CUSTOM-TERM'], [null, '-'], ['NET30', '계약 후 30일 이내']])('keeps unknown, empty and legacy payment term fallback for %s', async (value, expected) => {
    const rows = createOpportunityRows();
    rows.forEach((row) => { row.paymentTermCode = value; });
    const { service } = createService(rows, undefined, { findByGroup: async () => [] } as unknown as CodeService);
    expect((await service.getQuotePreview('crm-opp-001')).workflow.paymentTermLabel).toBe(expected);
  });

  it('surfaces payment-code lookup failures instead of printing a stale label', async () => {
    const { service } = createService(undefined, undefined, { findByGroup: async () => { throw new Error('code unavailable'); } } as unknown as CodeService);
    await expect(service.getQuotePreview('crm-opp-001')).rejects.toThrow('code unavailable');
  });

  it('calculates summary totals from revenue and cost without claiming contract handoff completion', async () => {
    const { service } = createService();

    const summary = await service.getSummary();

    expect(summary.totalCount).toBe(5);
    expect(summary.totalRevenue).toBeGreaterThan(summary.totalCost);
    expect(summary.grossMarginRate).toBeGreaterThan(0);
    expect(summary.boundaryNotice).toContain('PMS');
    expect(summary.unimplementedIntegrations).toEqual(['견적 생성', 'DMS 연결', 'PMS 인계']);
  });

  it('derives a read-only quote preview from opportunity revenue lines without generating documents', async () => {
    const { service } = createService();

    const preview = await service.getQuotePreview('crm-opp-001', quotePreviewCurrentUser);

    expect(preview.workflow).toMatchObject({
      sourceOpportunityId: 'crm-opp-001',
      sourceOpportunityVersion: 3,
      previewStatus: 'candidate',
      quoteNumber: 'Q-crm-opp-001-V3',
      paymentTermLabel: '계약 후 30일 이내',
      readOnly: true,
    });
    expect(preview.workflow.unavailableActions).toEqual([]);
    expect(preview.workflow.boundaryNotice).toContain('브라우저 인쇄/PDF 저장');
    expect(preview.party).toMatchObject({
      customerName: 'LS Electric',
      sellerName: 'SSOO 영업팀',
      sellerInfoStatus: 'dms-ci-planned',
      ownerContactStatus: 'opportunity-owner-profile',
      ownerContact: {
        userId: '77',
        displayName: '김민준',
        departmentName: 'DX센터',
        phone: '010-0000-0000',
        email: 'minjun@ssoo.example.com',
      },
    });
    expect(preview.party.sellerProfile).toMatchObject({
      companyName: 'SSOO 영업팀',
      ciStatus: 'dms-planned',
    });
    expect(preview.productLines).toHaveLength(1);
    expect(preview.serviceLines).toHaveLength(1);
    expect(preview.summary).toMatchObject({
      productSubtotal: 390000000,
      serviceSubtotal: 450000000,
      revenueSubtotal: 840000000,
      specialDiscountAmount: 20000000,
      quoteTotal: 820000000,
      vatIncluded: false,
      vatNotice: 'VAT 별도',
    });
    expect(preview.dmsDocument).toMatchObject({
      opportunityCode: 'crm-opp-001',
      quoteNumber: 'Q-crm-opp-001-V3',
      templateKey: 'crm-quote-v1',
      templateEvidence: {
        state: 'unavailable',
        templateKey: 'crm-quote-v1',
      },
      readiness: 'ready',
      dmsLinkStatus: 'planned',
      latestHandoff: null,
    });
    expect(preview.dmsDocument.lifecycle).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'markdown-draft', status: 'ready' }),
      expect.objectContaining({ key: 'template-review', status: 'blocked' }),
      expect.objectContaining({ key: 'word-export', status: 'blocked' }),
      expect.objectContaining({ key: 'pdf-export', status: 'blocked' }),
    ]));
    expect(preview.dmsDocument.variables).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'quoteNumber', value: 'Q-crm-opp-001-V3' }),
      expect.objectContaining({ key: 'quoteTotal', value: '820,000,000원' }),
    ]));
    expect(preview.notes.join(' ')).toContain('DMS');
  });

  it('stores quote workflow metadata without generating quote documents', async () => {
    const { service, rows, calls } = createWritableService(createOpportunityRows());

    const preview = await service.updateQuoteWorkflow('crm-opp-001', {
      status: 'sent',
      clientContactName: '홍길동',
      issuedAt: '2026-07-01',
      validUntil: '2026-07-31',
      quoteMemo: '고객 검토용 견적 상태 저장',
    }, 77n, quotePreviewCurrentUser);
    const row = rows.find((item) => item.opportunityCode === 'crm-opp-001');

    expect(row?.quoteStatusCode).toBe('sent');
    expect(row?.quoteClientContactName).toBe('홍길동');
    expect(row?.quoteIssuedAt?.toISOString().slice(0, 10)).toBe('2026-07-01');
    expect(row?.quoteValidUntil?.toISOString().slice(0, 10)).toBe('2026-07-31');
    expect(row?.quoteMemo).toBe('고객 검토용 견적 상태 저장');
    expect(preview.workflow).toMatchObject({
      workflowStatus: 'sent',
      validUntil: '2026-07-31',
      quoteMemo: '고객 검토용 견적 상태 저장',
    });
    expect(preview.party.clientContactName).toBe('홍길동');
    expect(calls.queueJob).toHaveLength(1);
  });

  it('stores a quote DMS markdown draft handoff without claiming Word or PDF export completion', async () => {
    const { service, rows, quoteHandoffs, calls } = createWritableService(createOpportunityRows());

    const result = await service.createQuoteDmsDocumentDraft(
      'crm-opp-001',
      { memo: '견적 초안 확인 요청' },
      quotePreviewCurrentUser,
    );

    expect(calls.fileWrite).toHaveLength(1);
    expect(calls.fileWrite[0]).toMatchObject({
      filePath: 'CRM/LS_Electric/quotes/Q-crm-opp-001-V3/Q-crm-opp-001-V3_스마트_배전반_통합_관제_고도화_quote-draft.md',
    });
    expect(String((calls.fileWrite[0] as { content: string }).content)).toContain('CRM 영업기회 원장에서 생성한 DMS markdown 견적 초안입니다.');
    expect(String((calls.fileWrite[0] as { content: string }).content)).toContain('## DMS 견적 lifecycle');
    expect(quoteHandoffs).toHaveLength(1);
    expect(quoteHandoffs[0]).toMatchObject({
      opportunityCode: 'crm-opp-001',
      quoteNumber: 'Q-crm-opp-001-V3',
      templateKey: 'crm-quote-v1',
      statusCode: 'draft-created',
      memo: '견적 초안 확인 요청',
      isActive: true,
    });
    expect(rows.find((row) => row.opportunityCode === 'crm-opp-001')?.dmsLinkStatusCode).toBe('draft-created');
    expect(result).toMatchObject({
      opportunityCode: 'crm-opp-001',
      quoteNumber: 'Q-crm-opp-001-V3',
      templateKey: 'crm-quote-v1',
      dmsLinkStatus: 'draft-created',
      preview: {
        templateEvidence: {
          state: 'available',
          templateName: 'CRM 견적서 기본 템플릿',
          sourcePath: 'templates/system/crm-quote-v1.md',
          status: 'active',
        },
        latestHandoff: {
          status: 'draft-created',
          draftPath: 'CRM/LS_Electric/quotes/Q-crm-opp-001-V3/Q-crm-opp-001-V3_스마트_배전반_통합_관제_고도화_quote-draft.md',
        },
      },
    });
    expect(result.preview.lifecycle).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'markdown-draft',
        status: 'completed',
        evidencePath: 'CRM/LS_Electric/quotes/Q-crm-opp-001-V3/Q-crm-opp-001-V3_스마트_배전반_통합_관제_고도화_quote-draft.md',
      }),
      expect.objectContaining({
        key: 'template-review',
        status: 'ready',
        evidencePath: 'templates/system/crm-quote-v1.md',
      }),
      expect.objectContaining({ key: 'word-export', status: 'pending' }),
      expect.objectContaining({ key: 'pdf-export', status: 'pending' }),
    ]));
    expect(result.preview.unavailableActions).toEqual([]);
    expect(calls.queueJob[calls.queueJob.length - 1]).toMatchObject({
      entityType: 'opportunity',
      entityId: '1',
      jobType: 'upsert',
      payload: {
        reasonCode: 'quote_dms_draft_created',
      },
    });
  });

  it('persists the selected uploaded quote template key in the DMS handoff', async () => {
    const { service, quoteHandoffs } = createWritableService(createOpportunityRows());

    const result = await service.createQuoteDmsDocumentDraft(
      'crm-opp-001',
      { templateKey: 'crm-quote-customer-a', memo: '고객 지정 양식' },
      quotePreviewCurrentUser,
    );

    expect(quoteHandoffs[0]?.templateKey).toBe('crm-quote-customer-a');
    expect(result.templateKey).toBe('crm-quote-customer-a');
    expect(result.preview.templateKey).toBe('crm-quote-customer-a');
    expect(result.preview.templateOptions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        templateKey: 'crm-quote-customer-a',
        docxOrigin: 'uploaded',
        selectable: true,
      }),
    ]));
  });

  it('records quote DMS lifecycle execution evidence on the active handoff snapshot', async () => {
    const { service, quoteHandoffs, calls } = createWritableService(createOpportunityRows());

    await service.createQuoteDmsDocumentDraft(
      'crm-opp-001',
      { memo: '견적 초안 확인 요청' },
      quotePreviewCurrentUser,
    );
    const result = await service.recordQuoteDmsDocumentExecutionEvidence(
      'crm-opp-001',
      {
        steps: [
          {
            key: 'template-review',
            evidencePath: 'dms://quotes/Q-crm-opp-001-V3/template-review.md',
            evidenceLabel: 'DMS quote template review',
          },
          {
            key: 'word-export',
            evidencePath: 'dms://quotes/Q-crm-opp-001-V3/quote.docx',
          },
          {
            key: 'pdf-export',
            evidencePath: 'dms://quotes/Q-crm-opp-001-V3/quote.pdf',
          },
        ],
        memo: 'DMS 견적 artifact evidence 수신',
      },
      quotePreviewCurrentUser,
    );

    expect(quoteHandoffs).toHaveLength(2);
    expect(quoteHandoffs[0]).toMatchObject({ statusCode: 'replaced', isActive: false });
    expect(quoteHandoffs[1]).toMatchObject({
      statusCode: 'execution-evidence-updated',
      isActive: true,
      memo: 'DMS 견적 artifact evidence 수신',
    });
    expect(result.appliedStepKeys).toEqual(['template-review', 'word-export', 'pdf-export']);
    expect(result.handoff.lifecycleSnapshot).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'template-review',
        status: 'completed',
        evidencePath: 'dms://quotes/Q-crm-opp-001-V3/template-review.md',
      }),
      expect.objectContaining({
        key: 'word-export',
        status: 'completed',
        evidencePath: 'dms://quotes/Q-crm-opp-001-V3/quote.docx',
      }),
      expect.objectContaining({
        key: 'pdf-export',
        status: 'completed',
        evidencePath: 'dms://quotes/Q-crm-opp-001-V3/quote.pdf',
      }),
    ]));
    expect(result.preview.lifecycle).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'word-export',
        status: 'completed',
        evidencePath: 'dms://quotes/Q-crm-opp-001-V3/quote.docx',
      }),
      expect.objectContaining({
        key: 'pdf-export',
        status: 'completed',
        evidencePath: 'dms://quotes/Q-crm-opp-001-V3/quote.pdf',
      }),
    ]));
    expect(calls.queueJob[calls.queueJob.length - 1]).toMatchObject({
      entityType: 'opportunity',
      entityId: '1',
      jobType: 'upsert',
      payload: {
        reasonCode: 'quote_dms_execution_evidence_template-review_word-export_pdf-export',
      },
    });
  });

  it('executes quote DMS lifecycle artifacts and records returned evidence on the active handoff', async () => {
    const dmsCalls = { dmsQuoteExecute: [] as unknown[] };
    const { service, quoteHandoffs, calls } = createWritableService(
      createOpportunityRows(),
      undefined,
      createDmsCrmQuoteLifecycleService(dmsCalls),
    );

    await service.createQuoteDmsDocumentDraft(
      'crm-opp-001',
      { memo: '견적 초안 확인 요청' },
      quotePreviewCurrentUser,
    );
    const result = await service.executeQuoteDmsDocumentLifecycle(
      'crm-opp-001',
      { memo: '견적 DMS artifact 실행' },
      quotePreviewCurrentUser,
    );

    expect(dmsCalls.dmsQuoteExecute).toHaveLength(1);
    expect(dmsCalls.dmsQuoteExecute[0]).toMatchObject({
      opportunityId: '1',
      opportunityCode: 'crm-opp-001',
      quoteNumber: 'Q-crm-opp-001-V3',
      templateKey: 'crm-quote-v1',
      draftPath: 'CRM/LS_Electric/quotes/Q-crm-opp-001-V3/Q-crm-opp-001-V3_스마트_배전반_통합_관제_고도화_quote-draft.md',
      lifecycle: expect.arrayContaining([
        expect.objectContaining({ key: 'markdown-draft', status: 'completed' }),
        expect.objectContaining({ key: 'template-review', status: 'ready' }),
      ]),
    });
    expect(quoteHandoffs).toHaveLength(2);
    expect(quoteHandoffs[1]).toMatchObject({
      statusCode: 'execution-evidence-updated',
      isActive: true,
      memo: '견적 DMS artifact 실행',
    });
    expect(result.dmsExecution).toMatchObject({
      quoteNumber: 'Q-crm-opp-001-V3',
      templateKey: 'crm-quote-v1',
      artifacts: expect.arrayContaining([
        expect.objectContaining({ kind: 'word-export', storageUri: 'local://quote.docx' }),
        expect.objectContaining({ kind: 'pdf-export', storageUri: 'local://quote.pdf' }),
      ]),
    });
    expect(result.preview.lifecycle).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'template-review',
        status: 'completed',
        evidencePath: '_generated/crm-quote-lifecycle/Q-crm-opp-001-V3/template-review.md',
      }),
      expect.objectContaining({
        key: 'word-export',
        status: 'completed',
        evidencePath: 'local://quote.docx',
      }),
      expect.objectContaining({
        key: 'pdf-export',
        status: 'completed',
        evidencePath: 'local://quote.pdf',
      }),
    ]));
    expect(calls.queueJob[calls.queueJob.length - 1]).toMatchObject({
      entityType: 'opportunity',
      entityId: '1',
      jobType: 'upsert',
      payload: {
        reasonCode: 'quote_dms_execution_evidence_template-review_word-export_pdf-export',
      },
    });
  });

  it('filters and sorts opportunities for the first CRM list surface without mutating ledger totals', async () => {
    const { service } = createService();

    const response = await service.listResponse({ search: 'LS', status: 'proposal', sort: 'margin-desc' });

    expect(response.items).toHaveLength(1);
    expect(response.items[0]?.id).toBe('crm-opp-001');
    expect(response.summary.totalCount).toBe(5);
    expect(response.summary.filteredCount).toBe(1);
    expect(response.summary.activeFilters).toEqual({ search: 'LS', status: 'proposal', sourceStatus: 'all', sort: 'margin-desc' });
  });

  it('supports source-demo status and profit sorting without changing canonical totals', async () => {
    const { service } = createService();

    const response = await service.listResponse({ sourceStatus: '진행중', sort: 'profit-desc' });

    expect(response.items.every((item) => item.status === 'proposal')).toBe(true);
    expect(response.items.map((item) => item.marginTotal)).toEqual([...response.items]
      .map((item) => item.marginTotal)
      .sort((left, right) => right - left));
    expect(response.summary.activeFilters).toEqual({
      search: '',
      status: 'all',
      sourceStatus: '진행중',
      sort: 'profit-desc',
    });
  });

  it('sorts source list by raw totals while preserving ledger ranking and values', async () => {
    const fixture = createOpportunityRows().slice(0, 2).map((row, index) => ({
      ...row, id: BigInt(index + 1), opportunityGroupCode: `raw-${index}`, opportunityCode: `raw-${index}`,
      revenueTotal: index === 0 ? 100n : 50000n, costTotal: 0n,
      lines: [{ ...row.lines[0], lineKindCode: 'revenue', categoryCode: 'product', quantity: index === 0 ? 3 : 1, unitPrice: index === 0 ? 20001n : 50000n, amount: index === 0 ? 60000n : 50000n }],
    }));
    const { service } = createService(fixture);
    for (const sort of ['revenue-desc', 'profit-desc'] as const) {
      expect((await service.listOpportunities({ view: 'source-list', sort })).map(item => item.id)).toEqual(['raw-0', 'raw-1']);
      expect((await service.listOpportunities({ sort })).map(item => item.id)).toEqual(['raw-1', 'raw-0']);
    }
    expect((await service.listOpportunities({ view: 'source-list' })).find(item => item.id === 'raw-0')?.revenueTotal).toBe(100);
  });

  it('limits source search to displayed fields and uses registration order for equal keys', async () => {
    const fixture = createOpportunityRows().slice(0, 2).map((row, index) => ({
      ...row, id: BigInt(2 - index), opportunityGroupCode: `tie-${index}`, opportunityCode: `tie-${index}`,
      customerName: '동일 고객', opportunityName: '대조', ownerName: '담당', businessType: 'hidden-only', industryLine: 'hidden-only',
    }));
    const { service } = createService(fixture);
    expect(await service.listOpportunities({ view: 'source-list', search: 'hidden-only' })).toHaveLength(0);
    expect(await service.listOpportunities({ search: 'hidden-only' })).toHaveLength(2);
    expect(await service.listOpportunities({ view: 'source-list', search: '담당 ' })).toHaveLength(0);
    expect(await service.listOpportunities({ search: '담당 ' })).toHaveLength(2);
    expect((await service.listOpportunities({ view: 'source-list', search: '담당' })).map(item => item.id)).toEqual(['tie-1', 'tie-0']);
  });

  it('exposes raw fractional version totals without overwriting canonical version amounts', async () => {
    const fixture = createOpportunityRows();
    fixture[0].lines = [{ ...fixture[0].lines[0], lineKindCode: 'revenue', categoryCode: 'product', quantity: 0.5, unitPrice: 12345n, amount: 6000n }];
    const { service } = createService(fixture);
    const result = await service.listOpportunityVersions(fixture[0].opportunityCode);
    const version = result.versions.find(item => item.id === fixture[0].opportunityCode);
    expect(version?.sourceTotals).toEqual({ revenueTotal: 6172.5, costTotal: 0, marginTotal: 6172.5, marginRate: 100 });
    expect(version?.revenueTotal).toBe(Number(fixture[0].revenueTotal));
  });

  it.each([
    [0.1, 9999, 1000, 0],
    [2.3, 100, 10, 230],
    [0.29, 100, 1, 29],
    [0.5, 123, 0, 62],
    [0.01, 19999, 100, 100],
    [1.234, 1000, 0, 1230],
  ])('calculates quantity %s × price %s with truncation %s as %s won', async (quantity, unitPrice, truncUnit, expected) => {
    const { service } = createWritableService();
    const result = await service.createOpportunity({
      ...writablePayload, specialDiscountValue: 0,
      revenueLines: [{ category: 'product', label: '절사 경계', quantity, unitPrice, truncUnit }],
      costLines: [],
    }, 77n);
    expect(result.revenueLines[0].amount).toBe(expected);
    expect(result.revenueTotal).toBe(expected);
  });

  it('normalizes rate precision before discount calculation and caps amount discounts', async () => {
    const { service } = createWritableService();
    const payload = { ...writablePayload, revenueLines: [{ category: 'product' as const, label: 'DC 경계', quantity: 1, unitPrice: 1000 }], costLines: [] };
    const rate = await service.createOpportunity({ ...payload, specialDiscountType: 'rate', specialDiscountValue: 12.345 }, 77n);
    expect(rate.specialDiscountValue).toBe(12.35);
    expect(rate.specialDiscountAmount).toBe(124);
    const amount = await service.createOpportunity({ ...payload, specialDiscountType: 'amount', specialDiscountValue: 1200 }, 77n);
    expect(amount.specialDiscountAmount).toBe(1000);
    expect(amount.revenueTotal).toBe(0);
    await expect(service.createOpportunity({ ...payload, specialDiscountType: 'rate', specialDiscountValue: 100.01 }, 77n)).rejects.toThrow('100 이하');
  });

  it('saves and reloads source optional fields and zero quantity without reviving the old amount', async () => {
    const { service } = createWritableService();
    const result = await service.createOpportunity({
      ...writablePayload,
      industryLine: '', nextAction: '',
      revenueLines: [{ category: 'product', label: '수량 초기화', quantity: 0, unitPrice: 10000, amount: 50000 }],
      costLines: [],
    }, 77n);
    expect(result.industryLine).toBe('');
    expect(result.nextAction).toBe('');
    expect(result.revenueTotal).toBe(0);
    expect((await service.getOpportunity(result.id)).revenueLines[0].amount).toBe(0);
  });

  it('creates an opportunity ledger row with calculated revenue and cost totals', async () => {
    const { service, rows, calls } = createWritableService();

    const result = await service.createOpportunity(writablePayload, 77n);

    expect(result.id).toMatch(/^crm-opp-/);
    expect(result.ownerUserId).toBe('77');
    expect(result.paymentTermCode).toBe('NET30');
    expect(result.revenueSubtotal).toBe(500000000);
    expect(result.specialDiscountType).toBe('amount');
    expect(result.specialDiscountValue).toBe(0);
    expect(result.specialDiscountAmount).toBe(0);
    expect(result.revenueTotal).toBe(500000000);
    expect(result.costTotal).toBe(280000000);
    expect(result.marginTotal).toBe(220000000);
    expect(result.revenueLines[0]).toMatchObject({
      category: 'product',
      quantity: 3,
      unitPrice: 100000000,
      amount: 300000000,
    });
    expect(result.revenueLines[1]).toMatchObject({
      category: 'service',
      department: 'DX센터',
      memberName: '구축팀',
      grade: 'Senior',
      serviceType: 'internal',
    });
    expect(rows[0]?.lines).toHaveLength(3);
    expect(calls.queueJob[0]).toMatchObject({
      sourceApp: 'crm',
      entityType: 'opportunity',
      jobType: 'upsert',
    });
  });

  it('applies payment terms and rate-based special discounts to final revenue and margin', async () => {
    const { service, rows } = createWritableService();

    const result = await service.createOpportunity({
      ...writablePayload,
      paymentTermCode: '분할납부',
      specialDiscountType: 'rate',
      specialDiscountValue: 10,
      revenueLines: [{ category: 'service', label: '할인 대상 매출', amount: 100000000 }],
      costLines: [{ category: 'internal-cost', label: '수행 원가', amount: 30000000 }],
    }, 77n);

    expect(result.paymentTermCode).toBe('분할납부');
    expect(result.revenueSubtotal).toBe(100000000);
    expect(result.specialDiscountType).toBe('rate');
    expect(result.specialDiscountValue).toBe(10);
    expect(result.specialDiscountAmount).toBe(10000000);
    expect(result.revenueTotal).toBe(90000000);
    expect(result.marginTotal).toBe(60000000);
    expect(rows[0]).toMatchObject({
      paymentTermCode: '분할납부',
      revenueSubtotal: 100000000n,
      specialDiscountTypeCode: 'rate',
      specialDiscountValue: 10,
      specialDiscountAmount: 10000000n,
      revenueTotal: 90000000n,
    });
  });

  it('preserves unspecified region through create, reload and update', async () => {
    const { service, rows } = createWritableService();
    const created = await service.createOpportunity({ ...writablePayload, region: 'unspecified' }, 77n);
    expect(created.region).toBe('unspecified');
    expect(rows[0].regionCode).toBe('unspecified');
    expect((await service.getOpportunity(created.id)).region).toBe('unspecified');
    const updated = await service.updateOpportunity(created.id, { ...writablePayload, region: 'unspecified' });
    expect(updated.region).toBe('unspecified');
  });

  it('remaps linked revenue rows from draft cost ids to persisted cost line codes', async () => {
    const { service, rows } = createWritableService();

    const result = await service.createOpportunity({
      ...writablePayload,
      revenueLines: [{
        id: 'linked-revenue-draft-cost-1',
        category: 'service',
        label: '연동 매출',
        quantity: 2,
        unitPrice: 120000000,
        marginRate: 25,
        linkedCostLineId: 'draft-cost-1',
        revenueLinked: true,
      }],
      costLines: [{
        id: 'draft-cost-1',
        category: 'internal-cost',
        label: '연동 원가',
        quantity: 2,
        unitPrice: 90000000,
        revenueLinked: true,
        revenueUnitPrice: 120000000,
      }],
    }, 77n);

    expect(result.revenueLines[0]).toMatchObject({
      id: 'revenue-001',
      linkedCostLineId: 'cost-001',
      revenueLinked: true,
      marginRate: 25,
    });
    expect(result.costLines[0]).toMatchObject({
      id: 'cost-001',
      revenueLinked: true,
      revenueUnitPrice: 120000000,
    });
    expect(rows[0]?.lines.find((line) => line.lineKindCode === 'revenue')).toMatchObject({
      linkedCostLineCode: 'cost-001',
    });
  });

  it('updates an unconfirmed latest opportunity without creating a formal new version', async () => {
    const [row] = createOpportunityRows();
    const { service, rows } = createWritableService(row ? [row] : []);

    const result = await service.updateOpportunity('crm-opp-001', {
      ...writablePayload,
      revenueLines: [{ category: 'service', label: '재산정 구축 서비스', amount: 640000000 }],
      costLines: [{ category: 'external-cost', label: '외부 전문 원가', amount: 410000000 }],
    });

    expect(result.version).toBe(3);
    expect(result.revenueLines).toMatchObject([
      { id: 'revenue-001', category: 'service', label: '재산정 구축 서비스', amount: 640000000 },
    ]);
    expect(result.costLines).toMatchObject([
      { id: 'cost-001', category: 'external-cost', label: '외부 전문 원가', amount: 410000000 },
    ]);
    expect(rows[0]?.revenueTotal).toBe(640000000n);
    expect(rows[0]?.costTotal).toBe(410000000n);
  });

  it('rejects direct updates for confirmed opportunities until they are reopened', async () => {
    const confirmed = createOpportunityRows().find((row) => row.opportunityCode === 'crm-opp-003');
    const { service } = createWritableService(confirmed ? [confirmed] : []);

    await expect(service.updateOpportunity('crm-opp-003', writablePayload)).rejects.toThrow('확정된 영업기회는 수정할 수 없습니다.');
  });

  it('rejects direct updates for previous opportunity versions', async () => {
    const rows = createOpportunityRows()
      .filter((row) => row.opportunityGroupCode === 'crm-opp-001')
      .map((row) => row.opportunityCode === 'crm-opp-001-v2' ? { ...row, confirmed: false, statusCode: 'proposal' } : row);
    const { service } = createWritableService(rows);

    await expect(service.updateOpportunity('crm-opp-001-v2', writablePayload)).rejects.toThrow('이전 차수 영업기회는 수정할 수 없습니다.');
  });

  it('deletes only the latest unconfirmed opportunity and returns the previous version', async () => {
    const rows = createOpportunityRows()
      .filter((row) => row.opportunityGroupCode === 'crm-opp-001')
      .map((row) => row.opportunityCode === 'crm-opp-001' ? { ...row, confirmed: false } : row);
    const { service, rows: writableRows, calls } = createWritableService(rows);

    const result = await service.deleteOpportunity('crm-opp-001');

    expect(result).toEqual({
      deletedOpportunityId: 'crm-opp-001',
      groupId: 'crm-opp-001',
      deletedVersion: 3,
      nextOpportunityId: 'crm-opp-001-v2',
    });
    expect(writableRows.map((row) => row.opportunityCode)).toEqual(['crm-opp-001-v2']);
    expect(calls.delete[0]).toEqual({ where: { id: 1n } });
    expect(calls.queueJob[calls.queueJob.length - 1]).toMatchObject({
      sourceApp: 'crm',
      entityType: 'opportunity',
      entityId: '1',
      jobType: 'delete',
      payload: { reasonCode: 'opportunity_deleted' },
    });
  });

  it('rejects deletion for confirmed and previous opportunity versions', async () => {
    const confirmedRows = createOpportunityRows()
      .filter((row) => row.opportunityGroupCode === 'crm-opp-001')
      .map((row) => row.opportunityCode === 'crm-opp-001' ? { ...row, confirmed: true } : row);
    const { service: confirmedService } = createWritableService(confirmedRows);

    await expect(confirmedService.deleteOpportunity('crm-opp-001')).rejects.toThrow('확정된 영업기회는 삭제할 수 없습니다.');

    const previousRows = createOpportunityRows()
      .filter((row) => row.opportunityGroupCode === 'crm-opp-001')
      .map((row) => ({ ...row, confirmed: false }));
    const { service: previousService } = createWritableService(previousRows);

    await expect(previousService.deleteOpportunity('crm-opp-001-v2')).rejects.toThrow('이전 차수 영업기회는 삭제할 수 없습니다.');
  });

  it.each(['draft', 'qualified', 'proposal', 'won'])('confirms an active opportunity without creating a new version or contract handoff, preserving %s', async (statusCode) => {
    const [row] = createOpportunityRows();
    row.statusCode = statusCode;
    const { service, rows, calls } = createWritableService(row ? [row] : []);

    const result = await service.confirmOpportunity('crm-opp-001');

    expect(result.confirmed).toBe(true);
    expect(result.status).toBe(statusCode);
    expect(calls.update[0]).not.toHaveProperty('data.statusCode');
    expect(result.version).toBe(3);
    expect(result.pmsHandoffStatus).toBe('planned');
    expect(rows[0]?.confirmed).toBe(true);
    expect(rows[0]?.statusCode).toBe(statusCode);
    expect(calls.update[0]).toMatchObject({
      where: { id: 1n },
      data: {
        confirmed: true,
        lastActivity: 'confirm',
      },
    });
    expect(calls.queueJob[calls.queueJob.length - 1]).toMatchObject({
      sourceApp: 'crm',
      entityType: 'opportunity',
      jobType: 'upsert',
      payload: {
        reasonCode: 'opportunity_confirmed',
      },
    });
  });

  it('converts a confirmed latest opportunity into a review contract and locks the opportunity', async () => {
    const [source] = createOpportunityRows();
    const row = source ? { ...source, confirmed: true, statusCode: 'won' } : null;
    const contractCalls: Array<{ payload: unknown; currentUserId?: bigint }> = [];
    const contractService = {
      createContract: async (payload: unknown, currentUserId?: bigint) => {
        contractCalls.push({ payload, currentUserId });
        return {
          id: 'crm-ct-converted',
          code: 'crm-ct-converted',
          sourceOpportunityId: '1',
          sourceOpportunityCode: 'crm-opp-001',
        };
      },
    };
    const { service, rows, calls } = createWritableService(row ? [row] : [], contractService);

    const result = await service.convertOpportunityToContract('crm-opp-001', {}, 7n);

    expect(contractCalls).toHaveLength(1);
    expect(contractCalls[0]).toMatchObject({
      currentUserId: 7n,
      payload: {
        sourceOpportunityId: '1',
        sourceOpportunityCode: 'crm-opp-001',
        customerName: 'LS Electric',
        contractName: '스마트 배전반 통합 관제 고도화',
        contractStartDate: '2026-07-01',
        contractEndDate: '2026-12-31',
      },
    });
    expect((contractCalls[0]?.payload as { revenueLines?: unknown[] }).revenueLines).toHaveLength(2);
    expect((contractCalls[0]?.payload as { costLines?: unknown[] }).costLines).toHaveLength(2);
    expect(result.contract.code).toBe('crm-ct-converted');
    expect(result.opportunity.contractCreated).toBe(true);
    expect(result.opportunity.contractCode).toBe('crm-ct-converted');
    expect(rows[0]).toMatchObject({
      contractCreated: true,
      contractCode: 'crm-ct-converted',
      lastActivity: 'convert-contract',
    });
    expect(calls.queueJob[calls.queueJob.length - 1]).toMatchObject({
      sourceApp: 'crm',
      entityType: 'opportunity',
      payload: {
        reasonCode: 'opportunity_contract_converted',
      },
    });
  });

  it('reopens a converted opportunity by revoking its linked contract in one domain operation', async () => {
    const [source] = createOpportunityRows();
    const row = source ? {
      ...source,
      confirmed: true,
      statusCode: 'won',
      contractCreated: true,
      contractCreatedAt: new Date('2026-07-06T00:00:00.000Z'),
      contractCode: 'crm-ct-converted',
    } : null;
    const revokeCalls: unknown[] = [];
    const contractService = {
      revokeConvertedContract: async (request: {
        opportunityId: bigint;
        opportunityCode: string;
        contractCode: string;
        reopenOpportunity: boolean;
        currentUserId?: bigint;
      }) => {
        revokeCalls.push(request);
        if (row) {
          Object.assign(row, {
            confirmed: false,
            statusCode: 'proposal',
            contractCreated: false,
            contractCreatedAt: null,
            contractCode: null,
          });
        }
        return { contractCode: request.contractCode, opportunityCode: request.opportunityCode };
      },
    };
    const { service, calls } = createWritableService(row ? [row] : [], contractService);

    const result = await service.reopenOpportunity('crm-opp-001', 7n);

    expect(result).toMatchObject({
      confirmed: false,
      status: 'proposal',
      contractCreated: false,
      contractCode: undefined,
    });
    expect(revokeCalls).toEqual([{
      opportunityId: 1n,
      opportunityCode: 'crm-opp-001',
      contractCode: 'crm-ct-converted',
      reopenOpportunity: true,
      currentUserId: 7n,
    }]);
    expect(calls.queueJob[calls.queueJob.length - 1]).toMatchObject({
      payload: { reasonCode: 'opportunity_reopened_with_contract_revocation' },
    });
  });

  it('revokes a converted contract while keeping the latest opportunity confirmed and is retry-safe', async () => {
    const [source] = createOpportunityRows();
    const row = source ? {
      ...source,
      confirmed: true,
      statusCode: 'won',
      contractCreated: true,
      contractCreatedAt: new Date('2026-07-06T00:00:00.000Z'),
      contractCode: 'crm-ct-converted',
    } : null;
    const revokeCalls: unknown[] = [];
    const contractService = {
      revokeConvertedContract: async (request: {
        opportunityId: bigint;
        opportunityCode: string;
        contractCode: string;
        reopenOpportunity: boolean;
        currentUserId?: bigint;
      }) => {
        revokeCalls.push(request);
        if (row) {
          Object.assign(row, {
            confirmed: true,
            statusCode: 'won',
            contractCreated: false,
            contractCreatedAt: null,
            contractCode: null,
          });
        }
        return { contractCode: request.contractCode, opportunityCode: request.opportunityCode };
      },
    };
    const { service, calls } = createWritableService(row ? [row] : [], contractService);

    const result = await service.revokeOpportunityContract('crm-opp-001', 7n);
    const retried = await service.revokeOpportunityContract('crm-opp-001', 7n);

    expect(result).toMatchObject({ confirmed: true, status: 'won', contractCreated: false });
    expect(retried).toMatchObject({ confirmed: true, status: 'won', contractCreated: false });
    expect(revokeCalls).toEqual([{
      opportunityId: 1n,
      opportunityCode: 'crm-opp-001',
      contractCode: 'crm-ct-converted',
      reopenOpportunity: false,
      currentUserId: 7n,
    }]);
    expect(calls.queueJob[calls.queueJob.length - 1]).toMatchObject({
      payload: { reasonCode: 'opportunity_contract_revoked' },
    });
  });

  it('continues to reject version addition while a linked contract exists', async () => {
    const [source] = createOpportunityRows();
    const row = source ? {
      ...source,
      confirmed: true,
      statusCode: 'won',
      contractCreated: true,
      contractCreatedAt: new Date('2026-07-06T00:00:00.000Z'),
      contractCode: 'crm-ct-converted',
    } : null;
    const { service } = createWritableService(row ? [row] : []);

    await expect(service.addOpportunityVersion('crm-opp-001'))
      .rejects.toThrow('계약으로 전환된 영업기회는 차수를 추가할 수 없습니다.');
  });

  it.each(['draft', 'qualified', 'proposal', 'won'])('reopens a confirmed opportunity back to proposal editing from %s without changing amount lines', async (statusCode) => {
    const confirmed = createOpportunityRows().find((row) => row.opportunityCode === 'crm-opp-003');
    if (confirmed) confirmed.statusCode = statusCode;
    const { service, rows, calls } = createWritableService(confirmed ? [confirmed] : []);

    const result = await service.reopenOpportunity('crm-opp-003');

    expect(result.confirmed).toBe(false);
    expect(result.status).toBe('proposal');
    expect(result.version).toBe(4);
    expect(rows[0]?.confirmed).toBe(false);
    expect(rows[0]?.statusCode).toBe('proposal');
    expect(calls.update[0]).toMatchObject({
      where: { id: 3n },
      data: {
        confirmed: false,
        statusCode: 'proposal',
        lastActivity: 'reopen',
      },
    });
    expect(calls.queueJob[calls.queueJob.length - 1]).toMatchObject({
      sourceApp: 'crm',
      entityType: 'opportunity',
      jobType: 'upsert',
      payload: {
        reasonCode: 'opportunity_reopened',
      },
    });
  });

  it('lists all versions in an opportunity group in version order', async () => {
    const rows = createOpportunityRows().filter((row) => row.opportunityGroupCode === 'crm-opp-001');
    const { service } = createWritableService(rows);

    const result = await service.listOpportunityVersions('crm-opp-001');

    expect(result.groupId).toBe('crm-opp-001');
    expect(result.versions.map((version) => version.id)).toEqual(['crm-opp-001-v2', 'crm-opp-001']);
    expect(result.versions.map((version) => version.version)).toEqual([2, 3]);
    expect(result.versions[0]?.isLatest).toBe(false);
    expect(result.versions[1]?.isLatest).toBe(true);
  });

  it('lists opportunity history from the CRM history ledger in reverse sequence order', async () => {
    const [row] = createOpportunityRows();
    const { service, calls } = createService(row ? [row] : []);

    const result = await service.listOpportunityHistory('crm-opp-001');

    expect(result.opportunityId).toBe('crm-opp-001');
    expect(result.groupId).toBe('crm-opp-001');
    expect(result.items.map((item) => item.historySeq)).toEqual(['2', '1']);
    expect(result.items[0]).toMatchObject({
      eventType: 'update',
      eventBy: '101',
      activity: 'update',
      status: 'proposal',
      revenueSubtotal: 840000000,
      specialDiscountAmount: 20000000,
      revenueTotal: 820000000,
      costTotal: 592000000,
      marginTotal: 228000000,
    });
    expect(calls.historyFindMany[0]).toMatchObject({
      where: { opportunityId: 1n },
    });
  });

  it('adds a draft version from the confirmed latest opportunity without contract handoff', async () => {
    const confirmed = createOpportunityRows().find((row) => row.opportunityCode === 'crm-opp-003');
    const { service, rows, calls } = createWritableService(confirmed ? [confirmed] : []);

    const result = await service.addOpportunityVersion('crm-opp-003');

    expect(result.id).toBe('crm-opp-003-v5');
    expect(result.groupId).toBe('crm-opp-003');
    expect(result.version).toBe(5);
    expect(result.versionCount).toBe(2);
    expect(result.confirmed).toBe(false);
    expect(result.status).toBe('won');
    expect(result.pmsHandoffStatus).toBe('planned');
    expect(rows[0]).toMatchObject({
      opportunityCode: 'crm-opp-003-v5',
      opportunityGroupCode: 'crm-opp-003',
      ownerUserId: 77n,
      versionNo: 5,
      confirmed: false,
      statusCode: 'won',
    });
    expect(calls.queueJob[calls.queueJob.length - 1]).toMatchObject({
      sourceApp: 'crm',
      entityType: 'opportunity',
      jobType: 'upsert',
      payload: {
        reasonCode: 'opportunity_version_added',
      },
    });
  });

  it('rejects version addition for unconfirmed opportunities', async () => {
    const [row] = createOpportunityRows();
    const { service } = createWritableService(row ? [row] : []);

    await expect(service.addOpportunityVersion('crm-opp-001')).rejects.toThrow('확정된 영업기회만 차수를 추가할 수 있습니다.');
  });

  it('rejects confirmation for held opportunities until the sales status is active again', async () => {
    const held = createOpportunityRows().find((row) => row.statusCode === 'hold');
    const { service } = createWritableService(held ? [held] : []);

    await expect(service.confirmOpportunity('crm-opp-005')).rejects.toThrow('실주 또는 보류 영업기회는 확정할 수 없습니다.');
  });

  it('rejects reopen for unconfirmed opportunities', async () => {
    const [row] = createOpportunityRows();
    const { service } = createWritableService(row ? [row] : []);

    await expect(service.reopenOpportunity('crm-opp-001')).rejects.toThrow('미확정 영업기회는 확정 해제할 수 없습니다.');
  });
});
