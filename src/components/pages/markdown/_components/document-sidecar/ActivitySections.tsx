'use client';

import * as React from 'react';
import { Copy, ExternalLink, MessageSquare, Paperclip, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SourceFileMeta, DocumentComment } from '@/types';
import { ActivityListSection, CollapsibleSection } from '@/components/templates/page-frame/sidecar';

function formatDate(date: Date | string | undefined): string {
  if (!date) return '-';
  const normalizedDate = typeof date === 'string' ? new Date(date) : date;
  return normalizedDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function EmptyPlaceholder({ text }: { text: string }) {
  return <p className="py-1 text-xs text-gray-400">{text}</p>;
}

export function AttachmentsSection({
  attachments,
  attachmentActionKey,
  onOpen,
  onCopyUri,
  onResync,
}: {
  attachments: SourceFileMeta[];
  attachmentActionKey: string | null;
  onOpen: (attachment: SourceFileMeta) => void | Promise<void>;
  onCopyUri: (attachment: SourceFileMeta) => void | Promise<void>;
  onResync: (attachment: SourceFileMeta) => void | Promise<void>;
}) {
  return (
    <CollapsibleSection icon={<Paperclip className="mr-1.5 h-4 w-4 shrink-0" />} title="첨부 파일">
      {attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const openKey = `${attachment.path}:${attachment.name}:open`;
            const resyncKey = `${attachment.path}:${attachment.name}:resync`;
            const isOpening = attachmentActionKey === openKey;
            const isResyncing = attachmentActionKey === resyncKey;

            return (
              <div
                key={`${attachment.path}-${attachment.name}`}
                className="rounded-md border border-ssoo-content-border px-2.5 py-2 text-xs text-ssoo-primary"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{attachment.name}</span>
                  <span className="text-ssoo-primary/60">{formatSize(attachment.size)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => void onOpen(attachment)}
                    disabled={isOpening}
                    className="inline-flex items-center gap-1 rounded border border-ssoo-content-border px-2 py-1 text-[11px] hover:border-ssoo-primary disabled:opacity-60"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {isOpening ? 'Opening...' : 'Open'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onCopyUri(attachment)}
                    className="inline-flex items-center gap-1 rounded border border-ssoo-content-border px-2 py-1 text-[11px] hover:border-ssoo-primary"
                  >
                    <Copy className="h-3 w-3" />
                    URI
                  </button>
                  <button
                    type="button"
                    onClick={() => void onResync(attachment)}
                    disabled={isResyncing}
                    className="inline-flex items-center gap-1 rounded border border-ssoo-content-border px-2 py-1 text-[11px] hover:border-ssoo-primary disabled:opacity-60"
                  >
                    <RefreshCw className={cn('h-3 w-3', isResyncing && 'animate-spin')} />
                    Resync
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyPlaceholder text="첨부없음" />
      )}
    </CollapsibleSection>
  );
}

export function CommentsSection({
  comments,
  editable,
  onDelete,
  originalCommentIds,
}: {
  comments: DocumentComment[];
  editable?: boolean;
  onDelete: (commentId: string) => void;
  originalCommentIds?: string[];
}) {
  const [pendingDeletes, setPendingDeletes] = React.useState<Set<string>>(new Set());

  const handleSoftDelete = (commentId: string) => {
    setPendingDeletes((prev) => new Set(prev).add(commentId));
    onDelete(commentId);
  };

  const handleRestore = (item: { id: string }) => {
    setPendingDeletes((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
  };

  const newCommentIds = React.useMemo(() => {
    if (!originalCommentIds || !editable) return undefined;
    const originalSet = new Set(originalCommentIds);
    const ids = new Set<string>();
    for (const c of comments) {
      if (!originalSet.has(c.id) && !pendingDeletes.has(c.id)) ids.add(c.id);
    }
    return ids.size > 0 ? ids : undefined;
  }, [comments, originalCommentIds, editable, pendingDeletes]);

  // 삭제된 댓글도 포함 — 단 원래 있던 댓글 정보가 필요
  // 댓글은 onDelete로 즉시 comments에서 제거되므로 별도 보관 필요
  const [deletedComments, setDeletedComments] = React.useState<DocumentComment[]>([]);

  const handleSoftDeleteWithCache = (commentId: string) => {
    const comment = comments.find((c) => c.id === commentId);
    if (comment) {
      setDeletedComments((prev) => [...prev, comment]);
    }
    handleSoftDelete(commentId);
  };

  const handleRestoreComment = (item: { id: string }) => {
    handleRestore(item);
    setDeletedComments((prev) => prev.filter((c) => c.id !== item.id));
  };

  const allComments = React.useMemo(() => {
    const deletedOnly = deletedComments.filter(
      (dc) => !comments.some((c) => c.id === dc.id) && pendingDeletes.has(dc.id)
    );
    return [...comments, ...deletedOnly];
  }, [comments, deletedComments, pendingDeletes]);

  return (
    <ActivityListSection
      icon={<MessageSquare className="mr-1.5 h-4 w-4 shrink-0" />}
      title="댓글"
      badge={comments.length > 0 ? <span className="mr-1 text-xs text-gray-400">({comments.length})</span> : undefined}
      variant="compact"
      highlightedItemIds={newCommentIds}
      deletedItemIds={pendingDeletes.size > 0 ? pendingDeletes : undefined}
      onItemRestore={handleRestoreComment}
      items={allComments.map((comment) => ({
        id: comment.id,
        title: comment.author || 'Unknown',
        content: comment.content,
        meta: formatDate(comment.createdAt),
        actions: editable && !pendingDeletes.has(comment.id)
          ? [
              {
                id: `${comment.id}-delete`,
                kind: 'icon' as const,
                tone: 'danger' as const,
                title: '댓글 삭제',
                ariaLabel: '댓글 삭제',
                icon: <X className="h-3 w-3" />,
                onClick: () => handleSoftDeleteWithCache(comment.id),
              },
            ]
          : undefined,
      }))}
      emptyText="댓글없음"
    />
  );
}
