'use client';

import { AssistantComposer } from '@/components/common/assistant/Composer';
import { Editor } from './editor';
import { Viewer } from '@/components/common/viewer';
import { ErrorState, LoadingState } from '@/components/common/StateDisplay';
import type { InlineSummaryFileItem } from '@/components/common/assistant/reference/Picker';
import type { TocItem } from '@/components/templates/page-frame';
import type { EditorRef } from './editor';
import type { TemplateItem } from '@/types/template';

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
  handleInlineTemplateSelect: (template: TemplateItem) => void | Promise<void>;
  setInlineTemplate: (template: TemplateItem | null) => void;
  setInlineSummaryFiles: React.Dispatch<React.SetStateAction<InlineSummaryFileItem[]>>;
  setInlineRelevanceWarnings: React.Dispatch<React.SetStateAction<string[]>>;
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
  handleInlineTemplateSelect,
  setInlineTemplate,
  setInlineSummaryFiles,
  setInlineRelevanceWarnings,
}: InlineComposerPanelProps) {
  if (!isEditorMode) {
    return null;
  }

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
      inlineContext={{
        selectedTemplate: inlineTemplate,
        summaryFiles: inlineSummaryFiles,
        onSelectTemplate: handleInlineTemplateSelect,
        onUpsertSummaryFiles: (files) => {
          setInlineSummaryFiles((prev) => {
            const map = new Map(prev.map((item) => [item.id, item]));
            for (const file of files) map.set(file.id, file);
            return Array.from(map.values());
          });
        },
      }}
      inlineTemplate={inlineTemplate}
      inlineSummaryFiles={inlineSummaryFiles}
      inlineWarnings={inlineRelevanceWarnings}
      onInlineClearAll={() => {
        setInlineTemplate(null);
        setInlineSummaryFiles([]);
        setInlineRelevanceWarnings([]);
      }}
      onInlineRemoveTemplate={() => {
        setInlineTemplate(null);
      }}
      onInlineRemoveSummaryFile={(id) => {
        setInlineSummaryFiles((prev) => prev.filter((item) => item.id !== id));
      }}
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
  saveAsTemplateOnly: boolean;
  templateSaveDraft: {
    name: string;
    description: string;
    scope: 'personal' | 'global';
  };
  setSaveAsTemplateOnly: React.Dispatch<React.SetStateAction<boolean>>;
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
  saveAsTemplateOnly,
  templateSaveDraft,
  setSaveAsTemplateOnly,
}: DocumentPageContentProps) {
  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <ErrorState error={error} onRetry={handleRetry} />
      </div>
    );
  }

  if (isLoading && !isCreateMode) {
    return (
      <div className="flex flex-1 items-center justify-center">
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
      />
    );
  }

  return (
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
      templateSaveEnabled={saveAsTemplateOnly}
      templateSaveDraft={templateSaveDraft}
      onTemplateSaved={() => {
        setSaveAsTemplateOnly(false);
      }}
    />
  );
}
