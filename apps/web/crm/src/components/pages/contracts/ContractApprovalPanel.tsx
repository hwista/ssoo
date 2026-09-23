'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle, NativeSelect, Textarea } from '@ssoo/web-ui';
import type { CrmContractApproval, CrmContractApprovalCandidates, CrmContractApprovalDecision, CrmContractApprovalInbox, CrmContractApprovalSource, CrmContractApprovalWorkspace } from '@ssoo/types/crm';
import { useAuthStore } from '@/stores/auth.store';

const base = '/api/crm/contract-approvals';
const statusLabel = { pending: '승인 대기', approved: '승인', rejected: '반려', withdrawn: '철회' } as const;
const time = (value: string) => new Date(value).toLocaleString('ko-KR');
async function api<T>(token: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${base}/${path}`, {
    method: body ? 'POST' : 'GET', cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success !== true) throw new Error(payload?.error?.message || payload?.message || '승인 정보를 처리하지 못했습니다. 다시 시도해 주세요.');
  return payload.data as T;
}

export function ContractApprovalInbox() {
  const token = useAuthStore(state => state.accessToken);
  const [data, setData] = useState<CrmContractApprovalInbox | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async (cursor?: string) => {
    if (!token) return;
    setBusy(true); setError('');
    try {
      const next = await api<CrmContractApprovalInbox>(token, `inbox${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`);
      setData(previous => ({ ...next, items: cursor ? [...(previous?.items ?? []), ...next.items] : next.items }));
    } catch (e) { setError(e instanceof Error ? e.message : '승인 대기 목록을 불러오지 못했습니다.'); }
    finally { setBusy(false); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);
  return <section aria-label="내 승인 대기" className="mb-4 min-w-0 rounded-xl border border-ssoo-border bg-ssoo-bg-card p-4">
    <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">내 승인 대기</h2><Button size="sm" variant="outline" disabled={busy} onClick={() => void load()}>대기 목록 새로고침</Button></div>
    {error && <p role="alert" className="mt-2 text-sm text-ssoo-danger">{error}</p>}
    {data?.items.length === 0 && <p className="mt-2 text-sm text-ssoo-text-muted">처리할 승인 요청이 없습니다.</p>}
    {!data && !error && <p role="status" className="mt-2 text-sm">승인 대기 목록을 불러오는 중입니다.</p>}
    <ul className="mt-2 space-y-2">{data?.items.map(row => <li key={row.id} className="text-sm break-words"><Link className="text-ssoo-primary underline" href={`/contracts?selected=${encodeURIComponent(row.contractCode)}`}>{row.contractName}</Link><span className="ml-2 text-ssoo-text-muted">{row.requesterName} 요청 · {time(row.requestedAt)}{!row.currentVersion ? ' · 원본 변경 또는 열람 불가' : ''}</span></li>)}</ul>
    {data?.nextCursor && <Button className="mt-3" size="sm" variant="outline" disabled={busy} onClick={() => void load(data.nextCursor!)}>대기 요청 더 보기</Button>}
  </section>;
}

export function ContractApprovalPanel({ contractCode, revision }: { contractCode: string; revision: string }) {
  const token = useAuthStore(state => state.accessToken);
  const fieldId = useId();
  const sequence = useRef(0);
  const requestIdentity = useRef<{ payload: string; key: string } | null>(null);
  const [data, setData] = useState<CrmContractApprovalWorkspace | null>(null);
  const [candidates, setCandidates] = useState<CrmContractApprovalCandidates | null>(null);
  const [approver, setApprover] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<CrmContractApprovalSource | null>(null);
  const [reviewedVersion, setReviewedVersion] = useState('');
  const [reviewedRequest, setReviewedRequest] = useState('');
  const [reason, setReason] = useState('');
  const path = `contracts/${encodeURIComponent(contractCode)}`;
  const load = useCallback(async (cursor?: string) => {
    if (!token) return;
    const ticket = ++sequence.current;
    setBusy(true); setError('');
    try {
      const next = await api<CrmContractApprovalWorkspace>(token, `${path}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`);
      if (ticket !== sequence.current) return;
      setData(previous => ({ ...next, items: cursor ? [...(previous?.items ?? []), ...next.items] : next.items }));
      if (!cursor) {
        setReviewedRequest('');
        setCandidates(null);
        if (next.canRequest) {
          const people = await api<CrmContractApprovalCandidates>(token, `${path}/candidates`);
          if (ticket === sequence.current) setCandidates(people);
        }
      }
    } catch (e) { if (ticket === sequence.current) setError(e instanceof Error ? e.message : '승인 정보를 불러오지 못했습니다.'); }
    finally { if (ticket === sequence.current) setBusy(false); }
  }, [token, path]);
  const invalidateLoad = useCallback(() => { sequence.current++; }, []);
  useEffect(() => { void load(); return invalidateLoad; }, [load, revision, invalidateLoad]);

  const run = async (operation: () => Promise<unknown>, message: string) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await operation();
      setNotice(message); setReason(''); setReviewedRequest('');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : '처리하지 못했습니다. 새로고침 후 확인해 주세요.'); }
    finally { setBusy(false); }
  };
  const request = () => {
    if (!token || !data?.source || !approver) return;
    const payload = JSON.stringify({ approverId: approver, versionKey: data.source.versionKey });
    if (requestIdentity.current?.payload !== payload) requestIdentity.current = { payload, key: crypto.randomUUID() };
    const requestKey = requestIdentity.current.key;
    void run(async () => {
      await api(token, path, { ...JSON.parse(payload), requestKey });
      requestIdentity.current = null;
    }, '승인을 요청했습니다.');
  };
  const openSnapshot = (row: CrmContractApproval) => {
    if (!token) return;
    setBusy(true); setError('');
    void api<CrmContractApprovalSource>(token, `${row.id}/snapshot`).then(value => {
      setPreview(value); setReviewedRequest(row.id);
    }).catch(e => setError(e instanceof Error ? e.message : '요청 당시 초안을 읽지 못했습니다.')).finally(() => setBusy(false));
  };
  const decide = (row: CrmContractApproval, action: CrmContractApprovalDecision['action']) => {
    if (!token) return;
    void run(() => api(token, `${row.id}/decision`, { action, ...(action === 'reject' ? { reason } : {}) }), action === 'approve' ? '승인했습니다.' : action === 'reject' ? '반려했습니다.' : '요청을 철회했습니다.');
  };
  const pending = data?.pending;
  return <section aria-label="계약 초안 승인" className="min-w-0 rounded-xl border border-ssoo-border bg-ssoo-bg-card p-4">
    <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">계약 초안 승인</h2><Button size="sm" variant="outline" disabled={busy} onClick={() => { setNotice(''); void load(); }}>승인 새로고침</Button></div>
    <p className="mt-2 text-sm text-ssoo-text-muted">저장된 계약 초안을 한 명에게 요청하고, 지정된 승인자가 직접 처리합니다. 아래 승인은 요청 당시 초안에만 적용됩니다.</p>
    {error && <p role="alert" className="mt-3 text-sm text-ssoo-danger">{error}</p>}
    {notice && <p role="status" className="mt-3 text-sm text-ssoo-success">{notice}</p>}
    {busy && <p role="status" className="mt-2 text-sm text-ssoo-text-muted">처리 중입니다.</p>}
    {data?.sourceMessage && <p className="mt-3 text-sm text-ssoo-text-muted">{data.sourceMessage}</p>}
    {pending && <div className="mt-4 rounded-lg border border-ssoo-border p-3 text-sm">
      <p className="font-medium">승인 대기 · {pending.approverName}</p><p className="mt-1 text-ssoo-text-muted">{pending.requesterName} 요청 · {time(pending.requestedAt)}</p>
      {!pending.currentVersion && <p className="mt-2 text-ssoo-warning">원본이 변경되었거나 열람할 수 없어 처리할 수 없습니다. 요청자가 철회한 후 원본과 권한을 확인해 다시 요청해 주세요.</p>}
      <Button className="mt-3" size="sm" variant="outline" disabled={busy} onClick={() => openSnapshot(pending)}>요청 당시 초안 확인</Button>
      {pending.canDecide && <div className="mt-3 space-y-2">
        <p className="text-ssoo-text-muted">요청 당시 초안을 확인한 후 처리해 주세요.</p>
        <label className="block" htmlFor={`${fieldId}-reason`}>반려 사유</label>
        <Textarea id={`${fieldId}-reason`} value={reason} onChange={event => setReason(event.target.value)} maxLength={2000} disabled={busy} placeholder="반려할 때에는 사유를 입력해 주세요." />
        <div className="flex flex-wrap gap-2"><Button size="sm" disabled={busy || reviewedRequest !== pending.id} onClick={() => decide(pending, 'approve')}>승인</Button><Button size="sm" variant="outline" disabled={busy || reviewedRequest !== pending.id || !reason.trim()} onClick={() => decide(pending, 'reject')}>반려</Button></div>
      </div>}
      {pending.canWithdraw && <Button className="mt-3 ml-2" size="sm" variant="outline" disabled={busy} onClick={() => decide(pending, 'withdraw')}>요청 철회</Button>}
    </div>}
    {data?.canRequest && <div className="mt-4 space-y-3">
      <Button size="sm" variant="outline" disabled={busy || !data.source} onClick={() => { setPreview(data.source); setReviewedVersion(data.source!.versionKey); }}>승인 요청할 초안 확인</Button>
      <div><label className="mb-1 block text-sm" htmlFor={`${fieldId}-approver`}>승인자</label><NativeSelect id={`${fieldId}-approver`} className="w-full" value={approver} onChange={event => setApprover(event.target.value)} disabled={busy}><option value="">승인자를 선택해 주세요</option>{candidates?.items.map(person => <option key={person.id} value={person.id}>{person.name} ({person.loginId})</option>)}</NativeSelect></div>
      <p className="text-xs text-ssoo-text-muted">계약과 해당 초안을 볼 권한이 있는 다른 사용자만 표시됩니다. 대상자가 없으면 원본 문서의 기존 공유 설정을 확인해 주세요.</p>
      {candidates?.nextCursor && <Button size="sm" variant="outline" disabled={busy} onClick={() => { setBusy(true); setError(''); void (async () => {
        const next = await api<CrmContractApprovalCandidates>(token!, `${path}/candidates?cursor=${encodeURIComponent(candidates.nextCursor!)}`);
        setCandidates(previous => ({ ...next, items: [...(previous?.items ?? []), ...next.items] }));
      })().catch(e => setError(e instanceof Error ? e.message : '승인자를 불러오지 못했습니다.')).finally(() => setBusy(false)); }}>승인자 더 보기</Button>}
      <Button size="sm" disabled={busy || !approver || !candidates?.items.some(person => person.id === approver) || reviewedVersion !== data.source?.versionKey} onClick={request}>승인 요청</Button>
    </div>}
    <div className="mt-4 border-t border-ssoo-border pt-3"><h3 className="text-sm font-medium">처리 이력</h3>
      {data?.items.length === 0 && <p className="mt-2 text-sm text-ssoo-text-muted">아직 승인 요청이 없습니다.</p>}
      <ol className="mt-2 space-y-3">{data?.items.filter(row => row.status !== 'pending').map(row => <li key={row.id} className="break-words rounded-lg border border-ssoo-border p-3 text-sm">
        <p className="font-medium">{statusLabel[row.status]} · {row.status === 'withdrawn' ? row.requesterName : row.approverName}</p>
        <p className="mt-1 text-xs text-ssoo-text-muted">요청: {row.requesterName} · {time(row.requestedAt)}</p><p className="mt-1 text-xs text-ssoo-text-muted">처리: {row.decidedAt ? time(row.decidedAt) : '미처리'}</p>
        {row.status === 'approved' && <p className="mt-2">{row.currentVersion ? '현재 초안 승인 완료' : '이전 초안의 승인 · 현재 초안에 적용되지 않습니다.'}</p>}
        {row.reason && <p className="mt-2 whitespace-pre-wrap">반려 사유: {row.reason}</p>}
        <Button size="sm" className="mt-2" variant="outline" disabled={busy} onClick={() => openSnapshot(row)}>요청 당시 초안 확인</Button>
      </li>)}</ol>
      {data?.nextCursor && <Button size="sm" className="mt-3" variant="outline" disabled={busy} onClick={() => void load(data.nextCursor!)}>이력 더 보기</Button>}
    </div>
    <Dialog open={Boolean(preview)} onOpenChange={open => { if (!open) setPreview(null); }}><DialogContent className="max-h-[85vh] w-[calc(100%_-_2rem)] max-w-3xl overflow-hidden"><DialogTitle>계약 초안 내용</DialogTitle><DialogDescription>{preview?.title} · 이 내용에 대한 내부 승인입니다.</DialogDescription><pre className="max-h-[55vh] min-w-0 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-ssoo-bg-secondary p-3 text-sm font-sans">{preview?.content}</pre><Button onClick={() => setPreview(null)}>내용 확인 완료</Button></DialogContent></Dialog>
  </section>;
}
