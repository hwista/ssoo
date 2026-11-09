'use client';
import { useState } from 'react';
import type { IntegrationSettings, MailIntegrationConfig } from '@ssoo/types/common';
import { SsooErrorNotice } from '@ssoo/web-shell';
import { Button, Checkbox, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, NativeSelect } from '@ssoo/web-ui';
import { useIntegration, useSaveIntegration, useProbeIntegration, useTestMail, useLocalMailbox, useLocalMail } from '@/hooks/queries/useIntegrations';

export function MailSettingsPanel() {
  const query = useIntegration('mail');
  return <section className="min-w-0 space-y-3 rounded-lg border p-4" aria-label="메일 연결 설정">
    <h2 className="text-base font-semibold">메일 연결 설정</h2>
    <p className="text-sm text-muted-foreground">로컬 수신함은 외부 주소에 발송하지 않습니다. 회사 SMTP 또는 Microsoft 메일 지원이 준비되면 제공자를 변경하고 연결 확인 → 저장·적용 → 시험 발송 순서로 확인하세요.</p>
    {query.error ? <SsooErrorNotice error={query.error} actions={[{ label: '다시 조회', onClick: () => query.refetch() }]} /> : query.data ? <MailSettingsForm key={`${query.data.updatedAt ?? 'initial'}:${query.dataUpdatedAt}`} initial={query.data} reload={() => query.refetch()} /> : <p role="status">연결 설정을 불러오는 중...</p>}
  </section>;
}

function MailSettingsForm({ initial, reload }: { initial: IntegrationSettings<'mail'>; reload: () => void }) {
  const [config, setConfig] = useState(initial.config);
  const [secret, setSecret] = useState('');
  const [clearSecret, setClearSecret] = useState(false);
  const [reason, setReason] = useState('');
  const [to, setTo] = useState('');
  const [showInbox, setShowInbox] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const save = useSaveIntegration('mail');
  const probe = useProbeIntegration('mail');
  const test = useTestMail();
  const inbox = useLocalMailbox(showInbox);
  const message = useLocalMail(selected);
  const busy = save.isPending || probe.isPending || test.isPending;
  const dirty = JSON.stringify(config) !== JSON.stringify(initial.config) || Boolean(secret) || clearSecret;
  const body = { config, secret: clearSecret ? null : secret, expectedUpdatedAt: initial.updatedAt, reason: reason.trim() };
  const change = <K extends keyof MailIntegrationConfig>(key: K, value: MailIntegrationConfig[K]) => { setConfig(previous => ({ ...previous, [key]: value })); probe.reset(); test.reset(); };
  return <div className="space-y-3">
    <div className="grid gap-3 md:grid-cols-2">
      <label className="space-y-1 text-sm"><span>메일 제공자</span><NativeSelect disabled={busy} value={config.provider} onChange={event => { change('provider', event.target.value as MailIntegrationConfig['provider']); setSecret(''); setClearSecret(false); }}><option value="environment">기존 서버 환경 설정</option><option value="local">로컬 수신함 (외부 전달 없음)</option><option value="smtp">회사 SMTP</option><option value="microsoft-graph">Microsoft 365 메일 (Graph)</option></NativeSelect></label>
      {config.provider !== 'environment' && <label className="space-y-1 text-sm"><span>연결 발신 주소</span><Input type="email" value={config.fromAddress} onChange={event => change('fromAddress', event.target.value)} placeholder={config.provider === 'local' ? '비워 두면 ssoo@local.invalid' : '발신 사서함 주소'} /></label>}
      {config.provider === 'smtp' && <>
        <label className="space-y-1 text-sm"><span>SMTP 호스트</span><Input value={config.host} onChange={event => change('host', event.target.value)} /></label>
        <label className="space-y-1 text-sm"><span>SMTP 포트</span><Input type="number" min={1} max={65535} value={config.port} onChange={event => change('port', Number(event.target.value))} /></label>
        <label className="space-y-1 text-sm"><span>SMTP 연결 보안</span><NativeSelect value={config.tls} onChange={event => change('tls', event.target.value as MailIntegrationConfig['tls'])}><option value="starttls">STARTTLS (보통 587)</option><option value="tls">TLS (보통 465)</option><option value="none">암호화 없음 (신뢰하는 내부 릴레이 전용)</option></NativeSelect></label>
        <label className="space-y-1 text-sm"><span>SMTP 계정 (인증 없는 내부 릴레이는 공백)</span><Input id="smtp-account" name="smtp-account" autoComplete="off" data-ssoo-input-intent="noncredential-secret" value={config.username} onChange={event => change('username', event.target.value)} /></label>
      </>}
      {config.provider === 'microsoft-graph' && <>
        <label className="space-y-1 text-sm"><span>메일 Tenant ID</span><Input value={config.tenantId} onChange={event => change('tenantId', event.target.value)} /></label>
        <label className="space-y-1 text-sm"><span>메일 Client ID</span><Input value={config.clientId} onChange={event => change('clientId', event.target.value)} /></label>
        <p className="text-sm text-muted-foreground md:col-span-2">Exchange Online 발신 사서함과 애플리케이션 Mail.Send 권한·관리자 동의가 필요합니다. 로그인용 Microsoft 설정과 별개입니다. 인증 성공만으로 수신 완료를 보장하지 않습니다.</p>
      </>}
      {(config.provider === 'smtp' || config.provider === 'microsoft-graph') && <div className="space-y-2">
        <label className="block space-y-1 text-sm"><span>{config.provider === 'smtp' ? 'SMTP 비밀번호' : '메일 Client Secret'}</span><Input id="mail-provider-secret" name="mail-provider-secret" type="password" autoComplete="off" data-ssoo-input-intent="noncredential-secret" data-1p-ignore="true" data-lpignore="true" data-bwignore="true" value={secret} disabled={clearSecret} onChange={event => { setSecret(event.target.value); probe.reset(); }} placeholder="새 값 입력 · 공백은 해당 제공자의 기존 값 유지" /></label>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={clearSecret} onCheckedChange={value => setClearSecret(value === true)} />이 제공자의 저장된 비밀값 삭제</label>
        <p className="text-xs text-muted-foreground">현재 적용 제공자 비밀값: {initial.secretConfigured ? '저장됨 (조회 불가)' : '없음'}</p>
      </div>}
    </div>
    {config.provider !== 'environment' && <label className="flex items-center gap-2 text-sm"><Checkbox checked={config.enabled} disabled={busy} onCheckedChange={value => change('enabled', value === true)} />메일 발송 활성화</label>}
    <p className="text-sm text-muted-foreground">자동 발송은 활성화 이후 생성된 메일부터 처리합니다. 기존 대기 메일은 검토 후 기존의 수동 전달 버튼으로 처리할 수 있습니다. 저장한 연결 발신 주소가 우선 적용됩니다.</p>
    <label className="block space-y-1 text-sm"><span>메일 설정 변경 사유</span><Input maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>
    {(save.error || probe.error || test.error) && <SsooErrorNotice error={save.error || probe.error || test.error} />}
    {probe.data && (probe.data.ok ? <p role="status" className="text-sm">{probe.data.message}</p> : <SsooErrorNotice error={probe.data.message} />)}
    {test.data && <p role="status" className="text-sm">{test.data.message}</p>}
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || !reason.trim()} onClick={() => probe.mutate(body)}>메일 연결 확인</Button><Button disabled={busy || !reason.trim()} onClick={() => save.mutate(body)}>메일 설정 저장·적용</Button><Button variant="outline" disabled={busy} onClick={reload}>메일 설정 다시 불러오기</Button></div>
    <div className="flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 space-y-1 text-sm"><span>시험 메일 수신 주소</span><Input type="email" value={to} onChange={event => setTo(event.target.value)} /></label><Button variant="outline" disabled={busy || dirty || !to.trim()} onClick={() => test.mutate(to.trim())}>시험 메일 보내기</Button></div>
    {dirty && <p className="text-xs text-muted-foreground">시험 메일은 설정을 저장한 후 보낼 수 있습니다.</p>}
    <Button variant="outline" onClick={() => { setShowInbox(true); if (showInbox) void inbox.refetch(); }}>로컬 수신함 조회</Button>
    {showInbox && <div className="space-y-2"><p className="text-sm text-muted-foreground">관리자 전용 · 최근 50건 표시 · 최대 100건/24시간 보관 · 비밀번호 복구 코드를 포함할 수 있습니다.</p>{inbox.error ? <SsooErrorNotice error={inbox.error} /> : inbox.isLoading ? <p role="status">수신함을 불러오는 중...</p> : inbox.data?.length ? inbox.data.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm"><div className="min-w-0 break-words"><p>{item.subject}</p><p className="text-muted-foreground">{item.to.join(', ')} · {new Date(item.createdAt).toLocaleString('ko-KR')}</p></div><Button variant="outline" size="sm" onClick={() => setSelected(item.id)}>본문 보기</Button></div>) : <p className="text-sm">로컬 수신 메일이 없습니다.</p>}</div>}
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>로컬 수신 메일</DialogTitle><DialogDescription>로컬에 보관된 내용입니다. 외부 수신자의 사서함에는 전달되지 않습니다.</DialogDescription></DialogHeader>{message.error ? <SsooErrorNotice error={message.error} /> : message.data ? <div className="space-y-3 text-sm"><p>{message.data.subject}</p><p className="break-all">{message.data.to.join(', ')}</p><pre className="whitespace-pre-wrap break-words font-sans">{message.data.text}</pre></div> : <p role="status">메일을 불러오는 중...</p>}</DialogContent></Dialog>
  </div>;
}
