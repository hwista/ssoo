import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { Injectable } from '@nestjs/common';
import type {
  CrmContract,
  CrmOperationsAdminBoundaryItem,
  CrmOperationsBusinessYear,
  CrmOperationsCodeGroup,
  CrmOperationsCodeGroupKey,
  CrmOperationsCodeOption,
  CrmOperationsPreviewOwner,
  CrmOperationsPreviewQuery,
  CrmOperationsPreviewReadiness,
  CrmOperationsPreviewResponse,
  CrmOperationsPreviewSummary,
  CrmOperationsSellerProfileStatus,
  CrmOpportunity,
  CrmQuoteSellerProfile,
} from '@ssoo/types/crm';
import { ContractService } from '../contract/contract.service.js';
import { OpportunityService } from '../opportunity/opportunity.service.js';
import { QuoteSettingsService } from '../quote-settings/quote-settings.service.js';

const CRM_OPERATIONS_BOUNDARY_NOTICE = '사업연도와 업무 설정은 CRM에서 관리하고, 계정·공통코드는 Admin/Auth, 문서 저장은 DMS에서 관리합니다.';
const CRM_OPERATIONS_UNAVAILABLE_ACTIONS = [
  'CRM 내부 계정 생성/비밀번호 초기화',
  'CRM 내부 역할/권한 편집',
  'CRM 내부 법인/조직 마스터 편집',
  'CRM 코드 마스터 확정 저장',
  'DMS CI 파일 직접 저장',
];

interface NormalizedOperationsPreviewQuery extends Required<CrmOperationsPreviewQuery> {}

@Injectable()
export class OperationsService {
  constructor(
    private readonly opportunityService: OpportunityService,
    private readonly contractService: ContractService,
    private readonly quoteSettingsService: QuoteSettingsService,
  ) {}

  async getPreview(query: CrmOperationsPreviewQuery = {}, currentUser?: TokenPayload): Promise<CrmOperationsPreviewResponse> {
    const normalized = this.normalizeQuery(query);
    const [opportunityResponse, contractResponse, sellerProfile] = await Promise.all([
      this.opportunityService.listResponse({ sort: 'updated-desc' }, currentUser),
      this.contractService.listResponse({ sort: 'updated-desc' }, currentUser),
      this.quoteSettingsService.getSellerProfile(),
    ]);
    const opportunities = opportunityResponse.items;
    const contracts = contractResponse.items;
    const codeGroups = this.buildCodeGroups(opportunities, contracts);
    const businessYears = this.buildBusinessYears(opportunities, contracts, normalized.year);
    const adminBoundaries = this.buildAdminBoundaries();
    const sellerStatus = this.buildSellerProfileStatus(sellerProfile);

    return {
      generatedAt: new Date().toISOString(),
      summary: this.buildSummary(normalized.year, codeGroups, businessYears, adminBoundaries),
      sellerProfile: sellerStatus,
      codeGroups,
      businessYears,
      adminBoundaries,
    };
  }

  private buildCodeGroups(opportunities: CrmOpportunity[], contracts: CrmContract[]): CrmOperationsCodeGroup[] {
    return [
      this.toCodeGroup({
        key: 'business-type',
        label: '사업구분',
        owner: 'crm',
        readiness: 'partial',
        options: this.countOptions([
          ...opportunities.map((item) => item.businessType),
          ...contracts.map((item) => item.businessType),
        ]),
        boundaryNote: '현재는 CRM 원장 값에서 후보를 수집합니다. 공용 코드 마스터 확정 저장은 후속입니다.',
      }),
      this.toCodeGroup({
        key: 'industry-line',
        label: '계열/산업',
        owner: 'crm',
        readiness: 'partial',
        options: this.countOptions([
          ...opportunities.map((item) => item.industryLine),
          ...contracts.map((item) => item.industryLine),
        ]),
        boundaryNote: '원천 데모 계열구분은 CRM 원장 후보로 시작하고 공용 코드 정책 확정 후 마스터화합니다.',
      }),
      this.toCodeGroup({
        key: 'payment-term',
        label: '수금조건',
        owner: 'crm',
        readiness: 'partial',
        options: this.countOptions([
          ...opportunities.map((item) => item.paymentTermCode ?? ''),
          ...contracts.map((item) => item.paymentTermCode ?? ''),
        ]),
        boundaryNote: '계약/견적 표시값에 쓰는 수금조건 후보입니다. 회계 연동 코드는 후속입니다.',
      }),
      this.toCodeGroup({
        key: 'region',
        label: '국내/해외',
        owner: 'crm',
        readiness: 'ready',
        options: [
          this.toFixedOption('domestic', '국내', opportunities, contracts),
          this.toFixedOption('overseas', '해외', opportunities, contracts),
          this.toFixedOption('unspecified', '미선택', opportunities, contracts),
        ],
        boundaryNote: '국내/해외와 미선택을 구분하는 CRM 원장 고정 코드입니다.',
      }),
      this.toCodeGroup({
        key: 'opportunity-status',
        label: '영업상태',
        owner: 'crm',
        readiness: 'ready',
        options: [
          { code: 'draft', label: '초안', usageCount: opportunities.filter((item) => item.status === 'draft').length, source: 'fixed' },
          { code: 'qualified', label: '검증', usageCount: opportunities.filter((item) => item.status === 'qualified').length, source: 'fixed' },
          { code: 'proposal', label: '제안', usageCount: opportunities.filter((item) => item.status === 'proposal').length, source: 'fixed' },
          { code: 'won', label: '수주', usageCount: opportunities.filter((item) => item.status === 'won').length, source: 'fixed' },
          { code: 'lost', label: '실주', usageCount: opportunities.filter((item) => item.status === 'lost').length, source: 'fixed' },
          { code: 'hold', label: '보류', usageCount: opportunities.filter((item) => item.status === 'hold').length, source: 'fixed' },
        ],
        boundaryNote: '영업상태는 CRM workflow 상태로 관리합니다.',
      }),
      this.toCodeGroup({
        key: 'contract-status',
        label: '계약상태',
        owner: 'crm',
        readiness: 'ready',
        options: [
          { code: 'review', label: '검토', usageCount: contracts.filter((item) => item.status === 'review').length, source: 'fixed' },
          { code: 'active', label: '진행', usageCount: contracts.filter((item) => item.status === 'active').length, source: 'fixed' },
          { code: 'completed', label: '완료', usageCount: contracts.filter((item) => item.status === 'completed').length, source: 'fixed' },
          { code: 'terminated', label: '해지', usageCount: contracts.filter((item) => item.status === 'terminated').length, source: 'fixed' },
        ],
        boundaryNote: '계약상태는 CRM 계약 원장 workflow 상태로 관리합니다.',
      }),
    ];
  }

  private buildBusinessYears(
    opportunities: CrmOpportunity[],
    contracts: CrmContract[],
    selectedYear: number,
  ): CrmOperationsBusinessYear[] {
    const years = new Map<number, CrmOperationsBusinessYear>();
    const ensure = (year: number) => {
      const existing = years.get(year);
      if (existing) {
        return existing;
      }
      const next: CrmOperationsBusinessYear = {
        year,
        opportunityCount: 0,
        contractCount: 0,
        billingPlanCount: 0,
        selected: year === selectedYear,
        owner: 'crm',
        readiness: 'partial',
      };
      years.set(year, next);
      return next;
    };

    ensure(selectedYear);
    opportunities.forEach((item) => {
      const year = this.toYear(item.expectedStartDate);
      if (year) {
        ensure(year).opportunityCount += 1;
      }
    });
    contracts.forEach((item) => {
      const year = this.toYear(item.contractStartDate);
      if (year) {
        ensure(year).contractCount += 1;
      }
      item.billingPlan.forEach((line) => {
        const billingYear = this.toBillingYear(line.billingYm);
        if (billingYear) {
          ensure(billingYear).billingPlanCount += 1;
        }
      });
    });

    return [...years.values()].sort((left, right) => left.year - right.year);
  }

  private buildAdminBoundaries(): CrmOperationsAdminBoundaryItem[] {
    return [
      {
        key: 'account-management',
        label: '계정 관리',
        owner: 'shared-admin',
        readiness: 'external',
        crmActionAvailable: false,
        targetSurface: '공용 Admin 사용자 관리',
        boundaryNote: '사용자 등록, 편집, 비활성화는 CRM 내부가 아니라 공용 Admin에서 관리합니다.',
      },
      {
        key: 'password-reset',
        label: '비밀번호 초기화',
        owner: 'shared-auth',
        readiness: 'external',
        crmActionAvailable: false,
        targetSurface: '공용 Auth/사용자 보안',
        boundaryNote: '비밀번호 초기화와 인증 정책은 CRM 업무 화면에 복제하지 않습니다.',
      },
      {
        key: 'profile-edit',
        label: '프로필 편집',
        owner: 'shared-auth',
        readiness: 'external',
        crmActionAvailable: false,
        targetSurface: '공용 사용자 프로필',
        boundaryNote: '견적 담당 연락처는 공용 사용자 프로필을 참조합니다.',
      },
      {
        key: 'role-permission',
        label: '역할/권한',
        owner: 'shared-admin',
        readiness: 'external',
        crmActionAvailable: false,
        targetSurface: '공용 Admin 권한 관리',
        boundaryNote: 'CRM access guard는 공용 permission seed와 capability snapshot을 사용합니다.',
      },
      {
        key: 'organization-company',
        label: '법인/조직',
        owner: 'shared-admin',
        readiness: 'planned',
        crmActionAvailable: false,
        targetSurface: '공용 Admin 조직/법인 관리',
        boundaryNote: 'CRM은 조직/법인 마스터를 직접 만들지 않고 공용 모델을 참조합니다.',
      },
      {
        key: 'ci-file-storage',
        label: 'CI 파일/문서 템플릿',
        owner: 'dms',
        readiness: 'planned',
        crmActionAvailable: false,
        targetSurface: 'DMS 템플릿/첨부/검토',
        boundaryNote: 'CRM 견적 설정은 표시값만 저장하고 CI 파일과 템플릿 버전은 DMS가 소유합니다.',
      },
    ];
  }

  private buildSellerProfileStatus(profile: CrmQuoteSellerProfile): CrmOperationsSellerProfileStatus {
    const sellerInfoStatus = this.quoteSettingsService.toSellerInfoStatus(profile);
    const requiredFields: Array<[string, string | undefined]> = [
      ['ceoName', profile.ceoName],
      ['businessRegistrationNo', profile.businessRegistrationNo],
      ['address', profile.address],
    ];
    const missingFields = requiredFields
      .filter(([, value]) => !String(value ?? '').trim())
      .map(([key]) => key);

    return {
      profile,
      sellerInfoStatus,
      readiness: sellerInfoStatus === 'configured' && missingFields.length === 0 ? 'ready' : sellerInfoStatus === 'not-configured' ? 'planned' : 'partial',
      missingFields,
      owner: 'crm',
      boundaryNote: '견적/계약서 표시용 공급자 값은 CRM 설정이 소유하고, CI 파일과 문서 템플릿은 DMS가 소유합니다.',
    };
  }

  private buildSummary(
    selectedYear: number,
    codeGroups: CrmOperationsCodeGroup[],
    businessYears: CrmOperationsBusinessYear[],
    adminBoundaries: CrmOperationsAdminBoundaryItem[],
  ): CrmOperationsPreviewSummary {
    const owners = [
      ...codeGroups.map((item) => item.owner),
      ...businessYears.map((item) => item.owner),
      ...adminBoundaries.map((item) => item.owner),
    ];
    return {
      selectedYear,
      codeGroupCount: codeGroups.length,
      codeOptionCount: codeGroups.reduce((sum, item) => sum + item.options.length, 0),
      businessYearCount: businessYears.length,
      adminBoundaryCount: adminBoundaries.length,
      crmOwnedCount: owners.filter((owner) => owner === 'crm').length,
      sharedOwnedCount: owners.filter((owner) => owner === 'shared-admin' || owner === 'shared-auth').length,
      dmsOwnedCount: owners.filter((owner) => owner === 'dms').length,
      boundaryNotice: CRM_OPERATIONS_BOUNDARY_NOTICE,
      unavailableActions: CRM_OPERATIONS_UNAVAILABLE_ACTIONS,
    };
  }

  private toCodeGroup(params: {
    key: CrmOperationsCodeGroupKey;
    label: string;
    owner: CrmOperationsPreviewOwner;
    readiness: CrmOperationsPreviewReadiness;
    options: CrmOperationsCodeOption[];
    boundaryNote: string;
  }): CrmOperationsCodeGroup {
    return {
      ...params,
      unavailableActions: params.readiness === 'ready' ? [] : ['코드 마스터 저장', '코드 삭제', '일괄 import'],
    };
  }

  private countOptions(values: string[]): CrmOperationsCodeOption[] {
    const counts = new Map<string, number>();
    values
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
    return [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right, 'ko-KR'))
      .map(([code, usageCount]) => ({
        code,
        label: code,
        usageCount,
        source: 'ledger',
      }));
  }

  private toFixedOption(
    code: 'domestic' | 'overseas' | 'unspecified',
    label: string,
    opportunities: CrmOpportunity[],
    contracts: CrmContract[],
  ): CrmOperationsCodeOption {
    return {
      code,
      label,
      usageCount: opportunities.filter((item) => item.region === code).length
        + contracts.filter((item) => item.region === code).length,
      source: 'fixed',
    };
  }

  private normalizeQuery(query: CrmOperationsPreviewQuery): NormalizedOperationsPreviewQuery {
    const rawYear = Number(query.year ?? new Date().getFullYear());
    const year = Number.isFinite(rawYear) && rawYear >= 2000 ? Math.trunc(rawYear) : new Date().getFullYear();
    return { year };
  }

  private toYear(value: string): number | null {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.getFullYear();
  }

  private toBillingYear(value: string): number | null {
    const [yearText] = value.split('/');
    const year = Number(yearText);
    return Number.isFinite(year) && year >= 2000 ? Math.trunc(year) : null;
  }
}
