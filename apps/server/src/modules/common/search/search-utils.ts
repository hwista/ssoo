import type { CommonSearchEntityType, CommonSearchSourceApp } from '@ssoo/types/common';

export const COMMON_SEARCH_SOURCE_APPS: CommonSearchSourceApp[] = ['admin', 'crm', 'pms', 'dms', 'sns'];

export const COMMON_SEARCH_SOURCE_LABELS: Record<CommonSearchSourceApp, string> = {
  admin: 'ADMIN',
  crm: 'CRM',
  pms: 'PMS',
  dms: 'DMS',
  sns: 'SNS',
};

export const COMMON_SEARCH_ENTITY_LABELS: Record<CommonSearchEntityType, string> = {
  document: '문서',
  person: '사람',
  post: '게시물',
  project: '프로젝트',
  customer: '고객',
  opportunity: '영업기회',
  user: '사용자',
  setting: '설정',
  menu: '메뉴',
  unknown: '결과',
};

export function includesCommonSearchQuery(value: string | null | undefined, query: string): boolean {
  return Boolean(value?.toLowerCase().includes(query.toLowerCase()));
}

export function scoreCommonSearchValues(query: string, values: Array<string | null | undefined>): number {
  const normalizedQuery = query.toLowerCase();
  return values.reduce((score, value) => {
    const normalizedValue = value?.toLowerCase().trim();
    if (!normalizedValue) return score;
    if (normalizedValue === normalizedQuery) return score + 100;
    if (normalizedValue.startsWith(normalizedQuery)) return score + 60;
    if (normalizedValue.includes(normalizedQuery)) return score + 30;
    return score;
  }, 0);
}

export function toCommonSearchIsoString(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}
