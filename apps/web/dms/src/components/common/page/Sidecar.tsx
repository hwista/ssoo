'use client';

import * as React from 'react';
import { User, Calendar, FileText, Tag, Paperclip, Link2, MessageSquare, X, Plus, ChevronDown, ChevronRight, Send } from 'lucide-react';
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

// ─── 헬퍼 ───────────────────────────────────────────────

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

// ─── 접기/펼치기 섹션 ────────────────────────────────────

interface CollapsibleSectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  /** 제목 오른쪽에 표시할 뱃지 (예: 댓글 수) */
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ icon: Icon, title, badge, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <section className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center w-full py-2 text-sm font-semibold text-ssoo-primary hover:text-ssoo-primary/80 transition-colors"
      >
        <Icon className="h-4 w-4 mr-1.5 shrink-0" />
        <span className="flex-1 text-left">{title}</span>
        {badge}
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 ml-1 shrink-0 text-ssoo-primary/50" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 ml-1 shrink-0 text-ssoo-primary/50" />
        )}
      </button>
      {isOpen && <div className="pb-3">{children}</div>}
    </section>
  );
}

// ─── 편집 서브 컴포넌트 ──────────────────────────────────

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
            aria-label="링크 삭제"
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
 * 댓글 섹션 컴포넌트 (목록 + 추가 + 삭제)
 * - editable=true (에디터 모드): 삭제만 가능
 * - editable=false (뷰어 모드): 추가 + 삭제 가능
 */
function CommentSection({
  comments,
  editable,
  onAdd,
  onDelete,
}: {
  comments: DocumentComment[];
  editable: boolean;
  onAdd: (content: string) => void;
  onDelete: (id: string) => void;
}) {
  const [inputValue, setInputValue] = React.useState('');

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      onAdd(trimmed);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-2">
      {/* 댓글 목록 */}
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="p-2 rounded border border-gray-200/60 text-xs space-y-1"
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
          <p className="text-ssoo-primary/80 whitespace-pre-wrap">{comment.content}</p>
        </div>
      ))}

      {/* 댓글 입력 (뷰어 모드에서만 표시) */}
      {!editable && (
        <div className="relative">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="댓글 입력... (Enter 전송)"
            rows={2}
            className="w-full px-2 py-1.5 pr-8 text-xs bg-transparent border border-ssoo-content-border rounded resize-none focus:outline-none focus:border-ssoo-primary text-ssoo-primary"
          />
          <button
            onClick={handleSubmit}
            disabled={!inputValue.trim()}
            className="absolute right-1.5 bottom-1.5 p-1 text-ssoo-primary/60 hover:text-ssoo-primary disabled:opacity-30 transition-colors"
            aria-label="댓글 추가"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 빈 상태 (에디터 모드 + 댓글 없음) */}
      {editable && comments.length === 0 && (
        <EmptyPlaceholder text="댓글없음" />
      )}
    </div>
  );
}

/**
 * 빈 상태 플레이스홀더
 */
function EmptyPlaceholder({ text }: { text: string }) {
  return <p className="text-xs text-gray-400 py-1">{text}</p>;
}

// ─── 메인 컴포넌트 ───────────────────────────────────────

/**
 * Sidecar 컴포넌트
 * 
 * 문서 메타정보를 표시하는 우측 패널
 * - 모든 섹션은 접기/펼치기 가능
 * - editable=true 일 때 태그, 요약, 소스링크 편집 + 댓글 추가/삭제 가능
 * - 빈 섹션은 플레이스홀더 표시
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

  const handleCommentAdd = (content: string) => {
    const newComment: DocumentComment = {
      id: `comment-${Date.now()}`,
      author: documentMetadata?.author || 'Unknown',
      content,
      createdAt: new Date().toISOString(),
    };
    onMetadataChange?.({ comments: [...comments, newComment] });
  };

  const handleCommentDelete = (commentId: string) => {
    const updated = comments.filter((c) => c.id !== commentId);
    onMetadataChange?.({ comments: updated });
  };

  return (
    <div className={cn('p-4 space-y-1', className)}>
      {/* ─── 태그 ─── */}
      <CollapsibleSection icon={Tag} title="태그">
        {editable ? (
          <EditableTags tags={tags ?? []} onChange={handleTagsChange} />
        ) : tags && tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs bg-ssoo-content-border text-ssoo-primary rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <EmptyPlaceholder text="태그없음" />
        )}
      </CollapsibleSection>

      {/* ─── 문서 정보 ─── */}
      {metadata && (
        <CollapsibleSection icon={FileText} title="문서 정보">
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="flex items-center text-gray-500">
                <User className="h-3.5 w-3.5 mr-1" />
                작성자
              </dt>
              <dd className="text-ssoo-primary">{metadata.author || 'Unknown'}</dd>
            </div>
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
        </CollapsibleSection>
      )}

      {/* ─── 요약 ─── */}
      <CollapsibleSection icon={FileText} title="요약">
        {editable ? (
          <textarea
            value={summary}
            onChange={handleSummaryChange}
            placeholder="문서 요약을 입력하세요..."
            rows={3}
            className="w-full px-2 py-1.5 text-xs bg-transparent border border-ssoo-content-border rounded resize-none focus:outline-none focus:border-ssoo-primary text-ssoo-primary"
          />
        ) : summary ? (
          <p className="text-xs text-ssoo-primary/80 leading-relaxed">{summary}</p>
        ) : (
          <EmptyPlaceholder text="요약없음" />
        )}
      </CollapsibleSection>

      {/* ─── 소스 링크 ─── */}
      <CollapsibleSection icon={Link2} title="소스 링크">
        {editable ? (
          <EditableSourceLinks links={sourceLinks} onChange={handleSourceLinksChange} />
        ) : sourceLinks.length > 0 ? (
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
        ) : (
          <EmptyPlaceholder text="링크없음" />
        )}
      </CollapsibleSection>

      {/* ─── 첨부 파일 ─── */}
      <CollapsibleSection icon={Paperclip} title="첨부 파일">
        {attachments.length > 0 ? (
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
        ) : (
          <EmptyPlaceholder text="첨부없음" />
        )}
      </CollapsibleSection>

      {/* ─── 댓글 ─── */}
      <CollapsibleSection
        icon={MessageSquare}
        title="댓글"
        badge={comments.length > 0 ? (
          <span className="text-xs text-gray-400 mr-1">({comments.length})</span>
        ) : undefined}
      >
        <CommentSection
          comments={comments}
          editable={editable}
          onAdd={handleCommentAdd}
          onDelete={handleCommentDelete}
        />
      </CollapsibleSection>
    </div>
  );
}
