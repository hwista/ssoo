'use client';

import { useMemo, useState } from 'react';
import { Clock, CheckCircle2, XCircle, FileQuestion, ArrowRight, Hourglass, Ban } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  DmsDocumentAccessRequestStatus,
  DmsDocumentAccessRequestStatusFilter,
  DmsDocumentAccessRequestSummary,
} from '@ssoo/types/dms';
import { useMyDocumentAccessRequestsQuery } from '@/features/access';
import { useOpenDocumentTab } from '@/hooks';
import { ErrorState, LoadingState } from '@/components/common/StateDisplay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STATUS_FILTERS: { value: DmsDocumentAccessRequestStatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '대기' },
  { value: 'approved', label: '승인' },
  { value: 'rejected', label: '거부' },
  { value: 'cancelled', label: '취소' },
  { value: 'expired', label: '만료' },
  { value: 'revoked', label: '회수' },
];

const STATUS_META: Record<DmsDocumentAccessRequestStatus, {
  label: string;
  icon: LucideIcon;
  className: string;
}> = {
  pending: {
    label: '요청 대기',
    icon: Clock,
    className: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  },
  approved: {
    label: '승인',
    icon: CheckCircle2,
    className: 'border-green-200 bg-green-50 text-green-700',
  },
  rejected: {
    label: '거부',
    icon: XCircle,
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  expired: {
    label: '만료',
    icon: Hourglass,
    className: 'border-zinc-200 bg-zinc-50 text-zinc-600',
  },
  cancelled: {
    label: '취소',
    icon: Ban,
    className: 'border-orange-200 bg-orange-50 text-orange-700',
  },
  revoked: {
    label: '회수',
    icon: Ban,
    className: 'border-orange-200 bg-orange-50 text-orange-700',
  },
};

function formatDateTime(value?: string): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }: { status: DmsDocumentAccessRequestStatus }) {
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;
  return (
    <Badge variant="outline" className={cn('gap-1 rounded px-2 py-0.5 text-caption', meta.className)}>
      <StatusIcon className="h-3 w-3" />
      {meta.label}
    </Badge>
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenDocument(request.path, request.documentTitle || request.path)}
          className="gap-1 text-caption"
        >
          문서 열기
          <ArrowRight className="h-3 w-3" />
        </Button>
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
      cancelled: list.filter((r) => r.status === 'cancelled').length,
      expired: list.filter((r) => r.status === 'expired').length,
      revoked: list.filter((r) => r.status === 'revoked').length,
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
              <Button
                key={item.value}
                type="button"
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(item.value)}
                className={cn(
                  'gap-1 px-2 text-caption',
                  !isActive && 'bg-white',
                )}
              >
                {item.label}
                <span className={cn('text-caption', isActive ? 'text-white/80' : 'text-gray-500')}>
                  {count}
                </span>
              </Button>
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
