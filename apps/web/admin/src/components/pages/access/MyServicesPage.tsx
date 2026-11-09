'use client';

import { useState, type FormEvent } from 'react';
import type { OnboardingServiceCode } from '@ssoo/types/common';
import { usePlatformAccess, resolveCommonSearchResultHref } from '@ssoo/web-auth';
import { Button, NativeSelect, Textarea, Checkbox, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@ssoo/web-ui';
import { SsooErrorNotice, SsooWorkspacePage } from '@ssoo/web-shell';
import { useCreateParticipationRequest } from '@/hooks/queries/useParticipation';
import { RequestHistory, ROLE_LABELS, SERVICE_LABELS } from './RequestHistory';

export function MyServicesPage() {
  const access = usePlatformAccess();
  const create = useCreateParticipationRequest();
  const [open, setOpen] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const [services, setServices] = useState<OnboardingServiceCode[]>([]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  if (!access) return null;
  const { snapshot, refresh, refreshing } = access;
  const members = snapshot.organizations.filter((organization) => organization.member);
  const target = organizationId || members[0]?.id;
  const suspended = snapshot.status === 'suspended';
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!target || submitting || !services.length) return;
    setSubmitting(true);
    try {
      for (const serviceCode of services) {
        await create.mutateAsync({ kind: 'service', organizationId: target, serviceCode, message });
        setServices((previous) => previous.filter((entry) => entry !== serviceCode));
      }
      setOpen(false); setMessage(''); setNotice('서비스 이용을 신청했습니다. 서비스별 승인 결과를 내 신청 내역에서 확인하세요.');
    } catch { /* Completed requests remain visible; only unsent services stay selected. */ }
    finally { setSubmitting(false); }
  };
  return <SsooWorkspacePage compact scrollBody breadcrumb={["내 업무", "서비스 이용"]} title="서비스 이용" description="조직별 서비스 이용 권한과 역할을 확인하고 필요한 서비스를 신청합니다."
    headerActions={{ extraActions: [
      { label: '상태 새로고침', variant: 'outline', onClick: () => { void refresh(); }, disabled: refreshing },
      { label: '서비스 신청', onClick: () => { create.reset(); setOpen(true); }, disabled: suspended || !members.length },
    ] }}>
    {suspended ? <SsooErrorNotice message="플랫폼 이용이 정지된 계정입니다. 플랫폼 관리자에게 문의해 주세요." /> : null}
    {notice ? <p role="status" className="rounded-lg bg-muted p-3 text-sm">{notice}</p> : null}
    <section className="space-y-3"><h2 className="text-base font-semibold">현재 이용 권한</h2>
      {!members.length ? <p className="text-sm text-muted-foreground">서비스를 신청하려면 승인된 소속이 필요합니다. ‘내 소속’ 메뉴에서 소속을 신청하고 승인 상태를 확인하세요.</p> : null}
      {snapshot.isPlatformAdmin ? <p className="text-sm">플랫폼 관리자 권한으로 전체 서비스에 접근할 수 있습니다.</p> : null}
      {snapshot.grants.length ? <ul className="divide-y rounded-lg border">{snapshot.grants.map((grant) => <li key={grant.id} className="space-y-1 break-words p-4 text-sm">
        <p className="font-medium">{SERVICE_LABELS[grant.serviceCode]} · {ROLE_LABELS[grant.roleCode]}</p>
        <p>{grant.organizationId ? snapshot.organizations.find((organization) => organization.id === grant.organizationId)?.path ?? '조직' : '플랫폼 전체'}</p>
        {grant.expiresAt ? <p>이용 기한: {new Date(grant.expiresAt).toLocaleString('ko-KR')}</p> : null}
      </li>)}</ul> : <p className="rounded-lg border p-5 text-sm text-muted-foreground">조직별로 승인된 서비스 이용권이 없습니다.</p>}
      <div className="flex flex-wrap gap-2">{snapshot.availableServices.map((code) => <Button key={code} asChild variant="outline"><a href={resolveCommonSearchResultHref({ sourceApp: code, target: { sourceApp: code, path: '/' } }) ?? '/'}>{SERVICE_LABELS[code]} 열기</a></Button>)}</div>
    </section>
    <RequestHistory snapshot={snapshot} scope="service" />
    <Dialog open={open} onOpenChange={(value) => { if (!submitting) setOpen(value); }}><DialogContent className="max-h-[90dvh] overflow-y-auto">
      <DialogHeader><DialogTitle>서비스 신청</DialogTitle><DialogDescription>승인된 소속에서 사용할 서비스를 선택하세요. 서비스별로 각각 승인받습니다.</DialogDescription></DialogHeader>
      <form onSubmit={(event) => { void submit(event); }} className="space-y-4">
        <label className="block space-y-1 text-sm"><span>서비스를 사용할 조직</span><NativeSelect required disabled={submitting} value={target ?? ''} onChange={(event) => { setOrganizationId(event.target.value); setServices([]); }}>
          <option value="">승인된 조직을 선택하세요</option>{members.map((organization) => <option key={organization.id} value={organization.id}>{organization.path ?? organization.name}</option>)}
        </NativeSelect></label>
        <fieldset className="space-y-2"><legend className="mb-2 text-sm">이용할 서비스</legend>{(Object.keys(SERVICE_LABELS) as OnboardingServiceCode[]).map((code) => {
          const granted = snapshot.grants.some((grant) => grant.serviceCode === code && grant.organizationId === target);
          const pending = snapshot.requests.some((request) => request.serviceCode === code && request.organizationId === target && request.status === 'pending');
          return <label key={code} className="flex items-center gap-2 text-sm"><Checkbox checked={services.includes(code)} disabled={submitting || !target || granted || pending} onCheckedChange={(checked) => setServices((previous) => checked === true ? [...previous, code] : previous.filter((entry) => entry !== code))} />{SERVICE_LABELS[code]}{granted ? ' · 승인됨' : pending ? ' · 승인 대기' : ''}</label>;
        })}</fieldset>
        <label className="block space-y-1 text-sm"><span>신청 사유</span><Textarea required disabled={submitting} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
        {create.error ? <SsooErrorNotice error={create.error}>접수된 항목은 내 신청 내역에 유지됩니다. 남은 항목을 확인하고 다시 신청해 주세요.</SsooErrorNotice> : null}
        <DialogFooter><Button type="button" variant="outline" disabled={submitting} onClick={() => setOpen(false)}>닫기</Button><Button type="submit" disabled={submitting || !services.length || !message.trim() || suspended}>{submitting ? '신청 중…' : '신청'}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
  </SsooWorkspacePage>;
}
