'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { CodeItem, CodeUsage } from '@ssoo/types/common';
import { getSharedAccessToken, resolveCommonSearchResultHref } from '@ssoo/web-auth';
import { SsooDataWorkspacePage, SsooErrorNotice, type SsooDataGridColumnDef } from '@ssoo/web-shell';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, NativeSelect, Textarea } from '@ssoo/web-ui';
import { useAuthStore } from '@/stores/auth.store';
import { useTabStore } from '@/stores/tab.store';
import { useCrmDomainAccess } from '@/lib/useCrmDomainAccess';

const groups = { payment_term: '수금조건', biz_type: '사업구분', group_type: '계열구분' };
type Group = keyof typeof groups;
type Editor = { kind: 'edit' | 'toggle' | 'remove'; item?: CodeItem };
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch('/api/codes' + path, { method, cache: 'no-store', headers: { Authorization: `Bearer ${getSharedAccessToken() ?? ''}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json() as { success: boolean; data: T; error?: { message?: string }; message?: string };
  if (!response.ok || !result.success) throw new Error(result.error?.message || result.message || '코드 요청에 실패했습니다.');
  return result.data;
}

export function CrmCodeManagement({ path = '' }: { path?: string }) {
  const token = useAuthStore(state => state.accessToken);
  const { access, error: accessError, retry: retryAccess } = useCrmDomainAccess(token);
  const canManage = access?.policy.hasSystemOverride === true;
  const openTab = useTabStore(state => state.openTab);
  const loadVersion = useRef(0);
  const [group, setGroup] = useState<Group>(() => { const requested = new URLSearchParams(path.split('?')[1]).get('codeGroup'); return requested && requested in groups ? requested as Group : 'payment_term'; });
  const [status, setStatus] = useState(() => new URLSearchParams(path.split('?')[1]).has('codeGroup') ? 'all' : 'active');
  const [items, setItems] = useState<CodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [usage, setUsage] = useState<CodeItem | null>(null);
  const load = useCallback(async () => {
    if (!token) return;
    const version = ++loadVersion.current;
    setLoading(true); setError(null);
    try { const result = await request<CodeItem[]>('?codeGroup=' + group); if (version === loadVersion.current) setItems(result); }
    catch (cause) { if (version === loadVersion.current) setError(cause instanceof Error ? cause.message : '조회에 실패했습니다.'); }
    finally { if (version === loadVersion.current) setLoading(false); }
  }, [group, token]);
  useEffect(() => { void load(); return () => { loadVersion.current += 1; }; }, [load]);
  const columns: SsooDataGridColumnDef<CodeItem>[] = [
    { accessorKey: 'displayNameKo', header: '코드명', size: 200 },
    { accessorKey: 'codeValue', header: '코드값', size: 160 },
    { accessorKey: 'sortOrder', header: '순서', size: 80 },
    { id: 'status', header: '상태', size: 100, cell: ({row:{original:item}}) => item.isActive ? '활성' : '비활성' },
    { id: 'actions', header: '작업', size: 350, cell: ({row:{original:item}}) => <div className="flex flex-wrap gap-2"><Button size="sm" disabled={!canManage || loading} onClick={() => setEditor({ kind: 'edit', item })}>정보 수정</Button><Button size="sm" variant="outline" disabled={!canManage || loading} onClick={() => setEditor({ kind: 'toggle', item })}>{item.isActive ? '비활성화' : '재활성화'}</Button><Button size="sm" variant="outline" disabled={!canManage} onClick={() => setUsage(item)}>참조·이력</Button>{!item.isActive && <Button size="sm" variant="outline" disabled={!canManage || loading} onClick={() => setEditor({ kind: 'remove', item })}>영구 삭제</Button>}</div> },
  ];
  return <>
    <SsooDataWorkspacePage compact title="CRM 업무 코드" description="수금조건·사업구분·계열구분을 관리합니다. 변경 사항은 CRM 입력 항목에 적용됩니다."
      breadcrumbItems={[{ label: 'CRM 설정' }, { label: '업무 코드' }]}
      toolbar={{ filterSummary: `${groups[group]} · ${status === 'all' ? '전체 상태' : status === 'active' ? '활성' : '비활성'}`, actions: [{ label: '코드 추가', onClick: () => setEditor({ kind: 'edit' }), disabled: !canManage || loading || !!error }, { label: '새로고침', variant: 'outline', onClick: () => void load(), disabled: loading }, { label: 'CRM 시스템 설정 ↗', variant: 'outline', onClick: () => openTab({ title: 'CRM 시스템 설정', path: '/operations/settings' }) }],
        filterSlot: <div className="flex flex-wrap gap-3"><label className="space-y-1 text-sm"><span>코드 유형</span><NativeSelect value={group} onChange={e => setGroup(e.target.value as Group)}>{Object.entries(groups).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></label><label className="space-y-1 text-sm"><span>상태</span><NativeSelect value={status} onChange={e => setStatus(e.target.value)}><option value="active">활성</option><option value="inactive">비활성</option><option value="all">전체</option></NativeSelect></label></div> }}
      statusSlot={<>{accessError && <SsooErrorNotice error={accessError} actions={[{ label: '권한 다시 확인', onClick: retryAccess }]} />}{access && !canManage && <p className="text-sm">조회 전용 · 코드 변경에는 플랫폼 관리 권한이 필요합니다.</p>}{notice && <p role="status" className="text-sm">{notice}</p>}</>}
      table={{ columns, data: items.filter(item => status === 'all' || (status === 'active' ? item.isActive : !item.isActive)), loading, error: error ? new Error(error) : undefined, onRetry: () => void load(), fitViewport: true, mobileSummaryColumns: ['displayNameKo', 'codeValue', 'status', 'actions'], emptyState: '이 조건의 코드가 없습니다.', enableSorting: false }} />
    {editor && <CodeEditor key={`${editor.kind}:${editor.item?.id ?? 'new'}`} editor={editor} group={group} onClose={() => setEditor(null)} onSaved={async () => { setEditor(null); setNotice('코드 변경이 적용되었습니다.'); window.dispatchEvent(new Event('crm-common-codes-changed')); await load(); }} />}
    {usage && <CodeReferences item={usage} onClose={() => setUsage(null)} />}
  </>;
}

function CodeEditor({ editor, group, onClose, onSaved }: { editor: Editor; group: Group; onClose: () => void; onSaved: () => Promise<void> }) {
  const item = editor.item;
  const [value, setValue] = useState(item?.codeValue ?? '');
  const [name, setName] = useState(item?.displayNameKo ?? '');
  const [sort, setSort] = useState(String(item?.sortOrder ?? 0));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const title = editor.kind === 'remove' ? '코드 영구 삭제' : editor.kind === 'toggle' ? item?.isActive ? '코드 비활성화' : '코드 재활성화' : item ? '코드 정보 수정' : '코드 추가';
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy || !reason.trim()) return;
    if (editor.kind === 'edit' && (!sort.trim() || !Number.isSafeInteger(Number(sort)) || Number(sort) < -2147483648 || Number(sort) > 2147483647)) { setError('정렬 순서는 정수로 입력하세요.'); return; }
    setBusy(true); setError(null);
    try {
      const audit = { reason: reason.trim(), expectedUpdatedAt: item?.updatedAt };
      if (editor.kind === 'remove' && item) await request(`/${item.id}/permanent`, 'DELETE', audit);
      else if (editor.kind === 'toggle' && item) await request(`/${item.id}`, item.isActive ? 'DELETE' : 'PUT', { ...audit, ...(!item.isActive ? { isActive: true } : {}) });
      else await request(item ? `/${item.id}` : '', item ? 'PUT' : 'POST', { ...audit, codeGroup: group, codeValue: value.trim(), displayNameKo: name.trim(), sortOrder: Number(sort) });
      await onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '저장에 실패했습니다.'); } finally { setBusy(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{groups[group]}{item ? ` · ${item.displayNameKo}` : ''}</DialogDescription></DialogHeader><form className="space-y-3" onSubmit={submit}>
    {editor.kind === 'edit' ? <><label className="block space-y-1 text-sm"><span>코드값</span><Input required value={value} disabled={busy} onChange={e => setValue(e.target.value)} /></label><label className="block space-y-1 text-sm"><span>코드명</span><Input required value={name} disabled={busy} onChange={e => setName(e.target.value)} /></label><label className="block space-y-1 text-sm"><span>정렬 순서</span><Input required type="number" value={sort} disabled={busy} onChange={e => setSort(e.target.value)} /></label></> : <p className="text-sm">{editor.kind === 'remove' ? '비활성 코드를 영구 삭제합니다. 기존 업무 자료의 사용 여부를 확인하세요. 감사 이력은 남습니다.' : item?.isActive ? '새 입력에서 선택되지 않도록 비활성화합니다. 기존 업무 자료의 사용 여부를 확인하세요.' : '새 입력에서 다시 선택할 수 있게 합니다.'}</p>}
    <label className="block space-y-1 text-sm"><span>변경 사유</span><Textarea required value={reason} disabled={busy} maxLength={2000} onChange={e => setReason(e.target.value)} /></label>{error && <SsooErrorNotice error={error} />}<DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>취소</Button><Button type="submit" disabled={busy || !reason.trim()}>{busy ? '처리 중…' : title}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}

function CodeReferences({ item, onClose }: { item: CodeItem; onClose: () => void }) {
  const [usage, setUsage] = useState<CodeUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setError(null); try { setUsage(await request<CodeUsage>(`/${item.id}/usage`)); } catch (cause) { setError(cause instanceof Error ? cause.message : '참조 조회 실패'); } }, [item.id]);
  useEffect(() => { void load(); }, [load]);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent><DialogHeader><DialogTitle>코드 참조·이력</DialogTitle><DialogDescription>{item.displayNameKo} · {item.codeValue}</DialogDescription></DialogHeader>{error ? <SsooErrorNotice error={error} actions={[{ label: '참조 다시 조회', onClick: () => void load() }]} /> : usage ? <div className="space-y-2 text-sm"><p>확인한 공통 직접 참조 {usage.total}건</p>{usage.references.map(entry => <p key={entry.name}>{entry.name}: {entry.count}건</p>)}<p>{usage.coverage}</p></div> : <p>참조 조회 중…</p>}<a className="text-sm underline" href={resolveCommonSearchResultHref({ sourceApp: 'admin', target: { sourceApp: 'admin', path: `/operation-history?category=code&subjectId=${encodeURIComponent(item.id)}` } }) || undefined}>공통 변경 이력 ↗</a></DialogContent></Dialog>;
}
