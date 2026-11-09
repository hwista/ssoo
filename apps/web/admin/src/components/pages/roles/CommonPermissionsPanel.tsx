'use client';
import { ProgramContext } from '../access/ProgramContext';
import { periodIssue, programPath } from '../access/program-context';
import { useTabStore } from '@/stores/tab.store';
import { getAdminTabOptions } from '@/components/layout/navigation';
import { getAdminBreadcrumb } from '@/components/layout/navigation';

import { OperationHistoryButton } from '../access/OperationHistoryButton';
import { useState, type FormEvent } from 'react';
import { SsooErrorNotice, SsooDataWorkspaceToolbar, SsooDataGrid, type SsooDataGridColumnDef, SsooDataWorkspacePage, type SsooDataWorkspaceAction } from '@ssoo/web-shell';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, NativeSelect, Textarea } from '@ssoo/web-ui';
import type { CommonPermissionTarget, ManagedCommonPermission } from '@ssoo/types/common';
import { useCommonPermissions, useChangeCommonPermission } from '@/hooks/queries/useCommonPermissions';
import { usePermissionCatalog } from '@/hooks/queries/useAccessOps';
import { useUserList } from '@/hooks/queries/useUsers';
import { useOrganizationList } from '@/hooks/queries/useOrganizations';
import { toIsoInput, toLocalInput } from '../access/ParticipationTargets';

type Editor = { mode: 'create' | 'update' | 'revoke'; row?: ManagedCommonPermission };
const formatDate = (value: string | null) => value ? new Date(value).toLocaleString('ko-KR') : '제한 없음';

export function CommonPermissionsPanel({ kind, fixedTargetId, onNavigate, showHeading = true, standalone = false, viewActions = [] }: { kind: CommonPermissionTarget; fixedTargetId?: string; onNavigate?: () => void; showHeading?: boolean; standalone?: boolean; viewActions?: SsooDataWorkspaceAction[] }) {
  const openTab = useTabStore(state => state.openTab);
  const title = kind === 'organization' ? '조직 공통 권한' : '사용자 공통 권한 예외';
  const [targetFilter, setTargetFilter] = useState(fixedTargetId ?? '');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const users = useUserList({ page: 1, limit: 100 }, true);
  const organizations = useOrganizationList(true);
  const catalog = usePermissionCatalog();
  const query = useCommonPermissions(kind, { targetId: targetFilter || undefined, page, status });
  const mutation = useChangeCommonPermission(kind);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [targetId, setTargetId] = useState('');
  const [permissionCode, setPermissionCode] = useState('');
  const [effect, setEffect] = useState<'grant' | 'revoke'>('grant');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const dateIssue = editor && editor.mode !== 'revoke' ? periodIssue(kind === 'organization' ? from : '', to, true) : null;
  const targets = kind === 'organization' ? (organizations.data?.data ?? []).filter(item => item.orgClass === 'permanent').map(item => ({ id: item.orgId, name: `${item.orgName} · ${item.orgCode}`, active: item.isActive }))
    : (users.data?.data ?? []).map(item => ({ id: item.id, name: `${item.userName} · ${item.loginId}`, active: item.isActive }));
  const permissions = (catalog.data?.groups ?? []).filter(group => group.owner === 'admin-platform').flatMap(group => group.items).filter(item => item.permissionCode !== 'system.override');
  const targetError = kind === 'organization' ? organizations.error : users.error;

  const open = (value: Editor) => {
    mutation.reset(); setNotice(''); setEditor(value); setTargetId(value.row?.targetId ?? targetFilter);
    setPermissionCode(value.row?.permissionCode ?? ''); setEffect(value.row?.effect ?? 'grant');
    setFrom(toLocalInput(value.row?.effectiveFrom ?? null)); setTo(toLocalInput(value.row?.effectiveTo ?? null)); setReason('');
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editor || !reason.trim() || dateIssue) return;
    try {
      if (editor.mode === 'revoke' && editor.row) await mutation.mutateAsync({ mode: 'revoke', id: editor.row.id, value: { reason: reason.trim(), expectedUpdatedAt: editor.row.updatedAt } });
      else {
        const value = { targetId, permissionCode, effect, effectiveFrom: kind === 'organization' ? toIsoInput(from) : null, effectiveTo: toIsoInput(to), reason: reason.trim() };
        if (editor.row) await mutation.mutateAsync({ mode: 'update', id: editor.row.id, value: { ...value, expectedUpdatedAt: editor.row.updatedAt } });
        else await mutation.mutateAsync({ mode: 'create', value });
      }
      setNotice(`${title} ${editor.mode === 'revoke' ? '회수' : '저장'} 처리가 완료되었습니다.`); setEditor(null);
    } catch { /* Keep the entered values and the server's actionable error in the dialog. */ }
  };
  const options = targets.map(item => <option key={item.id} value={item.id}>{item.name}{!item.active ? ' (중지)' : ''}</option>);

  const columns: SsooDataGridColumnDef<ManagedCommonPermission>[] = [
    { accessorKey: 'targetName', header: '대상', size: 170 },
    { id: 'permission', header: '권한', size: 210, cell: ({ row: { original: row } }) => <>{row.permissionName}<span className="sr-only">{row.permissionCode}</span></> },
    { id: 'effect', header: '효과', size: 80, cell: ({ row: { original: row } }) => row.effect === 'grant' ? '허용' : '차단' },
    { id: 'period', header: '기간', size: 190, cell: ({ row: { original: row } }) => <>{formatDate(row.effectiveFrom)}<br />~ {formatDate(row.effectiveTo)}</> },
    { id: 'status', header: '기록 상태', size: 200, cell: ({ row: { original: row } }) => <>{row.effective ? '적용 기간 내' : row.inactiveReason}<p className="break-words text-xs text-muted-foreground">{row.reason}</p></> },
    { id: 'actions', header: '작업', size: 230, cell: ({ row: { original: row } }) => <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => open({ mode: 'update', row })}>{row.isActive ? '변경' : '재부여'}</Button>{row.isActive ? <Button variant="outline" size="sm" onClick={() => open({ mode: 'revoke', row })}>회수</Button> : null}<OperationHistoryButton filter={{ category: kind === 'organization' ? 'organization-permission' : 'user-exception', subjectId: row.id }} onNavigate={onNavigate} /></div> },
  ];
  const description = kind === 'organization'
    ? '해당 조직의 유효 구성원에게 직접 적용합니다. 상위·하위 조직으로 상속하지 않습니다.'
    : '공통 기능 권한의 허용·차단 예외입니다. 동일 권한의 차단은 허용보다 우선합니다.';
  const toolbar = { filterSummary: `${targets.find(item => item.id === targetFilter)?.name ?? '전체 대상'} · ${status === 'all' ? '전체 기록' : status === 'active' ? '미회수 기록' : '회수 기록'}`, actions: [
    ...viewActions,
    ...(kind === 'user' && targetFilter ? [{ label: '대상 사용자 진단', variant: 'outline' as const, onClick: () => openTab(getAdminTabOptions(programPath('/access-diagnosis', { userId: targetFilter }))) }] : []),
    { label: '새로고침', variant: 'outline' as const, onClick: () => { void query.refetch(); }, disabled: query.isFetching },
    { label: '권한 추가', onClick: () => open({ mode: 'create' }) },
  ], filterSlot: (
    <div className="flex w-full flex-wrap gap-3"><label className="min-w-0 flex-1 space-y-1 text-sm"><span>{kind === 'organization' ? '조직' : '사용자'} 필터</span><NativeSelect value={targetFilter} disabled={!!fixedTargetId} onChange={event => { setTargetFilter(event.target.value); setPage(1); }}><option value="">전체 대상</option>{targetFilter && !targets.some(item => item.id === targetFilter) ? <option value={targetFilter}>선택한 {kind === 'organization' ? '조직' : '사용자'}</option> : null}{options}</NativeSelect></label>
      <label className="space-y-1 text-sm"><span>기록 상태</span><NativeSelect value={status} onChange={event => { setStatus(event.target.value as typeof status); setPage(1); }}><option value="all">전체 기록</option><option value="active">미회수 기록</option><option value="inactive">회수 기록</option></NativeSelect></label></div>
  ) };
  const table = { columns, data: query.data?.items ?? [], fitViewport: true, mobileSummaryColumns: ['targetName', 'permission', 'effect', 'period', 'status', 'actions'], enableSorting: false, loading: query.isLoading, error: query.error,
    onRetry: () => { void query.refetch(); }, emptyState: '조회 조건에 해당하는 공통 권한 기록이 없습니다.',
    pagination: { page, pageSize: query.data?.pageSize ?? 20, total: query.data?.total ?? 0, onPageChange: setPage, disabled: query.isFetching } };
  const feedback = <>
    {fixedTargetId && <ProgramContext context={kind === 'organization' ? { organizationId: fixedTargetId } : { userId: fixedTargetId }} basePath={kind === 'organization' ? '/organization-permissions' : '/user-permissions'} />}

    {targetError || catalog.error ? <SsooErrorNotice message="대상 또는 권한 목록을 불러오지 못했습니다." actions={[{ label: '다시 시도', intent: 'retry', onClick: () => Promise.all([kind === 'organization' ? organizations.refetch() : users.refetch(), catalog.refetch()]) }]} /> : null}
    {notice ? <p role="status" className="text-sm text-ssoo-success">{notice}</p> : null}
  </>;
  return <>
    {standalone ? <SsooDataWorkspacePage compact title={kind === 'organization' ? '조직 공통 권한' : '사용자 권한 예외'} description={`${description} 앱 전용 권한과 플랫폼 관리자 전체 권한은 여기서 편집하지 않습니다. 실제 접근 여부는 유효 권한 진단에서 확인합니다.`}
      breadcrumbItems={getAdminBreadcrumb(kind === 'organization' ? '/organization-permissions' : '/user-permissions')} toolbar={toolbar} statusSlot={feedback} table={table} />
      : <section aria-label={title} className="space-y-4">
        {showHeading ? <h2 className="text-base font-semibold">{title}</h2> : null}
    <p className="text-sm text-muted-foreground">{kind === 'organization' ? '해당 조직의 유효 구성원에게 직접 적용합니다. 상위·하위 조직으로 상속하지 않습니다.' : '공통 기능 권한에 대한 허용·차단 예외입니다. 동일 권한에 차단 예외가 있으면 허용보다 우선합니다.'}</p>
    <p className="text-xs text-muted-foreground">앱 전용 권한과 플랫폼 관리자 전체 권한은 여기서 편집하지 않습니다. 실제 접근 여부는 권한 조회에서 확인합니다.</p>
        <SsooDataWorkspaceToolbar {...toolbar} />{feedback}
        <div className="h-[min(60dvh,560px)]"><SsooDataGrid {...table} /></div>
      </section>}
    <Dialog open={!!editor} onOpenChange={value => { if (!value && !mutation.isPending) setEditor(null); }}><DialogContent><DialogHeader><DialogTitle>{title} {editor?.mode === 'revoke' ? '회수' : '편집'}</DialogTitle><DialogDescription>{kind === 'organization' ? '선택한 조직의 유효 구성원에게 직접 적용하며 상위·하위 조직으로 상속하지 않습니다.' : editor?.mode === 'revoke' ? '차단 예외를 회수하면 다른 경로의 허용 권한이 다시 적용될 수 있습니다.' : '같은 기능에 허용과 차단이 겹치면 차단이 우선합니다.'}</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        {editor?.mode !== 'revoke' ? <><label className="block space-y-1 text-sm"><span>대상</span><NativeSelect required value={targetId} disabled={!!fixedTargetId || !!editor?.row || mutation.isPending} onChange={event => setTargetId(event.target.value)}><option value="">대상 선택</option>{editor?.row && !targets.some(item => item.id === targetId) ? <option value={targetId}>{editor.row.targetName}</option> : null}{options}</NativeSelect></label>
          <label className="block space-y-1 text-sm"><span>공통 권한</span><NativeSelect required value={permissionCode} disabled={!!editor?.row || mutation.isPending} onChange={event => setPermissionCode(event.target.value)}><option value="">권한 선택</option>{editor?.row && !permissions.some(item => item.permissionCode === permissionCode) ? <option value={permissionCode}>{editor.row.permissionName} (중지)</option> : null}{permissions.map(item => <option key={item.permissionCode} value={item.permissionCode}>{item.permissionName} · {item.permissionCode}</option>)}</NativeSelect></label>
          {kind === 'user' ? <label className="block space-y-1 text-sm"><span>예외 효과</span><NativeSelect value={effect} disabled={mutation.isPending} onChange={event => setEffect(event.target.value as typeof effect)}><option value="grant">허용</option><option value="revoke">차단</option></NativeSelect></label> : <label className="block space-y-1 text-sm"><span>적용 시작</span><Input type="datetime-local" value={from} onChange={event => setFrom(event.target.value)} disabled={mutation.isPending} /></label>}
          <label className="block space-y-1 text-sm"><span>적용 종료 (비워 두면 제한 없음)</span><Input type="datetime-local" value={to} onChange={event => setTo(event.target.value)} disabled={mutation.isPending} /></label>
        </> : <p className="text-sm">{editor.row?.targetName} · {editor.row?.permissionName} · {editor.row?.effect === 'grant' ? '허용' : '차단'} 기록을 회수합니다.</p>}
        <label className="block space-y-1 text-sm"><span>변경 사유</span><Textarea required maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} disabled={mutation.isPending} /></label>
        {dateIssue ? <SsooErrorNotice message={dateIssue} /> : null}
        {mutation.isError ? <SsooErrorNotice error={mutation.error} /> : null}
        <DialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => setEditor(null)}>취소</Button><Button type="submit" disabled={mutation.isPending || !!dateIssue || !targetId || !permissionCode || !reason.trim()}>{mutation.isPending ? '처리 중...' : editor?.mode === 'revoke' ? '회수 실행' : '저장'}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
  </>;
}
