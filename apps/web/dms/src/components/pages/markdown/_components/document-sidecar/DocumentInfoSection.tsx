'use client';

import * as React from 'react';
import { Calendar, Check, FileText, Pencil, Sparkles, User, X } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/StateDisplay';
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

function WandButton({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="rounded p-1 text-ssoo-primary/50 transition-all hover:bg-black/5 hover:text-ssoo-primary disabled:opacity-40"
      aria-label={label}
      title={label}
    >
      {loading ? <LoadingSpinner className="h-3.5 w-3.5 text-current" /> : <Sparkles className="h-3.5 w-3.5" />}
    </button>
  );
}

export function DocumentInfoSection({
  editable,
  filePath,
  documentTitle,
  originalDocumentTitle = '',
  originalFilePath = '',
  titleRecommendationStatus = 'idle',
  pathRecommendationStatus = 'idle',
  externalLoading = false,
  pathValidationMessage,
  pendingSuggestedTitle,
  pendingSuggestedPath,
  pendingPathValidationMessage,
  metadata,
  onRequestRecommendation,
  onAcceptSuggestedTitle,
  onDismissSuggestedTitle,
  onAcceptSuggestedPath,
  onDismissSuggestedPath,
  onOpenSaveLocation,
}: {
  editable: boolean;
  filePath?: string;
  documentTitle: string;
  originalDocumentTitle?: string;
  originalFilePath?: string;
  titleRecommendationStatus?: 'idle' | 'loading' | 'resolved' | 'error';
  pathRecommendationStatus?: 'idle' | 'loading' | 'resolved' | 'error';
  externalLoading?: boolean;
  pathValidationMessage?: string;
  isNewDocument?: boolean;
  pendingSuggestedTitle?: string | null;
  pendingSuggestedPath?: string | null;
  pendingPathValidationMessage?: string;
  metadata?: {
    author?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    lineCount?: number;
    charCount?: number;
    wordCount?: number;
    lastModifiedBy?: string;
  };
  onRequestRecommendation?: () => void;
  onAcceptSuggestedTitle?: () => void;
  onDismissSuggestedTitle?: () => void;
  onAcceptSuggestedPath?: () => void;
  onDismissSuggestedPath?: () => void;
  onOpenSaveLocation: () => void;
}) {
  if (!metadata) return null;

  const editButton = editable ? (
    <button onClick={onOpenSaveLocation} className="text-gray-400 hover:text-ssoo-primary">
      <Pencil className="h-3 w-3" />
    </button>
  ) : null;

  const titleValue = (
    <span className="flex items-center gap-1">
      <Truncated text={documentTitle || '제목없음'} title={documentTitle} />
      {editButton}
    </span>
  );

  const pathValue = (
    <span className="flex items-center gap-1">
      <Truncated text={filePath ?? ''} />
      {editButton}
    </span>
  );

  const titleErrorValue = (
    <span className="flex items-center gap-1 text-red-600/80">
      <span>문서명 추천 오류</span>
      {editButton}
    </span>
  );

  const pathErrorValue = (
    <span className="flex items-center gap-1 text-red-600/80">
      <span>문서 경로 추천 오류</span>
      {editButton}
    </span>
  );

  const pathValidationValue = (
    <span className="flex items-center gap-1 text-amber-700/90">
      <span>{pathValidationMessage}</span>
      {editButton}
    </span>
  );

  const titleLoadingValue = (
    <span className="flex items-center gap-1 text-gray-500">
      <span>문서명 추천 중...</span>
      {editButton}
    </span>
  );

  const pathLoadingValue = (
    <span className="flex items-center gap-1 text-gray-500">
      <span>문서 경로 추천 중...</span>
      {editButton}
    </span>
  );

  const showTitleLoading = editable && (externalLoading || titleRecommendationStatus === 'loading');
  const showTitleError = editable && titleRecommendationStatus === 'error';
  const showPathLoading = editable && (externalLoading || pathRecommendationStatus === 'loading');
  const showPathError = editable && pathRecommendationStatus === 'error';
  const isTitleHighlighted = Boolean(documentTitle) && documentTitle !== originalDocumentTitle;
  const isPathHighlighted = Boolean(filePath) && filePath !== originalFilePath;
  const infoLoading = editable && (externalLoading || titleRecommendationStatus === 'loading' || pathRecommendationStatus === 'loading');
  const showWand = editable && Boolean(onRequestRecommendation);

  const suggestionCardClassName = 'mt-2 rounded border border-dashed border-ssoo-primary/30 bg-ssoo-primary/5 p-2';
  const actionButtonClassName = 'inline-flex items-center gap-1 rounded bg-ssoo-primary/10 px-2 py-0.5 text-caption text-ssoo-primary transition-colors hover:bg-ssoo-primary/20';
  const dismissButtonClassName = 'inline-flex items-center gap-1 rounded px-2 py-0.5 text-caption text-ssoo-primary/60 transition-colors hover:text-ssoo-primary';

  const items: KeyValueItem[] = [
    {
      label: '문서명',
      icon: <FileText className="mr-1 h-3.5 w-3.5" />,
      value: showTitleError ? titleErrorValue : (showTitleLoading ? titleLoadingValue : titleValue),
      hidden: showTitleLoading ? false : (showTitleError ? false : !documentTitle),
      highlighted: !showTitleLoading && !showTitleError && isTitleHighlighted,
    },
    {
      label: '문서 경로',
      indent: true,
      value: showPathError
        ? pathErrorValue
        : (showPathLoading ? pathLoadingValue : (pathValidationMessage ? pathValidationValue : pathValue)),
      hidden: showPathLoading ? false : (showPathError ? false : (!pathValidationMessage && !filePath)),
      highlighted: !showPathLoading && !showPathError && !pathValidationMessage && isPathHighlighted,
    },
    { label: '작성자', icon: <User className="mr-1 h-3.5 w-3.5" />, value: metadata.author, hidden: !metadata.author },
    { label: '작성일', icon: <Calendar className="mr-1 h-3.5 w-3.5" />, value: formatDate(metadata.createdAt), hidden: !metadata.createdAt },
    { label: '작성 시간', indent: true, value: formatTime(metadata.createdAt), hidden: !metadata.createdAt },
    { label: '수정자', icon: <Pencil className="mr-1 h-3.5 w-3.5" />, value: metadata.lastModifiedBy, hidden: !metadata.lastModifiedBy },
    { label: '수정일', icon: <Calendar className="mr-1 h-3.5 w-3.5" />, value: formatDate(metadata.updatedAt), hidden: !metadata.updatedAt },
    { label: '수정 시간', indent: true, value: formatTime(metadata.updatedAt), hidden: !metadata.updatedAt },
    { label: '줄 수', value: metadata.lineCount?.toLocaleString(), hidden: metadata.lineCount === undefined || editable },
    { label: '문자 수', value: metadata.charCount?.toLocaleString(), hidden: metadata.charCount === undefined || editable },
    { label: '단어 수', value: metadata.wordCount?.toLocaleString(), hidden: metadata.wordCount === undefined || editable },
  ];

  return (
    <KeyValueSection
      key={String(editable)}
      title="정보"
      icon={<FileText className="mr-1.5 h-4 w-4 shrink-0" />}
      headerRight={showWand ? <WandButton loading={infoLoading} onClick={onRequestRecommendation!} label="AI 문서명/경로 추천" /> : undefined}
      items={items}
      defaultOpen={editable}
    >
      {pendingSuggestedTitle && !showTitleLoading && (
        <div className={suggestionCardClassName}>
          <p className="mb-2 text-caption text-ssoo-primary/80">AI 추천 문서명: <span className="text-label-sm text-ssoo-primary">{pendingSuggestedTitle}</span></p>
          <div className="flex gap-1.5">
            <button type="button" onClick={onAcceptSuggestedTitle} className={actionButtonClassName}>
              <Check className="h-3 w-3" />
              적용
            </button>
            <button type="button" onClick={onDismissSuggestedTitle} className={dismissButtonClassName}>
              <X className="h-3 w-3" />
              취소
            </button>
          </div>
        </div>
      )}
      {pendingSuggestedPath && !showPathLoading && (
        <div className={suggestionCardClassName}>
          <p className="mb-2 text-caption text-ssoo-primary/80">AI 추천 문서 경로: <span className="font-mono text-ssoo-primary">{pendingSuggestedPath}</span></p>
          <div className="flex gap-1.5">
            <button type="button" onClick={onAcceptSuggestedPath} className={actionButtonClassName}>
              <Check className="h-3 w-3" />
              적용
            </button>
            <button type="button" onClick={onDismissSuggestedPath} className={dismissButtonClassName}>
              <X className="h-3 w-3" />
              취소
            </button>
          </div>
        </div>
      )}
      {!pendingSuggestedPath && pendingPathValidationMessage && !showPathLoading && (
        <div className="mt-2 rounded border border-amber-300/60 bg-amber-50/70 px-2.5 py-2 text-caption text-amber-700/90">
          {pendingPathValidationMessage}
        </div>
      )}
    </KeyValueSection>
  );
}
