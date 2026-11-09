'use client';
import { getAdminBreadcrumb } from '@/components/layout/navigation';

import { RegistrationRequestsPanel } from '../auth/RegistrationRequestsPanel';
import { useEffect, useState } from 'react';
import type { OnboardingRequest, OnboardingRequestKind, OnboardingRequestStatus, OnboardingRoleCode, OnboardingSnapshot } from '@ssoo/types/common';
import { usePlatformAccess } from '@ssoo/web-auth';
import { Button, Input, NativeSelect } from '@ssoo/web-ui';
import { SsooErrorNotice, SsooWorkspacePage, SsooDataGridPagination } from '@ssoo/web-shell';
import { useApprovalReviews, useDecideParticipationRequest } from '@/hooks/queries/useParticipation';
import { REQUEST_STATUS_LABELS, ROLE_LABELS, SERVICE_LABELS, requestOrganizationLabel } from './RequestHistory';

export function ApprovalsPage({ path = '' }: { path?: string }) {
  const requestedView = new URLSearchParams(path.split('?')[1]).get('view');
  const access = usePlatformAccess();
  const [view, setView] = useState<'participation' | 'registration'>(requestedView === 'registration' ? 'registration' : 'participation');
  useEffect(() => { setView(requestedView === 'registration' ? 'registration' : 'participation'); }, [requestedView]);
  const [status, setStatus] = useState<OnboardingRequestStatus>('pending');
  const [kind, setKind] = useState<OnboardingRequestKind | ''>('');
  const [page, setPage] = useState(1);
  const query = useApprovalReviews({ status, kind: kind || undefined, page });
  if (!access) return null;
  const { snapshot } = access;
  const total = query.data?.meta.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / (query.data?.meta.limit ?? 20)));
  return <SsooWorkspacePage compact breadcrumbItems={getAdminBreadcrumb("/approvals")} scrollBody title="공통 신청 처리" description="담당 조직·서비스의 신청을 승인하거나 반려하고 처리 내역을 확인합니다."
    headerActions={{ extraActions: [{ label: '승인함 새로고침', variant: 'outline', onClick: () => { void query.refetch(); }, disabled: query.isFetching || !snapshot.canReview }] }}>
    {snapshot.isPlatformAdmin && <div className="flex flex-wrap gap-2" aria-label="승인 업무 선택"><Button variant={view === 'participation' ? 'default' : 'outline'} onClick={() => setView('participation')}>조직·서비스 신청</Button><Button variant={view === 'registration' ? 'default' : 'outline'} onClick={() => setView('registration')}>계정 가입 신청</Button></div>}
    {snapshot.isPlatformAdmin && view === 'registration' ? <RegistrationRequestsPanel /> : !snapshot.canReview ? <SsooErrorNotice message="담당 범위의 승인 권한이 없습니다. 플랫폼 관리자에게 승인 권한 위임을 요청해 주세요." /> : <>
      <p className="text-sm text-muted-foreground">현재 승인 권한이 있는 범위만 조회됩니다. 본인 신청은 다른 승인자가 처리합니다.</p>
      <div className="flex flex-wrap gap-4">
        <label className="space-y-1 text-sm"><span>처리 상태</span><NativeSelect value={status} onChange={(event) => { setStatus(event.target.value as OnboardingRequestStatus); setPage(1); }}>{Object.entries(REQUEST_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></label>
        <label className="space-y-1 text-sm"><span>신청 유형</span><NativeSelect value={kind} onChange={(event) => { setKind(event.target.value as typeof kind); setPage(1); }}><option value="">전체 유형</option><option value="membership">조직 소속</option><option value="organization">조직 생성</option><option value="service">서비스 이용</option></NativeSelect></label>
      </div>
      {query.error ? <SsooErrorNotice error={query.error} actions={[{ label: '다시 조회', onClick: () => query.refetch() }]} /> : null}
      {query.isPending ? <p role="status">신청 내역을 불러오고 있습니다…</p> : null}
      {query.data ? <><p className="text-sm" role="status">{total}건 · {page} / {lastPage}페이지</p>
        {query.data.data.length ? <div className="space-y-4">{query.data.data.map((request) => <ApprovalRow key={request.id} request={request} snapshot={snapshot} />)}</div> : <div className="space-y-3 rounded-lg border p-5 text-sm"><p>{status === 'pending' ? '현재 조건에 처리할 대기 신청이 없습니다.' : '현재 조건에 해당하는 처리 내역이 없습니다.'}</p><p className="text-muted-foreground">처리 상태나 신청 유형을 바꿔 다른 내역을 확인할 수 있습니다.</p>{status === 'pending' ? <Button variant="outline" onClick={() => { setStatus('approved'); setPage(1); }}>승인 완료 내역 보기</Button> : null}</div>}
        <SsooDataGridPagination page={page} pageSize={query.data.meta.limit ?? 20} total={total} onPageChange={setPage} disabled={query.isFetching} />
      </> : null}
    </>}
  </SsooWorkspacePage>;
}

function ApprovalRow({ request, snapshot }: { request: OnboardingRequest; snapshot: OnboardingSnapshot }) {
  const decision = useDecideParticipationRequest();
  const [message, setMessage] = useState('');
  const [role, setRole] = useState<OnboardingRoleCode>('user');
  return <article className="space-y-3 rounded-lg border p-4 text-sm" aria-label={`${request.userName} ${request.serviceCode ? SERVICE_LABELS[request.serviceCode] : '조직'} 신청`}>
    <h2 className="break-words font-semibold">{request.userName} · {requestOrganizationLabel(request, snapshot)} · {request.serviceCode ? SERVICE_LABELS[request.serviceCode] : request.kind === 'organization' ? '조직 생성' : '조직 소속'}</h2>
    <p>{REQUEST_STATUS_LABELS[request.status]} · 신청 {new Date(request.createdAt).toLocaleString('ko-KR')}</p>
    <p className="break-words">신청 사유: {request.message}</p>
    {request.decisionMessage ? <p className="break-words">처리 사유: {request.decisionMessage}</p> : null}
    {request.decidedAt ? <p>처리 {new Date(request.decidedAt).toLocaleString('ko-KR')}</p> : null}
    {request.status === 'pending' ? <>
      <p className="text-sm text-muted-foreground">승인하면 신청한 {request.kind === 'service' ? '서비스 이용권' : request.kind === 'membership' ? '조직 소속' : '조직'}이 반영됩니다. 반려하면 사유와 함께 처리가 종료됩니다.</p>
      {request.kind === 'service' ? <label className="block space-y-1"><span>부여할 서비스 역할</span><NativeSelect disabled={decision.isPending} value={role} onChange={(event) => setRole(event.target.value as OnboardingRoleCode)}>{Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></label> : null}
      <label className="block space-y-1"><span>승인·반려 사유</span><Input disabled={decision.isPending} name={`approval-decision-${request.id}`} autoComplete="off" required maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
      {decision.error ? <SsooErrorNotice error={decision.error} /> : null}
      <div className="flex gap-2"><Button disabled={decision.isPending || !message.trim()} onClick={() => decision.mutate({ id: request.id, decision: 'approve', message, roleCode: role })}>승인</Button><Button variant="outline" disabled={decision.isPending || !message.trim()} onClick={() => decision.mutate({ id: request.id, decision: 'reject', message })}>반려</Button></div>
    </> : null}
  </article>;
}
