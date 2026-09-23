import type { CommonSearchResult, CommonSearchSourceApp } from '@ssoo/types/common';

export const SEARCH_RESULT_SOURCE_LABELS: Record<CommonSearchSourceApp, string> = {
  admin: '관리자', crm: '영업관리', pms: '프로젝트관리', dms: '문서관리', sns: '협업',
};

const CUSTOMER_TYPES: Record<string, string> = {
  prospect: '잠재', active: '거래중', partner: '파트너', inactive: '비활성',
};
const OPPORTUNITY_STATUSES: Record<string, string> = {
  draft: '초안', qualified: '검증', proposal: '제안', won: '수주', lost: '실주', hold: '보류',
};
const PRIORITIES: Record<string, string> = {
  high: '우선순위 높음', medium: '우선순위 보통', low: '우선순위 낮음',
};
const USER_ROLES: Record<string, string> = {
  admin: '관리자', manager: '매니저', user: '사용자', viewer: '뷰어',
};
const PROJECT_STATUSES: Record<string, string> = {
  request: '요청/인계', proposal: '제안 참조', execution: '수행', transition: '종료/전환',
};
const PROJECT_STAGES: Record<string, string> = {
  waiting: '대기', in_progress: '진행중', done: '완료',
};
const POST_VISIBILITIES: Record<string, string> = {
  public: '전체 공개', organization: '내 조직', followers: '팔로워', self: '나만 보기',
};

// Resolve only known codes in their domain. Never reinterpret free-form text or unknown codes.
function label(labels: Record<string, string>, value: string): string {
  return Object.hasOwn(labels, value) ? labels[value] : value;
}

export function getSearchResultBadgeLabel(result: CommonSearchResult, value: string): string {
  if (result.sourceApp === 'crm' && result.entityType === 'customer') {
    return label(CUSTOMER_TYPES, value).replace(/^(\d+) activities$/, '활동 $1건');
  }
  if (result.sourceApp === 'crm' && result.entityType === 'opportunity') {
    return label(PRIORITIES, label(OPPORTUNITY_STATUSES, value));
  }
  if (result.sourceApp === 'admin' && result.entityType === 'user') return label(USER_ROLES, value);
  if (result.sourceApp === 'pms' && result.entityType === 'project') return label(PROJECT_STATUSES, value);
  if (result.sourceApp === 'sns' && result.entityType === 'post') return label(POST_VISIBILITIES, value);
  return value;
}

export function getSearchResultSummary(result: CommonSearchResult): string {
  const summary = result.summary ?? result.snippets?.[0] ?? result.matchReason ?? '표시할 요약이 없습니다.';
  // Snippets and authored post/document/project summaries remain verbatim.
  if (result.summary == null) return summary;
  const metadata = result.metadata ?? {};
  if (result.sourceApp === 'pms' && result.entityType === 'project') {
    return summary === `${metadata.statusCode} · ${metadata.stageCode}`
      ? `${label(PROJECT_STATUSES, metadata.statusCode)} · ${label(PROJECT_STAGES, metadata.stageCode)}`
      : summary;
  }
  const code = result.sourceApp === 'crm' && result.entityType === 'customer'
    ? metadata.customerType
    : result.sourceApp === 'crm' && result.entityType === 'opportunity'
      ? metadata.status
      : result.sourceApp === 'admin' && result.entityType === 'user'
        ? result.badges?.[0]?.label
        : undefined;
  if (!code || !summary.endsWith(` · ${code}`)) return summary;
  return summary.slice(0, -code.length) + getSearchResultBadgeLabel(result, code);
}

export function getSearchResultMetadata(result: CommonSearchResult): Array<[string, string]> {
  const metadata = result.metadata ?? {};
  let entries: Array<[string, string | undefined]>;
  if (result.sourceApp === 'crm' && result.entityType === 'customer') {
    entries = [['고객 코드', metadata.customerCode], ['담당자', metadata.ownerName ?? result.ownerLabel]];
  } else if (result.sourceApp === 'crm' && result.entityType === 'opportunity') {
    entries = [['고객', metadata.customerName], ['담당자', result.ownerLabel]];
  } else if (result.sourceApp === 'pms' && result.entityType === 'project') {
    entries = [
      ['상태', metadata.statusCode ? label(PROJECT_STATUSES, metadata.statusCode) : undefined],
      ['진행 단계', metadata.stageCode ? label(PROJECT_STAGES, metadata.stageCode) : undefined],
    ];
  } else if (result.sourceApp === 'dms' && result.entityType === 'document') {
    entries = [['문서 위치', metadata.path]];
  } else {
    // Preserve the existing fallback for result kinds outside this approval.
    entries = Object.entries(metadata).filter(([, value]) => value.trim().length > 0).slice(0, 3);
  }
  return entries.filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()));
}
