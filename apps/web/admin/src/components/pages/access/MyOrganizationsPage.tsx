'use client';

import { useState, type FormEvent } from 'react';
import { usePlatformAccess } from '@ssoo/web-auth';
import { Button, Input, NativeSelect, Textarea, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@ssoo/web-ui';
import { SsooErrorNotice, SsooWorkspacePage } from '@ssoo/web-shell';
import { useCreateParticipationRequest } from '@/hooks/queries/useParticipation';
import { RequestHistory } from './RequestHistory';

export function MyOrganizationsPage() {
  const access = usePlatformAccess();
  const create = useCreateParticipationRequest();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'membership' | 'organization'>('membership');
  const [organizationId, setOrganizationId] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  if (!access) return null;
  const { snapshot, refresh, refreshing } = access;
  const members = snapshot.organizations.filter((organization) => organization.member);
  const suspended = snapshot.status === 'suspended';
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (create.isPending) return;
    try {
      await create.mutateAsync(kind === 'membership' ? { kind, organizationId, message } : { kind, organizationName: name, parentOrganizationId: organizationId || undefined, message });
      setOpen(false); setMessage(''); setName(''); setOrganizationId(''); setNotice('신청을 접수했습니다. 내 신청 내역에서 처리 상태를 확인하세요.');
    } catch { /* The mutation error remains in the dialog for retry. */ }
  };
  return <SsooWorkspacePage compact scrollBody breadcrumb={["내 업무", "내 소속"]} title="내 소속" description="승인된 소속을 확인하고 조직 소속·생성을 신청합니다."
    headerActions={{ extraActions: [
      { label: '상태 새로고침', variant: 'outline', onClick: () => { void refresh(); }, disabled: refreshing },
      { label: '소속 신청', onClick: () => { create.reset(); setOpen(true); }, disabled: suspended },
    ] }}>
    {suspended ? <SsooErrorNotice message="플랫폼 이용이 정지된 계정입니다. 플랫폼 관리자에게 문의해 주세요." /> : null}
    {notice ? <p role="status" className="rounded-lg bg-muted p-3 text-sm">{notice}</p> : null}
    <section className="space-y-3"><h2 className="text-base font-semibold">현재 소속</h2>
      <p className="text-sm">플랫폼 참여: {snapshot.status === 'active' ? '승인됨' : suspended ? '정지' : '소속 승인 대기'}</p>
      {members.length ? <ul className="divide-y rounded-lg border">{members.map((organization) => <li key={organization.id} className="break-words p-4 text-sm">{organization.path ?? organization.name}</li>)}</ul>
        : <p className="rounded-lg border p-5 text-sm text-muted-foreground">아직 승인된 소속이 없습니다. 소속 신청 후 담당자의 승인을 기다려 주세요.</p>}
      <p className="text-sm text-muted-foreground">소속 승인과 서비스 이용 승인은 별개입니다. 사용할 서비스는 ‘서비스 이용’ 메뉴에서 신청하세요.</p>
    </section>
    <RequestHistory snapshot={snapshot} scope="organization" />
    <Dialog open={open} onOpenChange={(value) => { if (!create.isPending) setOpen(value); }}><DialogContent className="max-h-[90dvh] overflow-y-auto">
      <DialogHeader><DialogTitle>소속 신청</DialogTitle><DialogDescription>소속할 조직을 선택하세요. 필요한 조직이 없으면 생성을 신청할 수 있습니다.</DialogDescription></DialogHeader>
      <form onSubmit={(event) => { void submit(event); }} className="space-y-4">
        <label className="block space-y-1 text-sm"><span>신청 방법</span><NativeSelect value={kind} onChange={(event) => { setKind(event.target.value as typeof kind); setOrganizationId(''); create.reset(); }}><option value="membership">기존 조직에 소속 신청</option><option value="organization">새 조직 생성 신청</option></NativeSelect></label>
        {kind === 'organization' ? <label className="block space-y-1 text-sm"><span>새 조직 이름</span><Input name="participation-organization-name" autoComplete="off" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label> : null}
        <label className="block space-y-1 text-sm"><span>{kind === 'membership' ? '소속할 조직' : '상위 조직'}</span><NativeSelect required={kind === 'membership'} value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>
          <option value="">{kind === 'membership' ? '조직을 선택하세요' : '없음 · 플랫폼 관리자에게 신청'}</option>
          {snapshot.organizations.map((organization) => <option key={organization.id} value={organization.id} disabled={kind === 'membership' && (organization.member || snapshot.requests.some((request) => request.kind === 'membership' && request.organizationId === organization.id && request.status === 'pending'))}>{organization.path ?? organization.name}{organization.member ? ' (소속됨)' : ''}</option>)}
        </NativeSelect></label>
        <label className="block space-y-1 text-sm"><span>신청 사유</span><Textarea required maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
        {create.error ? <SsooErrorNotice error={create.error} /> : null}
        <DialogFooter><Button type="button" variant="outline" disabled={create.isPending} onClick={() => setOpen(false)}>닫기</Button><Button type="submit" disabled={create.isPending || !message.trim() || suspended}>{create.isPending ? '신청 중…' : '신청'}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
  </SsooWorkspacePage>;
}
