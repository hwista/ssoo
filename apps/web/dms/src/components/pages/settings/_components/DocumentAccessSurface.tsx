'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, FileText, Inbox, Loader2, ShieldCheck, Users, XCircle } from 'lucide-react';
import type { DmsDocumentAccessRequestSummary, DmsManagedDocumentSummary } from '@ssoo/types/dms';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateDisplay';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import {
  useApproveDocumentAccessRequestMutation,
  useDocumentAccessInboxQuery,
  useManageableDocumentsQuery,
  useMyDocumentAccessRequestsQuery,
  useRejectDocumentAccessRequestMutation,
} from '@/hooks/queries/useDocumentAccessRequests';

type RequestStatus = DmsDocumentAccessRequestSummary['status'];

interface RequestActionDraft {
  responseMessage: string;
  grantExpiresAt: string;
}

const STATUS_META: Record<RequestStatus, {
  label: string;
  className: string;
}> = {
  pending: {
    label: '대기 중',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  approved: {
    label: '승인됨',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  rejected: {
    label: '거절됨',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
};

function formatDateTime(value?: string) {
  if (!value) return '-';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-badge text-ssoo-primary/70">{title}</p>
          <p className="mt-1 text-title-card text-ssoo-primary">{value}</p>
        </div>
        <div className="rounded-full border border-ssoo-content-border bg-ssoo-content-bg p-2 text-ssoo-primary">
          {icon}
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-badge ${STATUS_META[status].className}`}>
      {STATUS_META[status].label}
    </span>
  );
}

function formatVisibilityScope(scope: DmsManagedDocumentSummary['visibilityScope']) {
  switch (scope) {
    case 'public':
      return '공개';
    case 'organization':
      return '조직 공개';
    case 'self':
      return '소유자 전용';
    default:
      return '레거시';
  }
}

function formatSyncStatus(scope: DmsManagedDocumentSummary['syncStatusCode']) {
  return scope === 'repair_needed' ? '메타 보정 필요' : '정상 동기화';
}

function ManagedDocumentCard({ document }: { document: DmsManagedDocumentSummary }) {
  return (
    <article className="rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-label-strong text-ssoo-primary">{document.documentTitle}</h3>
            <span className="rounded-full border border-ssoo-content-border bg-ssoo-content-bg px-2 py-0.5 text-badge text-ssoo-primary/70">
              {formatVisibilityScope(document.visibilityScope)}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-badge ${document.syncStatusCode === 'repair_needed' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
              {formatSyncStatus(document.syncStatusCode)}
            </span>
          </div>
          <p className="mt-1 break-all text-caption text-ssoo-primary/70">{document.path}</p>
          <p className="mt-2 text-body-sm text-ssoo-primary/80">
            작성자: {document.owner.displayName ?? document.owner.loginId}
          </p>
          <p className="mt-1 text-caption text-ssoo-primary/70">
            업데이트: {formatDateTime(document.updatedAt)}
          </p>
        </div>
        <div className="grid min-w-[180px] gap-2 text-right text-caption text-ssoo-primary/70 sm:grid-cols-2 sm:text-left">
          <div className="rounded-md border border-ssoo-content-border bg-ssoo-content-bg/30 px-3 py-2">
            <p className="text-badge text-ssoo-primary/60">Pending 요청</p>
            <p className="mt-1 text-label-strong text-ssoo-primary">{document.requestSummary.pending}</p>
          </div>
          <div className="rounded-md border border-ssoo-content-border bg-ssoo-content-bg/30 px-3 py-2">
            <p className="text-badge text-ssoo-primary/60">Active grant</p>
            <p className="mt-1 text-label-strong text-ssoo-primary">{document.grantSummary.total - document.grantSummary.expired}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-ssoo-content-border bg-ssoo-content-bg/20 px-4 py-3">
          <div className="flex items-center gap-2 text-caption text-ssoo-primary/70">
            <Users className="h-4 w-4" />
            Grant 요약
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center text-body-sm text-ssoo-primary/80">
            <div>
              <p className="text-badge text-ssoo-primary/60">읽기</p>
              <p className="mt-1 text-label-strong text-ssoo-primary">{document.grantSummary.read}</p>
            </div>
            <div>
              <p className="text-badge text-ssoo-primary/60">쓰기</p>
              <p className="mt-1 text-label-strong text-ssoo-primary">{document.grantSummary.write}</p>
            </div>
            <div>
              <p className="text-badge text-ssoo-primary/60">관리</p>
              <p className="mt-1 text-label-strong text-ssoo-primary">{document.grantSummary.manage}</p>
            </div>
            <div>
              <p className="text-badge text-ssoo-primary/60">만료</p>
              <p className="mt-1 text-label-strong text-ssoo-primary">{document.grantSummary.expired}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-ssoo-content-border bg-ssoo-content-bg/20 px-4 py-3">
          <div className="flex items-center gap-2 text-caption text-ssoo-primary/70">
            <Inbox className="h-4 w-4" />
            요청 요약
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center text-body-sm text-ssoo-primary/80">
            <div>
              <p className="text-badge text-ssoo-primary/60">전체</p>
              <p className="mt-1 text-label-strong text-ssoo-primary">{document.requestSummary.total}</p>
            </div>
            <div>
              <p className="text-badge text-ssoo-primary/60">대기</p>
              <p className="mt-1 text-label-strong text-ssoo-primary">{document.requestSummary.pending}</p>
            </div>
            <div>
              <p className="text-badge text-ssoo-primary/60">승인</p>
              <p className="mt-1 text-label-strong text-ssoo-primary">{document.requestSummary.approved}</p>
            </div>
            <div>
              <p className="text-badge text-ssoo-primary/60">거절</p>
              <p className="mt-1 text-label-strong text-ssoo-primary">{document.requestSummary.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      {document.syncStatusCode === 'repair_needed' && document.repairReason && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-body-sm text-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">이 문서는 control-plane 메타 보정이 필요합니다.</p>
              <p className="mt-1 break-all text-caption text-amber-700">사유: {document.repairReason}</p>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function RequestCard({
  request,
  actionDraft,
  onActionDraftChange,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  request: DmsDocumentAccessRequestSummary;
  actionDraft?: RequestActionDraft;
  onActionDraftChange: (requestId: string, patch: Partial<RequestActionDraft>) => void;
  onApprove: (request: DmsDocumentAccessRequestSummary) => void;
  onReject: (request: DmsDocumentAccessRequestSummary) => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  return (
    <article className="rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-label-strong text-ssoo-primary">{request.documentTitle}</h3>
            <StatusBadge status={request.status} />
          </div>
          <p className="mt-1 break-all text-caption text-ssoo-primary/70">{request.path}</p>
          <p className="mt-2 text-body-sm text-ssoo-primary/80">
            요청자: {request.requester.displayName ?? request.requester.loginId}
          </p>
          <p className="mt-1 text-caption text-ssoo-primary/70">
            요청 시각: {formatDateTime(request.requestedAt)}
          </p>
          {request.requestMessage && (
            <p className="mt-2 rounded-md border border-ssoo-content-border bg-ssoo-content-bg/40 px-3 py-2 text-body-sm text-ssoo-primary/80">
              요청 메모: {request.requestMessage}
            </p>
          )}
          {request.responseMessage && (
            <p className="mt-2 rounded-md border border-ssoo-content-border bg-ssoo-content-bg/40 px-3 py-2 text-body-sm text-ssoo-primary/80">
              응답 메모: {request.responseMessage}
            </p>
          )}
        </div>
        <div className="text-right text-caption text-ssoo-primary/70">
          <p>응답 시각</p>
          <p className="mt-1">{formatDateTime(request.respondedAt)}</p>
        </div>
      </div>

      {request.canRespond && request.status === 'pending' && (
        <div className="mt-4 space-y-3 rounded-lg border border-ssoo-content-border bg-ssoo-content-bg/30 px-4 py-3">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
            <label className="space-y-1">
              <span className="text-caption text-ssoo-primary/70">응답 메모</span>
              <textarea
                value={actionDraft?.responseMessage ?? ''}
                onChange={(event) => onActionDraftChange(request.requestId, { responseMessage: event.target.value })}
                rows={3}
                maxLength={500}
                className="w-full rounded-md border border-ssoo-content-border bg-white px-3 py-2 text-body-sm text-ssoo-primary outline-none transition focus:border-ssoo-primary/40 focus:ring-2 focus:ring-ssoo-primary/10"
                placeholder="승인/거절 사유를 남겨 주세요."
              />
            </label>
            <label className="space-y-1">
              <span className="text-caption text-ssoo-primary/70">grant 만료일 (선택)</span>
              <input
                type="date"
                value={actionDraft?.grantExpiresAt ?? ''}
                onChange={(event) => onActionDraftChange(request.requestId, { grantExpiresAt: event.target.value })}
                className="h-control-h rounded-md border border-ssoo-content-border bg-white px-3 text-body-sm text-ssoo-primary outline-none transition focus:border-ssoo-primary/40 focus:ring-2 focus:ring-ssoo-primary/10"
              />
            </label>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onReject(request)}
              disabled={isApproving || isRejecting}
            >
              {isRejecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  거절 중...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  거절
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={() => onApprove(request)}
              disabled={isApproving || isRejecting}
            >
              {isApproving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  승인 중...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  승인
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

export function DocumentAccessSurface() {
  const manageableDocumentsQuery = useManageableDocumentsQuery();
  const myRequestsQuery = useMyDocumentAccessRequestsQuery('all');
  const inboxQuery = useDocumentAccessInboxQuery({ status: 'pending' });
  const approveMutation = useApproveDocumentAccessRequestMutation();
  const rejectMutation = useRejectDocumentAccessRequestMutation();
  const [actionDrafts, setActionDrafts] = useState<Record<string, RequestActionDraft>>({});

  const manageableDocuments = useMemo(
    () => manageableDocumentsQuery.data ?? [],
    [manageableDocumentsQuery.data],
  );
  const myRequests = useMemo(
    () => myRequestsQuery.data ?? [],
    [myRequestsQuery.data],
  );
  const inboxRequests = useMemo(
    () => inboxQuery.data ?? [],
    [inboxQuery.data],
  );

  const counts = useMemo(() => ({
    manageableDocuments: manageableDocuments.length,
    pendingOwnedRequests: manageableDocuments.reduce((sum, document) => sum + document.requestSummary.pending, 0),
    myPending: myRequests.filter((request) => request.status === 'pending').length,
    myApproved: myRequests.filter((request) => request.status === 'approved').length,
    inbox: inboxRequests.length,
  }), [inboxRequests.length, manageableDocuments, myRequests]);

  const handleActionDraftChange = (
    requestId: string,
    patch: Partial<RequestActionDraft>,
  ) => {
    setActionDrafts((current) => ({
      ...current,
      [requestId]: {
        responseMessage: current[requestId]?.responseMessage ?? '',
        grantExpiresAt: current[requestId]?.grantExpiresAt ?? '',
        ...patch,
      },
    }));
  };

  const handleApprove = async (request: DmsDocumentAccessRequestSummary) => {
    const draft = actionDrafts[request.requestId];
    try {
      await approveMutation.mutateAsync({
        accessRequestId: request.requestId,
        payload: {
          responseMessage: draft?.responseMessage.trim() || undefined,
          grantExpiresAt: draft?.grantExpiresAt
            ? new Date(`${draft.grantExpiresAt}T23:59:59.999Z`).toISOString()
            : undefined,
        },
      });
      toast.success('읽기 권한 요청을 승인했습니다.');
      setActionDrafts((current) => {
        const next = { ...current };
        delete next[request.requestId];
        return next;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '승인 처리에 실패했습니다.');
    }
  };

  const handleReject = async (request: DmsDocumentAccessRequestSummary) => {
    const draft = actionDrafts[request.requestId];
    try {
      await rejectMutation.mutateAsync({
        accessRequestId: request.requestId,
        payload: {
          responseMessage: draft?.responseMessage.trim() || undefined,
        },
      });
      toast.success('읽기 권한 요청을 거절했습니다.');
      setActionDrafts((current) => {
        const next = { ...current };
        delete next[request.requestId];
        return next;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '거절 처리에 실패했습니다.');
    }
  };

  if (manageableDocumentsQuery.isLoading && myRequestsQuery.isLoading && inboxQuery.isLoading) {
    return <LoadingState message="문서 권한 관리 현황을 불러오는 중입니다." className="py-16" />;
  }

  if (manageableDocumentsQuery.isError || myRequestsQuery.isError || inboxQuery.isError) {
    return (
      <ErrorState
        error={manageableDocumentsQuery.error?.message || myRequestsQuery.error?.message || inboxQuery.error?.message || '문서 권한 관리 현황을 불러오지 못했습니다.'}
        onRetry={() => {
          void manageableDocumentsQuery.refetch();
          void myRequestsQuery.refetch();
          void inboxQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <article className="rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
        <p className="text-badge text-ssoo-primary/70">현재 운영 중</p>
        <h3 className="mt-1 text-label-strong text-ssoo-primary">문서 운영/권한 surface</h3>
        <p className="mt-2 text-body-sm text-ssoo-primary/80">
          DB control-plane 기준으로 내가 관리 가능한 문서, 승인 inbox, 내가 보낸 요청을 한 화면에서 운영합니다.
        </p>
      </article>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="관리 가능 문서" value={counts.manageableDocuments} icon={<FileText className="h-5 w-5" />} />
        <SummaryCard title="내 문서 대기 요청" value={counts.pendingOwnedRequests} icon={<Users className="h-5 w-5" />} />
        <SummaryCard title="승인 inbox" value={counts.inbox} icon={<Inbox className="h-5 w-5" />} />
        <SummaryCard title="내 대기 요청" value={counts.myPending} icon={<Clock3 className="h-5 w-5" />} />
        <SummaryCard title="내 승인 완료" value={counts.myApproved} icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-label-strong text-ssoo-primary">내가 관리 가능한 문서</h3>
            <p className="text-caption text-ssoo-primary/70">
              owner 또는 manage grant 기준으로 내가 권한을 운영할 수 있는 문서 목록입니다.
            </p>
          </div>
          {manageableDocumentsQuery.isFetching && <Loader2 className="h-4 w-4 animate-spin text-ssoo-primary/60" />}
        </div>

        {manageableDocuments.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-10 w-10 text-ssoo-primary/40" />}
            title="관리 가능한 문서가 없습니다"
            description="현재 계정이 owner 또는 manage 권한으로 운영 중인 문서가 아직 없습니다."
            className="rounded-lg border border-dashed border-ssoo-content-border bg-ssoo-content-bg/20"
          />
        ) : (
          <div className="space-y-3">
            {manageableDocuments.map((document) => (
              <ManagedDocumentCard key={document.documentId} document={document} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-label-strong text-ssoo-primary">승인 대기 inbox</h3>
            <p className="text-caption text-ssoo-primary/70">
              내가 관리 가능한 문서에 대해 들어온 pending 요청만 표시합니다.
            </p>
          </div>
          {inboxQuery.isFetching && <Loader2 className="h-4 w-4 animate-spin text-ssoo-primary/60" />}
        </div>

        {inboxRequests.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="h-10 w-10 text-ssoo-primary/40" />}
            title="처리할 요청이 없습니다"
            description="현재 승인 또는 거절이 필요한 읽기 권한 요청이 없습니다."
            className="rounded-lg border border-dashed border-ssoo-content-border bg-ssoo-content-bg/20"
          />
        ) : (
          <div className="space-y-3">
            {inboxRequests.map((request) => (
              <RequestCard
                key={`inbox-${request.requestId}`}
                request={request}
                actionDraft={actionDrafts[request.requestId]}
                onActionDraftChange={handleActionDraftChange}
                onApprove={handleApprove}
                onReject={handleReject}
                isApproving={approveMutation.isPending && approveMutation.variables?.accessRequestId === request.requestId}
                isRejecting={rejectMutation.isPending && rejectMutation.variables?.accessRequestId === request.requestId}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-label-strong text-ssoo-primary">내 요청 내역</h3>
            <p className="text-caption text-ssoo-primary/70">
              discovery surface 에서 보낸 읽기 권한 요청의 최신 상태입니다.
            </p>
          </div>
          {myRequestsQuery.isFetching && <Loader2 className="h-4 w-4 animate-spin text-ssoo-primary/60" />}
        </div>

        {myRequests.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-10 w-10 text-ssoo-primary/40" />}
            title="보낸 요청이 없습니다"
            description="검색 결과에서 unreadable 문서를 찾으면 읽기 권한 요청을 보낼 수 있습니다."
            className="rounded-lg border border-dashed border-ssoo-content-border bg-ssoo-content-bg/20"
          />
        ) : (
          <div className="space-y-3">
            {myRequests.map((request) => (
              <RequestCard
                key={`my-${request.requestId}`}
                request={request}
                actionDraft={actionDrafts[request.requestId]}
                onActionDraftChange={handleActionDraftChange}
                onApprove={handleApprove}
                onReject={handleReject}
                isApproving={false}
                isRejecting={false}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
