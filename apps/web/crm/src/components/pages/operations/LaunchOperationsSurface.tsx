'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowUpRight, CheckCircle2, DatabaseZap, RefreshCw, RotateCw, ShieldAlert } from 'lucide-react';
import type {
  CrmDataQualityReport,
  CrmOperationAttempt,
  CrmOperationAttemptListResponse,
  CrmOperationsAccessSnapshot,
  CrmOperationsPreviewResponse,
  CrmReadiness,
  CrmSettings,
  CrmLaunchReadinessStatus,
  CrmLaunchReadinessSnapshot,
} from '@ssoo/types/crm';
import type { LaunchReadinessStatus } from '@ssoo/types/common';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ssoo/web-ui';

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
  preview: CrmOperationsPreviewResponse;
  settings: CrmSettings;
  readiness: CrmReadiness;
  dataQuality: CrmDataQualityReport;
}

const readinessLabel: Record<CrmLaunchReadinessStatus, string> = {
  ready: '준비',
  degraded: '주의',
  blocked: '차단',
  'not-required': '비대상',
};

const launchReadinessLabel: Record<LaunchReadinessStatus, string> = {
  ready: '준비',
  degraded: '주의',
  blocked: '차단',
  unknown: '확인 불가',
};

const actionLabel: Record<CrmOperationAttempt['action'], string> = {
  'quote-dms-lifecycle': '견적 DMS 문서',
  'opportunity-contract-document-lifecycle': '영업기회 계약서 DOCX',
  'contract-dms-lifecycle': '계약 DMS 문서',
  'pms-contract-handoff': 'PMS 계약 인계',
  'accounting-payment-execution': '회계·지급 실행',
};

const ownerAppBaseUrl: Partial<Record<CrmOperationAttempt['target'], string>> = {
  dms: process.env.NEXT_PUBLIC_DMS_APP_URL?.replace(/\/$/, '') || 'http://localhost:3003',
  pms: process.env.NEXT_PUBLIC_PMS_APP_URL?.replace(/\/$/, '') || 'http://localhost:3002',
};

function ownerHref(attempt: CrmOperationAttempt): string {
  const baseUrl = ownerAppBaseUrl[attempt.target];
  return baseUrl ? `${baseUrl}${attempt.ownerHref}` : attempt.ownerHref;
}

function errorMessage(payload: BackendErrorResponse | null, fallback: string) {
  return payload?.error?.message || payload?.message || fallback;
}

function formatDateTime(value?: string): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export function LaunchOperationsSurface({ accessToken }: { accessToken: string | null }) {
  const [overview, setOverview] = useState<OperationsOverview | null>(null);
  const [access, setAccess] = useState<CrmOperationsAccessSnapshot | null>(null);
  const [attempts, setAttempts] = useState<CrmOperationAttemptListResponse | null>(null);
  const [launchReadiness, setLaunchReadiness] = useState<CrmLaunchReadinessSnapshot | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [isLoading, setIsLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const accessResponse = await fetch('/api/crm/operations/access', { cache: 'no-store', headers });
      const accessPayload = await accessResponse.json().catch(() => null) as BackendSuccessResponse<CrmOperationsAccessSnapshot> | BackendErrorResponse | null;
      if (!accessResponse.ok || accessPayload?.success !== true) {
        throw new Error(errorMessage(accessPayload as BackendErrorResponse | null, 'CRM 운영 권한을 확인하지 못했습니다.'));
      }
      setAccess(accessPayload.data);
      if (!accessPayload.data.features.canReadOperations) {
        setOverview(null);
        setAttempts(null);
        return;
      }
      const [overviewResponse, attemptsResponse, launchReadinessResponse] = await Promise.all([
        fetch('/api/crm/operations/overview', { cache: 'no-store', headers }),
        fetch('/api/crm/operations/attempts?limit=100', { cache: 'no-store', headers }),
        fetch('/api/crm/operations/launch-readiness', { cache: 'no-store', headers }),
      ]);
      const overviewPayload = await overviewResponse.json().catch(() => null) as BackendSuccessResponse<OperationsOverview> | BackendErrorResponse | null;
      const attemptsPayload = await attemptsResponse.json().catch(() => null) as BackendSuccessResponse<CrmOperationAttemptListResponse> | BackendErrorResponse | null;
      const launchReadinessPayload = await launchReadinessResponse.json().catch(() => null) as BackendSuccessResponse<CrmLaunchReadinessSnapshot> | BackendErrorResponse | null;
      if (!overviewResponse.ok || overviewPayload?.success !== true) {
        throw new Error(errorMessage(overviewPayload as BackendErrorResponse | null, 'CRM 운영 readiness를 불러오지 못했습니다.'));
      }
      if (!attemptsResponse.ok || attemptsPayload?.success !== true) {
        throw new Error(errorMessage(attemptsPayload as BackendErrorResponse | null, 'CRM 운영 attempt를 불러오지 못했습니다.'));
      }
      if (!launchReadinessResponse.ok || launchReadinessPayload?.success !== true) {
        throw new Error(errorMessage(launchReadinessPayload as BackendErrorResponse | null, 'CRM launch snapshot을 불러오지 못했습니다.'));
      }
      setOverview(overviewPayload.data);
      setAttempts(attemptsPayload.data);
      setLaunchReadiness(launchReadinessPayload.data);
    } catch (cause) {
      setOverview(null);
      setAttempts(null);
      setLaunchReadiness(null);
      setAccess(null);
      setError(cause instanceof Error ? cause.message : 'CRM 운영 상태 조회에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(timer);
  }, []);

  const retry = async (attempt: CrmOperationAttempt) => {
    if (!accessToken || !overview?.access.features.canExecuteOperations) return;
    setRetryingId(attempt.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/crm/operations/attempts/${encodeURIComponent(attempt.id)}/retry`, {
        method: 'POST',
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<unknown> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(errorMessage(payload as BackendErrorResponse | null, '운영 attempt 재시도에 실패했습니다.'));
      }
      setNotice(`attempt ${attempt.id} 재시도를 완료했습니다.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '운영 attempt 재시도에 실패했습니다.');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <section aria-labelledby="launch-operations-heading" className="min-w-0 rounded-md border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-4">
        <div>
          <h2 id="launch-operations-heading" className="text-base font-semibold text-foreground">Live 런칭 운영 상태</h2>
          <p className="mt-1 break-words text-xs text-muted-foreground">DB probe와 운영 원장을 직접 조회합니다. 조회 실패는 준비 상태로 대체하지 않습니다.</p>
        </div>
        <Button variant="outline" size="sm" type="button" onClick={() => void load()} disabled={!accessToken || isLoading || retryingId !== null}>
          <RefreshCw className="h-4 w-4" /> {isLoading ? '확인 중' : '상태 새로고침'}
        </Button>
      </div>

      {error ? <div role="alert" className="flex items-start gap-2 border-b bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div> : null}
      {notice ? <div role="status" className="border-b bg-ssoo-success-bg px-4 py-3 text-sm text-ssoo-success">{notice}</div> : null}
      {isLoading && !overview ? <div className="p-5 text-sm text-muted-foreground">실제 런칭 상태를 확인하는 중입니다.</div> : null}
      {!isLoading && access && !access.features.canReadOperations ? (
        <div className="p-5 text-sm text-muted-foreground">현재 계정에는 live 운영 상태 조회 권한이 없습니다. 아래 기존 CRM 운영 기준 Preview는 계속 확인할 수 있습니다.</div>
      ) : null}

      {overview && attempts && launchReadiness ? (
        <div className="min-w-0 space-y-5 p-4">
          {(() => {
            const stale = !launchReadiness.expiresAt || Date.parse(launchReadiness.expiresAt) <= now;
            const status: LaunchReadinessStatus = stale ? 'unknown' : launchReadiness.status;
            const blockerCount = stale ? null : launchReadiness.blockerCount;
            const degradedCount = stale ? null : launchReadiness.degradedCount;
            return <>
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatusMetric label="런칭 readiness" value={launchReadinessLabel[status]} status={status} detail={`${blockerCount ?? '—'} 차단 · ${degradedCount ?? '—'} 주의`} />
            <StatusMetric label="데이터 품질" value={overview.dataQuality.status === 'ready' ? '정상' : overview.dataQuality.status === 'degraded' ? '주의' : '차단'} status={overview.dataQuality.status} detail={`${overview.dataQuality.findingCount}건 발견 · ${overview.dataQuality.violationCount}건 위반`} />
            <StatusMetric label="미복구 실패" value={`${attempts.unresolvedFailedCount}건`} status={attempts.unresolvedFailedCount > 0 ? 'degraded' : 'ready'} detail={`원본 실패 ${attempts.failedCount}건 · 복구 완료 ${attempts.recoveredFailedCount}건`} />
            <StatusMetric label="정체 attempt" value={`${attempts.stalledCount}건`} status={attempts.stalledCount > 0 ? 'blocked' : 'ready'} detail={`${attempts.stalledAfterMinutes}분 기준`} />
          </div>
          <p className="break-words text-xs text-muted-foreground">
            {stale ? '스냅샷 유효 시간이 지나 확인 불가로 전환했습니다. 상태 새로고침을 실행하세요.' : launchReadiness.reason}
            {' · '}snapshot {launchReadiness.snapshotId ?? '없음'} · {formatDateTime(launchReadiness.checkedAt ?? undefined)} · {launchReadiness.source}
          </p>
            </>;
          })()}

          <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
            <section className="min-w-0 overflow-hidden rounded-md border">
              <div className="flex items-center gap-2 border-b px-4 py-3"><ShieldAlert className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">의존성 readiness</h3></div>
              <div className="divide-y">
                {overview.readiness.checks.map((check) => (
                  <div key={check.key} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0"><div className="text-sm font-medium text-foreground">{check.label}</div><p className="mt-1 break-words text-xs text-muted-foreground">{check.reason}</p><p className="mt-1 break-words text-xs text-muted-foreground">{check.owner} · {formatDateTime(check.checkedAt)}</p></div>
                    <ReadinessBadge status={check.status} />
                  </div>
                ))}
              </div>
            </section>

            <section className="min-w-0 overflow-hidden rounded-md border">
              <div className="flex items-center gap-2 border-b px-4 py-3"><DatabaseZap className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">데이터 품질 진단</h3></div>
              <div className="divide-y">
                {overview.dataQuality.checks.map((check) => (
                  <div key={check.key} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0"><div className="text-sm font-medium text-foreground">{check.label}</div><p className="mt-1 break-words text-xs text-muted-foreground">{check.reason}</p>{check.entityIds.length > 0 ? <p className="mt-1 break-all text-xs text-ssoo-danger">대상: {check.entityIds.slice(0, 10).join(', ')}</p> : null}</div>
                    <Badge variant={check.status === 'ready' ? 'default' : check.status === 'degraded' ? 'secondary' : 'destructive'}>{check.status === 'ready' ? '정상' : check.status === 'degraded' ? `주의 ${check.findingCount}건` : `${check.violationCount}건`}</Badge>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="min-w-0 overflow-hidden rounded-md border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"><div><h3 className="text-sm font-semibold text-foreground">외부 경계 attempt 원장</h3><p className="mt-1 break-words text-xs text-muted-foreground">오류는 자격 증명을 제거한 메시지와 retry chain으로 보존합니다.</p></div><Badge variant="outline">실행 권한 {overview.access.features.canExecuteOperations ? '있음' : '없음'}</Badge></div>
            <div className="overflow-x-auto">
              <Table className="min-w-[980px] text-xs">
                <TableHeader><TableRow><TableHead>attempt</TableHead><TableHead>경계</TableHead><TableHead>대상</TableHead><TableHead>상태</TableHead><TableHead>요청자/시각</TableHead><TableHead>오류</TableHead><TableHead className="text-right">복구</TableHead></TableRow></TableHeader>
                <TableBody>
                  {attempts.items.length === 0 ? <TableRow><TableCell colSpan={7} className="py-6 text-left text-muted-foreground">기록된 운영 attempt가 없습니다.</TableCell></TableRow> : null}
                  {attempts.items.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell className="font-medium">#{attempt.id} · {attempt.attemptNumber}차{attempt.retryOfAttemptId ? ` · #${attempt.retryOfAttemptId} 재시도` : ''}<div className="mt-1 break-all font-normal text-muted-foreground">correlation {attempt.correlationId}</div></TableCell>
                      <TableCell>{actionLabel[attempt.action]}<div className="mt-1 text-muted-foreground">{attempt.target}</div></TableCell>
                      <TableCell>{attempt.sourceEntityType}<div className="mt-1 break-all text-muted-foreground">{attempt.sourceEntityId}</div></TableCell>
                      <TableCell><AttemptStatusBadge status={attempt.status} /></TableCell>
                      <TableCell>{attempt.requestedBy ?? '-'}<div className="mt-1 text-muted-foreground">{formatDateTime(attempt.startedAt ?? attempt.createdAt)}</div></TableCell>
                      <TableCell className="max-w-[280px] whitespace-normal"><span className={attempt.errorMessage ? 'text-ssoo-danger' : undefined}>{attempt.errorMessage ?? '-'}</span><div className="mt-1 text-muted-foreground">{attempt.recoverySummary}</div></TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          {attempt.status === 'failed' ? <Button asChild variant="outline" size="xs"><a href={ownerHref(attempt)} target={attempt.target === 'dms' || attempt.target === 'pms' ? '_blank' : undefined} rel="noreferrer">소유 화면 <ArrowUpRight className="h-3.5 w-3.5" /></a></Button> : null}
                          {attempt.status === 'failed' ? <Button asChild variant="outline" size="xs"><a href={attempt.sourceHref}>CRM 대상</a></Button> : null}
                        {attempt.status === 'failed' && attempt.recoveryStatus === 'recovered' ? <Badge variant="default">복구 완료</Badge> : null}
                        {attempt.status === 'failed' && attempt.recoveryStatus === 'recovering' ? <Badge variant="outline">복구 중</Badge> : null}
                        {attempt.retryable ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="outline" size="xs" disabled={!overview.access.features.canExecuteOperations || retryingId !== null}><RotateCw className="h-3.5 w-3.5" /> 재시도</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>실패 attempt를 재시도할까요?</AlertDialogTitle><AlertDialogDescription>소유 화면에서 원인을 수정했는지 확인한 뒤 correlation {attempt.correlationId}에 새 retry 항목을 생성합니다. 원본 실패 기록과 correlation은 보존됩니다.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={() => void retry(attempt)}>재시도 실행</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : attempt.status !== 'failed' ? '-' : attempt.recoveryStatus === 'unresolved' ? <Badge variant="outline">수동 복구</Badge> : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function ReadinessBadge({ status }: { status: CrmLaunchReadinessStatus }) {
  const variant = status === 'ready' ? 'default' : status === 'blocked' ? 'destructive' : status === 'degraded' ? 'secondary' : 'outline';
  return <Badge variant={variant}>{readinessLabel[status]}</Badge>;
}

function AttemptStatusBadge({ status }: { status: CrmOperationAttempt['status'] }) {
  const labels: Record<CrmOperationAttempt['status'], string> = { queued: '대기', running: '실행 중', succeeded: '성공', failed: '실패', cancelled: '취소' };
  return <Badge variant={status === 'succeeded' ? 'default' : status === 'failed' ? 'destructive' : 'outline'}>{labels[status]}</Badge>;
}

function StatusMetric({ label, value, detail, status }: { label: string; value: string; detail: string; status: CrmLaunchReadinessStatus | LaunchReadinessStatus }) {
  return <div className="min-w-0 rounded-md border bg-muted/30 px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-medium text-muted-foreground">{label}</span>{status === 'ready' ? <CheckCircle2 className="h-4 w-4 text-ssoo-success" /> : <AlertCircle className="h-4 w-4 text-ssoo-danger" />}</div><div className="mt-2 text-lg font-semibold text-foreground">{value}</div><div className="mt-1 break-words text-xs text-muted-foreground">{detail}</div></div>;
}
