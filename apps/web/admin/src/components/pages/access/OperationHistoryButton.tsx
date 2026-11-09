'use client';

import { resolveCommonSearchResultHref } from '@ssoo/web-auth';
import { programPath } from './program-context';
import { useState } from 'react';
import type { CommonOperationEvent, CommonOperationHistoryFilter } from '@ssoo/types/common';
import { Button, Input, NativeSelect, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';
import { SsooErrorNotice, SsooDataWorkspacePage, SsooDataWorkspaceToolbar, SsooDataGrid, type SsooDataGridColumnDef, type SsooDataWorkspaceAction } from '@ssoo/web-shell';
import { useOperationHistory, useOperationHistoryDetail } from '@/hooks/queries/useOperationHistory';
import { useUserList } from '@/hooks/queries/useUsers';
import { useOrganizationList } from '@/hooks/queries/useOrganizations';
import { useTabStore } from '@/stores/tab.store';
import { getAdminTabOptions, getAdminBreadcrumb } from '@/components/layout/navigation';
import { ROLE_LABELS, SERVICE_LABELS } from './RequestHistory';

const fieldLabels: Record<string, string> = {
  user_name: '이름', display_name: '표시 이름', role_code: '역할', is_active: '활성 여부', memo: '변경 사유', login_id: '로그인 ID', account_status_code: '계정 상태', login_fail_count: '로그인 실패 횟수', locked_until: '잠금 종료', user_id: '사용자', issued_app: '발급 앱', expires_at: '만료', revoked_at: '회수 시각', revoke_reason: '회수 사유', org_code: '조직 코드', org_name: '조직명', org_type: '조직 유형', org_class: '조직 구분', parent_org_id: '상위 조직', org_id: '조직', is_primary: '주 소속', is_leader: '조직장', position_code: '직위', effective_from: '적용 시작', effective_to: '적용 종료', status_code: '상태', source_code: '등록 경로', service_code: '서비스', scope_key: '적용 범위', role_name: '역할명', role_scope_code: '역할 범위', permission_code: '권한 코드', permission_name: '권한명', role_id: '역할 ID', permission_id: '권한 ID', exception_axis: '예외 기준', effect_type: '허용·차단', target_org_id: '대상 조직', target_object_type: '대상 유형', target_object_id: '대상 ID', reason: '사유', authority_kind: '위임 유형', max_role_code: '최대 승인 역할', kind: '신청 유형', resolved_org_id: '처리 조직', message: '신청 사유', decision_message: '처리 사유', decided_by: '처리자', decided_at: '처리 시각', code_group: '코드 그룹', code_value: '코드 값', display_name_ko: '한글명', display_name_en: '영문명', parent_code: '상위 코드', sort_order: '정렬 순서', description: '설명', password_login_enabled: '비밀번호 로그인', password_reset_enabled: '비밀번호 복구', password_change_enabled: '비밀번호 변경', reset_code_ttl_minutes: '복구 코드 유효 분', reset_code_length: '복구 코드 길이', internal_sso_enabled: '내부 SSO', microsoft_login_enabled: 'Microsoft 로그인', microsoft_signup_request_enabled: 'Microsoft 가입 신청', self_signup_enabled: '직접 가입', email_delivery_mode: '메일 전달 방식', allowed_tenant_ids: '허용 테넌트', allowed_email_domains: '허용 이메일 도메인', provider_code: '인증 제공자', decided_by_user_id: '처리자', decision_memo: '처리 사유', created_user_id: '생성 사용자', consumed_at: '사용 완료 시각', fail_count: '실패 횟수', template_code: '메일 유형', reference_type: '연결 대상 유형', reference_id: '연결 대상 ID', sent_at: '전달 시각', failed_at: '실패 시각', fail_reason: '실패 사유',
};
const programPaths: Record<string, string> = { membership: '/memberships', 'service-grant': '/service-grants', 'auth-account': '/accounts', session: '/accounts', email: '/email-operations', registration: '/approvals?view=registration' };
const eventLabels: Record<string, string> = { C: '생성', I: '생성', U: '변경', D: '삭제' };
const resultLabels: Record<string, string> = { deleted: '삭제됨', active: '활성', inactive: '비활성', pending: '대기', approved: '승인', rejected: '반려', cancelled: '취소', suspended: '중지', locked: '잠금', revoked: '회수', consumed: '사용 완료', sent: '전달 완료', failed: '실패', C: '생성', I: '생성', U: '변경', D: '삭제' };
const date = (value: string) => new Date(value).toLocaleString('ko-KR');

export function OperationHistoryPanel({ initialFilter, onNavigate, standalone = false, viewActions = [] }: { initialFilter: CommonOperationHistoryFilter; onNavigate: () => void; standalone?: boolean; viewActions?: SsooDataWorkspaceAction[] }) {
  const [filter, setFilter] = useState<CommonOperationHistoryFilter>({ scope: initialFilter.category ? 'all' : 'business', ...initialFilter, page: 1, pageSize: 30 });
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<CommonOperationEvent | null>(null);
  const [changedOnly, setChangedOnly] = useState(true);
  const history = useOperationHistory(filter);
  const detail = useOperationHistoryDetail(selected);
  const users = useUserList({ page: 1, limit: 100 }, true);
  const organizations = useOrganizationList(true);
  const openTab = useTabStore(state => state.openTab);
  const change = (key: keyof CommonOperationHistoryFilter, value: string) => {
    setSelected(null);
    setFilter(current => {
      const next = { ...current, [key]: value || undefined, page: 1, asOf: undefined };
      if (key === 'category' && value) next.scope = 'all';
      if (key === 'scope' && value === 'business') next.category = undefined;
      return next;
    });
  };
  const userName = (id: string | null) => users.data?.data.find(user => user.id === id)?.userName ?? id ?? '기록 없음';
  const value = (key: string, raw: string | null | undefined) => {
    if (raw == null) return '—';
    if (raw === 'true') return '예';
    if (raw === 'false') return '아니요';
    if (/(?:_at|_until)$|^effective_(?:from|to)$/.test(key)) return date(raw);
    if (key === 'service_code') return SERVICE_LABELS[raw as keyof typeof SERVICE_LABELS] ?? raw;
    if (key === 'role_code' || key === 'max_role_code') return raw === 'admin' ? '플랫폼 관리자' : ROLE_LABELS[raw as keyof typeof ROLE_LABELS] ?? raw;
    if (key === 'scope_key') return raw === 'global' ? '플랫폼 전체' : `${organizations.data?.data?.find(org => org.orgId === raw)?.orgName ?? '조직'} (${raw})`;
    if (key === 'effect_type') return raw === 'grant' ? '허용' : raw === 'revoke' ? '차단' : raw;
    if (key === 'authority_kind') return raw === 'service' ? '서비스 이용 승인' : raw === 'organization' ? '조직 승인' : raw;
    if (['user_id', 'decided_by', 'decided_by_user_id', 'created_user_id'].includes(key)) return `${userName(raw)} (${raw})`;
    if (['org_id', 'target_org_id', 'parent_org_id', 'resolved_org_id'].includes(key)) return `${organizations.data?.data?.find(org => org.orgId === raw)?.orgName ?? '조직'} (${raw})`;
    return resultLabels[raw] ?? raw;
  };
  const columns: SsooDataGridColumnDef<CommonOperationEvent>[] = [
    { id: 'time', header: '시각', size: 170, cell: ({ row: { original: event } }) => date(event.eventAt) },
    { id: 'subject', header: '변경 대상', size: 200, cell: ({ row: { original: event } }) => <span className="break-words">{event.categoryLabel}<span className="block text-xs text-muted-foreground">{event.details.user_name || event.details.org_name || event.details.role_name || event.details.display_name_ko || (event.details.user_id ? userName(event.details.user_id) : ['user', 'auth-account'].includes(event.category) ? userName(event.subjectId) : `#${event.subjectId}`)}</span></span> },
    { id: 'result', header: '처리·결과', size: 110, cell: ({ row: { original: event } }) => event.result === event.eventType ? (eventLabels[event.eventType] ?? event.eventType) : `${eventLabels[event.eventType] ?? event.eventType} · ${resultLabels[event.result] ?? event.result}` },
    { id: 'operator', header: '처리자', size: 160, cell: ({ row: { original: event } }) => userName(event.operatorUserId) },
    { id: 'reason', header: '사유', size: 140, cell: ({ row: { original: event } }) => event.details.memo || event.details.reason || event.details.decision_message || event.details.revoke_reason || '—' },
    { id: 'actions', header: '작업', size: 100, cell: ({ row: { original: event } }) => <Button variant="outline" size="sm" onClick={() => setSelected(event)}>변경 상세</Button> },
  ];
  const filters = <div className="w-full space-y-3">
    {!initialFilter.category && <label className="flex items-center gap-3 text-sm"><span>기록 범위</span><NativeSelect aria-label="이력 기록 범위" value={filter.scope ?? 'all'} onChange={event => change('scope', event.target.value)}><option value="business">업무 변경</option><option value="all">전체 기록 (세션·자동 갱신 포함)</option></NativeSelect></label>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <label className="space-y-1 text-sm"><span>이력 분류</span><NativeSelect value={filter.category ?? ''} disabled={!!initialFilter.category} onChange={event => change('category', event.target.value)}><option value="">전체 분류</option>{history.data?.categories.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}</NativeSelect></label>
      <label className="space-y-1 text-sm"><span>대상 사용자</span><NativeSelect value={filter.userId ?? ''} disabled={!!initialFilter.userId || users.isError} onChange={event => change('userId', event.target.value)}><option value="">전체 사용자</option>{users.data?.data.map(user => <option key={user.id} value={user.id}>{user.userName} · {user.loginId}</option>)}</NativeSelect></label>
      <label className="space-y-1 text-sm"><span>대상 조직</span><NativeSelect value={filter.organizationId ?? ''} disabled={!!initialFilter.organizationId || organizations.isError} onChange={event => change('organizationId', event.target.value)}><option value="">전체 조직</option>{organizations.data?.data?.map(org => <option key={org.orgId} value={org.orgId}>{org.orgName} · {org.orgCode}</option>)}</NativeSelect></label>
      <label className="space-y-1 text-sm"><span>처리 운영자</span><NativeSelect value={filter.operatorUserId ?? ''} disabled={users.isError} onChange={event => change('operatorUserId', event.target.value)}><option value="">전체 운영자</option>{users.data?.data.map(user => <option key={user.id} value={user.id}>{user.userName} · {user.loginId}</option>)}</NativeSelect></label>
      <label className="space-y-1 text-sm"><span>처리 결과</span><NativeSelect value={filter.result ?? ''} onChange={event => change('result', event.target.value)}><option value="">전체 결과</option>{Object.entries(resultLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</NativeSelect></label>
    </div>
    <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); setSelected(null); setFilter(current => ({ ...current, from: from ? new Date(from).toISOString() : undefined, to: to ? new Date(to).toISOString() : undefined, page: 1, asOf: undefined })); }}>
      <label className="space-y-1 text-sm"><span>조회 시작</span><Input type="datetime-local" value={from} onChange={event => setFrom(event.target.value)} /></label><label className="space-y-1 text-sm"><span>조회 종료 (미포함)</span><Input type="datetime-local" value={to} onChange={event => setTo(event.target.value)} /></label>
      <Button type="submit" variant="outline" disabled={history.isFetching}>기간 적용</Button><Button type="button" variant="outline" disabled={history.isFetching} onClick={() => { setSelected(null); if (!filter.asOf && filter.page === 1) void history.refetch(); else setFilter(current => ({ ...current, asOf: undefined, page: 1 })); }}>이력 새로고침</Button>
    </form>
  </div>;
  const information = <div className="space-y-2">
    {Object.values(initialFilter).some(Boolean) ? <div className="flex flex-wrap items-center gap-2 text-sm"><span>대상 조건: {initialFilter.roleId ? `역할 #${initialFilter.roleId}` : ''} {initialFilter.userId ? `사용자 ${userName(initialFilter.userId)}` : ''} {initialFilter.organizationId ? `조직 ${organizations.data?.data?.find(org => org.orgId === initialFilter.organizationId)?.orgName ?? initialFilter.organizationId}` : ''} {history.data?.categories.find(item => item.id === initialFilter.category)?.label ?? initialFilter.category ?? ''} {initialFilter.subjectId ? `#${initialFilter.subjectId}` : ''}</span><Button variant="outline" size="sm" onClick={() => openTab(getAdminTabOptions('/operation-history'))}>대상 조건 해제</Button></div> : null}
    {history.data ? <p className="text-xs text-muted-foreground">조회 기준 {date(history.data.snapshotAt)} · 이후 기록은 이력 새로고침으로 확인합니다.</p> : null}
    {users.isError || organizations.isError ? <SsooErrorNotice message="대상 이름을 불러오지 못했습니다. 이력의 식별자는 그대로 표시됩니다." actions={[{ label: '대상 다시 조회', onClick: () => Promise.all([users.refetch(), organizations.refetch()]) }]} /> : null}
  </div>;
  const crmCode = selected?.category === 'code' && ['payment_term', 'biz_type', 'group_type'].includes(selected.details.code_group ?? '');
  const openRelatedProgram = () => {
    if (!selected) return;
    if (crmCode) {
      const href = resolveCommonSearchResultHref({ sourceApp: 'crm', target: { sourceApp: 'crm', path: programPath('/operations/settings?view=codes', { codeGroup: selected.details.code_group }) } });
      if (href) window.location.assign(href);
      return;
    }
    const path = getAdminTabOptions(programPaths[selected.category] ?? selected.programPath).path;
    const pathname = path.split('?')[0];
    const userId = selected.details.user_id ?? (['user', 'auth-account'].includes(selected.category) ? selected.subjectId : undefined);
    const organizationId = selected.details.org_id ?? selected.details.target_org_id ?? (selected.category === 'organization' ? selected.subjectId : undefined) ?? (selected.category === 'service-grant' && /^\d+$/.test(selected.details.scope_key ?? '') ? selected.details.scope_key : undefined);
    const user = users.data?.data.find(item => item.id === userId);
    const target = programPath(path, {
      ...(['/users', '/memberships', '/service-grants', '/user-permissions', '/accounts', '/access-diagnosis'].includes(pathname) ? { userId } : {}),
      ...(['/organizations', '/memberships', '/service-grants', '/organization-permissions', '/approval-authorities'].includes(pathname) ? { organizationId } : {}),
      ...(['/users', '/accounts'].includes(pathname) && user ? { search: user.loginId } : {}),
      ...(pathname === '/roles' ? { roleId: selected.details.role_id ?? (selected.category === 'role' ? selected.subjectId : undefined) } : {}),
      ...(pathname === '/codes' ? { codeGroup: selected.details.code_group } : {}),
      ...(pathname === '/service-grants' ? { serviceCode: selected.details.service_code } : {}),
    });
    if (openTab(getAdminTabOptions(target))) onNavigate();
  };
  const detailContent = selected ? <section className="space-y-3 border-t pt-4" aria-label="선택한 이력 상세"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{selected.categoryLabel} #{selected.subjectId} · {date(selected.eventAt)}</h3><Button variant="outline" onClick={openRelatedProgram}>{crmCode ? 'CRM 업무 코드 관리' : getAdminTabOptions(programPaths[selected.category] ?? selected.programPath).title} ↗</Button></div>
      <p className="break-all text-xs text-muted-foreground">처리: {selected.activity ?? '기록 없음'} · 출처: {selected.source ?? '기록 없음'} · 연결 번호: {selected.transactionId ?? '기록 없음'}</p>
      {detail.error ? <SsooErrorNotice error={detail.error} actions={[{ label: '상세 다시 조회', onClick: () => detail.refetch() }]} /> : detail.isPending ? <p role="status">변경 내용을 불러오고 있습니다…</p> : detail.data ? <>
        <p className="text-sm">{detail.data.previous ? '직전 기록과 비교합니다. 변경된 항목은 ‘변경’으로 표시됩니다.' : '이전 기록이 없는 최초 이력입니다.'}</p>
        <Button variant="outline" size="sm" aria-pressed={changedOnly} onClick={() => setChangedOnly(value => !value)}>{changedOnly ? '전체 항목 보기' : '변경 항목만 보기'}</Button>
        <div className="overflow-x-auto"><Table className="min-w-[560px]"><TableHeader><TableRow><TableHead>항목</TableHead><TableHead>이전 값</TableHead><TableHead>현재 값</TableHead></TableRow></TableHeader><TableBody>{Object.keys(detail.data.current.details).filter(key => !changedOnly || !detail.data?.previous || detail.data.changedFields.includes(key)).map(key => <TableRow key={key}><TableCell>{fieldLabels[key] ?? key}{detail.data!.changedFields.includes(key) ? <span className="ml-2 text-xs font-semibold">변경</span> : null}</TableCell><TableCell className="max-w-80 whitespace-pre-wrap break-words">{value(key, detail.data!.previous?.details[key])}</TableCell><TableCell className="max-w-80 whitespace-pre-wrap break-words">{value(key, detail.data!.current.details[key])}</TableCell></TableRow>)}</TableBody></Table></div>
      </> : null}
    </section> : null;
  const table = { columns, data: history.data?.items ?? [], fitViewport: true, mobileSummaryColumns: ['time', 'subject', 'result', 'actions'], loading: history.isPending, error: history.error,
    onRetry: () => { void history.refetch(); }, enableSorting: false, emptyState: '조건에 해당하는 공통 운영 이력이 없습니다.',
    pagination: { page: filter.page ?? 1, pageSize: 30, total: history.data?.total ?? 0, disabled: history.isFetching,
      onPageChange: (page: number) => { setSelected(null); setFilter(current => ({ ...current, page, asOf: history.data?.snapshotAt })); } },
    secondGrid: selected ? { enabled: true, isOpen: true, onOpenChange: (open: boolean) => { if (!open) setSelected(null); }, content: <div className="p-4">{detailContent}</div> } : undefined,
  };
  const toolbar = { filterSummary: [filter.category ? history.data?.categories.find(item => item.id === filter.category)?.label : filter.scope === 'business' ? '업무 변경' : '전체 기록', filter.userId ? `사용자: ${userName(filter.userId)}` : '', filter.from || filter.to ? '기간 지정' : '전체 기간'].filter(Boolean).join(' · '), actions: viewActions, filterSlot: filters };
  return standalone ? <SsooDataWorkspacePage compact title="공통 변경 이력" description="기간·대상·처리자별 변경 사유와 전후 값을 확인하고 원본 관리 화면으로 이동합니다." breadcrumbItems={getAdminBreadcrumb('/operation-history')} toolbar={toolbar} statusSlot={information} table={table} />
    : <section className="min-w-0 space-y-4" aria-label="공통 운영 이력 조회"><SsooDataWorkspaceToolbar {...toolbar} />{information}<div className="h-[min(60dvh,560px)]"><SsooDataGrid {...table} /></div></section>;

}

export function OperationHistoryButton({ filter = {}, label = '변경 이력', onNavigate }: { filter?: CommonOperationHistoryFilter; label?: string; onNavigate?: () => void }) {
  const openTab = useTabStore(state => state.openTab);
  return <Button variant="outline" onClick={() => {
    const target = programPath('/operation-history', { category: filter.category, subjectId: filter.subjectId, userId: filter.userId, organizationId: filter.organizationId, roleId: filter.roleId });
    if (openTab(getAdminTabOptions(target))) onNavigate?.();
  }}>{label}</Button>;
}
