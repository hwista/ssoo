'use client';
import { getAdminBreadcrumb } from '@/components/layout/navigation';

import { AiJobsPanel } from './AiJobsPanel';
import { SsooErrorNotice, SsooDataGrid } from '@ssoo/web-shell';
import { EmbeddingSettingsPanel } from './EmbeddingSettingsPanel';
import { useState } from 'react';
import { Bot, Play, RefreshCcw } from 'lucide-react';
import { SsooWorkspacePage } from '@ssoo/web-shell';
import { NativeSelect } from '@ssoo/web-ui';
import { Button } from '@/components/ui/button';

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
      {label ?? (ready ? '사용 가능' : '설정 확인 필요')}
    </span>
  );
}

export function AiOperationsPage() {
  const { readiness, sources, metrics, scheduler } = useAiOperationsOverview();
  const runMutation = useRunAiJobs();
  const [activeView, setActiveView] = useState('queue');
  const [batchLimit, setBatchLimit] = useState(20);
  const [jobStatus, setJobStatus] = useState('pending');

  const queries = [readiness, sources, metrics, scheduler];
  const isLoading = queries.some((query) => query.isLoading);
  const queryError = queries.find((query) => query.isError)?.error;

  const refresh = () => Promise.all(queries.map((query) => query.refetch()));
  const runJobs = async () => {
    if (!window.confirm(`실행 가능한 AI 색인 작업을 최대 ${batchLimit}건 처리할까요?`)) return;
    await runMutation.mutateAsync(batchLimit).catch(() => undefined);
  };

  return (
    <SsooWorkspacePage compact
      breadcrumbItems={getAdminBreadcrumb("/ai-operations")} scrollBody
      title="AI 실행 운영"
      description="임베딩 제공자와 색인 작업의 상태를 확인하고 실행·재시도를 처리합니다."
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
        items: [
          { id: 'queue', label: '작업·실행' },
          { id: 'readiness', label: '연결 준비 상태' },
          { id: 'sources', label: '색인 대상' },
        ],
        activeItemId: activeView, onItemSelect: (item) => setActiveView(item.id),
      }}
    >
      {isLoading && <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">AI 운영 상태를 불러오는 중...</div>}
      {queryError && (
        <SsooErrorNotice className="p-4" error={queryError instanceof Error ? queryError.message : 'AI 운영 상태 조회에 실패했습니다.'} />
      )}

      {metrics.data && scheduler.data && (
        <section hidden={activeView !== 'queue'} id="admin-ai-queue" className="scroll-mt-4 space-y-4 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">색인 작업 실행</h2>
              <p className="mt-1 text-xs text-muted-foreground">집계 시각 {formatDateTime(metrics.data.generatedAt)}</p>
            </div>
            <div className="flex items-center gap-2">
              <NativeSelect
                value={batchLimit}
                onChange={(event) => setBatchLimit(Number(event.target.value))}

                aria-label="AI job 실행 수"
              >
                {[1, 10, 20, 50, 100].map((value) => <option key={value} value={value}>최대 {value}건</option>)}
              </NativeSelect>
              <Button onClick={runJobs} disabled={runMutation.isPending || metrics.data.runnableCount === 0}>
                <Play className="mr-1 h-4 w-4" /> {runMutation.isPending ? '실행 중...' : '대기 작업 실행'}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 xl:grid-cols-6">
            {[
              ['전체', metrics.data.totalCount], ['실행 가능', metrics.data.runnableCount], ['재시도 대기', metrics.data.retryWaitingCount],
              ['실행 중', metrics.data.runningCount], ['실패', metrics.data.failedCount], ['재시도 소진', metrics.data.exhaustedCount],
            ].map(([label, value]) => (
              <div key={label as string} className="min-w-0 rounded-md border p-2 sm:p-3"><div className="text-xs text-muted-foreground">{label as string}</div><div className="mt-1 text-lg font-semibold">{value as number}</div></div>
            ))}
          </div>
          <div className="rounded-md border p-3 text-sm">
            {readiness.data && <div className="mb-2 flex flex-wrap items-center gap-2"><span>임베딩 연결: {readiness.data.embedding.ready ? '설정 준비됨' : '설정 확인 필요'}</span><Button variant="link" size="sm" onClick={() => setActiveView('readiness')}>연결 설정 보기</Button></div>}
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill ready={scheduler.data.enabled} label={scheduler.data.enabled ? '자동 실행 켜짐' : '자동 실행 꺼짐'} />
              <span>실행 간격 {scheduler.data.intervalMs / 1000}초</span><span>회당 최대 {scheduler.data.batchLimit}건</span><span>자동 실행기: {scheduler.data.running ? '처리 중' : scheduler.data.enabled ? '다음 실행 대기' : '중지'}</span>
              <span>최근 완료 {formatDateTime(scheduler.data.lastFinishedAt)}</span>
            </div>
            {scheduler.data.lastErrorMessage && <SsooErrorNotice as="p" compact className="mt-2" error={scheduler.data.lastErrorMessage} />}
          </div>
          {runMutation.data && (
            <p className="text-sm text-ssoo-success">처리 {runMutation.data.processedCount}건 · 색인 완료 {runMutation.data.indexedCount} · 실패 {runMutation.data.failedCount}</p>
          )}
          {runMutation.isError && <SsooErrorNotice as="p" compact error={runMutation.error instanceof Error ? runMutation.error.message : 'AI 작업 실행에 실패했습니다.'} />}
          <div className="flex flex-wrap gap-2" aria-label="상태별 작업 조회">{[['pending', '대기 작업'], ['running', '실행 중 작업'], ['failed', '실패 작업'], ['', '전체 작업']].map(([status, label]) => <Button key={status} variant={jobStatus === status ? 'default' : 'outline'} size="sm" onClick={() => setJobStatus(status)}>{label} 보기</Button>)}</div>
          <AiJobsPanel key={jobStatus} initialStatus={jobStatus} />
        </section>
      )}

      {readiness.data && (
        <section hidden={activeView !== 'readiness'} id="admin-ai-readiness" className="scroll-mt-4 space-y-4 rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold"><Bot className="h-4 w-4" /> AI 연결 상태</h2>
              <p className="mt-1 text-xs text-muted-foreground">점검 {formatDateTime(readiness.data.checkedAt)}</p>
            </div>
            <StatusPill ready={readiness.data.ready} />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {[
              ['검색용 임베딩', readiness.data.embedding],
              ['대화 생성', readiness.data.chat],
            ].map(([title, status]) => {
              const provider = status as typeof readiness.data.embedding;
              return (
                <div key={title as string} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">{title as string}</h3>
                    <StatusPill ready={provider.ready} />
                  </div>
                  <dl className="mt-3 grid grid-cols-[8rem_minmax(0,1fr)] gap-1 text-xs [&>dd]:min-w-0 [&>dd]:break-words">
                    <dt className="text-muted-foreground">연결 제공자</dt><dd>{provider.providerCode}</dd>
                    <dt className="text-muted-foreground">배포 이름</dt><dd>{provider.deploymentName ?? '-'}</dd>
                    <dt className="text-muted-foreground">인증 방식</dt><dd>{provider.credentialMode ?? '-'}</dd>
                    <dt className="text-muted-foreground">상태 사유</dt><dd>{provider.reasonMessage ?? '-'}</dd>
                  </dl>
                </div>
              );
            })}
          </div>
          <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {readiness.data.configurationBoundary.message} 저장된 비밀값은 조회할 수 없습니다.
          </p>
          <p className="break-words text-sm text-muted-foreground">
            아래에서 로컬 임베딩 또는 Azure 연결을 설정할 수 있습니다. 연결 확인은 실제 임베딩을 생성합니다.
            모델 전환 후에는 필요한 대상을 재색인하세요. 자동 실행은 AI_INDEX_WORKER_ENABLED로 별도 관리하며,
            먼저 소량 작업으로 검증할 수 있습니다. 채팅 생성 배포와 임베딩은 별개입니다.
          </p>
        </section>
      )}

      <div hidden={activeView !== 'readiness'}><EmbeddingSettingsPanel /></div>

      {sources.data && (
        <section hidden={activeView !== 'sources'} id="admin-ai-sources" className="scroll-mt-4 rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">색인 대상</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">연결된 앱과 검색·색인 사용 상태</p>
          </div>
          <SsooDataGrid fitViewport enableSorting={false} mobileSummaryColumns={['app', 'state', 'pending', 'failed']}
            data={sources.data} columns={[
              { id: 'app', header: '앱', size: 140, cell: ({row:{original:source}}) => source.label },
              { id: 'state', header: '연결 상태', size: 130, cell: ({row:{original:source}}) => <StatusPill ready={source.registered && source.active} label={source.registered && source.active ? '연결됨' : '확인 필요'} /> },
              { id: 'features', header: '기능', size: 250, cell: ({row:{original:source}}) => `색인 ${source.indexingEnabled ? '사용' : '중지'} · 의미 검색 ${source.semanticSearchEnabled ? '사용' : '중지'} · 답변 참조 ${source.ragContextEnabled ? '사용' : '중지'}` },
              { accessorKey: 'objectCount', header: '대상 수', size: 90 },
              { id: 'pending', header: '대기', size: 80, cell: ({row:{original:source}}) => source.pendingCount },
              { id: 'failed', header: '실패', size: 80, cell: ({row:{original:source}}) => source.failedCount },
              { id: 'date', header: '최근 색인', size: 180, cell: ({row:{original:source}}) => formatDateTime(source.lastIndexedAt) },
            ]} />
        </section>
      )}


    </SsooWorkspacePage>
  );
}
