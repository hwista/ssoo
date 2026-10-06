import { Injectable } from '@nestjs/common';
import type { CrmDataQualityCheck, CrmDataQualityReport } from '@ssoo/types/crm';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmAccessService } from '../access/access.service.js';
import { DatabaseService } from '../../../database/database.service.js';

const MAX_DRILLDOWN_IDS = 100;

@Injectable()
export class CrmDataQualityService {
  constructor(private readonly db: DatabaseService, private readonly access?: CrmAccessService) {}

  async getReport(currentUser?: TokenPayload): Promise<CrmDataQualityReport> {
    const scope = currentUser ? await this.access!.businessOrganizationScope(currentUser) : null;
    const scopedWhere = { isActive: true, ...(scope === null ? {} : { ownerOrganizationId: { in: scope } }) };
    const [opportunities, contracts] = await Promise.all([
      this.db.client.crmOpportunity.findMany({
        where: scopedWhere,
        select: { opportunityCode: true, opportunityGroupCode: true, versionNo: true },
      }),
      this.db.client.crmContract.findMany({
        where: scopedWhere,
        select: {
          contractCode: true,
          confirmed: true,
          wbsCode: true,
          revenueTotal: true,
          lastSource: true,
          billingPlans: { where: { isActive: true }, select: { revenueAmount: true } },
        },
      }),
    ]);
    const [quoteHandoffs, contractHandoffs] = await Promise.all([
      this.db.client.crmQuoteDmsHandoff.findMany({
        where: { isActive: true, ...(scope === null ? {} : { opportunityCode: { in: opportunities.map(row => row.opportunityCode) } }) },
        select: { opportunityCode: true },
      }),
      this.db.client.crmContractDmsHandoff.findMany({
        where: { isActive: true, ...(scope === null ? {} : { contractCode: { in: contracts.map(row => row.contractCode) } }) },
        select: { contractCode: true },
      }),
    ]);

    const checks = [
      this.checkOpportunityLatest(opportunities),
      this.checkConfirmedContractWbs(contracts),
      this.checkBillingTotals(contracts),
      this.checkSingleActiveHandoff('quote-dms-active-handoff', '견적 DMS active handoff', quoteHandoffs.map((row) => row.opportunityCode), '/'),
      this.checkSingleActiveHandoff('contract-dms-active-handoff', '계약 DMS active handoff', contractHandoffs.map((row) => row.contractCode), '/contracts'),
    ];
    const violationCount = checks.reduce((sum, check) => sum + check.violationCount, 0);
    const findingCount = checks.reduce((sum, check) => sum + check.findingCount, 0);
    const acceptedExceptionCount = checks.reduce((sum, check) => sum + check.acceptedExceptionCount, 0);
    return {
      status: violationCount > 0 ? 'blocked' : findingCount > 0 ? 'degraded' : 'ready',
      checkedAt: new Date().toISOString(),
      violationCount,
      findingCount,
      acceptedExceptionCount,
      checks,
    };
  }

  private checkOpportunityLatest(rows: Array<{
    opportunityCode: string;
    opportunityGroupCode: string;
    versionNo: number;
  }>): CrmDataQualityCheck {
    const groups = new Map<string, typeof rows>();
    rows.forEach((row) => groups.set(row.opportunityGroupCode, [...(groups.get(row.opportunityGroupCode) ?? []), row]));
    const violations = [...groups.entries()]
      .filter(([, versions]) => versions
        .map((row) => row.versionNo)
        .sort((left, right) => left - right)
        .some((version, index) => version !== index + 1))
      .map(([groupCode]) => groupCode);
    return this.result(
      'opportunity-latest-version',
      '영업기회 latest 차수 불변식',
      violations,
      '그룹별 차수는 1부터 중복·누락 없이 이어져야 하며 최대 차수를 latest로 계산할 수 있어야 합니다.',
      '/',
    );
  }

  private checkConfirmedContractWbs(rows: Array<{ contractCode: string; confirmed: boolean; wbsCode: string | null }>): CrmDataQualityCheck {
    const violations = rows
      .filter((row) => row.confirmed && !row.wbsCode?.trim())
      .map((row) => row.contractCode);
    return this.result('confirmed-contract-wbs', '확정 계약 WBS', violations, '확정 계약에는 WBS가 필요합니다.', '/contracts');
  }

  private checkBillingTotals(rows: Array<{
    contractCode: string;
    revenueTotal: bigint;
    lastSource: string | null;
    billingPlans: Array<{ revenueAmount: bigint }>;
  }>): CrmDataQualityCheck {
    const findings = rows.filter((row) => row.billingPlans.length > 0
      && row.billingPlans.reduce((sum, plan) => sum + plan.revenueAmount, 0n) !== row.revenueTotal);
    const accepted = findings.filter((row) => row.lastSource === 'SOURCE-DEMO').map((row) => row.contractCode);
    const violations = findings.filter((row) => row.lastSource !== 'SOURCE-DEMO').map((row) => row.contractCode);
    if (accepted.length === 0) {
      return this.result('contract-billing-total', '계약·청구계획 합계', violations, '청구계획 매출 합계는 계약 매출 합계와 일치해야 합니다.', '/contracts');
    }
    return {
      key: 'contract-billing-total',
      label: '계약·청구계획 합계',
      status: violations.length > 0 ? 'blocked' : 'degraded',
      violationCount: violations.length,
      findingCount: violations.length + accepted.length,
      acceptedExceptionCount: accepted.length,
      entityIds: [...violations, ...accepted].slice(0, MAX_DRILLDOWN_IDS),
      reason: violations.length > 0
        ? `운영 계약 불일치 ${violations.length}건과 원천 데모 보존 차이 ${accepted.length}건이 있습니다.`
        : `원천 데모의 계약금액·청구합계 차이 ${accepted.length}건을 100% 이식 기준에 따라 보존했습니다. 운영 원장 위반은 없습니다.`,
      targetSurface: '/contracts',
    };
  }

  private checkSingleActiveHandoff(
    key: 'quote-dms-active-handoff' | 'contract-dms-active-handoff',
    label: string,
    entityIds: string[],
    targetSurface: string,
  ): CrmDataQualityCheck {
    const counts = new Map<string, number>();
    entityIds.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
    const violations = [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
    return this.result(key, label, violations, '동일 업무 개체의 active handoff는 최대 1건이어야 합니다.', targetSurface);
  }

  private result(
    key: CrmDataQualityCheck['key'],
    label: string,
    violations: string[],
    invariant: string,
    targetSurface: string,
  ): CrmDataQualityCheck {
    return {
      key,
      label,
      status: violations.length > 0 ? 'blocked' : 'ready',
      violationCount: violations.length,
      findingCount: violations.length,
      acceptedExceptionCount: 0,
      entityIds: violations.slice(0, MAX_DRILLDOWN_IDS),
      reason: violations.length > 0 ? `${invariant} 위반 ${violations.length}건` : `${invariant} 위반이 없습니다.`,
      targetSurface,
    };
  }
}
