import type { CrmOpportunity } from '@ssoo/types/crm';

const calculate = (revenueTotal: number, costTotal: number) => {
  const marginTotal = revenueTotal - costTotal;
  const marginRate = revenueTotal > 0 ? Math.round((marginTotal / revenueTotal) * 1000) / 10 : 0;
  return { marginTotal, marginRate };
};

export const CRM_OPPORTUNITIES: CrmOpportunity[] = [
  {
    id: 'crm-opp-001',
    customerName: 'LS Electric',
    opportunityName: '스마트 배전반 통합 관제 고도화',
    ownerName: '김민준',
    businessType: 'SI 구축',
    industryLine: '전력/제조',
    region: 'domestic',
    status: 'proposal',
    priority: 'high',
    version: 3,
    confirmed: false,
    expectedStartDate: '2026-07-01',
    expectedEndDate: '2026-12-31',
    revenueTotal: 840000000,
    costTotal: 592000000,
    ...calculate(840000000, 592000000),
    revenueLines: [
      { id: 'rev-001-1', category: 'product', label: '관제 플랫폼 라이선스', amount: 390000000 },
      { id: 'rev-001-2', category: 'service', label: '구축/연동 서비스', amount: 450000000 },
    ],
    costLines: [
      { id: 'cost-001-1', category: 'internal-cost', label: '내부 수행 원가', amount: 348000000 },
      { id: 'cost-001-2', category: 'external-cost', label: '외부 연동/장비 원가', amount: 244000000 },
    ],
    pmsHandoffStatus: 'planned',
    dmsLinkStatus: 'planned',
    adminBoundary: 'shared-admin',
    nextAction: '제안 금액 검토 후 계약 후보 전환 여부 결정',
    updatedAt: '2026-06-08T09:20:00.000Z',
  },
  {
    id: 'crm-opp-002', customerName: 'LS Cable & System', opportunityName: '해외 공장 품질 데이터 허브', ownerName: '박서연', businessType: '데이터 플랫폼', industryLine: '제조/품질', region: 'overseas', status: 'qualified', priority: 'high', version: 2, confirmed: false, expectedStartDate: '2026-08-15', expectedEndDate: '2027-02-28', revenueTotal: 1260000000, costTotal: 884000000, ...calculate(1260000000, 884000000), revenueLines: [{ id: 'rev-002-1', category: 'service', label: '데이터 수집/정제/대시보드', amount: 1260000000 }], costLines: [{ id: 'cost-002-1', category: 'internal-cost', label: '전담 개발/PM 원가', amount: 702000000 }, { id: 'cost-002-2', category: 'external-cost', label: '현지 인프라/통역/검증', amount: 182000000 }], pmsHandoffStatus: 'planned', dmsLinkStatus: 'planned', adminBoundary: 'shared-admin', nextAction: '해외 법인 범위와 수금조건 확정', updatedAt: '2026-06-08T08:45:00.000Z'
  },
  {
    id: 'crm-opp-003', customerName: 'LS MnM', opportunityName: '설비 예방정비 모바일 업무화', ownerName: '이현우', businessType: '업무 시스템', industryLine: '설비/정비', region: 'domestic', status: 'won', priority: 'medium', version: 4, confirmed: true, expectedStartDate: '2026-07-15', expectedEndDate: '2026-11-30', revenueTotal: 520000000, costTotal: 361000000, ...calculate(520000000, 361000000), revenueLines: [{ id: 'rev-003-1', category: 'service', label: '모바일 업무 구축', amount: 520000000 }], costLines: [{ id: 'cost-003-1', category: 'internal-cost', label: '수행 인력 원가', amount: 298000000 }, { id: 'cost-003-2', category: 'external-cost', label: '모바일 단말 검증', amount: 63000000 }], pmsHandoffStatus: 'planned', dmsLinkStatus: 'planned', adminBoundary: 'shared-admin', nextAction: '계약 원장 확정 후 PMS 읽기용 인계 패킷 준비', updatedAt: '2026-06-07T15:10:00.000Z'
  },
  {
    id: 'crm-opp-004', customerName: 'LS Materials', opportunityName: '영업/생산 수요 예측 PoC', ownerName: '정다은', businessType: 'AI/분석', industryLine: '소재/생산', region: 'domestic', status: 'draft', priority: 'medium', version: 1, confirmed: false, expectedStartDate: '2026-09-01', expectedEndDate: '2026-10-31', revenueTotal: 180000000, costTotal: 129000000, ...calculate(180000000, 129000000), revenueLines: [{ id: 'rev-004-1', category: 'service', label: 'PoC 분석/모델링', amount: 180000000 }], costLines: [{ id: 'cost-004-1', category: 'internal-cost', label: '분석/검증 원가', amount: 129000000 }], pmsHandoffStatus: 'planned', dmsLinkStatus: 'planned', adminBoundary: 'shared-admin', nextAction: '성과 기준과 확장 옵션 정리', updatedAt: '2026-06-06T11:00:00.000Z'
  },
  {
    id: 'crm-opp-005', customerName: 'LS ITC', opportunityName: '그룹 공통 문서/계약 템플릿 체계', ownerName: '최윤서', businessType: '공통 플랫폼', industryLine: '그룹 공통', region: 'domestic', status: 'hold', priority: 'low', version: 1, confirmed: false, expectedStartDate: '2026-10-01', expectedEndDate: '2027-01-31', revenueTotal: 310000000, costTotal: 245000000, ...calculate(310000000, 245000000), revenueLines: [{ id: 'rev-005-1', category: 'service', label: '템플릿/검토 흐름 설계', amount: 310000000 }], costLines: [{ id: 'cost-005-1', category: 'internal-cost', label: '업무 설계/구축 원가', amount: 245000000 }], pmsHandoffStatus: 'planned', dmsLinkStatus: 'planned', adminBoundary: 'shared-admin', nextAction: 'DMS 템플릿 소유권과 충돌 여부 확인', updatedAt: '2026-06-05T16:30:00.000Z'
  },
];
