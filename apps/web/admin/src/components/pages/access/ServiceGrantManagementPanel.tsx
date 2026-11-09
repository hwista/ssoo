'use client';
import { getAdminBreadcrumb } from '@/components/layout/navigation';
import { ProgramContext } from './ProgramContext';
import { periodIssue, programPath } from './program-context';
import { useTabStore } from '@/stores/tab.store';
import { getAdminTabOptions } from '@/components/layout/navigation';

import { useState, type FormEvent, type ReactNode } from 'react';
import type { ManagedServiceGrant, ParticipationFilter } from '@ssoo/types/common';
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, NativeSelect, Textarea } from '@ssoo/web-ui';
import { SsooErrorNotice, SsooSearchInput, SsooDataWorkspacePage, SsooDataWorkspaceToolbar, SsooDataGrid, type SsooDataGridColumnDef, type SsooDataWorkspaceAction } from '@ssoo/web-shell';
import { useManagedServiceGrants, useParticipationCommand } from '@/hooks/queries/useParticipationManagement';
import { OperationHistoryButton } from './OperationHistoryButton';
import { ParticipationTargets, toIsoInput, toLocalInput } from './ParticipationTargets';

const services = ['crm', 'pms', 'dms', 'sns'] as const;
const roleLabels: Record<string, string> = { viewer: '조회자', user: '사용자', manager: '매니저' };
type GrantAction = 'create' | 'edit' | 'revoke';
const actionLabel = (action: GrantAction, row?: ManagedServiceGrant) => action === 'create' ? '이용권 부여' : action === 'revoke' ? '이용권 회수' : row?.isActive ? '이용권 변경' : '이용권 재부여';

export function ServiceGrantManagementPanel({ userId, organizationId, serviceCode, onNavigate, standalone = false, serviceFilterSlot, relatedAction }: { userId?: string; organizationId?: string; serviceCode?: string; onNavigate?: () => void; standalone?: boolean; serviceFilterSlot?: ReactNode; relatedAction?: SsooDataWorkspaceAction }) {
  const openTab = useTabStore(state => state.openTab);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ParticipationFilter['status']>('active');
  const [editor, setEditor] = useState<{ action: GrantAction; row?: ManagedServiceGrant } | null>(null);
  const [notice, setNotice] = useState('');
  const list = useManagedServiceGrants({ userId, organizationId, serviceCode, search, page, status });
  const columns: SsooDataGridColumnDef<ManagedServiceGrant>[] = [
    { accessorKey: 'userName', header: '사용자', size: 150 },
    { id: 'organization', header: '조직', size: 190, cell: ({ row: { original: row } }) => row.organizationName ?? '플랫폼 전체 (기존 이용권)' },
    { id: 'service', header: '서비스·역할', size: 150, cell: ({ row: { original: row } }) => `${row.serviceCode.toUpperCase()} · ${roleLabels[row.roleCode] ?? row.roleCode}` },
    { id: 'expiresAt', header: '이용 종료', size: 190, cell: ({ row: { original: row } }) => row.expiresAt ? new Date(row.expiresAt).toLocaleString('ko-KR') : '기한 없음' },
    { id: 'status', header: '효력', size: 150, cell: ({ row: { original: row } }) => <Badge variant={row.effective ? 'default' : 'outline'}>{row.effective ? '이용 가능' : row.inactiveReason || '상태 확인 필요'}</Badge> },
    { id: 'actions', header: '작업', size: 240, cell: ({ row: { original: row } }) => <div className="flex flex-wrap gap-1">{row.organizationId ? <Button variant="outline" size="sm" disabled={list.isFetching} onClick={() => setEditor({ action: 'edit', row })}>{row.isActive ? '변경' : '재부여'}</Button> : null}{row.isActive ? <Button variant="outline" size="sm" disabled={list.isFetching} onClick={() => setEditor({ action: 'revoke', row })}>회수</Button> : null}<OperationHistoryButton filter={{ category: 'service-grant', subjectId: row.id }} onNavigate={onNavigate} /></div> },
  ];
  const toolbar = { filterSummary: [search ? `검색: ${search}` : '', status === 'active' ? '운영 중 기록 (기간 상태는 목록에서 확인)' : status === 'inactive' ? '종료·회수 기록' : '전체 기록'].filter(Boolean).join(' · '), actions: [
    { label: '새로고침', variant: 'outline' as const, onClick: () => { void list.refetch(); }, disabled: list.isFetching },
    ...(userId ? [{ label: '이 사용자 접근 진단', variant: 'outline' as const, onClick: () => openTab(getAdminTabOptions(programPath('/access-diagnosis', { userId }))) }] : []),
    { label: '이용권 부여', onClick: () => setEditor({ action: 'create' }), disabled: list.isFetching || list.isError },
    ...(relatedAction ? [relatedAction] : []),
  ], filterSlot: <div className="grid w-full items-end gap-3 sm:grid-cols-3">
    <SsooSearchInput id={`grant-search-${userId ?? organizationId ?? serviceCode ?? 'all'}`} name="service-grant-query" ariaLabel="이용권 사용자 검색" intent="data-filter" placeholder="사용자 이름" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
    <NativeSelect aria-label="이용권 기록 상태" value={status} onChange={event => { setStatus(event.target.value as ParticipationFilter['status']); setPage(1); }}><option value="all">전체 기록</option><option value="active">미회수 기록</option><option value="inactive">회수 기록</option></NativeSelect>
    {serviceFilterSlot}
  </div> };
  const table = { columns, data: list.data?.items ?? [], fitViewport: true, mobileSummaryColumns: ['userName', 'organization', 'service', 'expiresAt', 'status', 'actions'], loading: list.isLoading, error: list.error, onRetry: () => { void list.refetch(); }, enableSorting: false,
    pagination: { page, pageSize: 20, total: list.data?.total ?? 0, onPageChange: setPage, disabled: list.isFetching }, emptyState: '조건에 맞는 이용권이 없습니다.' };
  const feedback = <>{(userId || organizationId || serviceCode) && <ProgramContext context={{ userId, organizationId, serviceCode }} basePath="/service-grants" />}{notice ? <p role="status" className="text-sm">{notice}</p> : null}</>;
  const dialog = editor ? <GrantEditor {...editor} fixedUser={userId} fixedOrganization={organizationId} fixedService={serviceCode} onClose={() => setEditor(null)} onSaved={() => { setNotice(`${actionLabel(editor.action, editor.row)} 처리가 완료되었습니다.`); setEditor(null); }} /> : null;
  return <>
    {standalone ? <SsooDataWorkspacePage compact title="서비스 이용권 관리" description="조직 소속을 기준으로 사용자·조직별 서비스 역할과 이용 기간을 부여·변경·회수합니다." breadcrumbItems={getAdminBreadcrumb('/service-grants')} toolbar={toolbar} statusSlot={feedback}>
      <SsooDataGrid {...table} />
    </SsooDataWorkspacePage> : <section className="space-y-3" aria-label="서비스 이용권 관리"><h2 className="text-base font-semibold">서비스 이용권</h2><p className="text-sm text-muted-foreground">조직 소속을 기준으로 서비스 역할과 이용 기간을 관리합니다.</p><SsooDataWorkspaceToolbar {...toolbar} />{feedback}<div className="h-[min(60dvh,560px)]"><SsooDataGrid {...table} /></div></section>}
    {dialog}
  </>;
}

function GrantEditor({ action, row, fixedUser, fixedOrganization, fixedService, onClose, onSaved }: { action: GrantAction; row?: ManagedServiceGrant; fixedUser?: string; fixedOrganization?: string; fixedService?: string; onClose: () => void; onSaved: () => void }) {
  const command = useParticipationCommand();
  const [userId, setUserId] = useState(row?.userId ?? fixedUser ?? '');
  const [organizationId, setOrganizationId] = useState(row?.organizationId ?? fixedOrganization ?? '');
  const [serviceCode, setServiceCode] = useState(row?.serviceCode ?? fixedService ?? 'crm');
  const [roleCode, setRoleCode] = useState(row?.roleCode ?? 'viewer');
  const [expiresAt, setExpiresAt] = useState(toLocalInput(row?.expiresAt ?? null));
  const [reason, setReason] = useState('');
  const dateIssue = action !== 'revoke' ? periodIssue('', expiresAt, true) : null;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (command.isPending || (action !== 'revoke' && periodIssue('', expiresAt, true))) return;
    try {
      if (action === 'revoke' && row) await command.mutateAsync({ kind: 'grant.revoke', id: row.id, data: { reason, expectedUpdatedAt: row.updatedAt } });
      else if (action === 'edit' && row) await command.mutateAsync({ kind: 'grant.update', id: row.id, data: { roleCode, expiresAt: toIsoInput(expiresAt), reason, expectedUpdatedAt: row.updatedAt } });
      else await command.mutateAsync({ kind: 'grant.create', data: { userId, organizationId, serviceCode, roleCode, expiresAt: toIsoInput(expiresAt), reason } });
      onSaved();
    } catch { /* Keep the operator's input and show the server's validation error. */ }
  };
  return <Dialog open onOpenChange={(open) => { if (!open && !command.isPending) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{actionLabel(action, row)}</DialogTitle><DialogDescription>{row ? `${row.userName} · ${row.organizationName ?? '플랫폼 전체'} · ${row.serviceCode.toUpperCase()}` : '해당 조직에 현재 유효한 소속이 있어야 이용권을 부여할 수 있습니다.'}</DialogDescription></DialogHeader>
    <form className="space-y-4" onSubmit={submit}>
      {action === 'create' ? <ParticipationTargets userId={userId} organizationId={organizationId} onUser={setUserId} onOrganization={setOrganizationId} lockUser={Boolean(fixedUser)} lockOrganization={Boolean(fixedOrganization)} disabled={command.isPending} /> : null}
      {action !== 'revoke' ? <>
        <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm"><span>서비스</span><NativeSelect value={serviceCode} disabled={Boolean(row || fixedService) || command.isPending} onChange={(event) => setServiceCode(event.target.value)}>{services.map((service) => <option key={service} value={service}>{service.toUpperCase()}</option>)}</NativeSelect></label><label className="space-y-1 text-sm"><span>역할</span><NativeSelect value={roleCode} disabled={command.isPending} onChange={(event) => setRoleCode(event.target.value)}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></label></div>
        <label className="block space-y-1 text-sm"><span>이용 종료일시 (비우면 기한 없음)</span><Input type="datetime-local" value={expiresAt} disabled={command.isPending} onChange={(event) => setExpiresAt(event.target.value)} /></label>
      </> : <p className="text-sm">선택한 이용권을 회수합니다. 다른 조직이나 플랫폼 전체 이용권이 남아 있으면 서비스 접근이 유지될 수 있으므로 함께 확인해 주세요.</p>}
      <label className="block space-y-1 text-sm"><span>처리 사유</span><Textarea required maxLength={2000} value={reason} disabled={command.isPending} onChange={(event) => setReason(event.target.value)} /></label>
      {dateIssue ? <SsooErrorNotice message={dateIssue} /> : null}
      {command.isError ? <SsooErrorNotice error={command.error} /> : null}
      <DialogFooter><Button type="button" variant="outline" disabled={command.isPending} onClick={onClose}>닫기</Button><Button type="submit" disabled={command.isPending || !!dateIssue || !reason.trim() || (action === 'create' && (!userId || !organizationId))}>{command.isPending ? '처리 중…' : actionLabel(action, row)}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
