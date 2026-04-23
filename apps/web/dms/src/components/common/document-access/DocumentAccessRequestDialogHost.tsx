'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock3, Loader2, Send } from 'lucide-react';
import type { DmsDocumentAccessRequestState, DmsDocumentAccessRequestSummary } from '@ssoo/types/dms';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/lib/toast';
import { useCreateReadAccessRequestMutation } from '@/hooks/queries/useDocumentAccessRequests';
import {
  normalizeDocumentAccessRequestPath,
  useDocumentAccessRequestStore,
} from '@/stores/document-access-request.store';

const STATUS_LABELS: Record<NonNullable<DmsDocumentAccessRequestState['status']>, string> = {
  pending: '요청 대기',
  approved: '승인됨',
  rejected: '거절됨',
};

function formatDateLabel(value?: string) {
  if (!value) return '';

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

function toRequestState(
  request: DmsDocumentAccessRequestSummary,
): DmsDocumentAccessRequestState {
  return {
    requestId: request.requestId,
    status: request.status,
    requestedAt: request.requestedAt,
    requestMessage: request.requestMessage,
    requestedExpiresAt: request.requestedExpiresAt,
    respondedAt: request.respondedAt,
    responseMessage: request.responseMessage,
  };
}

export function DocumentAccessRequestDialogHost() {
  const isOpen = useDocumentAccessRequestStore((state) => state.isOpen);
  const target = useDocumentAccessRequestStore((state) => state.target);
  const overrides = useDocumentAccessRequestStore((state) => state.overrides);
  const close = useDocumentAccessRequestStore((state) => state.close);
  const setRequestState = useDocumentAccessRequestStore((state) => state.setRequestState);
  const createRequestMutation = useCreateReadAccessRequestMutation();
  const [requestMessage, setRequestMessage] = useState('');

  const pathKey = useMemo(
    () => normalizeDocumentAccessRequestPath(target?.path ?? ''),
    [target?.path],
  );
  const currentRequest = pathKey
    ? overrides[pathKey] ?? target?.readRequest
    : target?.readRequest;

  useEffect(() => {
    if (!isOpen) {
      setRequestMessage('');
      return;
    }

    if (currentRequest?.status === 'rejected') {
      setRequestMessage(currentRequest.requestMessage ?? '');
      return;
    }

    setRequestMessage('');
  }, [currentRequest?.requestMessage, currentRequest?.status, isOpen]);

  const isPendingRequest = currentRequest?.status === 'pending';
  const isApprovedRequest = currentRequest?.status === 'approved';
  const isSubmitting = createRequestMutation.isPending;

  const handleSubmit = async () => {
    if (!target || !pathKey) {
      return;
    }

    try {
      const created = await createRequestMutation.mutateAsync({
        path: target.path,
        requestMessage: requestMessage.trim() || undefined,
      });
      setRequestState(target.path, toRequestState(created));
      toast.success(
        currentRequest?.status === 'rejected'
          ? '읽기 권한 요청을 다시 접수했습니다.'
          : '읽기 권한 요청을 저장했습니다.',
      );
      close();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '읽기 권한 요청에 실패했습니다.');
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          close();
        }
      }}
    >
      <DialogContent className="max-w-xl border-ssoo-content-border bg-white text-ssoo-primary">
        <DialogHeader>
          <DialogTitle>읽기 권한 요청</DialogTitle>
          <DialogDescription className="text-ssoo-primary/70">
            discovery surface 에서 확인한 문서에 대해 owner/관리자에게 읽기 권한을 요청합니다.
          </DialogDescription>
        </DialogHeader>

        {target ? (
          <div className="space-y-4">
            <section className="rounded-lg border border-ssoo-content-border bg-ssoo-content-bg/40 px-4 py-3">
              <p className="text-badge text-ssoo-primary/70">대상 문서</p>
              <h3 className="mt-1 text-label-strong text-ssoo-primary">{target.title}</h3>
              <p className="mt-2 break-all text-caption text-ssoo-primary/70">{target.path}</p>
              {target.owner && (
                <p className="mt-1 text-caption text-ssoo-primary/70">작성자: {target.owner}</p>
              )}
            </section>

            {currentRequest ? (
              <section className="rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-ssoo-content-border bg-ssoo-content-bg px-2 py-0.5 text-badge text-ssoo-primary">
                    {STATUS_LABELS[currentRequest.status]}
                  </span>
                  <span className="inline-flex items-center gap-1 text-caption text-ssoo-primary/70">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatDateLabel(currentRequest.respondedAt ?? currentRequest.requestedAt)}
                  </span>
                </div>
                {currentRequest.requestMessage && (
                  <p className="mt-2 text-body-sm text-ssoo-primary/80">
                    요청 메모: {currentRequest.requestMessage}
                  </p>
                )}
                {currentRequest.responseMessage && (
                  <p className="mt-2 text-body-sm text-ssoo-primary/80">
                    응답 메모: {currentRequest.responseMessage}
                  </p>
                )}
              </section>
            ) : null}

            {isPendingRequest || isApprovedRequest ? (
              <section className="rounded-lg border border-ssoo-content-border bg-ssoo-content-bg/40 px-4 py-3 text-body-sm text-ssoo-primary/80">
                {isPendingRequest
                  ? '이미 처리 대기 중인 읽기 권한 요청이 있습니다. 승인되면 검색 결과와 문서 열기 상태에 반영됩니다.'
                  : '읽기 권한 승인이 완료되었습니다. 검색을 다시 실행하거나 문서를 다시 열면 접근 상태가 갱신됩니다.'}
              </section>
            ) : (
              <section className="space-y-2">
                <label className="block text-label-md text-ssoo-primary" htmlFor="document-access-request-message">
                  요청 메모
                </label>
                <textarea
                  id="document-access-request-message"
                  value={requestMessage}
                  onChange={(event) => setRequestMessage(event.target.value)}
                  placeholder="문서를 확인해야 하는 이유를 남겨 주세요."
                  rows={5}
                  maxLength={500}
                  className="w-full rounded-lg border border-ssoo-content-border bg-white px-3 py-2 text-body-sm text-ssoo-primary outline-none transition focus:border-ssoo-primary/40 focus:ring-2 focus:ring-ssoo-primary/10"
                />
                <p className="text-caption text-ssoo-primary/60">
                  최대 500자까지 입력할 수 있습니다.
                </p>
              </section>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => close()}
            disabled={isSubmitting}
          >
            닫기
          </Button>
          {!isPendingRequest && !isApprovedRequest && (
            <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting || !target}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  요청 중...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {currentRequest?.status === 'rejected' ? '다시 요청' : '권한 요청 보내기'}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
