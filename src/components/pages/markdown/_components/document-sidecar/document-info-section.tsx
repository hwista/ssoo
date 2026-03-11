'use client';

import * as React from 'react';
import { Calendar, FileText, Pencil, User } from 'lucide-react';
import { CollapsibleSection } from '@/components/templates/page-frame/sidecar';

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

  return (
    <CollapsibleSection icon={<FileText className="mr-1.5 h-4 w-4 shrink-0" />} title="문서 정보" defaultOpen={false}>
      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="flex items-center text-gray-500">
            <FileText className="mr-1 h-3.5 w-3.5" />
            문서명
          </dt>
          <dd className="flex items-center gap-1 text-ssoo-primary">
            {editable && isEditingTitle ? (
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
              <>
                <span className="max-w-[140px] truncate" title={documentTitle}>
                  {documentTitle || '제목없음'}
                </span>
                {editable ? (
                  <button onClick={onStartTitleEdit} className="text-gray-400 hover:text-ssoo-primary">
                    <Pencil className="h-3 w-3" />
                  </button>
                ) : null}
              </>
            )}
          </dd>
        </div>
        {fileName ? (
          <div className="flex items-center justify-between">
            <dt className="flex items-center pl-[18px] text-gray-500">파일명</dt>
            <dd className="max-w-[140px] truncate text-ssoo-primary" title={fileName}>{fileName}</dd>
          </div>
        ) : null}
        {filePath ? (
          <div className="flex items-center justify-between">
            <dt className="flex items-center pl-[18px] text-gray-500">경로</dt>
            <dd className="max-w-[140px] truncate text-ssoo-primary" title={filePath}>{filePath}</dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <dt className="flex items-center text-gray-500">
            <User className="mr-1 h-3.5 w-3.5" />
            작성자
          </dt>
          <dd className="text-ssoo-primary">{metadata.author || 'Unknown'}</dd>
        </div>
        {metadata.createdAt ? (
          <>
            <div className="flex items-center justify-between">
              <dt className="flex items-center text-gray-500">
                <Calendar className="mr-1 h-3.5 w-3.5" />
                생성일
              </dt>
              <dd className="text-ssoo-primary">{formatDate(metadata.createdAt)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center pl-[18px] text-gray-500">생성 시간</dt>
              <dd className="text-ssoo-primary">{formatTime(metadata.createdAt)}</dd>
            </div>
          </>
        ) : null}
        <div className="flex items-center justify-between">
          <dt className="flex items-center text-gray-500">
            <Pencil className="mr-1 h-3.5 w-3.5" />
            수정자
          </dt>
          <dd className="text-ssoo-primary">{metadata.lastModifiedBy || 'Unknown'}</dd>
        </div>
        {metadata.updatedAt ? (
          <>
            <div className="flex items-center justify-between">
              <dt className="flex items-center text-gray-500">
                <Calendar className="mr-1 h-3.5 w-3.5" />
                수정일
              </dt>
              <dd className="text-ssoo-primary">{formatDate(metadata.updatedAt)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center pl-[18px] text-gray-500">수정 시간</dt>
              <dd className="text-ssoo-primary">{formatTime(metadata.updatedAt)}</dd>
            </div>
          </>
        ) : null}
        {metadata.lineCount !== undefined ? (
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">줄 수</dt>
            <dd className="text-ssoo-primary">{metadata.lineCount.toLocaleString()}</dd>
          </div>
        ) : null}
        {metadata.charCount !== undefined ? (
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">문자 수</dt>
            <dd className="text-ssoo-primary">{metadata.charCount.toLocaleString()}</dd>
          </div>
        ) : null}
        {metadata.wordCount !== undefined ? (
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">단어 수</dt>
            <dd className="text-ssoo-primary">{metadata.wordCount.toLocaleString()}</dd>
          </div>
        ) : null}
      </dl>
    </CollapsibleSection>
  );
}
