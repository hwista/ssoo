'use client';

import * as React from 'react';
import { Download, File, FileSpreadsheet, FileText, Image, MessageSquare, Paperclip, Presentation, Plus, Link2, X } from 'lucide-react';
import type { SourceFileMeta, DocumentComment } from '@/types';
import { ActivityListSection } from '@/components/templates/page-frame/sidecar';
import type { ActivityAction } from '@/components/templates/page-frame/sidecar';
import { getAttachmentCategory, ATTACHMENT_ACCEPT_STRING } from '@/lib/constants/file';

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

function getFileIcon(fileName: string): React.ReactNode {
  const category = getAttachmentCategory(fileName);
  const cls = 'h-3 w-3 shrink-0 text-ssoo-primary/50';
  switch (category) {
    case 'image':
      return <Image className={cls} />;
    case 'office': {
      const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
      if (ext === '.xls' || ext === '.xlsx') return <FileSpreadsheet className={cls} />;
      if (ext === '.ppt' || ext === '.pptx') return <Presentation className={cls} />;
      return <FileText className={cls} />;
    }
    case 'document':
      return <FileText className={cls} />;
    case 'text':
      return <FileText className={cls} />;
    default:
      return <File className={cls} />;
  }
}

export function AttachmentsSection({
  attachments,
  editable,
  onChange,
  onItemClick,
  onDownload,
  originalAttachmentPaths,
}: {
  attachments: SourceFileMeta[];
  editable?: boolean;
  onChange?: (attachments: SourceFileMeta[]) => void;
  onItemClick?: (attachment: SourceFileMeta) => void;
  onDownload?: (attachment: SourceFileMeta) => void;
  originalAttachmentPaths?: string[];
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [pendingDeletes, setPendingDeletes] = React.useState<Set<string>>(new Set());
  const [deletedAttachments, setDeletedAttachments] = React.useState<SourceFileMeta[]>([]);

  const attachmentKey = (a: SourceFileMeta) => a.path || a.name;

  const newAttachmentPaths = React.useMemo(() => {
    if (!originalAttachmentPaths || !editable) return undefined;
    const originalSet = new Set(originalAttachmentPaths);
    const ids = new Set<string>();
    for (const a of attachments) {
      const key = attachmentKey(a);
      if (!originalSet.has(key) && !pendingDeletes.has(key)) ids.add(key);
    }
    return ids.size > 0 ? ids : undefined;
  }, [attachments, originalAttachmentPaths, editable, pendingDeletes]);

  const handleSoftDelete = (key: string) => {
    const attachment = attachments.find((a) => attachmentKey(a) === key);
    if (attachment) {
      setDeletedAttachments((prev) => [...prev, attachment]);
    }
    setPendingDeletes((prev) => new Set(prev).add(key));
    onChange?.(attachments.filter((a) => attachmentKey(a) !== key));
  };

  const handleRestore = (item: { id: string }) => {
    const cached = deletedAttachments.find((a) => attachmentKey(a) === item.id);
    setPendingDeletes((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
    setDeletedAttachments((prev) => prev.filter((a) => attachmentKey(a) !== item.id));
    if (cached && !attachments.some((a) => attachmentKey(a) === item.id)) {
      onChange?.([...attachments, cached]);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    const tempMeta: SourceFileMeta = {
      name: file.name,
      path: `__pending__/${Date.now()}-${file.name}`,
      type: file.type || 'application/octet-stream',
      size: file.size,
      origin: 'manual',
      status: 'draft',
      provider: 'local',
    };

    onChange?.([...attachments, tempMeta]);

    // Dispatch custom event so DocumentPage can track the pending file
    window.dispatchEvent(
      new CustomEvent('attachment-file-selected', { detail: { meta: tempMeta, file } }),
    );
  };

  const allAttachments = React.useMemo(() => {
    const deletedOnly = deletedAttachments.filter(
      (da) => !attachments.some((a) => attachmentKey(a) === attachmentKey(da)) && pendingDeletes.has(attachmentKey(da)),
    );
    return [...attachments, ...deletedOnly];
  }, [attachments, deletedAttachments, pendingDeletes]);

  const items = allAttachments.map((attachment) => {
    const key = attachmentKey(attachment);
    const isDeleted = pendingDeletes.has(key);
    const isReference = attachment.origin === 'reference';
    const isTemplate = attachment.origin === 'template';
    const isSynced = isReference || isTemplate;

    const actions: ActivityAction[] = [];

    // 에디터 모드: 수기 첨부만 삭제 가능, 참조/템플릿은 삭제 불가
    if (editable && !isDeleted && !isSynced) {
      actions.push({
        id: `delete-${key}`,
        kind: 'icon',
        tone: 'danger',
        icon: <X className="h-3 w-3" />,
        title: '첨부 삭제',
        onClick: () => handleSoftDelete(key),
      });
    }

    // 뷰어 모드: 참조 파일은 다운로드 가능, 템플릿은 다운로드 없음
    if (!editable && !isTemplate) {
      actions.push({
        id: `download-${key}`,
        kind: 'icon',
        tone: 'default',
        icon: <Download className="h-3 w-3" />,
        title: '다운로드',
        onClick: () => onDownload?.(attachment),
      });
    }

    // 뱃지: 참조됨 / 템플릿 (뷰어모드에서도 표시)
    const badgeLabel = isReference ? '참조됨' : isTemplate ? '템플릿' : null;
    const metaContent = badgeLabel
      ? (
        <span className="flex items-center gap-1.5">
          <span>{formatSize(attachment.size)}</span>
          <span className="inline-flex items-center gap-0.5 rounded-full border border-ssoo-content-border bg-ssoo-content-border/30 px-1.5 py-0.5 text-[10px] font-medium leading-none text-ssoo-primary">
            <Link2 className="h-2.5 w-2.5" />
            {badgeLabel}
          </span>
        </span>
      )
      : formatSize(attachment.size);

    return {
      id: key,
      title: attachment.name,
      meta: metaContent,
      icon: getFileIcon(attachment.name),
      actions,
    };
  });

  const deletedIds = React.useMemo(() => {
    if (pendingDeletes.size === 0) return undefined;
    return pendingDeletes;
  }, [pendingDeletes]);

  return (
    <ActivityListSection
      icon={<Paperclip className="mr-1.5 h-4 w-4 shrink-0" />}
      title="첨부"
      badge={attachments.length > 0 ? <span className="mr-1 text-xs text-gray-400">({attachments.length})</span> : undefined}
      items={items}
      variant="compact"
      highlightedItemIds={newAttachmentPaths}
      deletedItemIds={deletedIds}
      onItemRestore={handleRestore}
      onItemClick={(item) => {
        if (pendingDeletes.has(item.id)) return;
        const attachment = attachments.find((a) => attachmentKey(a) === item.id);
        if (attachment) onItemClick?.(attachment);
      }}
      emptyText="첨부없음"
    >
      {editable && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-7 w-full items-center justify-center gap-1.5 rounded border border-dashed border-ssoo-content-border px-2 text-xs text-ssoo-primary/60 transition-colors hover:border-ssoo-primary hover:text-ssoo-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            파일 첨부
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ATTACHMENT_ACCEPT_STRING}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}
    </ActivityListSection>
  );
}

export function CommentsSection({
  comments,
  editable,
  onDelete,
  onRestore,
  originalCommentIds,
}: {
  comments: DocumentComment[];
  editable?: boolean;
  onDelete: (commentId: string) => void;
  onRestore?: (comment: DocumentComment) => void;
  originalCommentIds?: string[];
}) {
  const [pendingDeletes, setPendingDeletes] = React.useState<Set<string>>(new Set());
  const [deletedComments, setDeletedComments] = React.useState<DocumentComment[]>([]);

  const newCommentIds = React.useMemo(() => {
    if (!originalCommentIds || !editable) return undefined;
    const originalSet = new Set(originalCommentIds);
    const ids = new Set<string>();
    for (const c of comments) {
      if (!originalSet.has(c.id) && !pendingDeletes.has(c.id)) ids.add(c.id);
    }
    return ids.size > 0 ? ids : undefined;
  }, [comments, originalCommentIds, editable, pendingDeletes]);

  const handleSoftDeleteWithCache = (commentId: string) => {
    const comment = comments.find((c) => c.id === commentId);
    if (comment) {
      setDeletedComments((prev) => [...prev, comment]);
    }
    setPendingDeletes((prev) => new Set(prev).add(commentId));
    onDelete(commentId);
  };

  const handleRestoreComment = (item: { id: string }) => {
    const cached = deletedComments.find((c) => c.id === item.id);
    setPendingDeletes((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
    setDeletedComments((prev) => prev.filter((c) => c.id !== item.id));
    if (cached) {
      onRestore?.(cached);
    }
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
