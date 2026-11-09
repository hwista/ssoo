'use client';

import { useState } from 'react';
import type { OnboardingRequest, OnboardingSnapshot } from '@ssoo/types/common';
import { Button, NativeSelect } from '@ssoo/web-ui';
import { SsooErrorNotice } from '@ssoo/web-shell';
import { useCancelParticipationRequest } from '@/hooks/queries/useParticipation';

export const SERVICE_LABELS = { crm: '영업관리 · CRM', pms: '프로젝트관리 · PMS', dms: '문서관리 · DMS', sns: '협업 · SNS' };
export const ROLE_LABELS = { viewer: '조회자', user: '일반 사용자', manager: '서비스 관리자' };
export const REQUEST_STATUS_LABELS = { pending: '승인 대기', approved: '승인', rejected: '반려', cancelled: '취소' };

export function requestOrganizationLabel(request: OnboardingRequest, snapshot: OnboardingSnapshot) {
  const organization = snapshot.organizations.find((entry) => entry.id === request.organizationId);
  if (organization) return organization.path ?? organization.name;
  const parent = snapshot.organizations.find((entry) => entry.id === request.parentOrganizationId);
  return [parent?.path ?? parent?.name, request.organizationName ?? '조직'].filter(Boolean).join(' › ');
}

export function RequestHistory({ snapshot, scope }: { snapshot: OnboardingSnapshot; scope: 'organization' | 'service' }) {
  const [status, setStatus] = useState('all');
  const cancel = useCancelParticipationRequest();
  const requests = snapshot.requests.filter((request) => (scope === 'service' ? request.kind === 'service' : request.kind !== 'service') && (status === 'all' || request.status === status));
  return <section className="space-y-4" aria-label="내 신청 내역">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold">내 신청 내역</h2>
      <label className="flex items-center gap-2 text-sm"><span>신청 상태</span><NativeSelect value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="all">전체 상태</option>{Object.entries(REQUEST_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </NativeSelect></label></div>
    <p className="text-sm text-muted-foreground">최근 신청 100건 중 해당 내역입니다. 반려 사유를 확인한 뒤 다시 신청할 수 있습니다.</p>
    {cancel.error ? <SsooErrorNotice error={cancel.error} /> : null}
    {requests.length ? <ul className="divide-y rounded-lg border">{requests.map((request) => <li key={request.id} className="space-y-2 p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 space-y-1 break-words"><p className="font-medium">{requestOrganizationLabel(request, snapshot)}{request.serviceCode ? ` · ${SERVICE_LABELS[request.serviceCode]}` : request.kind === 'organization' ? ' · 조직 생성' : ' · 소속 신청'}</p>
        <p>{REQUEST_STATUS_LABELS[request.status]} · 신청 {new Date(request.createdAt).toLocaleString('ko-KR')}</p></div>
        {request.status === 'pending' ? <Button variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate(request.id)}>신청 취소</Button> : null}</div>
      <p className="break-words">신청 사유: {request.message}</p>
      {request.decisionMessage ? <p className="break-words">처리 사유: {request.decisionMessage}</p> : null}
      {request.decidedAt ? <p className="text-muted-foreground">처리 {new Date(request.decidedAt).toLocaleString('ko-KR')}</p> : null}
    </li>)}</ul> : <p className="rounded-lg border p-5 text-sm text-muted-foreground">해당하는 신청 내역이 없습니다.</p>}
  </section>;
}
