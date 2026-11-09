'use client';

import { useState } from 'react';
import { SsooErrorNotice, SsooDataGrid, type SsooDataGridColumnDef } from '@ssoo/web-shell';
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, NativeSelect, Textarea } from '@ssoo/web-ui';
import { useAiJobDetail, useAiJobs, useRetryAiJob } from '@/hooks/queries/useAiOperations';

const statuses: Record<string, string> = { pending: '대기', running: '실행 중', indexed: '완료', skipped: '생략', failed: '실패', cancelled: '취소' };
const date = (value?: string | null) => value ? new Date(value).toLocaleString('ko-KR') : '—';

export function AiJobsPanel({ initialStatus = '' }: { initialStatus?: string }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(initialStatus);
  const [sourceApp, setSourceApp] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const query = useAiJobs({ page, pageSize: 20, status: status || undefined, sourceApp: sourceApp || undefined });
  const columns: SsooDataGridColumnDef<NonNullable<typeof query.data>['items'][number]>[] = [

    { id: 'target', header: '작업·대상', size: 240, cell: ({row:{original:job}}) => <>#{job.id} · {job.sourceApp.toUpperCase()}<p className="break-all text-xs text-muted-foreground">{job.entityType} · {job.entityId}</p></> },
    { id: 'status', header: '상태', size: 110, cell: ({row:{original:job}}) => statuses[job.status] || job.status },
    { id: 'attempts', header: '시도', size: 90, cell: ({row:{original:job}}) => `${job.attemptCount} / ${job.maxAttempts}` },
    { id: 'date', header: '요청일', size: 190, cell: ({row:{original:job}}) => date(job.requestedAt) },
    { id: 'actions', header: '확인', size: 130, cell: ({row:{original:job}}) => <Button variant="outline" size="sm" onClick={() => setSelected(job.id)}>작업 상세</Button> },
  ];
  return <section className="min-w-0 space-y-4 rounded-lg border p-4" aria-label="AI 개별 작업 관리">
    <h2 className="text-base font-semibold">개별 작업·재시도</h2>
    <div className="flex flex-wrap items-end gap-3">
      <label className="space-y-1 text-sm"><span>작업 앱</span><NativeSelect value={sourceApp} onChange={event => { setSourceApp(event.target.value); setPage(1); }}><option value="">전체 앱</option>{['admin','crm','pms','dms','sns'].map(app => <option key={app} value={app}>{app.toUpperCase()}</option>)}</NativeSelect></label>
      <label className="space-y-1 text-sm"><span>작업 상태</span><NativeSelect value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">전체 상태</option>{Object.entries(statuses).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></label>
      <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>작업 새로고침</Button>
    </div>
    <div className="h-[min(60dvh,480px)]"><SsooDataGrid columns={columns} data={query.data?.items ?? []} loading={query.isLoading} error={query.error} onRetry={() => { void query.refetch(); }} fitViewport mobileSummaryColumns={['target', 'status', 'actions']} enableSorting={false} emptyState="해당하는 작업이 없습니다."
      pagination={{page, pageSize: 20, total: query.data?.total ?? 0, onPageChange: setPage, disabled: query.isFetching}} /></div>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>AI 작업 상세</DialogTitle><DialogDescription>실행 결과를 확인하고 실패한 작업을 다시 등록합니다.</DialogDescription></DialogHeader>{selected && <AiJobDetail key={selected} id={selected} onSelect={setSelected} />}</DialogContent></Dialog>
  </section>;
}

function AiJobDetail({ id, onSelect }: { id: string; onSelect: (id: string) => void }) {
  const query = useAiJobDetail(id);
  const retry = useRetryAiJob();
  const [reason, setReason] = useState('');
  const job = query.data;
  if (query.isError) return <SsooErrorNotice error={query.error} actions={[{ label: '상세 다시 조회', onClick: () => query.refetch() }]} />;
  if (!job) return <p role="status">작업 상세를 불러오는 중...</p>;
  const submit = async () => {
    if (!reason.trim() || !window.confirm(`실패 작업 #${job.id}의 후속 작업을 대기열에 등록할까요?`)) return;
    try { const next = await retry.mutateAsync({ id: job.id, reason: reason.trim(), expectedRevision: job.revision }); onSelect(next.id); } catch { /* Keep the failed operation and reason visible. */ }
  };
  return <div className="min-w-0 space-y-3 break-words text-sm">
    <p>#{job.id} · {job.sourceApp.toUpperCase()} · {job.entityType} · {job.entityId}</p>
    <p>{statuses[job.status] || job.status} · {job.attemptCount} / {job.maxAttempts}회 시도</p>
    <p>요청 {date(job.requestedAt)} · 요청자 {job.requestedBy || '—'}</p><p>시작 {date(job.startedAt)} · 종료 {date(job.finishedAt)}</p><p>자동 재시도 예정 {date(job.nextRetryAt)}</p>
    {job.lastError && <SsooErrorNotice error={job.lastError} />}
    {job.reason && <p>등록 사유: {job.reason}</p>}
    <div className="flex flex-wrap gap-2">{job.retryOfJobId && <Button variant="outline" onClick={() => onSelect(job.retryOfJobId!)}>이전 실패 작업 #{job.retryOfJobId}</Button>}{job.retryJobId && <Button variant="outline" onClick={() => onSelect(job.retryJobId!)}>후속 작업 #{job.retryJobId}</Button>}<Button variant="outline" onClick={() => query.refetch()}>상세 새로고침</Button></div>
    {job.canRetry && <><p className="text-xs text-muted-foreground">기존 실패 기록은 유지하고 같은 대상의 새 작업을 등록합니다. 실행은 기존 자동 실행 설정을 따릅니다.</p><label className="block space-y-1"><span>AI 작업 재시도 사유</span><Textarea value={reason} maxLength={2000} onChange={event => setReason(event.target.value)} disabled={retry.isPending} /></label>{retry.error && <SsooErrorNotice error={retry.error} />}<Button disabled={retry.isPending || !reason.trim()} onClick={submit}>실패 작업 재등록</Button></>}
  </div>;
}
