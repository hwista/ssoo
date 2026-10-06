'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCommonNotificationEventStream } from '@ssoo/web-auth';
import type { SnsPostAccessState } from '@ssoo/types/sns';
import { Button, NativeSelect, Textarea } from '@ssoo/web-ui';
import { SsooErrorNotice } from '@ssoo/web-shell';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores';

const statusLabels = { pending: '승인 대기', approved: '승인', rejected: '반려', cancelled: '철회', revoked: '회수' };

export function PostAccessPanel({ postId, onChanged }: { postId: string; onChanged: () => void }) {
  const userId = useAuthStore(state => state.user?.userId);
  const [state, setState] = useState<SnsPostAccessState | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [role, setRole] = useState<'read' | 'write'>('read');
  const refreshSequence = useRef(0);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const sequence = ++refreshSequence.current;
    try {
      const response = await apiClient.get<{ success: boolean; data: SnsPostAccessState }>(`/sns/post-access/${encodeURIComponent(postId)}`, { signal });
      if (!response.data.success) throw new Error('공유 상태를 불러오지 못했습니다.');
      if (!signal?.aborted && sequence === refreshSequence.current) { setState(response.data.data); setError(null); }
    } catch (cause) { if (!signal?.aborted && sequence === refreshSequence.current) setError(cause); }
  }, [postId]);
  useCommonNotificationEventStream('sns', {
    enabled: Boolean(userId),
    onDomainEvent: event => {
      if (event.domainEvent?.type === 'sns.post-access.changed' || event.domainEvent?.type === 'sns.feed.changed') {
        const changedId = event.domainEvent.payload?.postId;
        if (!changedId || changedId === postId) { void refresh(); onChanged(); }
      }
    },
  });
  useEffect(() => {
    setState(null); setError(null); setMessage('');
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => { controller.abort(); refreshSequence.current += 1; };
  }, [refresh, userId]);
  const mutate = async (path: string, body: object) => {
    setBusy(true); setError(null);
    try { await apiClient.post(path, body); setMessage(''); await refresh(); onChanged(); }
    catch (cause) { await refresh(); setError(cause); }
    finally { setBusy(false); }
  };
  return <section className="space-y-3 rounded-lg border bg-card p-4">
    <div className="flex items-center justify-between gap-2"><h2 className="text-heading-sm">개별 공유</h2><Button variant="outline" size="sm" disabled={busy} onClick={() => { void refresh(); onChanged(); }}>새로고침</Button></div>
    <p className="text-sm text-muted-foreground">소유자가 승인한 사용자에게 권한을 추가합니다. 게시물의 기본 공개 범위는 유지됩니다.</p>
    {error ? <SsooErrorNotice error={error} actions={[{ label: '다시 시도', onClick: () => void refresh() }]} /> : null}
    {state && !state.canManage && !state.requests.some(request => request.statusCode === 'pending') ? <form className="space-y-2" onSubmit={event => { event.preventDefault(); void mutate(`/sns/post-access/${postId}/requests`, { role: state.canRead ? role : 'read', message }); }}>
      {state.canRead ? <label className="block text-sm">신청 권한<NativeSelect aria-label="신청 권한" value={role} onChange={event => setRole(event.target.value as 'read' | 'write')} disabled={busy}><option value="read">읽기</option><option value="write">수정</option></NativeSelect></label> : null}
      <Textarea aria-label="공유 신청 사유" value={message} onChange={event => setMessage(event.target.value)} maxLength={500} disabled={busy} placeholder="권한이 필요한 사유를 입력해 주세요." />
      <Button type="submit" size="sm" disabled={busy || !message.trim() || (state.canRead && role === 'read')}>권한 신청</Button>
    </form> : null}
    {state?.requests.map(request => <div key={request.id} className="space-y-2 border-t pt-3">
      <p className="text-sm">사용자 #{request.requesterUserId} · {request.requestedRole === 'write' ? '수정' : '읽기'} · {statusLabels[request.statusCode]}</p>
      <p className="whitespace-pre-wrap text-sm">{request.requestMessage}</p>
      {request.decisionMessage ? <p className="text-sm text-muted-foreground">{request.decisionMessage}</p> : null}
      {request.expiresAt ? <p className="text-sm text-muted-foreground">만료: {new Date(request.expiresAt).toLocaleString()}</p> : null}
      <div className="flex flex-wrap gap-2">
        {state.canManage && request.statusCode === 'pending' ? <><Button size="sm" disabled={busy} onClick={() => void mutate(`/sns/post-access/requests/${request.id}/decision`, { decision: 'approve' })}>승인</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void mutate(`/sns/post-access/requests/${request.id}/decision`, { decision: 'reject' })}>반려</Button></> : null}
        {state.canManage && request.statusCode === 'approved' ? <Button size="sm" variant="outline" disabled={busy} onClick={() => void mutate(`/sns/post-access/requests/${request.id}/decision`, { decision: 'revoke' })}>권한 회수</Button> : null}
        {!state.canManage && request.statusCode === 'pending' ? <Button size="sm" variant="outline" disabled={busy} onClick={() => void mutate(`/sns/post-access/requests/${request.id}/decision`, { decision: 'cancel' })}>신청 철회</Button> : null}
      </div>
    </div>)}
  </section>;
}
