'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, Check, Loader2, Play, RefreshCcw, RotateCcw, X } from 'lucide-react';
import { NativeSelect, Textarea } from '@ssoo/web-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ingestApi, type IngestJobClient, type IngestQueueMetricsClient } from '@/lib/api/storageApi';
import { toast } from '@/lib/toast';

const STATUS_LABEL: Record<IngestJobClient['status'], string> = {
  draft: '초안',
  pending_confirm: '승인 대기',
  processing: '처리 중',
  published: '게시 완료',
  failed: '실패',
  cancelled: '취소',
};

function formatDateTime(value?: string) {
  return value ? new Date(value).toLocaleString('ko-KR') : '-';
}

function responseError(error: string | undefined, fallback: string) {
  return error ?? fallback;
}

export function IngestOperationsSurface() {
  const [jobs, setJobs] = useState<IngestJobClient[]>([]);
  const [metrics, setMetrics] = useState<IngestQueueMetricsClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeAction, setActiveAction] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | IngestJobClient['status']>('all');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    const [jobsResponse, metricsResponse] = await Promise.all([ingestApi.jobs(), ingestApi.metrics()]);
    if (!jobsResponse.success || !jobsResponse.data) {
      throw new Error(responseError(jobsResponse.error, '수집 작업 목록 조회에 실패했습니다.'));
    }
    if (!metricsResponse.success || !metricsResponse.data) {
      throw new Error(responseError(metricsResponse.error, '수집 큐 지표 조회에 실패했습니다.'));
    }
    setJobs(jobsResponse.data.jobs);
    setMetrics(metricsResponse.data);
    setLoadError('');
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load().catch((error) => {
      setLoadError(error instanceof Error ? error.message : '수집 큐 조회에 실패했습니다.');
      setIsLoading(false);
    });
    const timer = window.setInterval(() => {
      void load(true).catch(() => undefined);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const filteredJobs = useMemo(
    () => statusFilter === 'all' ? jobs : jobs.filter((job) => job.status === statusFilter),
    [jobs, statusFilter],
  );

  const runAction = async (job: IngestJobClient, action: 'confirm' | 'retry' | 'cancel') => {
    const actionLabel = action === 'confirm' ? '게시 승인' : action === 'retry' ? '재시도' : '취소';
    if (!window.confirm(`${job.title} 작업을 ${actionLabel}할까요?`)) return;
    setActiveAction(`${job.id}:${action}`);
    try {
      const response = await ingestApi[action](job.id);
      if (!response.success) throw new Error(responseError(response.error, `${actionLabel}에 실패했습니다.`));
      toast.success(`수집 작업을 ${actionLabel}했습니다.`);
      await load(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `${actionLabel}에 실패했습니다.`);
    } finally {
      setActiveAction('');
    }
  };

  const submitSmokeJob = async () => {
    if (!title.trim() || !content.trim()) {
      toast.warning('제목과 내용을 입력하세요.');
      return;
    }
    setActiveAction('submit');
    try {
      const response = await ingestApi.submit({ title: title.trim(), content, origin: 'manual' });
      if (!response.success) throw new Error(responseError(response.error, '수집 작업 등록에 실패했습니다.'));
      setTitle('');
      setContent('');
      toast.success('수집 작업을 등록했습니다.');
      await load(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '수집 작업 등록에 실패했습니다.');
    } finally {
      setActiveAction('');
    }
  };

  const cleanup = async () => {
    if (!metrics) return;
    if (!window.confirm(`${metrics.retentionDays}일이 지난 게시·취소 작업 이력을 정리할까요? 게시된 문서 자체는 삭제하지 않습니다.`)) return;
    setActiveAction('cleanup');
    try {
      const response = await ingestApi.cleanup();
      if (!response.success || !response.data) throw new Error(responseError(response.error, '큐 정리에 실패했습니다.'));
      toast.success(`${response.data.removedCount}건의 완료 이력을 정리했습니다.`);
      await load(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '큐 정리에 실패했습니다.');
    } finally {
      setActiveAction('');
    }
  };

  return (
    <section className="mt-3 space-y-3 pb-20">
      <article className="rounded-lg border border-ssoo-content-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-badge text-ssoo-primary/70">수집 작업 운영 제어</p>
            <h3 className="mt-1 text-label-strong text-ssoo-primary">수집 작업 처리</h3>
            <p className="mt-1 text-body-sm text-ssoo-primary/75">승인·재시도·취소·보존 정리를 큐 상태와 함께 수행합니다.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={isLoading}>
              <RefreshCcw className="mr-1 h-4 w-4" /> 새로고침
            </Button>
            <Button variant="outline" size="sm" onClick={cleanup} disabled={!metrics || activeAction === 'cleanup'}>
              <Archive className="mr-1 h-4 w-4" /> 완료 이력 정리
            </Button>
          </div>
        </div>

        {loadError && <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{loadError}</p>}
        {metrics && (
          <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {[
              ['전체', metrics.totalCount], ['승인 대기', metrics.counts.pending_confirm], ['처리 중', metrics.counts.processing],
              ['실패', metrics.counts.failed], ['동시 처리', `${metrics.activeJobs}/${metrics.maxConcurrentJobs}`], ['보존', `${metrics.retentionDays}일`],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-md border p-3">
                <p className="text-badge text-ssoo-primary/60">{label as string}</p>
                <p className="mt-1 text-label-strong text-ssoo-primary">{value as string | number}</p>
              </div>
            ))}
          </div>
        )}
        {metrics?.latestFailure && (
          <p className="mt-3 rounded-md bg-ssoo-danger-bg p-3 text-xs text-ssoo-danger">
            최근 실패 {metrics.latestFailure.jobId} · {formatDateTime(metrics.latestFailure.at)} · {metrics.latestFailure.error}
          </p>
        )}
      </article>

      <article className="rounded-lg border border-ssoo-content-border bg-card p-4 [container-type:inline-size]">
        <h3 className="text-label-strong text-ssoo-primary">수동 점검 작업 등록</h3>
        <p className="mt-1 text-body-sm text-ssoo-primary/70">운영자가 수집 → 승인 → 문서 게시 흐름을 확인할 때 사용합니다.</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(14rem,0.4fr)_minmax(20rem,1fr)_auto] [@container(max-width:719px)]:grid-cols-1">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="수집 작업 제목" maxLength={240} />
          <Textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="테스트 문서 내용" className="min-h-20" />
          <Button className="self-end" onClick={submitSmokeJob} disabled={activeAction === 'submit'}>
            <Play className="mr-1 h-4 w-4" /> 작업 등록
          </Button>
        </div>
      </article>

      <article className="rounded-lg border border-ssoo-content-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <h3 className="text-label-strong text-ssoo-primary">작업 이력</h3>
          <NativeSelect
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
            aria-label="수집 작업 상태 필터"
          >
            <option value="all">전체 상태</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </NativeSelect>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-ssoo-primary/60"><Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-8 text-center text-sm text-ssoo-primary/60">조건에 맞는 작업이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>작업</TableHead><TableHead>상태</TableHead><TableHead>시도</TableHead><TableHead>요청/갱신</TableHead><TableHead>결과</TableHead><TableHead className="text-right">제어</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell><p className="max-w-72 truncate text-sm font-medium">{job.title}</p><p className="text-xs text-muted-foreground">{job.id} · {job.requestedBy}</p></TableCell>
                    <TableCell><span className={`rounded-full border px-2 py-0.5 text-xs ${job.status === 'failed' ? 'ssoo-tone-danger-surface' : job.status === 'published' ? 'ssoo-tone-success-surface' : 'text-muted-foreground'}`}>{STATUS_LABEL[job.status]}</span></TableCell>
                    <TableCell>{job.attemptCount}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs"><div>{formatDateTime(job.createdAt)}</div><div className="text-muted-foreground">{formatDateTime(job.updatedAt)}</div></TableCell>
                    <TableCell className="max-w-80 text-xs">
                      <div className="truncate">{job.docPath ?? job.error ?? '-'}</div>
                      <div className="text-muted-foreground">
                        {job.commitHash
                          ? `${job.publishedBranch ?? 'Git'} · ${job.commitHash.slice(0, 7)}`
                          : job.lastOperatedBy ?? '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {job.status === 'pending_confirm' && <Button variant="outline" size="sm" onClick={() => void runAction(job, 'confirm')} disabled={Boolean(activeAction)}><Check className="mr-1 h-3.5 w-3.5" /> 승인</Button>}
                        {job.status === 'failed' && <Button variant="outline" size="sm" onClick={() => void runAction(job, 'retry')} disabled={Boolean(activeAction)}><RotateCcw className="mr-1 h-3.5 w-3.5" /> 재시도</Button>}
                        {['draft', 'pending_confirm', 'failed'].includes(job.status) && <Button variant="outline" size="sm" onClick={() => void runAction(job, 'cancel')} disabled={Boolean(activeAction)}><X className="mr-1 h-3.5 w-3.5" /> 취소</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </article>
    </section>
  );
}
