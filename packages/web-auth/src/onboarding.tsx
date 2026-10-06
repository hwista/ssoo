'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { AuthIdentity, OnboardingRequest, OnboardingRoleCode, OnboardingServiceCode, OnboardingSnapshot } from '@ssoo/types/common';
import type { StoreApi, UseBoundStore } from 'zustand';
import { Button, Checkbox, Input, NativeSelect, Textarea } from '@ssoo/web-ui';
import { SsooErrorNotice, SsooErrorPage } from '@ssoo/web-shell';
import type { AuthStore } from './store';
import { createSharedAxiosApiClient } from './axios-api-client';
import { getCommonSearchApiBaseUrl, resolveCommonSearchResultHref } from './search-routing';

const labels = { crm: '영업관리 · CRM', pms: '프로젝트관리 · PMS', dms: '문서관리 · DMS', sns: '협업 · SNS' };
const statuses = { pending: '승인 대기', approved: '승인', rejected: '반려', cancelled: '취소' };
const cardClass = 'space-y-4 rounded-xl border bg-background p-5';
const api = () => createSharedAxiosApiClient({ baseURL: getCommonSearchApiBaseUrl() });

export interface SharedOnboardingBoundaryProps<TUser extends AuthIdentity = AuthIdentity> {
  authStore: UseBoundStore<StoreApi<AuthStore<TUser>>>;
  app: 'admin' | OnboardingServiceCode;
  pathname: string;
  children: ReactNode;
}

/** Shared by every app. Admission errors use the same recovery template as domain errors. */
export function SharedOnboardingBoundary<TUser extends AuthIdentity>({ authStore, app, pathname, children }: SharedOnboardingBoundaryProps<TUser>) {
  const authenticated = authStore((state) => state.isAuthenticated);
  const accessToken = authStore((state) => state.accessToken);
  const user = authStore((state) => state.user);
  const logout = authStore((state) => state.logout);
  const [result, setResult] = useState<{ identity: string; snapshot: OnboardingSnapshot } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [explicit, setExplicit] = useState(false);
  const identity = user?.userId ?? '';
  const generation = useRef(0);
  const publicSurface = /^\/(login|auth|password-reset|recovery)(\/|$)/.test(pathname);
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    if (!authenticated || !accessToken || publicSurface) { setResult(null); setError(null); return; }
    setLoading(true);
    try {
      const response = await api().get<{ success: boolean; data: OnboardingSnapshot }>('/onboarding');
      if (!response.data.success) throw new Error('소속·서비스 상태를 확인하지 못했습니다.');
      if (version === generation.current) { setResult({ identity, snapshot: response.data.data }); setError(null); }
    } catch (cause) { if (version === generation.current) setError(cause); }
    finally { if (version === generation.current) setLoading(false); }
  }, [authenticated, accessToken, identity, publicSurface]);
  useEffect(() => {
    setExplicit(new URLSearchParams(window.location.search).get('onboarding') === '1');
    void refresh();
    const focus = () => { void refresh(); };
    window.addEventListener('focus', focus);
    return () => { generation.current++; window.removeEventListener('focus', focus); };
  }, [refresh, pathname]);
  // The existing app auth boundary owns cookie restoration. A persisted identity
  // without its in-memory token is not yet an authenticated API session.
  if (publicSurface || !authenticated || !accessToken) return children;
  if (error) return <SsooErrorPage error={error} title="소속·서비스 상태를 확인하지 못했습니다" onRetry={refresh} retrying={loading}
    actions={[{ label: '로그아웃', onClick: logout, intent: 'exit' }]} />;
  if (!result || result.identity !== identity) return <main className="grid min-h-screen place-items-center"><p role="status">소속·서비스 승인 상태를 확인하고 있습니다…</p></main>;
  const snapshot = result.snapshot;
  const allowed = snapshot.status === 'active' && (app === 'admin' ? snapshot.isPlatformAdmin : snapshot.availableServices.includes(app));
  if (allowed && !explicit) return children;
  return <OnboardingPage snapshot={snapshot} refresh={refresh} refreshing={loading} logout={logout} canReturn={allowed} />;
}

function OnboardingPage({ snapshot, refresh, refreshing, logout, canReturn }: {
  snapshot: OnboardingSnapshot; refresh: () => Promise<void>; refreshing: boolean; logout: () => Promise<void>; canReturn: boolean;
}) {
  const [kind, setKind] = useState<'membership' | 'organization'>('membership');
  const [organizationId, setOrganizationId] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [parentOrganizationId, setParentOrganizationId] = useState('');
  const [serviceOrganizationId, setServiceOrganizationId] = useState('');
  const [selectedServices, setSelectedServices] = useState<OnboardingServiceCode[]>([]);
  const [message, setMessage] = useState('');
  const [serviceMessage, setServiceMessage] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const members = snapshot.organizations.filter((organization) => organization.member);
  const run = async (operation: () => Promise<unknown>, confirmation: string) => {
    if (busy) return;
    setBusy(true); setError(null); setNotice('');
    try { await operation(); setNotice(confirmation); await refresh(); }
    catch (cause) { setError(cause); }
    finally { setBusy(false); }
  };
  const submitOrganization = (event: FormEvent) => {
    event.preventDefault();
    void run(() => api().post('/onboarding/requests', kind === 'membership'
      ? { kind, organizationId, message }
      : { kind, organizationName, parentOrganizationId: parentOrganizationId || undefined, message }), '신청을 접수했습니다. 승인 결과를 이 화면에서 확인할 수 있습니다.');
  };
  const submitServices = (event: FormEvent) => {
    event.preventDefault();
    const target = serviceOrganizationId || members[0]?.id;
    void run(async () => {
      // Keep successfully submitted choices disabled if a later request fails.
      for (const serviceCode of selectedServices) {
        await api().post('/onboarding/requests', { kind: 'service', organizationId: target, serviceCode, message: serviceMessage });
        setSelectedServices((previous) => previous.filter((code) => code !== serviceCode));
        await refresh();
      }
    }, '서비스 이용을 신청했습니다. 각 서비스 담당자가 승인하면 이용할 수 있습니다.');
  };
  const orgOptions = snapshot.organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}{organization.member ? ' (소속됨)' : ''}</option>);
  return <main className="min-h-screen bg-muted/20 px-4 py-8 text-foreground sm:px-8">
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2"><p className="text-sm font-medium text-primary">SSOO · 소속과 서비스</p><h1 className="text-2xl font-semibold">함께 일할 조직과 서비스를 선택해 주세요</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">계정 생성 후 조직 소속과 서비스 이용을 각각 승인받습니다. 전체 공개 문서와 게시물은 이 플랫폼 안에서 공유됩니다.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={refreshing} onClick={() => void refresh()}>상태 새로고침</Button><Button variant="ghost" onClick={() => { void logout().catch(setError); }}>로그아웃</Button></div>
      </header>
      {error ? <SsooErrorNotice error={error} /> : null}
      {notice ? <p role="status" className="rounded-md bg-muted p-3 text-sm">{notice}</p> : null}
      {snapshot.status === 'suspended' ? <SsooErrorNotice message="플랫폼 이용이 정지된 계정입니다. 플랫폼 관리자에게 문의해 주세요." /> : <>
        <section className={cardClass} aria-labelledby="onboarding-current"><h2 id="onboarding-current" className="font-semibold">현재 이용 상태</h2>
          <p className="text-sm">소속 조직: {members.length ? members.map((organization) => organization.name).join(', ') : '아직 승인된 소속이 없습니다.'}</p>
          <div className="flex flex-wrap gap-2">{snapshot.availableServices.map((code) => {
            const href = resolveCommonSearchResultHref({ sourceApp: code, target: { sourceApp: code, path: '/' } });
            return href ? <Button asChild variant="outline" key={code}><a href={href}>{labels[code]} 열기</a></Button> : null;
          })}{snapshot.isPlatformAdmin ? <Button asChild variant="outline"><a href={resolveCommonSearchResultHref({ sourceApp: 'admin', target: { sourceApp: 'admin', path: '/' } }) ?? '/'}>시스템 관리 열기</a></Button> : null}
          {canReturn ? <Button asChild variant="ghost"><a href="/">현재 앱으로 돌아가기</a></Button> : null}</div>
        </section>
        <div className="grid gap-6 md:grid-cols-2">
          <form className={cardClass} onSubmit={submitOrganization}><h2 className="font-semibold">1. 조직 소속 신청</h2>
            <label className="block space-y-1 text-sm"><span>신청 방법</span><NativeSelect value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><option value="membership">기존 조직에 소속 신청</option><option value="organization">새 조직 생성 신청</option></NativeSelect></label>
            {kind === 'membership' ? <label className="block space-y-1 text-sm"><span>소속할 조직</span><NativeSelect required value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}><option value="">조직을 선택해 주세요</option>{orgOptions}</NativeSelect></label> : <>
              <label className="block space-y-1 text-sm"><span>새 조직 이름</span><Input name="onboarding-organization-name" autoComplete="off" required maxLength={120} value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} /></label>
              <label className="block space-y-1 text-sm"><span>상위 조직</span><NativeSelect value={parentOrganizationId} onChange={(event) => setParentOrganizationId(event.target.value)}><option value="">없음 · 플랫폼 관리자에게 신청</option>{orgOptions}</NativeSelect></label></>}
            <label className="block space-y-1 text-sm"><span>소속 신청 사유</span><Textarea required maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
            <Button type="submit" disabled={busy}>조직 신청</Button>
          </form>
          <form className={cardClass} onSubmit={submitServices}><h2 className="font-semibold">2. 서비스 이용 신청</h2>
            <p className="text-sm text-muted-foreground">조직 소속 승인 후 해당 조직에서 사용할 서비스를 신청해 주세요.</p>
            <label className="block space-y-1 text-sm"><span>서비스를 사용할 조직</span><NativeSelect required value={serviceOrganizationId || members[0]?.id || ''} onChange={(event) => setServiceOrganizationId(event.target.value)}><option value="">승인된 조직이 필요합니다</option>{members.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</NativeSelect></label>
            <fieldset className="space-y-2"><legend className="mb-2 text-sm">이용할 서비스</legend>{(Object.keys(labels) as OnboardingServiceCode[]).map((code) => {
              const target = serviceOrganizationId || members[0]?.id;
              const granted = snapshot.grants.some((grant) => grant.serviceCode === code && grant.organizationId === target);
              const pending = snapshot.requests.some((request) => request.kind === 'service' && request.serviceCode === code && request.organizationId === target && request.status === 'pending');
              return <label key={code} className="flex items-center gap-2 text-sm"><Checkbox disabled={busy || !target || granted || pending} checked={selectedServices.includes(code)} onCheckedChange={(checked) => setSelectedServices((previous) => checked === true ? [...previous, code] : previous.filter((value) => value !== code))} />{labels[code]}{granted ? ' · 승인됨' : pending ? ' · 승인 대기' : ''}</label>;
            })}</fieldset>
            <label className="block space-y-1 text-sm"><span>서비스 신청 사유</span><Textarea required maxLength={2000} value={serviceMessage} onChange={(event) => setServiceMessage(event.target.value)} /></label>
            <Button type="submit" disabled={busy || !members.length || !selectedServices.length}>서비스 신청</Button>
          </form>
        </div>
        <section className={cardClass}><h2 className="font-semibold">내 신청 내역</h2>{snapshot.requests.length ? <ul className="divide-y">{snapshot.requests.map((request) => <li key={request.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm"><div className="min-w-0 space-y-1 break-words"><p className="font-medium">{request.organizationName ?? '조직'}{request.serviceCode ? ` · ${labels[request.serviceCode]}` : request.kind === 'organization' ? ' · 신규 조직' : ' · 소속'} — {statuses[request.status]}</p><p>{request.message}</p>{request.decisionMessage ? <p className="text-muted-foreground">처리 사유: {request.decisionMessage}</p> : null}</div>{request.status === 'pending' ? <Button variant="outline" disabled={busy} onClick={() => void run(() => api().delete(`/onboarding/requests/${request.id}`), '신청을 취소했습니다.')}>신청 취소</Button> : null}</li>)}</ul> : <p className="text-sm text-muted-foreground">아직 신청 내역이 없습니다.</p>}</section>
        {snapshot.canReview ? <OnboardingReviews onChanged={refresh} /> : null}
        {snapshot.isPlatformAdmin ? <OnboardingAuthorities snapshot={snapshot} /> : null}
      </>}
    </div>
  </main>;
}

function OnboardingReviews({ onChanged }: { onChanged: () => Promise<void> }) {
  const [requests, setRequests] = useState<OnboardingRequest[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const refresh = useCallback(async () => {
    try { const response = await api().get<{ data: OnboardingRequest[] }>('/onboarding/reviews'); setRequests(response.data.data); setError(null); }
    catch (cause) { setError(cause); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return <section className={cardClass}><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">담당 신청 승인함</h2><Button variant="outline" onClick={() => void refresh()}>승인함 새로고침</Button></div>
    {error ? <SsooErrorNotice error={error} actions={[{ label: '다시 조회', onClick: refresh, intent: 'retry' }]} /> : null}
    {requests?.length === 0 ? <p className="text-sm text-muted-foreground">담당 범위에 대기 중인 신청이 없습니다. 본인 신청은 다른 승인자가 처리합니다.</p> : null}
    {requests === null && !error ? <p role="status">승인함을 불러오고 있습니다…</p> : null}
    {requests?.map((request) => <ReviewRow key={request.id} request={request} onChanged={async () => { await refresh(); await onChanged(); }} />)}
  </section>;
}

function ReviewRow({ request, onChanged }: { request: OnboardingRequest; onChanged: () => Promise<void> }) {
  const [message, setMessage] = useState(''); const [role, setRole] = useState<OnboardingRoleCode>('user');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null);
  const decide = async (decision: 'approve' | 'reject') => {
    setBusy(true); setError(null);
    try { await api().post(`/onboarding/requests/${request.id}/decision`, { decision, message, roleCode: role }); await onChanged(); }
    catch (cause) { setError(cause); }
    finally { setBusy(false); }
  };
  return <div className="space-y-3 rounded-lg border p-4 text-sm"><p className="font-medium">{request.userName} · {request.organizationName}{request.serviceCode ? ` · ${labels[request.serviceCode]}` : request.kind === 'organization' ? ' · 신규 조직 생성' : ' · 조직 소속'}</p><p className="break-words">{request.message}</p>
    {request.kind === 'service' ? <label className="block space-y-1"><span>부여할 서비스 역할</span><NativeSelect value={role} onChange={(event) => setRole(event.target.value as OnboardingRoleCode)}><option value="viewer">조회자</option><option value="user">일반 사용자</option><option value="manager">서비스 관리자</option></NativeSelect></label> : null}
    <label className="block space-y-1"><span>승인·반려 사유</span><Input name={`onboarding-decision-${request.id}`} autoComplete="off" value={message} maxLength={2000} onChange={(event) => setMessage(event.target.value)} /></label>
    {error ? <SsooErrorNotice error={error} /> : null}<div className="flex gap-2"><Button disabled={busy || !message.trim()} onClick={() => void decide('approve')}>승인</Button><Button variant="outline" disabled={busy || !message.trim()} onClick={() => void decide('reject')}>반려</Button></div>
  </div>;
}

type Authority = { id: string; userId: string; userName: string; organizationName: string | null; authorityKind: string; serviceCode: string; maxRoleCode: string; isActive: boolean };
function OnboardingAuthorities({ snapshot }: { snapshot: OnboardingSnapshot }) {
  const [authorities, setAuthorities] = useState<Authority[]>([]); const [users, setUsers] = useState<{ id: string; userName: string }[]>([]);
  const [userId, setUserId] = useState(''); const [kind, setKind] = useState('organization'); const [orgId, setOrgId] = useState('');
  const [service, setService] = useState<OnboardingServiceCode>('crm'); const [role, setRole] = useState('user');
  const [error, setError] = useState<unknown>(null); const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => { try {
    const [authorityResponse, userResponse] = await Promise.all([api().get<{ data: Authority[] }>('/onboarding/authorities'), api().get<{ data: { id: string; userName: string }[] }>('/users', { params: { limit: 100 } })]);
    setAuthorities(authorityResponse.data.data); setUsers(userResponse.data.data); setError(null);
  } catch (cause) { setError(cause); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const mutate = async (operation: () => Promise<unknown>) => { setBusy(true); setError(null); try { await operation(); await refresh(); } catch (cause) { setError(cause); } finally { setBusy(false); } };
  return <section className={cardClass}><h2 className="font-semibold">승인 권한 위임 · 플랫폼 관리자</h2>
    <p className="text-sm text-muted-foreground">조직·서비스 담당자는 지정된 범위의 신청만 처리합니다. 이 위임으로 시스템 관리 앱 권한이 부여되지는 않습니다.</p>
    {error ? <SsooErrorNotice error={error} actions={[{ label: '다시 조회', onClick: refresh, intent: 'retry' }]} /> : null}
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void mutate(() => api().post('/onboarding/authorities', { userId, authorityKind: kind, organizationId: orgId || undefined, serviceCode: kind === 'service' ? service : undefined, maxRoleCode: role })); }}>
      <label className="space-y-1 text-sm"><span>승인 담당자</span><NativeSelect required value={userId} onChange={(event) => setUserId(event.target.value)}><option value="">사용자 선택</option>{users.map((user) => <option value={user.id} key={user.id}>{user.userName}</option>)}</NativeSelect></label>
      <label className="space-y-1 text-sm"><span>승인 유형</span><NativeSelect value={kind} onChange={(event) => setKind(event.target.value)}><option value="organization">조직 소속·하위 조직 생성</option><option value="service">서비스 이용</option></NativeSelect></label>
      <label className="space-y-1 text-sm"><span>담당 조직</span><NativeSelect required={kind === 'organization'} value={orgId} onChange={(event) => setOrgId(event.target.value)}><option value="">{kind === 'service' ? '플랫폼 내 모든 조직' : '조직 선택'}</option>{snapshot.organizations.map((organization) => <option value={organization.id} key={organization.id}>{organization.name}</option>)}</NativeSelect></label>
      {kind === 'service' ? <><label className="space-y-1 text-sm"><span>담당 서비스</span><NativeSelect value={service} onChange={(event) => setService(event.target.value as OnboardingServiceCode)}>{(Object.keys(labels) as OnboardingServiceCode[]).map((code) => <option key={code} value={code}>{labels[code]}</option>)}</NativeSelect></label><label className="space-y-1 text-sm"><span>부여 가능한 최대 역할</span><NativeSelect value={role} onChange={(event) => setRole(event.target.value)}><option value="viewer">조회자</option><option value="user">일반 사용자</option><option value="manager">서비스 관리자</option></NativeSelect></label></> : null}
      <div className="self-end"><Button type="submit" disabled={busy}>승인 권한 위임</Button></div>
    </form>
    <ul className="divide-y">{authorities.filter((entry) => entry.isActive).map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span>{entry.userName} · {entry.organizationName ?? '전체 조직'} · {entry.serviceCode || '조직 승인'} · {entry.maxRoleCode}</span><Button variant="outline" disabled={busy} onClick={() => void mutate(() => api().delete(`/onboarding/authorities/${entry.id}`))}>위임 회수</Button></li>)}</ul>
  </section>;
}
