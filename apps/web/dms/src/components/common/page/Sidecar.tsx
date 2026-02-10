'use client';

import * as React from 'react';
import { User, Calendar, FileText, Tag, Paperclip, Link2, MessageSquare, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SourceFileMeta, DocumentMetadata, DocumentComment } from '@/types';

/**
 * 목차 아이템
 */
export interface TocItem {
  /** 고유 ID (스크롤 타겟) */
  id: string;
  /** 표시 텍스트 */
  text: string;
  /** 헤딩 레벨 (1~6) */
  level: number;
}

/**
 * 문서 메타데이터 (표시용)
 */
export interface SidecarMetadata {
  /** 작성자 */
  author?: string;
  /** 생성일 */
  createdAt?: Date | string;
  /** 수정일 */
  updatedAt?: Date | string;
  /** 줄 수 */
  lineCount?: number;
  /** 문자 수 */
  charCount?: number;
  /** 단어 수 */
  wordCount?: number;
  /** 첨부 파일 */
  attachments?: SourceFileMeta[];
}

/**
 * Sidecar Props
 */
export interface SidecarProps {
  /** 문서 메타데이터 (표시용) */
  metadata?: SidecarMetadata;
  /** 태그 목록 */
  tags?: string[];
  /** 편집 가능 여부 */
  editable?: boolean;
  /** 전체 DocumentMetadata (편집용) */
  documentMetadata?: DocumentMetadata | null;
  /** 메타데이터 변경 콜백 */
  onMetadataChange?: (update: Partial<DocumentMetadata>) => void;
  /** 추가 className */
  className?: string;
}

/**
 * 날짜 포맷팅 헬퍼
 */
function formatDate(date: Date | string | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 태그 편집 컴포넌트
 */
function EditableTags({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [inputValue, setInputValue] = React.useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputValue('');
    }
  };

  const handleRemove = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-ssoo-content-border text-ssoo-primary rounded-full"
          >
            {tag}
            <button
              onClick={() => handleRemove(tag)}
              className="hover:text-red-500 transition-colors"
              aria-label={`태그 "${tag}" 삭제`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="태그 추가..."
          className="flex-1 px-2 py-1 text-xs bg-transparent border border-ssoo-content-border rounded focus:outline-none focus:border-ssoo-primary text-ssoo-primary"
        />
        <button
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className="p-1 text-ssoo-primary/60 hover:text-ssoo-primary disabled:opacity-30 transition-colors"
          aria-label="태그 추가"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * 소스 링크 편집 컴포넌트
 */
function EditableSourceLinks({
  links,
  onChange,
}: {
  links: string[];
  onChange: (links: string[]) => void;
}) {
  const [inputValue, setInputValue] = React.useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !links.includes(trimmed)) {
      onChange([...links, trimmed]);
      setInputValue('');
    }
  };

  const handleRemove = (link: string) => {
    onChange(links.filter((l) => l !== link));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      {links.map((link) => (
        <div
          key={link}
          className="flex items-center justify-between gap-1 text-xs"
        >
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-blue-500 hover:underline"
          >
            {link}
          </a>
          <button
            onClick={() => handleRemove(link)}
            className="flex-shrink-0 hover:text-red-500 transition-colors text-ssoo-primary/60"
            aria-label={`링크 삭제`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <div className="flex gap-1">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="URL 추가..."
          className="flex-1 px-2 py-1 text-xs bg-transparent border border-ssoo-content-border rounded focus:outline-none focus:border-ssoo-primary text-ssoo-primary"
        />
        <button
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className="p-1 text-ssoo-primary/60 hover:text-ssoo-primary disabled:opacity-30 transition-colors"
          aria-label="링크 추가"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * 댓글 목록 컴포넌트 (삭제만 가능)
 */
function CommentList({
  comments,
  onDelete,
}: {
  comments: DocumentComment[];
  onDelete: (id: string) => void;
}) {
  if (comments.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-2">댓글이 없습니다</p>
    );
  }

  return (
    <div className="space-y-2">
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="p-2 rounded border border-ssoo-content-border text-xs space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-ssoo-primary">{comment.author}</span>
            <div className="flex items-center gap-1">
              <span className="text-gray-400">{formatDate(comment.createdAt)}</span>
              <button
                onClick={() => onDelete(comment.id)}
                className="p-0.5 hover:text-red-500 transition-colors text-gray-400"
                aria-label="댓글 삭제"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
          <p className="text-ssoo-primary/80">{comment.content}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Sidecar 컴포넌트
 * 
 * 문서 메타정보 + 목차를 표시하는 우측 패널
 * editable=true 일 때 태그, 요약, 소스링크 편집 + 댓글 삭제 가능
 */
export function Sidecar({
  metadata,
  tags,
  editable = false,
  documentMetadata,
  onMetadataChange,
  className,
}: SidecarProps) {
  const attachments = metadata?.attachments ?? [];
  const summary = documentMetadata?.summary ?? '';
  const sourceLinks = documentMetadata?.sourceLinks ?? [];
  const comments = documentMetadata?.comments ?? [];

  const handleTagsChange = (newTags: string[]) => {
    onMetadataChange?.({ tags: newTags });
  };

  const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onMetadataChange?.({ summary: e.target.value });
  };

  const handleSourceLinksChange = (newLinks: string[]) => {
    onMetadataChange?.({ sourceLinks: newLinks });
  };

  const handleCommentDelete = (commentId: string) => {
    const updated = comments.filter((c) => c.id !== commentId);
    onMetadataChange?.({ comments: updated });
  };

  return (
    <div className={cn('p-4 space-y-6', className)}>
      {/* 문서 정보 섹션 */}
      {metadata && (
        <section>
          <h3 className="flex items-center text-sm font-semibold text-ssoo-primary mb-3">
            <FileText className="h-4 w-4 mr-1.5" />
            문서 정보
          </h3>
          <dl className="space-y-2 text-sm">
            {metadata.author && (
              <div className="flex items-center justify-between">
                <dt className="flex items-center text-gray-500">
                  <User className="h-3.5 w-3.5 mr-1" />
                  작성자
                </dt>
                <dd className="text-ssoo-primary">{metadata.author}</dd>
              </div>
            )}
            {metadata.createdAt && (
              <div className="flex items-center justify-between">
                <dt className="flex items-center text-gray-500">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  생성일
                </dt>
                <dd className="text-ssoo-primary">{formatDate(metadata.createdAt)}</dd>
              </div>
            )}
            {metadata.updatedAt && (
              <div className="flex items-center justify-between">
                <dt className="flex items-center text-gray-500">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  수정일
                </dt>
                <dd className="text-ssoo-primary">{formatDate(metadata.updatedAt)}</dd>
              </div>
            )}
            {metadata.lineCount !== undefined && (
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">줄 수</dt>
                <dd className="text-ssoo-primary">{metadata.lineCount.toLocaleString()}</dd>
              </div>
            )}
            {metadata.charCount !== undefined && (
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">문자 수</dt>
                <dd className="text-ssoo-primary">{metadata.charCount.toLocaleString()}</dd>
              </div>
            )}
            {metadata.wordCount !== undefined && (
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">단어 수</dt>
                <dd className="text-ssoo-primary">{metadata.wordCount.toLocaleString()}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* 요약 섹션 (편집 모드) */}
      {editable && (
        <section>
          <h3 className="flex items-center text-sm font-semibold text-ssoo-primary mb-3">
            <FileText className="h-4 w-4 mr-1.5" />
            요약
          </h3>
          <textarea
            value={summary}
            onChange={handleSummaryChange}
            placeholder="문서 요약을 입력하세요..."
            rows={3}
            className="w-full px-2 py-1.5 text-xs bg-transparent border border-ssoo-content-border rounded resize-none focus:outline-none focus:border-ssoo-primary text-ssoo-primary"
          />
        </section>
      )}

      {/* 요약 표시 (읽기 모드, 요약이 있을 때만) */}
      {!editable && summary && (
        <section>
          <h3 className="flex items-center text-sm font-semibold text-ssoo-primary mb-3">
            <FileText className="h-4 w-4 mr-1.5" />
            요약
          </h3>
          <p className="text-xs text-ssoo-primary/80 leading-relaxed">{summary}</p>
        </section>
      )}

      {/* 태그 섹션 */}
      {(editable || (tags && tags.length > 0)) && (
        <section>
          <h3 className="flex items-center text-sm font-semibold text-ssoo-primary mb-3">
            <Tag className="h-4 w-4 mr-1.5" />
            태그
          </h3>
          {editable ? (
            <EditableTags
              tags={tags ?? []}
              onChange={handleTagsChange}
            />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {(tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-ssoo-content-border text-ssoo-primary rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 소스 링크 섹션 */}
      {(editable || sourceLinks.length > 0) && (
        <section>
          <h3 className="flex items-center text-sm font-semibold text-ssoo-primary mb-3">
            <Link2 className="h-4 w-4 mr-1.5" />
            소스 링크
          </h3>
          {editable ? (
            <EditableSourceLinks
              links={sourceLinks}
              onChange={handleSourceLinksChange}
            />
          ) : (
            <div className="space-y-1">
              {sourceLinks.map((link) => (
                <a
                  key={link}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-blue-500 hover:underline truncate"
                >
                  {link}
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 첨부 파일 섹션 */}
      {attachments.length > 0 && (
        <section>
          <h3 className="flex items-center text-sm font-semibold text-ssoo-primary mb-3">
            <Paperclip className="h-4 w-4 mr-1.5" />
            첨부 파일
          </h3>
          <div className="space-y-2">
            {attachments.map((attachment) => {
              const link = attachment.url || `/api/file?path=${encodeURIComponent(attachment.path)}`;
              return (
                <a
                  key={`${attachment.path}-${attachment.name}`}
                  href={link}
                  className="flex items-center justify-between rounded-md border border-ssoo-content-border px-2.5 py-2 text-xs text-ssoo-primary transition-colors hover:border-ssoo-primary"
                >
                  <span className="truncate">{attachment.name}</span>
                  <span className="text-ssoo-primary/60">
                    {(attachment.size / 1024).toFixed(1)} KB
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* 댓글 섹션 */}
      {(editable || comments.length > 0) && (
        <section>
          <h3 className="flex items-center text-sm font-semibold text-ssoo-primary mb-3">
            <MessageSquare className="h-4 w-4 mr-1.5" />
            댓글
            {comments.length > 0 && (
              <span className="ml-1 text-xs text-gray-400">({comments.length})</span>
            )}
          </h3>
          {editable ? (
            <CommentList comments={comments} onDelete={handleCommentDelete} />
          ) : (
            <div className="space-y-2">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-2 rounded border border-ssoo-content-border text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ssoo-primary">{comment.author}</span>
                    <span className="text-gray-400">{formatDate(comment.createdAt)}</span>
                  </div>
                  <p className="text-ssoo-primary/80">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 빈 상태 */}
      {!metadata && (!tags || tags.length === 0) && !editable && (
        <p className="text-sm text-gray-400 text-center py-4">
          문서 정보가 없습니다
        </p>
      )}
    </div>
  );
}
