'use client';

import * as React from 'react';
import { Download, File, FileSpreadsheet, FileText, ImageIcon, Paperclip, Presentation, Plus, Link2, X } from 'lucide-react';
import type { SourceFileMeta } from '@/types';
import { ActivityListSection } from '@/components/templates/page-frame/sidecar';
import type { ActivityAction } from '@/components/templates/page-frame/sidecar';
import { getAttachmentCategory, ATTACHMENT_ACCEPT_STRING } from '@/lib/constants/file';

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
      return <ImageIcon className={cls} />;
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
  templateMode = false,
  onChange,
  onItemClick,
  onDownload,
  originalAttachmentPaths,
  deletedReferenceKeys,
  defaultOpen = true,
}: {
  attachments: SourceFileMeta[];
  editable?: boolean;
  templateMode?: boolean;
  onChange?: (attachments: SourceFileMeta[]) => void;
  onItemClick?: (attachment: SourceFileMeta) => void;
  onDownload?: (attachment: SourceFileMeta) => void;
  originalAttachmentPaths?: string[];
  /** 인라인 컴포저에서 소프트 삭제된 참조/템플릿 키 (표시 전용, undo 없음) */
  deletedReferenceKeys?: Set<string>;
  defaultOpen?: boolean;
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
          <span>{formatSize(attachment.size ?? 0)}</span>
          <span className="inline-flex items-center gap-0.5 rounded-full border border-ssoo-content-border bg-ssoo-content-border px-1.5 py-0.5 text-badge leading-none text-ssoo-primary">
            <Link2 className="h-2.5 w-2.5" />
            {badgeLabel}
          </span>
        </span>
      )
      : formatSize(attachment.size ?? 0);

    return {
      id: key,
      title: attachment.name,
      meta: metaContent,
      icon: getFileIcon(attachment.name),
      actions,
    };
  });

  const deletedIds = React.useMemo(() => {
    const hasLocal = pendingDeletes.size > 0;
    const hasExternal = deletedReferenceKeys && deletedReferenceKeys.size > 0;
    if (!hasLocal && !hasExternal) return undefined;
    if (hasLocal && !hasExternal) return pendingDeletes;
    if (!hasLocal && hasExternal) return deletedReferenceKeys;
    const merged = new Set(pendingDeletes);
    for (const key of deletedReferenceKeys!) merged.add(key);
    return merged;
  }, [pendingDeletes, deletedReferenceKeys]);

  return (
    <ActivityListSection
      icon={templateMode ? <FileText className="mr-1.5 h-4 w-4 shrink-0" /> : <Paperclip className="mr-1.5 h-4 w-4 shrink-0" />}
      title={templateMode ? '참조' : '파일'}
      badge={attachments.length > 0 ? <span className="mr-1 text-caption text-gray-400">({attachments.length})</span> : undefined}
      items={items}
      variant="compact"
      highlightedItemIds={newAttachmentPaths}
      deletedItemIds={deletedIds}
      nonRestorableItemIds={deletedReferenceKeys}
      onItemRestore={handleRestore}
      onItemClick={(item) => {
        if (pendingDeletes.has(item.id) || deletedReferenceKeys?.has(item.id)) return;
        const attachment = attachments.find((a) => attachmentKey(a) === item.id);
        if (attachment) onItemClick?.(attachment);
      }}
      emptyText={templateMode ? '참조 문서 없음' : '파일없음'}
      defaultOpen={defaultOpen}
    >
      {editable && !templateMode && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-7 w-full items-center justify-center gap-1.5 rounded border border-dashed border-ssoo-content-border px-2 text-caption text-ssoo-primary/60 transition-colors hover:border-ssoo-primary hover:text-ssoo-primary"
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
