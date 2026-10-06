import type { CrmOperationsPreviewResponse } from '@ssoo/types/crm';

const currentYear = new Date().getFullYear();

export const operationsPreviewFallback: CrmOperationsPreviewResponse = {
  generatedAt: new Date(0).toISOString(),
  summary: {
    selectedYear: currentYear,
    codeGroupCount: 0,
    codeOptionCount: 0,
    businessYearCount: 0,
    adminBoundaryCount: 0,
    crmOwnedCount: 0,
    sharedOwnedCount: 0,
    dmsOwnedCount: 0,
    boundaryNotice: '사업연도와 업무 설정은 CRM에서 관리하고, 계정·공통코드는 Admin/Auth, 문서 저장은 DMS에서 관리합니다.',
    unavailableActions: [
      'CRM 내부 계정 생성/비밀번호 초기화',
      'CRM 내부 역할/권한 편집',
      'CRM 내부 법인/조직 마스터 편집',
      'CRM 코드 마스터 확정 저장',
      'DMS CI 파일 직접 저장',
    ],
  },
  sellerProfile: {
    profile: {
      id: '',
      profileCode: 'default',
      companyName: '공급자 회사 정보 미설정',
      ciStatus: 'not-configured',
      updatedAt: new Date(0).toISOString(),
    },
    sellerInfoStatus: 'not-configured',
    readiness: 'planned',
    missingFields: ['ceoName', 'businessRegistrationNo', 'address'],
    owner: 'crm',
    boundaryNote: '견적/계약서 표시용 공급자 값은 CRM 설정이 소유하고, CI 파일과 문서 템플릿은 DMS가 소유합니다.',
  },
  codeGroups: [],
  businessYears: [],
  adminBoundaries: [],
};
