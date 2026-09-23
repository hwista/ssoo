'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, ArrowUpRight, Building2, Database, FileText, History, RefreshCw, RotateCcw, Save, Settings2 } from 'lucide-react';
import type {
  CrmOperationsAccessSnapshot,
  CrmSettings,
  CrmSettingsHistoryItem,
  CrmSettingsUpdateRequest,
} from '@ssoo/types/crm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Checkbox,
  Input,
  NativeSelect,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@ssoo/web-ui';
import { SSOO_CONTENT_PAGE_METRICS, SSOO_PAGE_CHROME_METRICS } from '@ssoo/web-shell';
import { useAuthStore } from '@/stores/auth.store';

interface BackendSuccessResponse<T> {
  success: true;
  data: T;
}

interface BackendErrorResponse {
  success?: false;
  error?: { message?: string };
  message?: string;
}

interface OperationsOverview {
  access: CrmOperationsAccessSnapshot;
  settings: CrmSettings;
}

function backendMessage(payload: BackendErrorResponse | null, fallback: string): string {
  return payload?.error?.message || payload?.message || fallback;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function toUpdateRequest(settings: CrmSettings): CrmSettingsUpdateRequest {
  return {
    expectedRevision: settings.revision,
    quoteTemplateKey: settings.quoteTemplateKey,
    contractTemplateKey: settings.contractTemplateKey,
    dmsHandoffEnabled: settings.dmsHandoffEnabled,
    pmsHandoffEnabled: settings.pmsHandoffEnabled,
    accountingHandoffEnabled: settings.accountingHandoffEnabled,
    accountingProviderMode: settings.accountingProviderMode,
    stalledAfterMinutes: settings.stalledAfterMinutes,
    attemptRetentionDays: settings.attemptRetentionDays,
    memo: settings.memo,
  };
}

export function CrmSettingsWorkspaceClient() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [settings, setSettings] = useState<CrmSettings | null>(null);
  const [draft, setDraft] = useState<CrmSettingsUpdateRequest | null>(null);
  const [access, setAccess] = useState<CrmOperationsAccessSnapshot | null>(null);
  const [history, setHistory] = useState<CrmSettingsHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const [overviewResponse, historyResponse] = await Promise.all([
        fetch('/api/crm/operations/overview', { cache: 'no-store', headers }),
        fetch('/api/crm/settings/history?limit=30', { cache: 'no-store', headers }),
      ]);
      const overviewPayload = await overviewResponse.json().catch(() => null) as BackendSuccessResponse<OperationsOverview> | BackendErrorResponse | null;
      const historyPayload = await historyResponse.json().catch(() => null) as BackendSuccessResponse<CrmSettingsHistoryItem[]> | BackendErrorResponse | null;
      if (!overviewResponse.ok || overviewPayload?.success !== true) {
        throw new Error(backendMessage(overviewPayload as BackendErrorResponse | null, 'CRM 설정을 불러오지 못했습니다.'));
      }
      if (!historyResponse.ok || historyPayload?.success !== true) {
        throw new Error(backendMessage(historyPayload as BackendErrorResponse | null, 'CRM 설정 이력을 불러오지 못했습니다.'));
      }
      setSettings(overviewPayload.data.settings);
      setDraft(toUpdateRequest(overviewPayload.data.settings));
      setAccess(overviewPayload.data.access);
      setHistory(historyPayload.data);
    } catch (cause) {
      setSettings(null);
      setDraft(null);
      setAccess(null);
      setHistory([]);
      setError(cause instanceof Error ? cause.message : 'CRM 설정 조회에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const canManage = access?.features.canManageSettings === true;
  const isDirty = useMemo(() => Boolean(settings && draft && JSON.stringify(toUpdateRequest(settings)) !== JSON.stringify(draft)), [draft, settings]);

  const save = async (payload = draft, successMessage = 'CRM 운영 설정이 저장되었습니다.') => {
    if (!accessToken || !payload || !canManage) return;
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/crm/settings', {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const responsePayload = await response.json().catch(() => null) as BackendSuccessResponse<CrmSettings> | BackendErrorResponse | null;
      if (!response.ok || responsePayload?.success !== true) {
        throw new Error(backendMessage(responsePayload as BackendErrorResponse | null, 'CRM 설정 저장에 실패했습니다.'));
      }
      setSettings(responsePayload.data);
      setDraft(toUpdateRequest(responsePayload.data));
      setNotice(successMessage);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'CRM 설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const restore = async (item: CrmSettingsHistoryItem) => {
    if (!settings) return;
    await save({
      ...toUpdateRequest(item),
      expectedRevision: settings.revision,
    }, `revision ${item.revision}의 설정을 새 revision으로 복원했습니다.`);
  };

  const updateDraft = <K extends keyof CrmSettingsUpdateRequest>(key: K, value: CrmSettingsUpdateRequest[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  };

  return (
    <div className="min-h-full min-w-0 bg-muted">
      <div className="mx-auto flex w-full min-w-0 flex-col gap-5 p-4" style={{ maxWidth: SSOO_CONTENT_PAGE_METRICS.mainContentWidthPx + SSOO_PAGE_CHROME_METRICS.stackPaddingPx * 2 }}>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">CRM 시스템 설정</h1>
              <p className="mt-1 text-sm text-muted-foreground">비밀정보를 저장하지 않는 문서 연동·운영 임계값 정본</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => void load()} disabled={!accessToken || isLoading || isSaving}>
              <RefreshCw className="h-4 w-4" /> 새로고침
            </Button>
            <Button size="sm" type="button" onClick={() => void save()} disabled={!canManage || !isDirty || isSaving}>
              <Save className="h-4 w-4" /> {isSaving ? '저장 중' : '저장'}
            </Button>
          </div>
        </header>

        {error ? (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
        {notice ? <div role="status" className="rounded-md border border-ssoo-success-border bg-ssoo-success-bg px-3 py-2 text-sm text-ssoo-success">{notice}</div> : null}
        {!isLoading && access && !canManage ? (
          <div className="rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground">현재 계정은 운영 조회 전용입니다. 설정 변경과 이력 복원은 CRM 관리자에게 요청하세요.</div>
        ) : null}

        {isLoading && !draft ? <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">CRM 설정을 확인하는 중입니다.</div> : null}
        {draft && settings ? (
          <>
            <section className="rounded-md border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">문서·외부 경계 설정</h2>
                  <p className="mt-1 text-xs text-muted-foreground">DMS 템플릿 key와 선택 연동 활성 상태를 관리합니다.</p>
                </div>
                <Badge variant="outline">revision {settings.revision}</Badge>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-4 px-5 py-5 xl:grid-cols-2">
                <Field label="견적 DMS 템플릿 key">
                  <Input value={draft.quoteTemplateKey} disabled={!canManage} maxLength={120} onChange={(event) => updateDraft('quoteTemplateKey', event.target.value)} />
                </Field>
                <Field label="계약 DMS 템플릿 key">
                  <Input value={draft.contractTemplateKey} disabled={!canManage} maxLength={120} onChange={(event) => updateDraft('contractTemplateKey', event.target.value)} />
                </Field>
                <ToggleField label="DMS 문서 인계" description="CRM 런칭 핵심 경계로 유지합니다." checked={draft.dmsHandoffEnabled} disabled />
                <ToggleField label="PMS 계약 인계" description="활성화하면 성공 probe가 readiness 필수가 됩니다." checked={draft.pmsHandoffEnabled} disabled={!canManage} onChange={(checked) => updateDraft('pmsHandoffEnabled', checked)} />
                <ToggleField label="회계·지급 인계" description="활성화하면 external API evidence가 필요합니다." checked={draft.accountingHandoffEnabled} disabled={!canManage} onChange={(checked) => setDraft((current) => current ? { ...current, accountingHandoffEnabled: checked, accountingProviderMode: checked ? 'external-api' : 'disabled' } : current)} />
                <Field label="회계 provider mode">
                  <NativeSelect value={draft.accountingProviderMode} disabled={!canManage} onChange={(event) => {
                    const mode = event.target.value as CrmSettingsUpdateRequest['accountingProviderMode'];
                    setDraft((current) => current ? { ...current, accountingProviderMode: mode, accountingHandoffEnabled: mode === 'external-api' } : current);
                  }}>
                    <option value="disabled">비활성</option>
                    <option value="external-api">외부 API</option>
                  </NativeSelect>
                </Field>
              </div>
            </section>

            <section className="flex flex-wrap items-center justify-between gap-4 rounded-md border bg-card px-5 py-4">
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div><h2 className="text-sm font-semibold text-foreground">공급자 회사정보·CI</h2><p className="mt-1 text-xs text-muted-foreground">기존 북마크와 권한 동선을 유지하며 견적·계약 공통 법정정보와 CI를 관리합니다.</p></div>
              </div>
              <Button asChild variant="outline" size="sm"><a href="/quote-settings">견적 설정 열기 <ArrowUpRight className="h-4 w-4" /></a></Button>
            </section>

            <section className="rounded-md border bg-card">
              <div className="border-b px-5 py-4">
                <h2 className="text-sm font-semibold text-foreground">운영 임계값·provenance</h2>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-4 px-5 py-5 xl:grid-cols-2">
                <Field label="정체 판정 시간(분)">
                  <Input type="number" min={5} max={1440} value={draft.stalledAfterMinutes} disabled={!canManage} onChange={(event) => updateDraft('stalledAfterMinutes', Number(event.target.value))} />
                </Field>
                <Field label="attempt 보존 기간(일)">
                  <Input type="number" min={7} max={3650} value={draft.attemptRetentionDays} disabled={!canManage} onChange={(event) => updateDraft('attemptRetentionDays', Number(event.target.value))} />
                </Field>
                <div className="xl:col-span-2">
                  <Field label="운영 메모">
                    <Textarea value={draft.memo ?? ''} disabled={!canManage} maxLength={4000} rows={3} onChange={(event) => updateDraft('memo', event.target.value)} />
                  </Field>
                </div>
                <ProvenanceItem label="저장소" value="database" icon={<Database className="h-4 w-4" />} />
                <ProvenanceItem label="마지막 변경" value={`${formatDateTime(settings.updatedAt)} · ${settings.source.lastActivity ?? '-'}`} icon={<FileText className="h-4 w-4" />} />
              </div>
            </section>

            <section className="overflow-hidden rounded-md border bg-card">
              <div className="flex items-center gap-2 border-b px-5 py-4">
                <History className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">설정 변경 이력</h2>
              </div>
              <div className="overflow-x-auto">
                <Table className="min-w-[760px] text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>시각</TableHead><TableHead>revision</TableHead><TableHead>이벤트</TableHead><TableHead>템플릿</TableHead><TableHead>수정자</TableHead><TableHead className="text-right">복원</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.length === 0 ? <TableRow><TableCell colSpan={6} className="py-6 text-left text-muted-foreground">기록된 변경 이력이 없습니다.</TableCell></TableRow> : null}
                    {history.map((item) => (
                      <TableRow key={item.historySequence}>
                        <TableCell>{formatDateTime(item.eventAt)}</TableCell>
                        <TableCell>{item.revision}</TableCell>
                        <TableCell>{item.eventType}</TableCell>
                        <TableCell>{item.quoteTemplateKey} / {item.contractTemplateKey}</TableCell>
                        <TableCell>{item.eventBy ?? '-'}</TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="outline" size="xs" disabled={!canManage || isSaving}><RotateCcw className="h-3.5 w-3.5" /> 복원</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>이 설정으로 복원할까요?</AlertDialogTitle>
                                <AlertDialogDescription>revision {item.revision}의 값을 현재 설정의 새 revision으로 저장합니다. 기존 이력은 삭제되지 않습니다.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction onClick={() => void restore(item)}>복원 실행</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block min-w-0 space-y-1.5 text-sm"><span className="font-medium text-muted-foreground">{label}</span>{children}</label>;
}

function ToggleField({ label, description, checked, disabled, onChange }: { label: string; description: string; checked: boolean; disabled?: boolean; onChange?: (checked: boolean) => void }) {
  return (
    <label className="flex min-w-0 items-start gap-3 rounded-md border bg-muted/40 px-4 py-3">
      <Checkbox checked={checked} disabled={disabled} onCheckedChange={(value) => onChange?.(value === true)} aria-label={label} />
      <span className="min-w-0 break-words"><span className="block text-sm font-medium text-foreground">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{description}</span></span>
    </label>
  );
}

function ProvenanceItem({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return <div className="flex min-w-0 items-start gap-3 rounded-md border bg-muted/40 px-4 py-3 text-sm"><span className="mt-0.5 text-muted-foreground">{icon}</span><span className="min-w-0 break-words"><span className="block text-xs text-muted-foreground">{label}</span><span className="mt-1 block font-medium text-foreground">{value}</span></span></div>;
}
