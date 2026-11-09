'use client';

import { ProgramContext } from '../access/ProgramContext';
import { periodIssue } from '../access/program-context';
import { OperationHistoryButton } from '../access/OperationHistoryButton';
import { useState, type FormEvent } from 'react';
import type { ApprovalCandidate, OnboardingRoleCode, OnboardingServiceCode } from '@ssoo/types/common';
import { usePlatformAccess } from '@ssoo/web-auth';
import { Button, NativeSelect, Input, Textarea, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@ssoo/web-ui';
import { SsooErrorNotice, SsooSearchInput } from '@ssoo/web-shell';
import { useApprovalAuthorities, useApprovalCandidates, useDelegateApproval, useRevokeApprovalAuthority } from '@/hooks/queries/useParticipation';
import { ROLE_LABELS, SERVICE_LABELS } from '../access/RequestHistory';
import { toIsoInput, toLocalInput } from '../access/ParticipationTargets';
import type { ApprovalAuthority } from '@/lib/api/endpoints/participation';
import { useTabStore } from '@/stores/tab.store';
import { getAdminTabOptions } from '@/components/layout/navigation';

export function ApprovalAuthoritiesTab({ organizationFilter }: { organizationFilter?: string }) {
  const access = usePlatformAccess();
  const authorities = useApprovalAuthorities();
  const delegate = useDelegateApproval();
  const revoke = useRevokeApprovalAuthority();
  const [editing, setEditing] = useState(false);
  const [organizationId, setOrganizationId] = useState(organizationFilter ?? '__choose__');
  const [kind, setKind] = useState<'organization' | 'service'>('organization');
  const [service, setService] = useState<OnboardingServiceCode>('pms');
  const [role, setRole] = useState<OnboardingRoleCode>('user');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ApprovalCandidate | null>(null);
  const [notice, setNotice] = useState('');
  const [editingEntry, setEditingEntry] = useState<ApprovalAuthority | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [reason, setReason] = useState('');
  const [revokeEntry, setRevokeEntry] = useState<ApprovalAuthority | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const openTab = useTabStore(state => state.openTab);
  const candidates = useApprovalCandidates({ organizationId: organizationId || undefined, search: query || undefined, page }, editing && !editingEntry && organizationId !== '__choose__');
  if (!access) return null;
  const { snapshot } = access;
  const path = (id: string | null, fallback?: string | null) => id ? snapshot.organizations.find((organization) => organization.id === id)?.path ?? fallback ?? '비활성 조직' : '플랫폼 내 모든 조직';
  const selectedCandidate = candidates.data?.items.find((candidate) => candidate.id === selected?.id);
  const busy = delegate.isPending || revoke.isPending;
  const dateIssue = periodIssue('', expiresAt, true);
  const visibleAuthorities = authorities.data?.filter(entry => !organizationFilter || entry.organizationId === organizationFilter);
  const existingAuthority = !editingEntry && selectedCandidate ? authorities.data?.find(entry => entry.userId === selectedCandidate.id && entry.authorityKind === kind && (entry.organizationId ?? '') === organizationId && (kind === 'organization' || entry.serviceCode === service)) : undefined;
  const editAuthority = (entry: ApprovalAuthority) => {
    delegate.reset(); setEditingEntry(entry); setKind(entry.authorityKind); setOrganizationId(entry.organizationId ?? ''); setService(entry.serviceCode || 'pms'); setRole(entry.maxRoleCode); setExpiresAt(toLocalInput(entry.expiresAt)); setReason(''); setEditing(true);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (existingAuthority || authorities.isFetching || authorities.isError || (!editingEntry && !selectedCandidate?.eligible) || organizationId === '__choose__' || busy || dateIssue || !reason.trim()) return;
    const targetId = editingEntry?.userId ?? selectedCandidate!.id;
    const targetName = editingEntry?.userName ?? selectedCandidate!.name;
    try {
      await delegate.mutateAsync({ userId: targetId, authorityKind: kind, organizationId: organizationId || undefined,
        serviceCode: kind === 'service' ? service : undefined, maxRoleCode: role,
        expiresAt: toIsoInput(expiresAt), reason: reason.trim(), expectedUpdatedAt: editingEntry?.updatedAt });
      setNotice(`${targetName} 님의 ${path(organizationId)} 승인 권한을 저장했습니다.`);
      setEditing(false); setSelected(null);
    } catch { void candidates.refetch(); }
  };
  return <section className="space-y-5" aria-label="승인 권한 위임">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="space-y-2"><h2 className="text-base font-semibold">승인 범위 관리</h2>
      </div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={authorities.isFetching} onClick={() => { void authorities.refetch(); }}>위임 새로고침</Button><Button onClick={() => { delegate.reset(); setEditingEntry(null); setExpiresAt(''); setReason(''); setSelected(null); setEditing(true); }}>승인 담당자 추가</Button></div></div>
    <p className="text-sm text-muted-foreground">신청 처리 위임 · 담당자의 서비스 이용권과 플랫폼 관리자 권한은 별도입니다.</p>
    {organizationFilter && <ProgramContext context={{ organizationId: organizationFilter }} basePath="/approval-authorities" />}
    {notice ? <p role="status" className="rounded-lg bg-muted p-3 text-sm">{notice}</p> : null}
    {authorities.error ? <SsooErrorNotice error={authorities.error} actions={[{ label: '위임 다시 조회', onClick: () => authorities.refetch() }]} /> : null}
    {revoke.error ? <SsooErrorNotice error={revoke.error} /> : null}
    {authorities.isPending ? <p role="status">승인 담당자를 불러오고 있습니다…</p> : null}
    {authorities.data ? <section className="space-y-3"><h2 className="font-semibold">등록된 승인 담당자</h2>
      <Button variant="outline" aria-pressed={showInactive} onClick={() => setShowInactive(value => !value)}>회수 기록 {showInactive ? '숨기기' : '포함'}</Button>
      {visibleAuthorities?.some((entry) => showInactive || entry.isActive) ? <ul className="divide-y rounded-lg border">{visibleAuthorities?.filter((entry) => showInactive || entry.isActive).map((entry) => <li key={entry.id} className="flex flex-wrap items-start justify-between gap-3 p-4 text-sm">
        <div className="min-w-0 space-y-1 break-words"><p className="font-medium">{entry.userName} · {path(entry.organizationId, entry.organizationName)}</p><p>{entry.serviceCode ? `${SERVICE_LABELS[entry.serviceCode]} · ${ROLE_LABELS[entry.maxRoleCode]}까지 승인` : '조직 소속·하위 조직 생성 승인'}</p>
          <p>{entry.effective ? '유효' : entry.inactiveReason} · 종료 {entry.expiresAt ? new Date(entry.expiresAt).toLocaleString('ko-KR') : '기한 없음'} · 범위 내 대기 {entry.pendingCount}건</p><p className="text-muted-foreground">{entry.reason || '변경 사유 미기록'}</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => editAuthority(entry)}>{entry.isActive ? '위임 변경' : '위임 재부여'}</Button>
        {entry.isActive ? <Button variant="outline" disabled={busy} aria-label={`${entry.userName} ${entry.serviceCode || '조직'} 위임 회수`} onClick={() => { revoke.reset(); setRevokeEntry(entry); setRevokeReason(''); }}>위임 회수</Button> : null}
        <OperationHistoryButton filter={{ category: 'approval-authority', subjectId: entry.id }} /><Button variant="outline" onClick={() => openTab(getAdminTabOptions('/approvals'))}>신청 처리함</Button></div>
      </li>)}</ul> : <p className="rounded-lg border p-5 text-sm text-muted-foreground">등록된 승인 담당자가 없습니다. 플랫폼 관리자는 위임 전에도 다른 사람의 신청을 처리할 수 있습니다.</p>}
    </section> : null}
    {editing ? <section className="space-y-4 rounded-lg border p-4" aria-label="승인 담당자 추가">
      <h2 className="font-semibold">승인 담당자 추가·변경</h2>
      <p className="text-sm text-muted-foreground">지정한 조직에만 적용합니다. 하위 조직으로 자동 확대되지 않습니다.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm"><span>승인 유형</span><NativeSelect value={kind} disabled={busy || !!editingEntry} onChange={(event) => { setKind(event.target.value as typeof kind); setSelected(null); if (!organizationId) setOrganizationId('__choose__'); }}><option value="organization">조직 소속·하위 조직 생성</option><option value="service">서비스 이용</option></NativeSelect></label>
        <label className="space-y-1 text-sm"><span>담당 조직</span><NativeSelect value={organizationId} disabled={busy || !!editingEntry} onChange={(event) => { setOrganizationId(event.target.value); setPage(1); setSelected(null); }}>
          {editingEntry?.organizationId && !snapshot.organizations.some(item => item.id === editingEntry.organizationId) ? <option value={editingEntry.organizationId}>{editingEntry.organizationName} (비활성)</option> : null}
          <option value="__choose__">담당할 조직을 선택하세요</option>{kind === 'service' ? <option value="">플랫폼 내 모든 조직</option> : null}{snapshot.organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.path ?? organization.name}</option>)}
        </NativeSelect></label>
      </div>
      {editingEntry ? <p className="text-sm">담당자: {editingEntry.userName}</p> : organizationId !== '__choose__' ? <>
        <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); setSelected(null); setQuery(search.trim()); setPage(1); if (query === search.trim() && page === 1) void candidates.refetch(); }}>
          <SsooSearchInput id="approval-authority-search" name="approval-authority-query" ariaLabel="승인 담당자 검색" intent="entity-lookup" placeholder="이름, 로그인 ID 또는 이메일" value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1" />
          <Button type="submit" variant="outline" disabled={candidates.isFetching || busy}>담당자 검색</Button>
        </form>
        {candidates.error ? <SsooErrorNotice error={candidates.error} actions={[{ label: '담당자 다시 조회', onClick: () => candidates.refetch() }]} /> : null}
        {candidates.isFetching ? <p role="status" className="text-sm">담당자의 소속과 계정 상태를 확인하고 있습니다…</p> : null}
        {candidates.data ? <><p className="text-sm" role="status">검색 결과 {candidates.data.total}명 · {page} / {Math.max(1, Math.ceil(candidates.data.total / candidates.data.pageSize))}페이지</p>
          <ul className="divide-y" aria-label="승인 담당자 검색 결과">{candidates.data.items.map((candidate) => <li key={candidate.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
            <div className="min-w-0 flex-1 space-y-1 break-words"><p className="font-medium">{candidate.name} · {candidate.loginId || candidate.email}</p><p>{candidate.organizations.join(' · ') || '승인된 소속 없음'}</p><p>{candidate.reason ?? '선택 가능 · 참여와 소속 승인 완료'}</p></div>
            <Button variant={selected?.id === candidate.id ? 'default' : 'outline'} aria-pressed={selected?.id === candidate.id} aria-label={`${candidate.name} 담당자 선택`} disabled={!candidate.eligible || busy || candidates.isFetching} onClick={() => setSelected(candidate)}>{selected?.id === candidate.id ? '선택됨' : '선택'}</Button>
          </li>)}</ul>
          {!candidates.data.total ? <p className="text-sm">검색 결과가 없습니다. 사용자 관리에서 계정 상태를 확인하세요.</p> : null}
          <div className="flex gap-2"><Button variant="outline" disabled={page <= 1 || candidates.isFetching} onClick={() => { setSelected(null); setPage((value) => value - 1); }}>이전 담당자 페이지</Button><Button variant="outline" disabled={page * candidates.data.pageSize >= candidates.data.total || candidates.isFetching} onClick={() => { setSelected(null); setPage((value) => value + 1); }}>다음 담당자 페이지</Button></div>
        </> : null}
      </> : <p className="text-sm text-muted-foreground">담당 조직을 선택하면 소속 승인 여부를 확인하고 담당자를 검색할 수 있습니다.</p>}
      <form onSubmit={(event) => { void submit(event); }} className="space-y-4 border-t pt-4">
        {kind === 'service' ? <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm"><span>담당 서비스</span><NativeSelect value={service} disabled={busy || !!editingEntry} onChange={(event) => setService(event.target.value as OnboardingServiceCode)}>{Object.entries(SERVICE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></label><label className="space-y-1 text-sm"><span>부여 가능한 최대 역할</span><NativeSelect value={role} disabled={busy} onChange={(event) => setRole(event.target.value as OnboardingRoleCode)}>{Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></label></div> : null}
        <p className="rounded-md bg-muted p-3 text-sm">담당자: {editingEntry?.userName ?? selectedCandidate?.name ?? "미선택"} · 범위: {organizationId === "__choose__" ? "미선택" : path(organizationId)} · {kind === "service" ? `${SERVICE_LABELS[service]} / 최대 ${ROLE_LABELS[role]}` : "조직 소속·하위 조직 생성"}</p>
        {existingAuthority && <div className="flex flex-wrap items-center gap-2 text-sm" role="status"><span>같은 담당자·범위의 위임이 있습니다.</span><Button type="button" variant="outline" onClick={() => editAuthority(existingAuthority)}>{existingAuthority.isActive ? '기존 위임 변경' : '회수 위임 재부여'}</Button></div>}
        {dateIssue && <SsooErrorNotice message={dateIssue} />}
        <label className="block space-y-1 text-sm"><span>위임 종료 (비워 두면 기한 없음)</span><Input type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} disabled={busy} /></label>
        <label className="block space-y-1 text-sm"><span>위임 변경 사유</span><Textarea required maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} disabled={busy} /></label>
        {!editingEntry && !selectedCandidate?.eligible && <p className="text-sm">선택 가능한 담당자를 골라 주세요.</p>}
        {delegate.error ? <SsooErrorNotice error={delegate.error} /> : null}
        <div className="flex gap-2"><Button type="submit" disabled={busy || !!existingAuthority || authorities.isFetching || authorities.isError || Boolean(dateIssue) || (!editingEntry && (!selectedCandidate?.eligible || candidates.isFetching)) || organizationId === '__choose__' || !reason.trim()}>{delegate.isPending ? '저장 중…' : '승인 권한 저장'}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(false)}>닫기</Button></div>
      </form>
    </section> : null}
    <Dialog open={!!revokeEntry} onOpenChange={open => { if (!open && !busy) setRevokeEntry(null); }}><DialogContent><DialogHeader><DialogTitle>승인 위임 회수</DialogTitle><DialogDescription>{revokeEntry?.userName} 님의 위임을 회수합니다. 범위 내 대기 {revokeEntry?.pendingCount ?? 0}건은 후임 담당자 또는 플랫폼 관리자가 처리할 수 있습니다.</DialogDescription></DialogHeader>
      <form className="space-y-3" onSubmit={async event => { event.preventDefault(); if (!revokeEntry || !revokeReason.trim()) return; try {
        await revoke.mutateAsync({ id: revokeEntry.id, reason: revokeReason.trim(), expectedUpdatedAt: revokeEntry.updatedAt }); setRevokeEntry(null); setNotice('승인 권한을 회수했습니다.');
      } catch { /* Retain the reason and display the server error. */ } }}>
        <label className="block space-y-1 text-sm"><span>위임 회수 사유</span><Textarea required maxLength={2000} value={revokeReason} onChange={event => setRevokeReason(event.target.value)} disabled={busy} /></label>
        {revoke.error ? <SsooErrorNotice error={revoke.error} /> : null}<DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setRevokeEntry(null)}>취소</Button><Button type="submit" disabled={busy || !revokeReason.trim()}>위임 회수 실행</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
  </section>;
}
