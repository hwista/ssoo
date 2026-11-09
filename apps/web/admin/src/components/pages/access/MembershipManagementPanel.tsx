'use client';
import { getAdminBreadcrumb } from '@/components/layout/navigation';

import { ProgramContext } from './ProgramContext';
import { periodIssue, programPath } from './program-context';
import { useTabStore } from '@/stores/tab.store';
import { getAdminTabOptions } from '@/components/layout/navigation';
import { useState, type FormEvent } from 'react';
import type { ManagedMembership, ParticipationFilter } from '@ssoo/types/common';
import { Badge, Button, Checkbox, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, NativeSelect, Textarea } from '@ssoo/web-ui';
import { SsooErrorNotice, SsooSearchInput, SsooDataWorkspacePage, SsooDataWorkspaceToolbar, SsooDataGrid, type SsooDataGridColumnDef } from '@ssoo/web-shell';
import { useManagedMemberships, useParticipationCommand } from '@/hooks/queries/useParticipationManagement';
import { OperationHistoryButton } from './OperationHistoryButton';
import { ParticipationTargets, toIsoInput, toLocalInput } from './ParticipationTargets';

type MembershipAction = 'create' | 'edit' | 'transfer' | 'end';
const labels: Record<MembershipAction, string> = { create: '소속 배치', edit: '소속 변경', transfer: '조직 이동', end: '소속 종료' };

export function MembershipManagementPanel({ userId, organizationId, onNavigate, standalone = false }: { userId?: string; organizationId?: string; onNavigate?: () => void; standalone?: boolean }) {
  const openTab = useTabStore(state => state.openTab);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ParticipationFilter['status']>('active');
  const [editor, setEditor] = useState<{ action: MembershipAction; row?: ManagedMembership } | null>(null);
  const [notice, setNotice] = useState('');
  const list = useManagedMemberships({ userId, organizationId, search, page, status });
  const columns: SsooDataGridColumnDef<ManagedMembership>[] = [
    { accessorKey: 'userName', header: '사용자', size: 150 },
    { accessorKey: 'organizationName', header: '조직', size: 180 },
    { id: 'kind', header: '구분', size: 120, cell: ({ row: { original: row } }) => <>{row.isPrimary ? '주 소속' : '겸직'}{row.isLeader ? ' · 리더' : ''}{row.positionCode ? ` · ${row.positionCode}` : ''}</> },
    { id: 'period', header: '유효기간', size: 200, cell: ({ row: { original: row } }) => <div className="whitespace-nowrap">{row.effectiveFrom ? new Date(row.effectiveFrom).toLocaleString('ko-KR') : '시작 제한 없음'}<br />{row.effectiveTo ? new Date(row.effectiveTo).toLocaleString('ko-KR') : '종료 제한 없음'}</div> },
    { id: 'status', header: '상태', size: 120, cell: ({ row: { original: row } }) => <Badge variant={row.effective ? 'default' : 'outline'}>{!row.isActive ? '종료' : row.effective ? '유효' : '기간 확인 필요'}</Badge> },
    { id: 'actions', header: '작업', size: 330, cell: ({ row: { original: row } }) => <div className="flex flex-wrap gap-1">{row.isActive ? (['edit', 'transfer', 'end'] as const).map(action => <Button key={action} variant="outline" size="sm" disabled={list.isFetching} onClick={() => setEditor({ action, row })}>{labels[action]}</Button>) : <Button variant="outline" size="sm" disabled={list.isFetching} onClick={() => setEditor({ action: 'create', row })}>다시 배치</Button>}<OperationHistoryButton filter={{ category: 'membership', subjectId: row.id }} onNavigate={onNavigate} /></div> },
  ];
  const toolbar = { filterSummary: [search ? `검색: ${search}` : '', status === 'active' ? '운영 중 기록 (기간 상태는 목록에서 확인)' : status === 'inactive' ? '종료·회수 기록' : '전체 기록'].filter(Boolean).join(' · '), actions: [
    { label: '새로고침', variant: 'outline' as const, onClick: () => { void list.refetch(); }, disabled: list.isFetching },
    ...(userId ? [{ label: '이 사용자 이용권', variant: 'outline' as const, onClick: () => openTab(getAdminTabOptions(programPath('/service-grants', { userId, organizationId }))) }] : []),
    { label: '소속 배치', onClick: () => setEditor({ action: 'create' }), disabled: list.isFetching || list.isError },
  ], filterSlot: <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
    <SsooSearchInput id={`membership-search-${userId ?? organizationId ?? 'all'}`} name="membership-directory-query" ariaLabel="소속 사용자 또는 조직 검색" intent="data-filter" placeholder="사용자 또는 조직 이름" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
    <NativeSelect aria-label="소속 기록 상태" value={status} onChange={event => { setStatus(event.target.value as ParticipationFilter['status']); setPage(1); }}><option value="all">전체 기록</option><option value="active">미종료 기록</option><option value="inactive">종료 기록</option></NativeSelect>
  </div> };
  const table = { columns, data: list.data?.items ?? [], fitViewport: true, mobileSummaryColumns: ['userName', 'organizationName', 'kind', 'period', 'status', 'actions'], loading: list.isLoading, error: list.error, onRetry: () => { void list.refetch(); }, enableSorting: false,
    pagination: { page, pageSize: 20, total: list.data?.total ?? 0, onPageChange: setPage, disabled: list.isFetching }, emptyState: '조건에 맞는 소속이 없습니다.' };
  const feedback = <>{(userId || organizationId) && <ProgramContext context={{ userId, organizationId }} basePath="/memberships" />}{notice ? <p role="status" className="text-sm">{notice}</p> : null}</>;
  const dialog = editor ? <MembershipEditor {...editor} userId={userId} organizationId={organizationId} onClose={() => setEditor(null)} onSaved={() => { setNotice(`${labels[editor.action]} 처리가 완료되었습니다.`); setEditor(null); }} /> : null;
  return <>
    {standalone ? <SsooDataWorkspacePage compact title="사용자 소속 관리" description="사용자와 조직의 소속을 조회하고 배치·겸직·조직 이동·종료를 처리합니다." breadcrumbItems={getAdminBreadcrumb('/memberships')} toolbar={toolbar} statusSlot={feedback}>
      <SsooDataGrid {...table} />
    </SsooDataWorkspacePage> : <section className="space-y-3" aria-label="사용자 소속 관리"><h2 className="text-base font-semibold">사용자 소속</h2><p className="text-sm text-muted-foreground">배치·겸직·조직 이동과 소속 종료를 관리합니다.</p><SsooDataWorkspaceToolbar {...toolbar} />{feedback}<div className="h-[min(60dvh,560px)]"><SsooDataGrid {...table} /></div></section>}
    {dialog}
  </>;
}

function MembershipEditor({ action, row, userId: fixedUser, organizationId: fixedOrganization, onClose, onSaved }: {
  action: MembershipAction; row?: ManagedMembership; userId?: string; organizationId?: string; onClose: () => void; onSaved: () => void;
}) {
  const command = useParticipationCommand();
  const [userId, setUserId] = useState(row?.userId ?? fixedUser ?? '');
  const [organizationId, setOrganizationId] = useState(action === 'transfer' ? '' : row?.organizationId ?? fixedOrganization ?? '');
  const [primary, setPrimary] = useState(row?.isPrimary ?? false);
  const [leader, setLeader] = useState(row?.isLeader ?? false);
  const [position, setPosition] = useState(row?.positionCode ?? '');
  const [from, setFrom] = useState(toLocalInput(action === 'create' ? null : row?.effectiveFrom ?? null));
  const [to, setTo] = useState(toLocalInput(action === 'create' ? null : row?.effectiveTo ?? null));
  const [reason, setReason] = useState('');
  const dateIssue = action === 'create' || action === 'edit' ? periodIssue(from, to) : null;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (command.isPending || ((action === 'create' || action === 'edit') && periodIssue(from, to))) return;
    const fields = { isPrimary: primary, isLeader: leader, positionCode: position || null, effectiveFrom: toIsoInput(from), effectiveTo: toIsoInput(to), reason };
    try {
      if (action === 'create') await command.mutateAsync({ kind: 'membership.create', data: { ...fields, userId, organizationId } });
      else if (row && action === 'edit') await command.mutateAsync({ kind: 'membership.update', id: row.id, data: { ...fields, expectedUpdatedAt: row.updatedAt } });
      else if (row && action === 'end') await command.mutateAsync({ kind: 'membership.end', id: row.id, data: { reason, expectedUpdatedAt: row.updatedAt } });
      else if (row) await command.mutateAsync({ kind: 'membership.transfer', id: row.id, data: { organizationId, reason, expectedUpdatedAt: row.updatedAt } });
      onSaved();
    } catch { /* Preserve the form and mutation error for correction or refresh. */ }
  };
  return <Dialog open onOpenChange={(open) => { if (!open && !command.isPending) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
    <DialogHeader><DialogTitle>{labels[action]}</DialogTitle><DialogDescription>{row ? `${row.userName} · ${row.organizationName}` : '활성 사용자와 조직을 선택해 소속을 배치합니다.'}</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="space-y-4">
      {action !== 'end' ? <ParticipationTargets userId={userId} organizationId={organizationId} onUser={setUserId} onOrganization={setOrganizationId} lockUser={Boolean(row || fixedUser)} lockOrganization={action === 'edit' || (action === 'create' && Boolean(fixedOrganization))} disabled={command.isPending} /> : null}
      {action === 'create' || action === 'edit' ? <>
        <div className="flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><Checkbox checked={primary} disabled={command.isPending} onCheckedChange={(value) => setPrimary(value === true)} />주 소속</label><label className="flex items-center gap-2"><Checkbox checked={leader} disabled={command.isPending} onCheckedChange={(value) => setLeader(value === true)} />조직 리더</label></div>
        <label className="block space-y-1 text-sm"><span>직책·직급 코드 (선택)</span><Input value={position} maxLength={100} disabled={command.isPending} onChange={(event) => setPosition(event.target.value)} /><span className="block text-xs text-muted-foreground">조직에서 사용하는 직책 코드가 있을 때만 입력합니다. 소속·앱 권한은 이 값으로 결정되지 않습니다.</span></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm"><span>시작일시</span><Input type="datetime-local" value={from} disabled={command.isPending} onChange={(event) => setFrom(event.target.value)} /></label><label className="space-y-1 text-sm"><span>종료일시</span><Input type="datetime-local" value={to} disabled={command.isPending} onChange={(event) => setTo(event.target.value)} /></label></div>
      </> : <p className="text-sm">기존 소속을 종료하고 해당 조직의 이용권과 승인 위임을 회수합니다.{action === 'transfer' ? ' 새 조직의 서비스 이용권은 별도로 부여해 주세요.' : ' 다른 조직 소속과 업무 기록은 유지합니다.'}</p>}
      <label className="block space-y-1 text-sm"><span>처리 사유</span><Textarea required maxLength={2000} value={reason} disabled={command.isPending} onChange={(event) => setReason(event.target.value)} /></label>
      {dateIssue ? <SsooErrorNotice message={dateIssue} /> : null}
      {command.isError ? <SsooErrorNotice error={command.error} /> : null}
      <DialogFooter><Button type="button" variant="outline" disabled={command.isPending} onClick={onClose}>닫기</Button><Button type="submit" disabled={command.isPending || !!dateIssue || !reason.trim() || (action !== 'end' && (!userId || !organizationId))}>{command.isPending ? '처리 중…' : labels[action]}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
