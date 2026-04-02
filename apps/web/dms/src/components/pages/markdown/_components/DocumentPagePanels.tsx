'use client';

import { AssistantComposer } from '@/components/common/assistant/Composer';
import { Editor } from './editor';
import { Viewer } from '@/components/common/viewer';
import { ErrorState, LoadingState } from '@/components/common/StateDisplay';
import type { InlineSummaryFileItem } from '@/components/common/assistant/reference/Picker';
import type { TocItem } from '@/components/templates/page-frame';
import type { EditorRef } from './editor';
import type { TemplateItem, TemplateReferenceDoc } from '@/types/template';

type PageMode = 'viewer' | 'editor' | 'create';

interface InlineComposerPanelProps {
  isEditorMode: boolean;
  inlineInstruction: string;
  isComposing: boolean;
  setInlineInstruction: (value: string) => void;
  handleInlineCompose: (draft?: string) => Promise<void>;
  inlineTemplate: TemplateItem | null;
  inlineSummaryFiles: InlineSummaryFileItem[];
  inlineRelevanceWarnings: string[];
  usedSummaryFileIds?: Set<string>;
  isTemplateUsed?: boolean;
  deletedFileIds?: Set<string>;
  isTemplateDeleted?: boolean;
  handleInlineTemplateSelect: (template: TemplateItem) => void | Promise<void>;
  setInlineTemplate: (template: TemplateItem | null) => void;
  setInlineSummaryFiles: React.Dispatch<React.SetStateAction<InlineSummaryFileItem[]>>;
  setInlineRelevanceWarnings: React.Dispatch<React.SetStateAction<string[]>>;
  onRemoveSummaryFile?: (id: string) => void;
  onRemoveTemplate?: () => void;
  onRestoreSummaryFile?: (id: string) => void;
  onRestoreTemplate?: () => void;
  onClearAll?: () => void;
  onAbort?: () => void;
  hasFailedRestore?: boolean;
  isRetryingRestore?: boolean;
  onRetryRestore?: () => void;
  templateModeEnabled?: boolean;
  templateReferenceDocuments?: TemplateReferenceDoc[];
  addTemplateReference?: (ref: TemplateReferenceDoc) => void;
  removeTemplateReference?: (path: string) => void;
  onRemoveTemplateReference?: (path: string) => Promise<void>;
  onRestoreReference?: (path: string) => void;
  pendingDeletedRefPaths?: Set<string>;
}

export function InlineComposerPanel({
  isEditorMode,
  inlineInstruction,
  isComposing,
  setInlineInstruction,
  handleInlineCompose,
  inlineTemplate,
  inlineSummaryFiles,
  inlineRelevanceWarnings,
  usedSummaryFileIds,
  isTemplateUsed,
  deletedFileIds,
  isTemplateDeleted,
  handleInlineTemplateSelect,
  setInlineTemplate,
  setInlineSummaryFiles,
  setInlineRelevanceWarnings,
  onRemoveSummaryFile,
  onRemoveTemplate,
  onRestoreSummaryFile,
  onRestoreTemplate,
  onClearAll,
  onAbort,
  hasFailedRestore,
  isRetryingRestore,
  onRetryRestore,
  templateModeEnabled = false,
  templateReferenceDocuments = [],
  addTemplateReference,
  removeTemplateReference,
  onRemoveTemplateReference,
  onRestoreReference,
  pendingDeletedRefPaths,
}: InlineComposerPanelProps) {
  if (!isEditorMode) {
    return null;
  }

  const pickerSections = templateModeEnabled
    ? { documentSearch: true, openDocuments: true, fileUpload: true, templateSelection: true }
    : undefined;

  const overrideAttachedPaths = templateModeEnabled
    ? new Set(templateReferenceDocuments.filter((r) => r.kind !== 'file').map((r) => r.path))
    : undefined;

  const referenceChips = templateModeEnabled
    ? templateReferenceDocuments.map((r) => ({
      path: r.path,
      title: r.title || r.path,
      kind: r.kind,
      storage: r.storage,
      tempId: r.tempId,
      isDeleted: pendingDeletedRefPaths?.has(r.path),
    }))
    : undefined;

  const cleanupTemplateSelectedRefs = () => {
    if (!templateModeEnabled || !removeTemplateReference) return;
    for (const ref of templateReferenceDocuments) {
      if (ref.source === 'template-selected') {
        removeTemplateReference(ref.path);
      }
    }
  };

  const overrideToggleReference = templateModeEnabled && addTemplateReference && removeTemplateReference
    ? (ref: { path: string; title: string }) => {
      const exists = templateReferenceDocuments.some((item) => item.path === ref.path);
      if (exists) {
        removeTemplateReference(ref.path);
        return;
      }
      addTemplateReference({ path: ref.path, title: ref.title, source: 'picker', kind: 'document', storage: 'path' });
    }
    : undefined;

  const wrappedUpsertSummaryFiles = templateModeEnabled && addTemplateReference
    ? (files: InlineSummaryFileItem[]) => {
      setInlineSummaryFiles((prev) => {
        const map = new Map(prev.map((item) => [item.id, item]));
        for (const file of files) map.set(file.id, file);
        return Array.from(map.values());
      });
      for (const file of files) {
        addTemplateReference({
          path: `__inline__/${file.id}`,
          title: file.name,
          source: 'picker',
          kind: 'file',
          storage: 'inline',
          textContent: file.textContent,
          tempId: file.id,
          mimeType: file.type,
          size: file.size,
        });
      }
    }
    : (files: InlineSummaryFileItem[]) => {
      setInlineSummaryFiles((prev) => {
        const map = new Map(prev.map((item) => [item.id, item]));
        for (const file of files) map.set(file.id, file);
        return Array.from(map.values());
      });
    };

  const wrappedTemplateSelect = templateModeEnabled && addTemplateReference && removeTemplateReference
    ? async (template: TemplateItem) => {
      cleanupTemplateSelectedRefs();

      if (inlineTemplate?.id === template.id) {
        if (onRemoveTemplate) {
          await onRemoveTemplate();
        } else {
          setInlineTemplate(null);
        }
        return;
      }

      if (template.referenceDocuments?.length) {
        for (const doc of template.referenceDocuments) {
          addTemplateReference({
            path: doc.path,
            title: doc.title,
            source: 'template-selected',
            kind: doc.kind ?? 'document',
            provider: doc.provider,
            mimeType: doc.mimeType,
            size: doc.size,
            storage: doc.storage ?? 'path',
            textContent: doc.textContent,
            tempId: doc.tempId,
          });
        }
      }

      await handleInlineTemplateSelect(template);
    }
    : handleInlineTemplateSelect;

  const handleRemoveReference = async (path: string) => {
    if (!templateModeEnabled) return;
    await onRemoveTemplateReference?.(path);
  };

  return (
    <AssistantComposer
      inputDraft={inlineInstruction}
      isProcessing={isComposing}
      setInputDraft={setInlineInstruction}
      submitUserMessage={async (text) => {
        await handleInlineCompose(text);
      }}
      placeholder="AI와 함께 문서를 작성하세요. 선택한 텍스트 영역이 있으면 치환하고 없으면 커서 위치에 삽입됩니다."
      submitVariant="text"
      submitLabel="적용"
      mode="inline"
      pickerSections={pickerSections}
      overrideToggleReference={overrideToggleReference}
      overrideAttachedPaths={overrideAttachedPaths}
      inlineContext={{
        selectedTemplate: inlineTemplate,
        summaryFiles: inlineSummaryFiles,
        onSelectTemplate: wrappedTemplateSelect,
        onUpsertSummaryFiles: wrappedUpsertSummaryFiles,
      }}
      referenceChips={referenceChips}
      onRemoveReference={handleRemoveReference}
      onRestoreReference={onRestoreReference}
      inlineTemplate={inlineTemplate}
      inlineSummaryFiles={inlineSummaryFiles}
      inlineWarnings={inlineRelevanceWarnings}
      usedSummaryFileIds={usedSummaryFileIds}
      isTemplateUsed={isTemplateUsed}
      deletedFileIds={deletedFileIds}
      isTemplateDeleted={isTemplateDeleted}
      onInlineClearAll={() => {
        if (onClearAll) {
          onClearAll();
        } else {
          cleanupTemplateSelectedRefs();
          setInlineTemplate(null);
          setInlineSummaryFiles([]);
          setInlineRelevanceWarnings([]);
        }
      }}
      onInlineRemoveTemplate={() => {
        if (onRemoveTemplate) {
          onRemoveTemplate();
        } else {
          setInlineTemplate(null);
        }
      }}
      onInlineRemoveSummaryFile={(id) => {
        if (onRemoveSummaryFile) {
          onRemoveSummaryFile(id);
        } else {
          setInlineSummaryFiles((prev) => prev.filter((item) => item.id !== id));
        }
      }}
      onInlineRestoreTemplate={onRestoreTemplate}
      onInlineRestoreSummaryFile={onRestoreSummaryFile}
      onAbort={onAbort}
      hasFailedRestore={hasFailedRestore}
      isRetryingRestore={isRetryingRestore}
      onRetryRestore={onRetryRestore}
    />
  );
}

interface DocumentPageContentProps {
  error: string | null;
  handleRetry: () => void;
  isLoading: boolean;
  isCreateMode: boolean;
  mode: PageMode;
  htmlContent: string;
  toc: TocItem[];
  handleTocClick: (id: string) => void;
  handleSearch: (query?: string) => void;
  handleAttachCurrentDocToAssistant: () => void;
  editorRef: React.RefObject<EditorRef | null>;
  createPath: string;
  setCreatePath: (path: string) => void;
  /** 새 문서용 자동 생성 파일명 */
  generatedFileName?: string;
  isPreview: boolean;
  isComposing: boolean;
  isTemplateGenerating?: boolean;
  currentDraftContent?: string | null;
  streamingAutoScroll?: boolean;
  onEditorContentChange?: (content: string) => void;
  /** 본문 <a> 클릭 */
  onLinkClick?: (href: string) => void;
  /** 본문 <img> 클릭 */
  onImageClick?: (src: string, alt: string) => void;
  /** undo/redo 가용성 변경 콜백 */
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
}

export function DocumentPageContent({
  error,
  handleRetry,
  isLoading,
  isCreateMode,
  mode,
  htmlContent,
  toc,
  handleTocClick,
  handleSearch,
  handleAttachCurrentDocToAssistant,
  editorRef,
  createPath,
  setCreatePath,
  generatedFileName,
  isPreview,
  isComposing,
  isTemplateGenerating = false,
  currentDraftContent,
  streamingAutoScroll = false,
  onEditorContentChange,
  onLinkClick,
  onImageClick,
  onHistoryChange,
}: DocumentPageContentProps) {
  if (error) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <ErrorState error={error} onRetry={handleRetry} />
      </div>
    );
  }

  if (isLoading && !isCreateMode) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <LoadingState message="문서를 불러오는 중..." />
      </div>
    );
  }

  if (mode === 'viewer') {
    return (
      <Viewer
        content={htmlContent}
        toc={toc}
        onTocClick={handleTocClick}
        onSearch={handleSearch}
        onAttachToAssistant={handleAttachCurrentDocToAssistant}
        variant="embedded"
        onLinkClick={onLinkClick}
        onImageClick={onImageClick}
      />
    );
  }

  return (
    <div className="relative h-full min-h-0">
      <Editor
        ref={editorRef}
        className="h-full min-h-0"
        variant="embedded"
        showToolbar={false}
        preferredCreatePath={isCreateMode ? createPath : undefined}
        generatedFileName={isCreateMode ? generatedFileName : undefined}
        onCreatePathResolved={setCreatePath}
        isPreview={isPreview}
        isPendingInsertLoading={isComposing}
        streamingAutoScroll={streamingAutoScroll}
        onContentChange={onEditorContentChange}
        onHistoryChange={onHistoryChange}
      />
      {isTemplateGenerating && !(currentDraftContent?.trim()) ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
          <LoadingState size="sm" message="AI가 템플릿 초안을 작성하는 중..." />
        </div>
      ) : null}
    </div>
  );
}
