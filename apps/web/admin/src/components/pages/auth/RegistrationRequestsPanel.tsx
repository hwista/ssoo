'use client';

import { useState } from 'react';
import type { AuthRegistrationRequestItem } from '@ssoo/types/common';
import { SsooErrorNotice, SsooDataGrid, type SsooDataGridColumnDef } from '@ssoo/web-shell';
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, NativeSelect, Textarea } from '@ssoo/web-ui';
import { useApproveRegistrationRequest, useAssignableRoles, useRegistrationRequests, useRejectRegistrationRequest } from '@/hooks/queries/useAuthAdmin';
import { OperationHistoryButton } from '../access/OperationHistoryButton';

const labels: Record<string, string> = { pending: '대기', approved: '승인', rejected: '반려', expired: '만료' };
const date = (value?: string | null) => value ? new Date(value).toLocaleString('ko-KR') : '—';

/** The same registration program is available from authentication settings and the approval inbox. */
export function RegistrationRequestsPanel() {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuthRegistrationRequestItem | null>(null);
  const query = useRegistrationRequests({ page, limit: 20, statusCode: status || undefined });
  const total = query.data?.data?.total ?? 0;
  const items = query.data?.data?.data ?? [];
  const columns: SsooDataGridColumnDef<AuthRegistrationRequestItem>[] = [

    { id: 'status', header: '상태', size: 90, cell: ({row:{original:item}}) => labels[item.statusCode] },
    { id: 'name', header: '이메일·표시명', size: 240, cell: ({row:{original:item}}) => <>{item.email}<p className="text-xs text-muted-foreground">{item.displayName || '—'}</p></> },
    { id: 'provider', header: '제공자·Tenant', size: 220, cell: ({row:{original:item}}) => <>{item.providerCode}<p className="break-all text-xs text-muted-foreground">{item.tenantId || '—'}</p></> },
    { id: 'date', header: '신청일', size: 190, cell: ({row:{original:item}}) => date(item.requestedAt) },
    { id: 'actions', header: '작업', size: 130, cell: ({row:{original:item}}) => <Button variant="outline" size="sm" onClick={() => setSelected(item)}>상세·처리</Button> },
  ];
  return <section className="min-w-0 space-y-4 rounded-lg border bg-card p-4" aria-label="가입 신청 관리">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="text-base font-semibold">가입 신청</h2><p className="text-sm text-muted-foreground">외부 계정 연결·생성을 승인합니다. 플랫폼 참여와 조직·서비스 이용 승인은 별도로 처리합니다.</p></div>
      <label className="space-y-1 text-sm"><span>가입 처리 상태</span><NativeSelect value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">전체</option>{Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></label>
      <Button variant="outline" disabled={query.isFetching} onClick={() => query.refetch()}>가입 신청 새로고침</Button>
    </div>
    <div className="h-[min(60dvh,480px)]"><SsooDataGrid columns={columns} data={items} loading={query.isLoading} error={query.error} onRetry={() => { void query.refetch(); }} fitViewport mobileSummaryColumns={['name', 'status', 'actions']} enableSorting={false} emptyState="해당하는 가입 신청이 없습니다."
      pagination={{page, pageSize: 20, total: total, onPageChange: setPage, disabled: query.isFetching}} /></div>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>가입 신청 상세</DialogTitle><DialogDescription>신청자 정보와 처리 결과를 확인하고 승인 또는 반려합니다.</DialogDescription></DialogHeader>{selected && <RegistrationDecision key={selected.registrationRequestId} request={selected} onDone={() => setSelected(null)} />}</DialogContent></Dialog>
  </section>;
}

function RegistrationDecision({ request, onDone }: { request: AuthRegistrationRequestItem; onDone: () => void }) {
  const roles = useAssignableRoles();
  const approve = useApproveRegistrationRequest();
  const reject = useRejectRegistrationRequest();
  const [roleCode, setRoleCode] = useState('user');
  const [memo, setMemo] = useState('');
  const pending = approve.isPending || reject.isPending;
  const decide = async (approved: boolean) => {
    if (!memo.trim() || !window.confirm(`${request.email} 가입 신청을 ${approved ? '승인' : '반려'}할까요?`)) return;
    try {
      const data = { roleCode, memo: memo.trim(), expectedUpdatedAt: request.updatedAt };
      if (approved) await approve.mutateAsync({ id: request.registrationRequestId, data });
      else await reject.mutateAsync({ id: request.registrationRequestId, data });
      onDone();
    } catch { /* The mutation error remains visible with the entered reason. */ }
  };
  return <div className="min-w-0 space-y-4 text-sm">
    <dl className="space-y-2 break-words"><dt>신청자</dt><dd>{request.displayName || '—'} · {request.email}</dd><dt>외부 계정</dt><dd>{request.providerCode} · {request.tenantId} · {request.subjectId}</dd><dt>상태·시각</dt><dd>{labels[request.statusCode]} · 신청 {date(request.requestedAt)} · 처리 {date(request.decidedAt)}</dd><dt>처리 사유·운영자</dt><dd>{request.decisionMemo || '—'} · {request.decidedByUserId || '—'}</dd>{request.createdUserId && <><dt>연결 사용자</dt><dd>#{request.createdUserId}</dd></>}</dl>
    <OperationHistoryButton filter={{ category: 'registration', subjectId: request.registrationRequestId }} onNavigate={onDone} />
    {request.statusCode === 'pending' && <>
      {roles.isError && <SsooErrorNotice error={roles.error} actions={[{ label: '승인 역할 다시 조회', onClick: () => roles.refetch() }]} />}
      <label className="block space-y-1"><span>신규 계정의 플랫폼 기본 역할</span><NativeSelect value={roleCode} onChange={event => setRoleCode(event.target.value)} disabled={pending || roles.isLoading}>{(roles.data?.data ?? []).map(role => <option key={role.roleCode} value={role.roleCode}>{role.roleName} ({role.roleCode})</option>)}</NativeSelect></label>
      <p className="text-xs text-muted-foreground">같은 이메일의 기존 계정에 연결하는 경우 기존 역할은 유지됩니다. 중지된 계정은 사용자 관리에서 상태를 먼저 확인하세요.</p>
      <label className="block space-y-1"><span>가입 승인·반려 사유</span><Textarea value={memo} onChange={event => setMemo(event.target.value)} maxLength={1000} disabled={pending} /></label>
      {(approve.error || reject.error) && <SsooErrorNotice error={approve.error || reject.error} />}
      <div className="flex gap-2"><Button disabled={pending || !memo.trim() || !roles.data?.data?.some(role => role.roleCode === roleCode)} onClick={() => decide(true)}>가입 승인</Button><Button variant="outline" disabled={pending || !memo.trim()} onClick={() => decide(false)}>가입 반려</Button><Button variant="outline" disabled={pending} onClick={onDone}>취소</Button></div>
    </>}
  </div>;
}
