'use client';

import { SsooErrorNotice } from '@ssoo/web-shell';
import { useState } from 'react';
import { Bot, Play, RefreshCcw } from 'lucide-react';
import { SsooSettingsPage } from '@ssoo/web-shell';
import { NativeSelect } from '@ssoo/web-ui';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAiOperationsOverview, useRunAiJobs } from '@/hooks/queries/useAiOperations';

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString('ko-KR') : '-';
}

function StatusPill({ ready, label }: { ready: boolean; label?: string }) {
  return (
    <span className={ready
      ? 'rounded-full bg-ssoo-success-bg px-2 py-0.5 text-xs font-medium text-ssoo-success'
      : 'rounded-full bg-ssoo-danger-bg px-2 py-0.5 text-xs font-medium text-ssoo-danger'}
    >
      {label ?? (ready ? 'ready' : 'blocked')}
    </span>
  );
}

export function AiOperationsPage() {
  const { readiness, sources, metrics, scheduler } = useAiOperationsOverview();
  const runMutation = useRunAiJobs();
  const [batchLimit, setBatchLimit] = useState(20);

  const queries = [readiness, sources, metrics, scheduler];
  const isLoading = queries.some((query) => query.isLoading);
  const queryError = queries.find((query) => query.isError)?.error;

  const refresh = () => Promise.all(queries.map((query) => query.refetch()));
  const runJobs = async () => {
    if (!window.confirm(`실행 가능한 AI index job을 최대 ${batchLimit}건 처리할까요?`)) return;
    await runMutation.mutateAsync(batchLimit).catch(() => undefined);
  };

  return (
    <SsooSettingsPage
      filePath="admin/ai-operations"
      headerActions={{
        extraActions: [{
          label: '상태 새로고침',
          icon: <RefreshCcw className="h-4 w-4" />,
          variant: 'outline',
          onClick: () => { void refresh(); },
          disabled: queries.some((query) => query.isFetching),
        }],
        extraActionsPosition: 'right',
      }}
      index={{
        ariaLabel: 'AI 운영 항목 색인',
        activeItemId: 'readiness',
        items: [
          { id: 'readiness', label: 'Provider 준비 상태' },
          { id: 'sources', label: 'Index source' },
          { id: 'queue', label: 'Queue 및 worker' },
        ],
        onItemSelect: (item) => document.getElementById(`admin-ai-${item.id}`)?.scrollIntoView({ behavior: 'smooth' }),
      }}
    >
      {isLoading && <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">AI 운영 상태를 불러오는 중...</div>}
      {queryError && (
        <SsooErrorNotice className="p-4" error={queryError instanceof Error ? queryError.message : 'AI 운영 상태 조회에 실패했습니다.'} />
      )}

      {readiness.data && (
        <section id="admin-ai-readiness" className="scroll-mt-4 space-y-4 rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold"><Bot className="h-4 w-4" /> Provider 준비 상태</h2>
              <p className="mt-1 text-xs text-muted-foreground">점검 {formatDateTime(readiness.data.checkedAt)}</p>
            </div>
            <StatusPill ready={readiness.data.ready} />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {[
              ['Embedding', readiness.data.embedding],
              ['Chat', readiness.data.chat],
            ].map(([title, status]) => {
              const provider = status as typeof readiness.data.embedding;
              return (
                <div key={title as string} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">{title as string}</h3>
                    <StatusPill ready={provider.ready} />
                  </div>
                  <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-1 text-xs">
                    <dt className="text-muted-foreground">Provider</dt><dd>{provider.providerCode}</dd>
                    <dt className="text-muted-foreground">Deployment</dt><dd>{provider.deploymentName ?? '-'}</dd>
                    <dt className="text-muted-foreground">Credential</dt><dd>{provider.credentialMode ?? '-'}</dd>
                    <dt className="text-muted-foreground">상태 사유</dt><dd>{provider.reasonMessage ?? '-'}</dd>
                  </dl>
                </div>
              );
            })}
          </div>
          <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {readiness.data.configurationBoundary.message} Admin에서는 비밀값을 조회하거나 수정하지 않습니다.
          </p>
        </section>
      )}

      {sources.data && (
        <section id="admin-ai-sources" className="scroll-mt-4 rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Index source</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">등록 adapter와 검색/index 활성 상태</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead><TableHead>Adapter</TableHead><TableHead>기능</TableHead>
                  <TableHead>Object</TableHead><TableHead>Pending</TableHead><TableHead>Failed</TableHead><TableHead>최근 index</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.data.map((source) => (
                  <TableRow key={source.sourceApp}>
                    <TableCell><div className="text-sm font-medium">{source.label}</div><div className="text-xs text-muted-foreground">{source.sourceApp}</div></TableCell>
                    <TableCell><StatusPill ready={source.registered && source.active} label={source.registrationStatus ?? (source.registered ? 'registered' : 'missing')} /></TableCell>
                    <TableCell className="text-xs">index {source.indexingEnabled ? 'on' : 'off'} · semantic {source.semanticSearchEnabled ? 'on' : 'off'} · RAG {source.ragContextEnabled ? 'on' : 'off'}</TableCell>
                    <TableCell>{source.objectCount}</TableCell><TableCell>{source.pendingCount}</TableCell><TableCell className={source.failedCount > 0 ? 'text-destructive' : ''}>{source.failedCount}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{formatDateTime(source.lastIndexedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {metrics.data && scheduler.data && (
        <section id="admin-ai-queue" className="scroll-mt-4 space-y-4 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Queue 및 worker 제어</h2>
              <p className="mt-1 text-xs text-muted-foreground">Queue 생성 {formatDateTime(metrics.data.generatedAt)}</p>
            </div>
            <div className="flex items-center gap-2">
              <NativeSelect
                value={batchLimit}
                onChange={(event) => setBatchLimit(Number(event.target.value))}
                className="h-9 rounded-md border bg-background px-3 text-sm"
                aria-label="AI job 실행 수"
              >
                {[1, 10, 20, 50, 100].map((value) => <option key={value} value={value}>최대 {value}건</option>)}
              </NativeSelect>
              <Button onClick={runJobs} disabled={runMutation.isPending || metrics.data.runnableCount === 0}>
                <Play className="mr-1 h-4 w-4" /> {runMutation.isPending ? '실행 중...' : '대기 job 실행'}
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {[
              ['전체', metrics.data.totalCount], ['실행 가능', metrics.data.runnableCount], ['재시도 대기', metrics.data.retryWaitingCount],
              ['실행 중', metrics.data.runningCount], ['실패', metrics.data.failedCount], ['재시도 소진', metrics.data.exhaustedCount],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-md border p-3"><div className="text-xs text-muted-foreground">{label as string}</div><div className="mt-1 text-lg font-semibold">{value as number}</div></div>
            ))}
          </div>
          <div className="rounded-md border p-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill ready={scheduler.data.enabled} label={scheduler.data.enabled ? 'scheduler enabled' : 'scheduler disabled'} />
              <span>interval {scheduler.data.intervalMs}ms</span><span>batch {scheduler.data.batchLimit}</span><span>running {scheduler.data.running ? 'yes' : 'no'}</span>
              <span>최근 완료 {formatDateTime(scheduler.data.lastFinishedAt)}</span>
            </div>
            {scheduler.data.lastErrorMessage && <SsooErrorNotice as="p" compact className="mt-2" error={scheduler.data.lastErrorMessage} />}
          </div>
          {runMutation.data && (
            <p className="text-sm text-ssoo-success">처리 {runMutation.data.processedCount}건 · indexed {runMutation.data.indexedCount} · 실패 {runMutation.data.failedCount}</p>
          )}
          {runMutation.isError && <SsooErrorNotice as="p" compact error={runMutation.error instanceof Error ? runMutation.error.message : 'AI job 실행에 실패했습니다.'} />}
        </section>
      )}
    </SsooSettingsPage>
  );
}
