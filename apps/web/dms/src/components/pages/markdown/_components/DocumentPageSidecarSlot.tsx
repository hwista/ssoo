'use client';

import { DocumentSidecar } from './DocumentSidecar';
import type { BodyLink, DocumentMetadata } from '@/types';
import type { RecommendationStatus, TemplateSaveDraft } from '../documentPageTypes';
import type { DocumentSidecarMetadata } from './DocumentSidecar';
import type { DocumentSidecarDiffSnapshot } from '../documentPageUtils';

interface DocumentPageSidecarSlotProps {
  metadata: DocumentSidecarMetadata;
  tags: string[];
  editable: boolean;
  documentMetadata: DocumentMetadata | null;
  isLoading: boolean;
  onMetadataChange: (update: Partial<DocumentMetadata>) => void;
  onFileMove: (newPath: string) => void;
  generatedFileName?: string;
  isNewDocument: boolean;
  titleRecommendationStatus: RecommendationStatus;
  pathRecommendationStatus: RecommendationStatus;
  externalInfoLoading: boolean;
  originalDocumentTitle: string;
  originalFilePath: string;
  pathValidationMessage?: string;
  displayDocumentTitle?: string;
  pendingSuggestedTitle: string | null;
  pendingSuggestedPath: string | null;
  pendingPathValidationMessage?: string;
  filePath: string;
  templateSaveEnabled: boolean;
  templateDraft: TemplateSaveDraft;
  onTemplateDraftChange: (update: Partial<TemplateSaveDraft>) => void;
  onRequestInfoRecommendation: () => void;
  onAcceptSuggestedTitle: () => void;
  onDismissSuggestedTitle: () => void;
  onAcceptSuggestedPath: () => void;
  onDismissSuggestedPath: () => void;
  getEditorContent: () => string;
  bodyLinks: BodyLink[];
  onScrollToBodyLink: (url: string) => void;
  onOpenLink: (url: string, type?: 'link' | 'image') => void;
  originalMetaSnapshot: DocumentSidecarDiffSnapshot | null;
  onOpenDocumentTab: (path: string) => void;
  externalSuggestedTags?: string[];
  externalSuggestedTagsLoading: boolean;
  onExternalSuggestedTagsConsumed: () => void;
  externalAiSuggestion?: string | null;
  externalAiSuggestionLoading: boolean;
  onExternalAiSuggestionConsumed: () => void;
  deletedReferenceKeys?: Set<string>;
  onImmediateFlush: () => Promise<void>;
}

export function DocumentPageSidecarSlot({
  metadata,
  tags,
  editable,
  documentMetadata,
  isLoading,
  onMetadataChange,
  onFileMove,
  generatedFileName,
  isNewDocument,
  titleRecommendationStatus,
  pathRecommendationStatus,
  externalInfoLoading,
  originalDocumentTitle,
  originalFilePath,
  pathValidationMessage,
  displayDocumentTitle,
  pendingSuggestedTitle,
  pendingSuggestedPath,
  pendingPathValidationMessage,
  filePath,
  templateSaveEnabled,
  templateDraft,
  onTemplateDraftChange,
  onRequestInfoRecommendation,
  onAcceptSuggestedTitle,
  onDismissSuggestedTitle,
  onAcceptSuggestedPath,
  onDismissSuggestedPath,
  getEditorContent,
  bodyLinks,
  onScrollToBodyLink,
  onOpenLink,
  originalMetaSnapshot,
  onOpenDocumentTab,
  externalSuggestedTags,
  externalSuggestedTagsLoading,
  onExternalSuggestedTagsConsumed,
  externalAiSuggestion,
  externalAiSuggestionLoading,
  onExternalAiSuggestionConsumed,
  deletedReferenceKeys,
  onImmediateFlush,
}: DocumentPageSidecarSlotProps) {
  return (
    <DocumentSidecar
      metadata={metadata}
      tags={tags}
      editable={editable}
      documentMetadata={documentMetadata}
      isLoading={isLoading}
      onMetadataChange={onMetadataChange}
      onFileMove={onFileMove}
      generatedFileName={generatedFileName}
      isNewDocument={isNewDocument}
      titleRecommendationStatus={titleRecommendationStatus}
      pathRecommendationStatus={pathRecommendationStatus}
      externalInfoLoading={externalInfoLoading}
      originalDocumentTitle={originalDocumentTitle}
      originalFilePath={originalFilePath}
      pathValidationMessage={pathValidationMessage}
      displayDocumentTitle={displayDocumentTitle}
      pendingSuggestedTitle={pendingSuggestedTitle}
      pendingSuggestedPath={pendingSuggestedPath}
      pendingPathValidationMessage={pendingPathValidationMessage}
      filePath={filePath}
      templateSaveEnabled={templateSaveEnabled}
      templateDraft={templateDraft}
      onTemplateDraftChange={onTemplateDraftChange}
      onRequestInfoRecommendation={onRequestInfoRecommendation}
      onAcceptSuggestedTitle={onAcceptSuggestedTitle}
      onDismissSuggestedTitle={onDismissSuggestedTitle}
      onAcceptSuggestedPath={onAcceptSuggestedPath}
      onDismissSuggestedPath={onDismissSuggestedPath}
      getEditorContent={getEditorContent}
      bodyLinks={bodyLinks}
      onScrollToBodyLink={onScrollToBodyLink}
      onOpenLink={onOpenLink}
      originalMetaSnapshot={originalMetaSnapshot}
      onOpenDocumentTab={onOpenDocumentTab}
      externalSuggestedTags={externalSuggestedTags}
      externalSuggestedTagsLoading={externalSuggestedTagsLoading}
      onExternalSuggestedTagsConsumed={onExternalSuggestedTagsConsumed}
      externalAiSuggestion={externalAiSuggestion}
      externalAiSuggestionLoading={externalAiSuggestionLoading}
      onExternalAiSuggestionConsumed={onExternalAiSuggestionConsumed}
      deletedReferenceKeys={deletedReferenceKeys}
      onImmediateFlush={onImmediateFlush}
    />
  );
}
