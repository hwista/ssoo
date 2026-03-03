'use client';

import * as React from 'react';
import { User, Calendar, FileText, Tag, Paperclip, Link2, MessageSquare, X, Plus, Send, Pencil, ExternalLink, Copy, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { SourceFileMeta, DocumentMetadata, DocumentComment } from '@/types';
import { ingestApi, storageApi } from '@/lib/utils/apiClient';
import { CollapsibleSection } from '@/components/common/page/sidecar';

/**
 * 문서 메타데이터 (표시용)
 */
export interface DocumentSidecarMetadata {
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
  /** 수정자 */
  lastModifiedBy?: string;
  /** 첨부 파일 */
  attachments?: SourceFileMeta[];
}

/**
 * Sidecar Props
 */
export interface DocumentSidecarProps {
  /** 문서 메타데이터 (표시용) */
  metadata?: DocumentSidecarMetadata;
  /** 파일 경로 */
  filePath?: string;
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

/**
 * 시간 포맷팅 헬퍼
 */
function formatTime(date: Date | string | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
 * 댓글 입력 컴포넌트 (사이드카 하단 고정)
 */
function CommentInput({ onAdd }: { onAdd: (content: string) => void }) {
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
    <div className="flex-shrink-0 border-t border-gray-200 p-3">
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
export function DocumentSidecar({
  metadata,
  tags,
  editable = false,
  documentMetadata,
  onMetadataChange,
  filePath,
  className,
}: DocumentSidecarProps) {
  const attachments = metadata?.attachments ?? [];
  const summary = documentMetadata?.summary ?? '';
  const sourceLinks = documentMetadata?.sourceLinks ?? [];
  const comments = documentMetadata?.comments ?? [];
  const [attachmentActionKey, setAttachmentActionKey] = React.useState<string | null>(null);

  // 문서명: title이 있으면 사용, 없으면 파일명에서 추출
  const fileName = filePath ? filePath.split('/').pop() || '' : '';
  const documentTitle = documentMetadata?.title || fileName.replace(/\.md$/, '');
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [titleDraft, setTitleDraft] = React.useState(documentTitle);

  React.useEffect(() => {
    setTitleDraft(documentTitle);
  }, [documentTitle]);

  const handleTitleSave = () => {
    onMetadataChange?.({ title: titleDraft });
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleSave();
    if (e.key === 'Escape') { setTitleDraft(documentTitle); setIsEditingTitle(false); }
  };

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

  const handleAttachmentOpen = async (attachment: SourceFileMeta) => {
    const actionKey = `${attachment.path}:${attachment.name}:open`;
    setAttachmentActionKey(actionKey);

    try {
      if (attachment.url) {
        window.open(attachment.url, '_blank', 'noopener,noreferrer');
        toast.success('원본 링크를 열었습니다.');
        return;
      }

      const response = await storageApi.open({
        storageUri: attachment.storageUri,
        provider: attachment.provider ?? 'local',
        path: attachment.path,
      });

      if (!response.success || !response.data) {
        toast.error(response.error || '첨부 파일 열기에 실패했습니다.');
        return;
      }

      window.open(response.data.openUrl, '_blank', 'noopener,noreferrer');
      toast.success('원본 파일 열기를 요청했습니다.');
    } catch {
      toast.error('첨부 파일 열기 중 오류가 발생했습니다.');
    } finally {
      setAttachmentActionKey((current) => (current === actionKey ? null : current));
    }
  };

  const handleAttachmentCopyUri = async (attachment: SourceFileMeta) => {
    const uri = attachment.storageUri || `${attachment.provider ?? 'local'}://${attachment.path}`;
    try {
      await navigator.clipboard.writeText(uri);
      toast.success('storageUri를 클립보드에 복사했습니다.');
    } catch {
      toast.error('클립보드 복사에 실패했습니다.');
    }
  };

  const handleAttachmentResync = async (attachment: SourceFileMeta) => {
    const actionKey = `${attachment.path}:${attachment.name}:resync`;
    setAttachmentActionKey(actionKey);

    try {
      const response = await ingestApi.submit({
        title: `resync-${attachment.name}`,
        content: [
          '# Attachment Resync Request',
          '',
          `- file: ${attachment.name}`,
          `- path: ${attachment.path}`,
          `- storageUri: ${attachment.storageUri ?? '-'}`,
          `- provider: ${attachment.provider ?? 'local'}`,
          '',
          '원본 파일 메타데이터 재수집 요청입니다.',
        ].join('\n'),
        provider: attachment.provider ?? 'local',
        relativePath: attachment.path.split('/').slice(0, -1).join('/') || 'ingest',
        origin: 'ingest',
      });

      if (!response.success || !response.data) {
        toast.error(response.error || '재동기화 요청에 실패했습니다.');
        return;
      }

      toast.success(`재동기화 작업이 등록되었습니다. (${response.data.status})`);
    } catch {
      toast.error('재동기화 요청 중 오류가 발생했습니다.');
    } finally {
      setAttachmentActionKey((current) => (current === actionKey ? null : current));
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 스크롤 가능한 섹션 영역 */}
      <div className="flex-1 overflow-auto p-4 space-y-1">
        {/* ─── 문서 정보 ─── */}
        {metadata && (
          <CollapsibleSection icon={<FileText className="h-4 w-4 mr-1.5 shrink-0" />} title="문서 정보" defaultOpen={false}>
            <dl className="space-y-2 text-sm">
              {/* 문서명 */}
              <div className="flex items-center justify-between">
                <dt className="flex items-center text-gray-500">
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  문서명
                </dt>
                <dd className="text-ssoo-primary flex items-center gap-1">
                  {editable && isEditingTitle ? (
                    <input
                      type="text"
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onBlur={handleTitleSave}
                      onKeyDown={handleTitleKeyDown}
                      className="w-full text-sm text-right border-b border-ssoo-content-border bg-transparent outline-none px-0.5"
                      autoFocus
                    />
                  ) : (
                    <>
                      <span className="truncate max-w-[140px]" title={documentTitle}>{documentTitle || '제목없음'}</span>
                      {editable && (
                        <button onClick={() => setIsEditingTitle(true)} className="text-gray-400 hover:text-ssoo-primary">
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </>
                  )}
                </dd>
              </div>
              {/* 파일명 */}
              {fileName && (
                <div className="flex items-center justify-between">
                  <dt className="flex items-center text-gray-500 pl-[18px]">
                    파일명
                  </dt>
                  <dd className="text-ssoo-primary truncate max-w-[140px]" title={fileName}>{fileName}</dd>
                </div>
              )}
              {/* 파일 경로 */}
              {filePath && (
                <div className="flex items-center justify-between">
                  <dt className="flex items-center text-gray-500 pl-[18px]">
                    경로
                  </dt>
                  <dd className="text-ssoo-primary truncate max-w-[140px]" title={filePath}>{filePath}</dd>
                </div>
              )}
              {/* 작성자 */}
              <div className="flex items-center justify-between">
                <dt className="flex items-center text-gray-500">
                  <User className="h-3.5 w-3.5 mr-1" />
                  작성자
                </dt>
                <dd className="text-ssoo-primary">{metadata.author || 'Unknown'}</dd>
              </div>
              {/* 생성일 */}
              {metadata.createdAt && (
                <div className="flex items-center justify-between">
                  <dt className="flex items-center text-gray-500">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    생성일
                  </dt>
                  <dd className="text-ssoo-primary">{formatDate(metadata.createdAt)}</dd>
                </div>
              )}
              {/* 생성 시간 */}
              {metadata.createdAt && (
                <div className="flex items-center justify-between">
                  <dt className="flex items-center text-gray-500 pl-[18px]">
                    생성 시간
                  </dt>
                  <dd className="text-ssoo-primary">{formatTime(metadata.createdAt)}</dd>
                </div>
              )}
              {/* 수정자 */}
              <div className="flex items-center justify-between">
                <dt className="flex items-center text-gray-500">
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  수정자
                </dt>
                <dd className="text-ssoo-primary">{metadata.lastModifiedBy || 'Unknown'}</dd>
              </div>
              {/* 수정일 */}
              {metadata.updatedAt && (
                <div className="flex items-center justify-between">
                  <dt className="flex items-center text-gray-500">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    수정일
                  </dt>
                  <dd className="text-ssoo-primary">{formatDate(metadata.updatedAt)}</dd>
                </div>
              )}
              {/* 수정 시간 */}
              {metadata.updatedAt && (
                <div className="flex items-center justify-between">
                  <dt className="flex items-center text-gray-500 pl-[18px]">
                    수정 시간
                  </dt>
                  <dd className="text-ssoo-primary">{formatTime(metadata.updatedAt)}</dd>
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

        {/* ─── 태그 ─── */}
        <CollapsibleSection icon={<Tag className="h-4 w-4 mr-1.5 shrink-0" />} title="태그">
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

        {/* ─── 요약 ─── */}
        <CollapsibleSection icon={<FileText className="h-4 w-4 mr-1.5 shrink-0" />} title="요약">
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
        <CollapsibleSection icon={<Link2 className="h-4 w-4 mr-1.5 shrink-0" />} title="url">
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
        <CollapsibleSection icon={<Paperclip className="h-4 w-4 mr-1.5 shrink-0" />} title="첨부 파일">
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
                        onClick={() => void handleAttachmentOpen(attachment)}
                        disabled={isOpening}
                        className="inline-flex items-center gap-1 rounded border border-ssoo-content-border px-2 py-1 text-[11px] hover:border-ssoo-primary disabled:opacity-60"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {isOpening ? 'Opening...' : 'Open'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAttachmentCopyUri(attachment)}
                        className="inline-flex items-center gap-1 rounded border border-ssoo-content-border px-2 py-1 text-[11px] hover:border-ssoo-primary"
                      >
                        <Copy className="h-3 w-3" />
                        URI
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAttachmentResync(attachment)}
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

        {/* ─── 댓글 목록 ─── */}
        <CollapsibleSection
          icon={<MessageSquare className="h-4 w-4 mr-1.5 shrink-0" />}
          title="댓글"
          badge={comments.length > 0 ? (
            <span className="text-xs text-gray-400 mr-1">({comments.length})</span>
          ) : undefined}
        >
          {comments.length > 0 ? (
            <div className="space-y-2">
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
                        onClick={() => handleCommentDelete(comment.id)}
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
            </div>
          ) : (
            <EmptyPlaceholder text="댓글없음" />
          )}
        </CollapsibleSection>
      </div>

      {/* ─── 댓글 입력 (하단 고정) ─── */}
      {!editable && (
        <CommentInput onAdd={handleCommentAdd} />
      )}
    </div>
  );
}
