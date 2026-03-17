'use client';

import * as React from 'react';
import { toast } from '@/lib/toast';
import type { SourceFileMeta, DocumentMetadata, DocumentComment, BodyLink } from '@/types';
import { SidecarFrame } from '@/components/templates/page-frame/sidecar';
import { SaveLocationDialog } from '@/components/common/save-location';
import type { SaveLocationResult } from '@/components/common/save-location';
import { getAttachmentCategory } from '@/lib/constants/file';
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
  /** 현재 에디터 콘텐츠 반환 (AI 마술봉에서 사용) */
  getEditorContent?: () => string;
  /** 본문에서 추출된 링크 목록 */
  bodyLinks?: BodyLink[];
  /** 본문 내 링크 위치로 스크롤 이동 */
  onScrollToBodyLink?: (url: string) => void;
  /** 링크 클릭 시 열기 (내부 문서 → 탭, 외부 → 브라우저, 이미지 → 미리보기) */
  onOpenLink?: (url: string, type?: 'link' | 'image') => void;
  /** 현재 파일 경로 (내부 링크 판별용) */
  currentFilePath?: string | null;
  /** 편집 진입 시 메타데이터 스냅샷 (변경 하이라이트용) */
  originalMetaSnapshot?: {
    tags: string[];
    summary: string;
    sourceLinks: string[];
    comments: string[];
    attachmentPaths: string[];
  } | null;
  /** 추가 className */
  className?: string;
  /** 문서 탭 열기 (템플릿 파일 클릭 시) */
  onOpenDocumentTab?: (path: string) => void;
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
  getEditorContent,
  bodyLinks,
  onScrollToBodyLink,
  onOpenLink,
  currentFilePath,
  originalMetaSnapshot,
  className,
  onOpenDocumentTab,
}: DocumentSidecarProps) {
  const attachments = documentMetadata?.sourceFiles ?? [];
  const summary = documentMetadata?.summary ?? '';
  const sourceLinks = documentMetadata?.sourceLinks ?? [];
  const comments = documentMetadata?.comments ?? [];
  const isTemplateSidecar = editable && templateSaveEnabled;
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

  const handleCommentRestore = (comment: DocumentComment) => {
    onMetadataChange?.({ comments: [...comments, comment] });
  };

  const handleAttachmentsChange = (newAttachments: SourceFileMeta[]) => {
    onMetadataChange?.({ sourceFiles: newAttachments });
  };

  const handleAttachmentClick = (attachment: SourceFileMeta) => {
    // 템플릿 파일은 새 탭에서 열기
    if (attachment.origin === 'template') {
      if (onOpenDocumentTab && attachment.path) {
        onOpenDocumentTab(attachment.path);
      }
      return;
    }

    if (attachment.path.startsWith('__pending__/')) {
      toast.info('파일이 아직 저장되지 않았습니다. 문서를 저장한 후 이용해주세요.');
      return;
    }
    const category = getAttachmentCategory(attachment.name);
    if (category === 'image') {
      onOpenLink?.(attachment.path, 'image');
    } else if (category === 'text' || category === 'document') {
      window.open(`/api/file/serve-attachment?path=${encodeURIComponent(attachment.path)}&name=${encodeURIComponent(attachment.name)}`, '_blank');
    } else {
      toast.info('현재 로컬 저장소 파일은 미리보기를 제공하지 않습니다. 다운로드 버튼을 이용해주세요.');
    }
  };

  const handleAttachmentDownload = (attachment: SourceFileMeta) => {
    if (attachment.path.startsWith('__pending__/')) {
      toast.info('파일이 아직 저장되지 않았습니다. 문서를 저장한 후 이용해주세요.');
      return;
    }
    const url = `/api/file/serve-attachment?path=${encodeURIComponent(attachment.path)}&name=${encodeURIComponent(attachment.name)}&download=1`;
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
            getEditorContent={getEditorContent}
            originalTags={originalMetaSnapshot?.tags}
          />
          <SummarySection
            editable={editable}
            summary={summary}
            onChange={handleSummaryChange}
            onSummaryReplace={(text) => onMetadataChange?.({ summary: text })}
            getEditorContent={getEditorContent}
            originalSummary={originalMetaSnapshot?.summary}
          />
          <SourceLinksSection
            editable={editable}
            sourceLinks={sourceLinks}
            onChange={handleSourceLinksChange}
            originalSourceLinks={originalMetaSnapshot?.sourceLinks}
            bodyLinks={bodyLinks}
            onScrollToBodyLink={onScrollToBodyLink}
            onOpenLink={onOpenLink}
            currentFilePath={currentFilePath}
          />
          <AttachmentsSection
            attachments={attachments}
            editable={editable}
            onChange={handleAttachmentsChange}
            onItemClick={handleAttachmentClick}
            onDownload={handleAttachmentDownload}
            originalAttachmentPaths={originalMetaSnapshot?.attachmentPaths}
          />
          <CommentsSection
            comments={comments}
            editable={editable}
            onDelete={handleCommentDelete}
            onRestore={handleCommentRestore}
            originalCommentIds={originalMetaSnapshot?.comments}
          />
        </>
      )}
    </SidecarFrame>
  );
}
