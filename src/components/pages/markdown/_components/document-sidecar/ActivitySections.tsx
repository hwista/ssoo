'use client';

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
  onDelete,
}: {
  comments: DocumentComment[];
  onDelete: (commentId: string) => void;
}) {
  return (
    <ActivityListSection
      icon={<MessageSquare className="mr-1.5 h-4 w-4 shrink-0" />}
      title="댓글"
      badge={comments.length > 0 ? <span className="mr-1 text-xs text-gray-400">({comments.length})</span> : undefined}
      variant="compact"
      items={comments.map((comment) => ({
        id: comment.id,
        title: comment.author || 'Unknown',
        content: comment.content,
        meta: formatDate(comment.createdAt),
        actions: [
          {
            id: `${comment.id}-delete`,
            kind: 'icon' as const,
            tone: 'danger' as const,
            title: '댓글 삭제',
            ariaLabel: '댓글 삭제',
            icon: <X className="h-3 w-3" />,
            onClick: () => onDelete(comment.id),
          },
        ],
      }))}
      emptyText="댓글없음"
    />
  );
}
