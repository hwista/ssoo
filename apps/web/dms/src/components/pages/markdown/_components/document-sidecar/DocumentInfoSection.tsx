'use client';

import * as React from 'react';
import { Calendar, FileText, Pencil, User } from 'lucide-react';
import { KeyValueSection } from '@/components/templates/page-frame/sidecar';
import type { KeyValueItem } from '@/components/templates/page-frame/sidecar';

function formatDate(date: Date | string | undefined): string {
  if (!date) return '-';
  const normalizedDate = typeof date === 'string' ? new Date(date) : date;
  return normalizedDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatTime(date: Date | string | undefined): string {
  if (!date) return '-';
  const normalizedDate = typeof date === 'string' ? new Date(date) : date;
  return normalizedDate.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function Truncated({ text, title }: { text: string; title?: string }) {
  return <span className="max-w-[140px] truncate" title={title ?? text}>{text}</span>;
}

export function DocumentInfoSection({
  editable,
  fileName,
  filePath,
  documentTitle,
  isEditingTitle,
  titleDraft,
  metadata,
  onStartTitleEdit,
  onTitleDraftChange,
  onTitleSave,
  onTitleKeyDown,
}: {
  editable: boolean;
  fileName: string;
  filePath?: string;
  documentTitle: string;
  isEditingTitle: boolean;
  titleDraft: string;
  metadata?: {
    author?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    lineCount?: number;
    charCount?: number;
    wordCount?: number;
    lastModifiedBy?: string;
  };
  onStartTitleEdit: () => void;
  onTitleDraftChange: (value: string) => void;
  onTitleSave: () => void;
  onTitleKeyDown: (event: React.KeyboardEvent) => void;
}) {
  if (!metadata) return null;

  const titleValue = editable && isEditingTitle ? (
    <input
      type="text"
      value={titleDraft}
      onChange={(event) => onTitleDraftChange(event.target.value)}
      onBlur={onTitleSave}
      onKeyDown={onTitleKeyDown}
      className="w-full border-b border-ssoo-content-border bg-transparent px-0.5 text-right text-sm outline-none"
      autoFocus
    />
  ) : (
    <span className="flex items-center gap-1">
      <Truncated text={documentTitle || '제목없음'} title={documentTitle} />
      {editable ? (
        <button onClick={onStartTitleEdit} className="text-gray-400 hover:text-ssoo-primary">
          <Pencil className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  );

  const items: KeyValueItem[] = [
    { label: '문서명', icon: <FileText className="mr-1 h-3.5 w-3.5" />, value: titleValue },
    { label: '파일명', indent: true, value: <Truncated text={fileName} />, hidden: !fileName },
    { label: '경로', indent: true, value: <Truncated text={filePath ?? ''} />, hidden: !filePath },
    { label: '작성자', icon: <User className="mr-1 h-3.5 w-3.5" />, value: metadata.author || 'Unknown' },
    { label: '생성일', icon: <Calendar className="mr-1 h-3.5 w-3.5" />, value: formatDate(metadata.createdAt), hidden: !metadata.createdAt },
    { label: '생성 시간', indent: true, value: formatTime(metadata.createdAt), hidden: !metadata.createdAt },
    { label: '수정자', icon: <Pencil className="mr-1 h-3.5 w-3.5" />, value: metadata.lastModifiedBy || 'Unknown' },
    { label: '수정일', icon: <Calendar className="mr-1 h-3.5 w-3.5" />, value: formatDate(metadata.updatedAt), hidden: !metadata.updatedAt },
    { label: '수정 시간', indent: true, value: formatTime(metadata.updatedAt), hidden: !metadata.updatedAt },
    { label: '줄 수', value: metadata.lineCount?.toLocaleString(), hidden: metadata.lineCount === undefined },
    { label: '문자 수', value: metadata.charCount?.toLocaleString(), hidden: metadata.charCount === undefined },
    { label: '단어 수', value: metadata.wordCount?.toLocaleString(), hidden: metadata.wordCount === undefined },
  ];

  return (
    <KeyValueSection
      key={String(editable)}
      title="문서 정보"
      icon={<FileText className="mr-1.5 h-4 w-4 shrink-0" />}
      items={items}
      defaultOpen={editable}
    />
  );
}
