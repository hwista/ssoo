'use client';
import { useState } from 'react';
import type { EmbeddingIntegrationConfig, IntegrationSettings } from '@ssoo/types/common';
import { SsooErrorNotice } from '@ssoo/web-shell';
import { Button, Checkbox, Input, NativeSelect } from '@ssoo/web-ui';
import { useIntegration, useProbeIntegration, useSaveIntegration, useEmbeddingReindex } from '@/hooks/queries/useIntegrations';

export function EmbeddingSettingsPanel() {
  const query = useIntegration('embedding');
  return <section className="min-w-0 space-y-3 rounded-lg border p-4" aria-label="임베딩 연결 설정"><h2 className="text-base font-semibold">임베딩 연결 설정</h2><p className="text-sm text-muted-foreground">로컬 모델은 기존 서버 CPU를 사용합니다. 외부 호출료는 없으며, 첫 연결 확인 때 모델을 한 번 다운로드합니다. Azure로 전환하면 해당 제공자의 요금이 적용됩니다.</p>{query.error ? <SsooErrorNotice error={query.error} actions={[{ label: '다시 조회', onClick: () => query.refetch() }]} /> : query.data ? <EmbeddingSettingsForm key={`${query.data.updatedAt ?? 'initial'}:${query.dataUpdatedAt}`} initial={query.data} reload={() => query.refetch()} /> : <p role="status">임베딩 설정을 불러오는 중...</p>}</section>;
}

function EmbeddingSettingsForm({ initial, reload }: { initial: IntegrationSettings<'embedding'>; reload: () => void }) {
  const [config, setConfig] = useState(initial.config);
  const [secret, setSecret] = useState('');
  const [clearSecret, setClearSecret] = useState(false);
  const [reason, setReason] = useState('');
  const [sourceApp, setSourceApp] = useState('dms');
  const reindex = useEmbeddingReindex();
  const probe = useProbeIntegration('embedding');
  const save = useSaveIntegration('embedding');
  const busy = probe.isPending || save.isPending;
  const change = <K extends keyof EmbeddingIntegrationConfig>(key: K, value: EmbeddingIntegrationConfig[K]) => { setConfig(previous => ({ ...previous, [key]: value })); probe.reset(); };
  const body = { config, secret: clearSecret ? null : secret, expectedUpdatedAt: initial.updatedAt, reason: reason.trim() };
  return <div className="space-y-3"><div className="grid gap-3 md:grid-cols-2">
    <label className="space-y-1 text-sm"><span>임베딩 제공자</span><NativeSelect disabled={busy} value={config.provider} onChange={event => { change('provider', event.target.value as EmbeddingIntegrationConfig['provider']); setSecret(''); setClearSecret(false); }}><option value="environment">기존 서버 환경 설정</option><option value="local">로컬 다국어 E5 small (384차원)</option><option value="azure-openai">Azure OpenAI</option></NativeSelect></label>
    {config.provider === 'azure-openai' && <>
      <label className="space-y-1 text-sm"><span>임베딩 Endpoint</span><Input type="url" value={config.endpoint} onChange={event => change('endpoint', event.target.value)} placeholder="https://리소스.openai.azure.com" /></label>
      <label className="space-y-1 text-sm"><span>임베딩 배포 이름</span><Input value={config.deployment} onChange={event => change('deployment', event.target.value)} /></label>
      <label className="space-y-1 text-sm"><span>임베딩 차원</span><Input type="number" min={1} max={2000} value={config.dimension} onChange={event => change('dimension', Number(event.target.value))} /></label>
      <label className="space-y-1 text-sm"><span>임베딩 API 버전</span><Input value={config.apiVersion} onChange={event => change('apiVersion', event.target.value)} /></label>
      <div className="space-y-2"><label className="block space-y-1 text-sm"><span>임베딩 API Key</span><Input id="embedding-api-key" name="embedding-api-key" type="password" autoComplete="off" data-ssoo-input-intent="noncredential-secret" data-1p-ignore="true" data-lpignore="true" data-bwignore="true" value={secret} disabled={clearSecret} onChange={event => { setSecret(event.target.value); probe.reset(); }} placeholder="공백은 저장된 키 유지" /></label><label className="flex items-center gap-2 text-sm"><Checkbox checked={clearSecret} onCheckedChange={value => setClearSecret(value === true)} />저장된 API Key 삭제</label><p className="text-xs text-muted-foreground">현재 제공자 비밀값: {initial.secretConfigured ? '저장됨 (조회 불가)' : '없음'}</p></div>
    </>}
  </div>
  {config.provider === 'local' && <p className="text-sm text-muted-foreground">multilingual-e5-small · CPU 2개 스레드 · 순차 처리 · 5분간 사용하지 않으면 모델 메모리 해제. 한국어를 포함한 다국어 검색을 지원합니다.</p>}
  {config.provider !== 'environment' && <label className="flex items-center gap-2 text-sm"><Checkbox checked={config.enabled} disabled={busy} onCheckedChange={value => change('enabled', value === true)} />임베딩 활성화</label>}
  <p className="text-sm text-muted-foreground">모델·배포·차원이 바뀌면 기존 벡터는 새 검색에 섞이지 않습니다. 설정 저장 후 아래에서 재색인을 등록하고 대기 job을 실행하세요. 키워드 검색은 유지됩니다. 채팅 생성 모델과 자동 실행 설정은 별개입니다.</p>
  <label className="block space-y-1 text-sm"><span>임베딩 설정 변경 사유</span><Input value={reason} maxLength={500} onChange={event => setReason(event.target.value)} /></label>
  {(probe.error || save.error) && <SsooErrorNotice error={probe.error || save.error} />}
  {probe.data && (probe.data.ok ? <p role="status" className="text-sm">{probe.data.message}</p> : <SsooErrorNotice error={probe.data.message} />)}
  {busy && <p role="status" className="text-sm">연결을 확인하고 있습니다. 최초 로컬 모델 준비에는 시간이 걸릴 수 있습니다.</p>}
  <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || !reason.trim()} onClick={() => probe.mutate(body)}>임베딩 생성 확인</Button><Button disabled={busy || !reason.trim()} onClick={() => save.mutate(body)}>임베딩 설정 저장·적용</Button><Button variant="outline" disabled={busy} onClick={reload}>임베딩 설정 다시 불러오기</Button></div>
  <div className="flex flex-wrap items-end gap-2"><label className="space-y-1 text-sm"><span>재색인 애플리케이션</span><NativeSelect value={sourceApp} onChange={event => setSourceApp(event.target.value)}><option value="dms">DMS</option><option value="sns">SNS</option><option value="pms">PMS</option><option value="crm">CRM</option></NativeSelect></label><Button variant="outline" disabled={busy || reindex.isPending || !reason.trim() || JSON.stringify(config) !== JSON.stringify(initial.config) || Boolean(secret) || clearSecret} onClick={() => reindex.mutate({ sourceApp, reason: reason.trim() })}>등록 문서 재색인 (최대 20건)</Button></div>
  <p className="text-xs text-muted-foreground">현재 모델의 벡터가 없거나 오래된 등록 문서만 선택합니다. 이미 대기·실행 중인 대상은 중복 등록하지 않습니다. 위 변경 사유를 재색인 사유로 기록합니다.</p>
  {reindex.error && <SsooErrorNotice error={reindex.error} />}{reindex.data && <p role="status" className="text-sm">{reindex.data.message}</p>}
  </div>;
}
