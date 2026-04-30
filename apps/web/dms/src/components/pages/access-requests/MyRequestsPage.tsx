'use client';

import { useMemo, useState } from 'react';
import { Clock, CheckCircle2, XCircle, FileQuestion, ArrowRight } from 'lucide-react';
import type {
  DmsDocumentAccessRequestStatusFilter,
  DmsDocumentAccessRequestSummary,
} from '@ssoo/types/dms';
import { useMyDocumentAccessRequestsQuery } from '@/hooks/queries/useDocumentAccessRequests';
import { useOpenDocumentTab } from '@/hooks';
import { ErrorState, LoadingState } from '@/components/common/StateDisplay';
import { cn } from '@/lib/utils';

const STATUS_FILTERS: { value: DmsDocumentAccessRequestStatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '대기' },
  { value: 'approved', label: '승인' },
  { value: 'rejected', label: '거부' },
];

function formatDateTime(value?: string): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-caption bg-yellow-50 text-yellow-700 border border-yellow-200">
        <Clock className="h-3 w-3" />
        요청 대기
      </span>
    );
  }
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-caption bg-green-50 text-green-700 border border-green-200">
        <CheckCircle2 className="h-3 w-3" />
        승인
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-caption bg-gray-50 text-gray-700 border border-gray-200">
      <XCircle className="h-3 w-3" />
      거부
    </span>
  );
}

function RequestRow({ request, onOpenDocument }: {
  request: DmsDocumentAccessRequestSummary;
  onOpenDocument: (path: string, title: string) => void;
}) {
  const canOpen = request.status === 'approved';

  return (
    <div className="flex items-start gap-3 px-3 py-3 border-b border-ssoo-content-border last:border-b-0 hover:bg-ssoo-content-bg/30">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-body-sm text-ssoo-primary font-medium truncate">
            {request.documentTitle || request.path}
          </span>
          <StatusBadge status={request.status} />
        </div>
        <div className="text-caption text-gray-500 mt-0.5 truncate">{request.path}</div>
        {request.requestMessage ? (
          <div className="text-caption text-gray-700 mt-1 line-clamp-2">
            메시지: {request.requestMessage}
          </div>
        ) : null}
        {request.responseMessage ? (
          <div className="text-caption text-gray-700 mt-1 line-clamp-2">
            응답: {request.responseMessage}
          </div>
        ) : null}
        <div className="text-caption text-gray-400 mt-1">
          요청 {formatDateTime(request.requestedAt)}
          {request.respondedAt ? ` · 응답 ${formatDateTime(request.respondedAt)}` : ''}
        </div>
      </div>
      {canOpen ? (
        <button
          type="button"
          onClick={() => onOpenDocument(request.path, request.documentTitle || request.path)}
          className="inline-flex items-center gap-1 rounded border border-ssoo-content-border bg-white px-2 py-1 text-caption text-ssoo-primary hover:bg-ssoo-content-bg"
        >
          문서 열기
          <ArrowRight className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}

export function MyRequestsPage() {
  const [filter, setFilter] = useState<DmsDocumentAccessRequestStatusFilter>('all');
  const query = useMyDocumentAccessRequestsQuery(filter);
  const openDocumentTab = useOpenDocumentTab();

  const counts = useMemo(() => {
    const list = query.data ?? [];
    return {
      total: list.length,
      pending: list.filter((r) => r.status === 'pending').length,
      approved: list.filter((r) => r.status === 'approved').length,
      rejected: list.filter((r) => r.status === 'rejected').length,
    };
  }, [query.data]);

  if (query.isLoading) {
    return <LoadingState message="요청 목록 불러오는 중..." fullHeight />;
  }
  if (query.isError) {
    return <ErrorState error={query.error?.message ?? '요청 목록을 불러오지 못했습니다.'} />;
  }

  const requests = query.data ?? [];

  return (
    <main className="h-full overflow-auto bg-white">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <header className="mb-4">
          <div className="flex items-center gap-2 text-title-card text-ssoo-primary">
            <FileQuestion className="h-5 w-5" />
            내 요청
          </div>
          <p className="text-body-sm text-gray-500 mt-1">
            내가 보낸 문서 권한 요청 내역.
          </p>
        </header>

        <div className="mb-3 flex items-center gap-1">
          {STATUS_FILTERS.map((item) => {
            const isActive = filter === item.value;
            const count = item.value === 'all' ? counts.total : counts[item.value];
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={cn(
                  'inline-flex items-center gap-1 rounded px-2 py-1 text-caption border transition-colors',
                  isActive
                    ? 'border-ssoo-primary bg-ssoo-primary text-white'
                    : 'border-ssoo-content-border bg-white text-ssoo-primary hover:bg-ssoo-content-bg',
                )}
              >
                {item.label}
                <span className={cn('text-caption', isActive ? 'text-white/80' : 'text-gray-500')}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="rounded border border-ssoo-content-border bg-white">
          {requests.length === 0 ? (
            <div className="px-4 py-12 text-center text-body-sm text-gray-500">
              {filter === 'all'
                ? '보낸 요청이 없습니다. 검색 결과에서 권한이 부족한 문서의 "권한 요청" 버튼을 눌러 보내세요.'
                : `${STATUS_FILTERS.find((f) => f.value === filter)?.label} 상태의 요청이 없습니다.`}
            </div>
          ) : (
            <div>
              {requests.map((request) => (
                <RequestRow
                  key={request.requestId}
                  request={request}
                  onOpenDocument={(path, title) =>
                    openDocumentTab({ path, title })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
