'use client';

import Link from 'next/link';

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@ssoo/web-ui';
import { SsooErrorNotice } from '@ssoo/web-shell';

interface SetupStatus { required: boolean; enabled: boolean }
async function setupRequest<T>(body?: Record<string, string>): Promise<T> {
  const response = await fetch('/api/initial-setup', { method: body ? 'POST' : 'GET', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error?.message ?? '최초 설정 상태를 확인하지 못했습니다.');
  return result.data as T;
}

export function InitialSetupLoginGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    let active = true;
    void setupRequest<SetupStatus>().then((status) => { if (active && status.required) router.replace('/setup'); })
      .catch((cause) => { if (active) setError(cause); });
    return () => { active = false; };
  }, [router]);
  return <>{error ? <SsooErrorNotice error={error} actions={[{ label: '최초 설정 확인', href: '/setup' }]} /> : null}{children}</>;
}

export default function InitialSetupPage() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [form, setForm] = useState({ setupCode: '', loginId: '', userName: '', email: '', password: '', confirmation: '' });
  const load = useCallback(async () => {
    setBusy(true); setError(null);
    try { setStatus(await setupRequest<SetupStatus>()); } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (form.password !== form.confirmation) { setError(new Error('비밀번호 확인이 일치하지 않습니다.')); return; }
    setBusy(true); setError(null);
    try {
      const result = await setupRequest<{ loginId: string }>({ setupCode: form.setupCode, loginId: form.loginId.trim(),
        userName: form.userName.trim(), email: form.email.trim(), password: form.password });
      setCreated(result.loginId); setForm({ setupCode: '', loginId: '', userName: '', email: '', password: '', confirmation: '' });
    } catch (cause) { setError(cause); } finally { setBusy(false); }
  };
  return <main className="min-h-screen bg-background px-4 py-10 sm:py-16">
    <div className="mx-auto max-w-xl space-y-6">
      <header className="space-y-2"><p className="text-sm font-medium text-primary">SSOO · 운영 시작</p>
        <h1 className="text-2xl font-semibold">최초 관리자 설정</h1>
        <p className="text-sm text-muted-foreground">플랫폼을 처음 준비하는 단계입니다. 관리자 계정을 만든 뒤 회사와 팀, 승인 담당자를 설정합니다.</p></header>
      {error ? <SsooErrorNotice error={error} actions={[{ label: '설정 상태 다시 확인', onClick: load, disabled: busy }]} /> : null}
      {created ? <section className="space-y-4 rounded-lg border p-6" aria-label="최초 설정 완료">
        <h2 className="text-lg font-semibold">관리자 계정이 준비되었습니다</h2><p><strong>{created}</strong> 계정으로 로그인할 수 있습니다.</p>
        <Button asChild><Link href="/login?returnTo=%2F%3Fonboarding%3D1">로그인하기</Link></Button>
      </section> : status && !status.required ? <section className="space-y-4 rounded-lg border p-6">
        <h2 className="text-lg font-semibold">이미 계정이 있는 플랫폼입니다</h2><p className="text-sm text-muted-foreground">최초 설정은 한 번만 사용할 수 있습니다. 기존 관리자로 로그인하거나 관리자에게 계정 발급을 요청해 주세요.</p>
        <Button asChild><Link href="/login">로그인으로 이동</Link></Button>
      </section> : status && !status.enabled ? <section className="space-y-4 rounded-lg border p-6">
        <h2 className="text-lg font-semibold">설치 담당자의 준비가 필요합니다</h2>
        <p className="text-sm">설치 담당자에게 ‘최초 관리자 설정 코드 준비’를 요청해 주세요. 준비된 코드를 전달받은 뒤 아래에서 다시 확인할 수 있습니다.</p>
        <Button onClick={() => void load()} disabled={busy}>설정 준비 다시 확인</Button>
      </section> : status ? <form name="ssoo-initial-setup" data-ssoo-credential-region="initial-setup" className="space-y-5 rounded-lg border bg-card p-6" onSubmit={submit}>
        <label className="block space-y-1 text-sm"><span>설치 확인 코드</span><Input id="ssoo-setup-code" name="ssoo-installation-code" data-ssoo-input-intent="noncredential-secret" type="password" autoComplete="off" required minLength={32} maxLength={256} value={form.setupCode} onChange={(e) => setForm({ ...form, setupCode: e.target.value })} /><span className="block text-muted-foreground">설치 담당자에게 받은 코드를 입력하세요.</span></label>
        <label className="block space-y-1 text-sm"><span>관리자 이름</span><Input required maxLength={100} name="ssoo-setup-name" autoComplete="name" value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} /></label>
        <label className="block space-y-1 text-sm"><span>이메일</span><Input required type="email" name="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label className="block space-y-1 text-sm"><span>로그인 ID</span><Input required maxLength={50} id="ssoo-setup-login" name="username" autoComplete="username" data-ssoo-input-intent="credential" value={form.loginId} onChange={(e) => setForm({ ...form, loginId: e.target.value })} /></label>
        <label className="block space-y-1 text-sm"><span>비밀번호</span><Input required type="password" id="ssoo-setup-password" name="new-password" autoComplete="new-password" data-ssoo-input-intent="credential" minLength={8} maxLength={100} pattern="(?=.*[A-Za-z])(?=.*[0-9])(?=.*[!@#$%^&*]).+" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><span className="block text-muted-foreground">8자 이상, 영문·숫자·특수문자(!@#$%^&amp;*)를 포함해 주세요.</span></label>
        <label className="block space-y-1 text-sm"><span>비밀번호 확인</span><Input required type="password" id="ssoo-setup-confirmation" name="confirm-password" autoComplete="new-password" data-ssoo-input-intent="credential" value={form.confirmation} onChange={(e) => setForm({ ...form, confirmation: e.target.value })} /></label>
        <Button type="submit" disabled={busy}>{busy ? '관리자 계정 준비 중…' : '관리자 계정 만들기'}</Button>
      </form> : !error ? <p role="status">최초 설정 상태를 확인하고 있습니다…</p> : null}
    </div>
  </main>;
}
