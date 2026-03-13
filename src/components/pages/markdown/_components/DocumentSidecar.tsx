'use client';

import * as React from 'react';
import { toast } from '@/lib/toast';
import type { SourceFileMeta, DocumentMetadata, DocumentComment } from '@/types';
import { ingestApi, storageApi } from '@/lib/api';
import { SidecarFrame } from '@/components/templates/page-frame/sidecar';
import { SaveLocationDialog } from '@/components/common/save-location';
import type { SaveLocationResult } from '@/components/common/save-location';
import {
  AttachmentsSection,
  CommentInput,
  CommentsSection,
  DocumentInfoSection,
  SourceLinksSection,
  SummarySection,
  TagsSection,
  TemplateSaveSection,
} from './document-sidecar';

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
  /** 파일 이동 콜백 (기존 문서 경로 변경 시) */
  onFileMove?: (newPath: string) => void;
  /** 자동 생성 파일명 (새 문서용) */
  generatedFileName?: string;
  /** 신규 문서 여부 */
  isNewDocument?: boolean;
  /** 템플릿 전용 저장 여부 */
  templateSaveEnabled?: boolean;
  /** 템플릿 저장용 메타데이터 */
  templateDraft?: {
    name: string;
    description: string;
    scope: 'personal' | 'global';
  };
  /** 템플릿 저장 메타데이터 변경 */
  onTemplateDraftChange?: (update: {
    name?: string;
    description?: string;
    scope?: 'personal' | 'global';
  }) => void;
  /** 추가 className */
  className?: string;
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
  onFileMove,
  generatedFileName,
  isNewDocument = false,
  filePath,
  templateSaveEnabled = false,
  templateDraft,
  onTemplateDraftChange,
  className,
}: DocumentSidecarProps) {
  const attachments = metadata?.attachments ?? [];
  const summary = documentMetadata?.summary ?? '';
  const sourceLinks = documentMetadata?.sourceLinks ?? [];
  const comments = documentMetadata?.comments ?? [];
  const isTemplateSidecar = editable && templateSaveEnabled;
  const [attachmentActionKey, setAttachmentActionKey] = React.useState<string | null>(null);
  const [isSaveLocationOpen, setIsSaveLocationOpen] = React.useState(false);

  const fileName = filePath ? filePath.split('/').pop() || '' : '';
  const documentTitle = documentMetadata?.title || fileName.replace(/\.md$/, '');
  const currentDirectory = filePath ? filePath.split('/').slice(0, -1).join('/') : '';

  const handleSaveLocationConfirm = (result: SaveLocationResult) => {
    if (result.title !== documentTitle) {
      onMetadataChange?.({ title: result.title });
    }

    if (!isNewDocument && filePath) {
      const newFullPath = result.directory
        ? `${result.directory}/${fileName}`
        : fileName;
      if (newFullPath !== filePath) {
        onFileMove?.(newFullPath);
      }
    }
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
    <SidecarFrame
      className={className}
      footerClassName="border-t-0"
      footer={!editable && !isTemplateSidecar ? <CommentInput onAdd={handleCommentAdd} /> : undefined}
    >
      {isTemplateSidecar ? (
        <TemplateSaveSection
          enabled={templateSaveEnabled}
          templateDraft={templateDraft}
          onTemplateDraftChange={onTemplateDraftChange}
        />
      ) : (
        <>
          <DocumentInfoSection
            editable={editable}
            fileName={fileName}
            filePath={filePath}
            documentTitle={documentTitle}
            metadata={metadata}
            onOpenSaveLocation={() => setIsSaveLocationOpen(true)}
          />
          <SaveLocationDialog
            open={isSaveLocationOpen}
            onOpenChange={setIsSaveLocationOpen}
            initialTitle={documentTitle}
            initialDirectory={currentDirectory}
            fileName={generatedFileName || fileName}
            isNewDocument={isNewDocument}
            onConfirm={handleSaveLocationConfirm}
          />
          <TagsSection
            editable={editable}
            tags={tags ?? []}
            onChange={handleTagsChange}
          />
          <SummarySection
            editable={editable}
            summary={summary}
            onChange={handleSummaryChange}
          />
          <SourceLinksSection
            editable={editable}
            sourceLinks={sourceLinks}
            onChange={handleSourceLinksChange}
          />
          <AttachmentsSection
            attachments={attachments}
            attachmentActionKey={attachmentActionKey}
            onOpen={handleAttachmentOpen}
            onCopyUri={handleAttachmentCopyUri}
            onResync={handleAttachmentResync}
          />
          <CommentsSection
            comments={comments}
            editable={editable}
            onDelete={handleCommentDelete}
          />
        </>
      )}
    </SidecarFrame>
  );
}
