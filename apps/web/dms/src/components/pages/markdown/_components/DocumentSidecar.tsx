'use client';

import * as React from 'react';
import { toast } from '@/lib/toast';
import type { SourceFileMeta, DocumentMetadata, DocumentComment, BodyLink } from '@/types';
import type { DocumentCollaborationSnapshotClient } from '@/lib/api/collaborationApi';
import { SidecarFrame } from '@/components/templates/page-frame/sidecar';
import { Button } from '@/components/ui/button';
import { SaveLocationDialog } from '@/components/common/save-location';
import type { SaveLocationResult } from '@/components/common/save-location';
import { getAttachmentCategory } from '@/lib/constants/file';
import { LoadingState } from '@/components/common/StateDisplay';
import type { TemplateOriginType, TemplateReferenceDoc } from '@/types/template';
import {
  AttachmentsSection,
  CommentInput,
  CommentsSection,
  DocumentInfoSection,
  SourceLinksSection,
  SummarySection,
  TagsSection,
} from './document-sidecar';
import type { DocumentSidecarDiffSnapshot } from '../documentPageUtils';

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
  /** 새 문서 AI 제목 추천 상태 */
  titleRecommendationStatus?: 'idle' | 'loading' | 'resolved' | 'error';
  /** 새 문서 AI 경로 추천 상태 */
  pathRecommendationStatus?: 'idle' | 'loading' | 'resolved' | 'error';
  /** 새 문서 정보 섹션 외부 로딩 상태 */
  externalInfoLoading?: boolean;
  /** 정보 섹션 원본 문서명 */
  originalDocumentTitle?: string;
  /** 정보 섹션 원본 문서 경로 */
  originalFilePath?: string;
  /** 새 문서에서 정보 섹션에 표시할 추천 문서명 */
  displayDocumentTitle?: string;
  /** 정보 섹션 대기 중 추천 문서명 */
  pendingSuggestedTitle?: string | null;
  /** 정보 섹션 대기 중 추천 문서 경로 */
  pendingSuggestedPath?: string | null;
  /** 정보 섹션 대기 중 경로 validation 메시지 */
  pendingPathValidationMessage?: string;
  /** 새 문서 경로 validation 메시지 */
  pathValidationMessage?: string;
  /** 템플릿 모드 여부 */
  templateModeEnabled?: boolean;
  /** 템플릿 AI 변환 중 여부 */
  isConvertingTemplate?: boolean;
  /** 템플릿 유형 */
  templateOriginType?: TemplateOriginType;
  /** 템플릿 참조 문서 */
  templateReferenceDocuments?: TemplateReferenceDoc[];
  /** 현재 에디터 콘텐츠 반환 (AI 마술봉에서 사용) */
  getEditorContent?: () => string;
  /** 본문에서 추출된 링크 목록 */
  bodyLinks?: BodyLink[];
  /** 본문 내 링크 위치로 스크롤 이동 */
  onScrollToBodyLink?: (url: string) => void;
  /** 링크 클릭 시 열기 (내부 문서 → 탭, 외부 → 브라우저, 이미지 → 미리보기) */
  onOpenLink?: (url: string, type?: 'link' | 'image') => void;
  /** 편집 진입 시 메타데이터 스냅샷 (변경 하이라이트용) */
  originalMetaSnapshot?: DocumentSidecarDiffSnapshot | null;
  /** 추가 className */
  className?: string;
  /** 문서 탭 열기 (템플릿 파일 클릭 시) */
  onOpenDocumentTab?: (path: string) => void;
  /** 외부 AI 추천 태그 (compose 후 자동 트리거) */
  externalSuggestedTags?: string[];
  /** 외부 AI 태그 추천 로딩 상태 */
  externalSuggestedTagsLoading?: boolean;
  /** 외부 태그 제안이 소비된 후 호출 */
  onExternalSuggestedTagsConsumed?: () => void;
  /** 외부 AI 요약 제안 (compose 후 자동 트리거) */
  externalAiSuggestion?: string | null;
  /** 외부 AI 요약 추천 로딩 상태 */
  externalAiSuggestionLoading?: boolean;
  /** 외부 요약 제안이 소비된 후 호출 */
  onExternalAiSuggestionConsumed?: () => void;
  /** 정보 섹션 AI 추천 요청 */
  onRequestInfoRecommendation?: () => void;
  /** 문서명 제안 적용 */
  onAcceptSuggestedTitle?: () => void;
  /** 문서명 제안 취소 */
  onDismissSuggestedTitle?: () => void;
  /** 문서 경로 제안 적용 */
  onAcceptSuggestedPath?: () => void;
  /** 문서 경로 제안 취소 */
  onDismissSuggestedPath?: () => void;
  /** 인라인 컴포저에서 소프트 삭제된 참조 파일/템플릿 키 (사이드카에 삭제 표시용) */
  deletedReferenceKeys?: Set<string>;
  /** 댓글 변경 후 즉시 디스크에 저장하는 콜백 (뷰어 모드 댓글은 편집 저장 흐름을 타지 않으므로 별도 flush 필요) */
  onImmediateFlush?: () => Promise<void>;
  /** 문서 로딩 중 여부 */
  isLoading?: boolean;
  /** collaboration/publish 상태 */
  collaborationSnapshot?: DocumentCollaborationSnapshotClient | null;
  /** 잠금 takeover */
  onTakeoverLock?: () => Promise<void> | void;
  /** publish 상태 새로고침 */
  onRefreshPublishState?: () => Promise<void> | void;
  /** publish 재시도 */
  onRetryPublish?: () => Promise<void> | void;
  /** 현재 사용자 로그인 ID */
  currentUserLoginId?: string;
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
  titleRecommendationStatus = 'idle',
  pathRecommendationStatus = 'idle',
  externalInfoLoading = false,
  originalDocumentTitle,
  originalFilePath,
  displayDocumentTitle,
  pendingSuggestedTitle,
  pendingSuggestedPath,
  pendingPathValidationMessage,
  pathValidationMessage,
  filePath,
  templateModeEnabled = false,
  templateReferenceDocuments = [],
  getEditorContent,
  bodyLinks,
  onScrollToBodyLink,
  onOpenLink,
  originalMetaSnapshot,
  className,
  onOpenDocumentTab,
  externalSuggestedTags,
  externalSuggestedTagsLoading,
  onExternalSuggestedTagsConsumed,
  externalAiSuggestion,
  externalAiSuggestionLoading,
  onExternalAiSuggestionConsumed,
  onRequestInfoRecommendation,
  onAcceptSuggestedTitle,
  onDismissSuggestedTitle,
  onAcceptSuggestedPath,
  onDismissSuggestedPath,
  deletedReferenceKeys,
  onImmediateFlush,
  isLoading = false,
  collaborationSnapshot,
  onTakeoverLock,
  onRefreshPublishState,
  onRetryPublish,
  currentUserLoginId,
}: DocumentSidecarProps) {
  const attachments = documentMetadata?.sourceFiles ?? [];
  const summary = documentMetadata?.summary ?? '';
  const sourceLinks = documentMetadata?.sourceLinks ?? [];
  const comments = documentMetadata?.comments ?? [];
  const isTemplateSidecar = templateModeEnabled;
  const templateReferenceAttachments = React.useMemo<SourceFileMeta[]>(() => (
    isTemplateSidecar
      ? templateReferenceDocuments.map((reference) => ({
        name: reference.title || reference.path.split('/').pop() || reference.path,
        path: reference.path,
        type: reference.mimeType || 'text/markdown',
        size: reference.size || 0,
        origin: 'reference',
        provider: reference.provider === 'sharepoint' || reference.provider === 'nas' ? reference.provider : 'local',
      }))
      : []
  ), [isTemplateSidecar, templateReferenceDocuments]);
  const [isSaveLocationOpen, setIsSaveLocationOpen] = React.useState(false);
  const [replyTarget, setReplyTarget] = React.useState<{ id: string; author: string } | undefined>();

  const fileName = filePath ? filePath.split('/').pop() || '' : '';
  const documentTitle = isNewDocument
    ? (documentMetadata?.title || displayDocumentTitle || '')
    : (documentMetadata?.title || fileName.replace(/\.md$/, ''));
  const currentDirectory = filePath ? filePath.split('/').slice(0, -1).join('/') : '';

  const handleSaveLocationConfirm = (result: SaveLocationResult) => {
    if (result.title !== documentTitle) {
      onMetadataChange?.({ title: result.title });
    }

    if (isNewDocument) {
      const newFullPath = result.directory
        ? `${result.directory}/${result.fileName}`
        : result.fileName;
      onFileMove?.(newFullPath);
      return;
    }

    if (filePath) {
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

  const handleCommentAdd = (content: string, parentId?: string) => {
    const newComment: DocumentComment = {
      id: `comment-${Date.now()}`,
      author: documentMetadata?.author || 'Unknown',
      content,
      createdAt: new Date().toISOString(),
      parentId,
    };
    onMetadataChange?.({ comments: [...comments, newComment] });
    if (!editable) onImmediateFlush?.();
  };

  const handleCommentDelete = (commentId: string) => {
    // 모든 댓글은 tombstone 처리 (deletedAt 설정, hard-delete 없음)
    const updated = comments.map((c) =>
      c.id === commentId ? { ...c, deletedAt: new Date().toISOString() } : c,
    );
    onMetadataChange?.({ comments: updated });
    if (!editable) onImmediateFlush?.();
  };

  const handleCommentRestore = (comment: DocumentComment) => {
    // deletedAt 제거로 복원
    const updated = comments.map((c) =>
      c.id === comment.id ? { ...c, deletedAt: undefined } : c,
    );
    onMetadataChange?.({ comments: updated });
    if (!editable) onImmediateFlush?.();
  };

  const handleAttachmentsChange = (newAttachments: SourceFileMeta[]) => {
    onMetadataChange?.({ sourceFiles: newAttachments });
  };

  const handleAttachmentClick = (attachment: SourceFileMeta) => {
    if (isTemplateSidecar && (attachment.origin === 'template' || attachment.origin === 'reference')) {
      const refDoc = templateReferenceDocuments.find((r) => r.path === attachment.path);
      if (refDoc) {
        if (refDoc.storage === 'inline') {
          toast.info('업로드된 참조 파일은 미리보기를 지원하지 않습니다.');
          return;
        }
        const kind = refDoc.kind ?? 'document';
        if (kind === 'document') {
          if (onOpenDocumentTab && attachment.path) {
            onOpenDocumentTab(attachment.path);
          }
          return;
        }
      }
    }

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
      footer={!editable && !isTemplateSidecar ? (
        <CommentInput
          onAdd={handleCommentAdd}
          replyTo={replyTarget}
          onCancelReply={() => setReplyTarget(undefined)}
        />
      ) : undefined}
    >
      {isLoading ? (
        <LoadingState size="sm" message="문서를 불러오는 중..." className="h-full" />
      ) : (
        <>
          {collaborationSnapshot ? (
            <div className="mb-3 rounded-md border border-ssoo-border bg-ssoo-card px-3 py-3 text-sm text-ssoo-foreground">
              <div className="font-medium">협업 / Publish 상태</div>
              <p className="mt-2 text-ssoo-muted-foreground">
                현재 접속 {collaborationSnapshot.members.length}명 · 편집 중 {collaborationSnapshot.members.filter((member) => member.mode === 'edit').length}명 · publish {collaborationSnapshot.publishState.status}
              </p>
              <p className="mt-1 text-ssoo-muted-foreground">
                {collaborationSnapshot.softLock
                  ? `편집 잠금: ${collaborationSnapshot.softLock.displayName}(${collaborationSnapshot.softLock.loginId})`
                  : '현재 soft lock 없음'}
              </p>
              {collaborationSnapshot.publishState.affectedPaths?.length ? (
                <p className="mt-1 text-ssoo-muted-foreground">
                  change set: {collaborationSnapshot.publishState.operationType || 'update'} · {collaborationSnapshot.publishState.affectedPaths.join(', ')}
                </p>
              ) : null}
              {collaborationSnapshot.publishState.syncStatus ? (
                <p className="mt-1 text-ssoo-muted-foreground">
                  git sync: remoteAhead {String(collaborationSnapshot.publishState.syncStatus.remoteAhead)} / localAhead {String(collaborationSnapshot.publishState.syncStatus.localAhead)} / diverged {String(collaborationSnapshot.publishState.syncStatus.diverged)}
                </p>
              ) : null}
              {collaborationSnapshot.publishState.lastError ? (
                <p className="mt-1 text-amber-700">최근 publish 오류: {collaborationSnapshot.publishState.lastError}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {(collaborationSnapshot.publishState.status === 'sync-blocked' || collaborationSnapshot.publishState.status === 'push-failed') && onRefreshPublishState ? (
                  <Button variant="outline" size="sm" onClick={() => void onRefreshPublishState()}>
                    상태 새로고침
                  </Button>
                ) : null}
                {(collaborationSnapshot.publishState.status === 'sync-blocked' || collaborationSnapshot.publishState.status === 'push-failed') && onRetryPublish ? (
                  <Button variant="outline" size="sm" onClick={() => void onRetryPublish()}>
                    publish 재시도
                  </Button>
                ) : null}
                {collaborationSnapshot.softLock && collaborationSnapshot.softLock.loginId !== currentUserLoginId && onTakeoverLock ? (
                  <Button variant="outline" size="sm" onClick={() => void onTakeoverLock()}>
                    잠금 takeover
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
          <DocumentInfoSection
            editable={editable}
            templateMode={isTemplateSidecar}
            filePath={filePath}
            documentTitle={documentTitle}
            originalDocumentTitle={originalDocumentTitle}
            originalFilePath={originalFilePath}
            titleRecommendationStatus={titleRecommendationStatus}
            pathRecommendationStatus={pathRecommendationStatus}
            externalLoading={externalInfoLoading}
            pendingSuggestedTitle={pendingSuggestedTitle}
            pendingSuggestedPath={pendingSuggestedPath}
            pendingPathValidationMessage={pendingPathValidationMessage}
            pathValidationMessage={pathValidationMessage}
            isNewDocument={isNewDocument}
            metadata={metadata}
            onRequestRecommendation={onRequestInfoRecommendation}
            onAcceptSuggestedTitle={onAcceptSuggestedTitle}
            onDismissSuggestedTitle={onDismissSuggestedTitle}
            onAcceptSuggestedPath={onAcceptSuggestedPath}
            onDismissSuggestedPath={onDismissSuggestedPath}
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
            externalSuggestedTags={externalSuggestedTags}
            externalLoading={externalSuggestedTagsLoading}
            onExternalSuggestedTagsConsumed={onExternalSuggestedTagsConsumed}
          />
          {!isTemplateSidecar && (
            <SummarySection
              editable={editable}
              summary={summary}
              onChange={handleSummaryChange}
              onSummaryReplace={(text) => onMetadataChange?.({ summary: text })}
              getEditorContent={getEditorContent}
              originalSummary={originalMetaSnapshot?.summary}
              externalAiSuggestion={externalAiSuggestion}
              externalLoading={externalAiSuggestionLoading}
              onExternalAiSuggestionConsumed={onExternalAiSuggestionConsumed}
            />
          )}
          {!isTemplateSidecar && (
            <SourceLinksSection
              editable={editable}
              sourceLinks={sourceLinks}
              onChange={handleSourceLinksChange}
              originalSourceLinks={originalMetaSnapshot?.sourceLinks}
              bodyLinks={bodyLinks}
              onScrollToBodyLink={onScrollToBodyLink}
              onOpenLink={onOpenLink}
              defaultOpen={editable}
            />
          )}
          <AttachmentsSection
            attachments={isTemplateSidecar ? templateReferenceAttachments : attachments}
            editable={editable}
            templateMode={isTemplateSidecar}
            onChange={isTemplateSidecar ? undefined : handleAttachmentsChange}
            onItemClick={handleAttachmentClick}
            onDownload={handleAttachmentDownload}
            originalAttachmentPaths={isTemplateSidecar ? undefined : originalMetaSnapshot?.attachmentPaths}
            deletedReferenceKeys={isTemplateSidecar ? undefined : deletedReferenceKeys}
            defaultOpen={isTemplateSidecar || editable}
          />
          {!isNewDocument && !isTemplateSidecar && (
            <CommentsSection
              comments={comments}
              editable={editable}
              onDelete={handleCommentDelete}
              onRestore={handleCommentRestore}
              onReply={(comment) => {
                const commentMap = new Map(comments.map((c) => [c.id, c]));
                let current = comment;
                while (current.parentId && commentMap.has(current.parentId)) {
                  current = commentMap.get(current.parentId)!;
                }
                setReplyTarget({ id: current.id, author: comment.author || 'Unknown' });
              }}
              originalCommentIds={originalMetaSnapshot?.commentIds}
            />
          )}
        </>
      )}
    </SidecarFrame>
  );
}
