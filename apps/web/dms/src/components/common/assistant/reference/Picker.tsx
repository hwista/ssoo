'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { FileUp, Plus, Search } from 'lucide-react';
import { useAssistantContextStore, useTabStore } from '@/stores';
import type { TemplateItem } from '@/types/template';
import { useFileTreeQuery } from '@/hooks/queries/useFileTree';
import { useTemplateList } from '@/hooks/queries/useTemplates';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';
import {
  AssistantReferenceDocSections,
  InlineTemplateSections,
} from './PickerSections';
import {
  collectOpenDocs,
  filterDocReferences,
  filterPersonalDocumentTemplates,
  flattenFileTreeDocs,
  type DocReferenceItem,
} from './pickerUtils';
import { createPendingSummaryFile, extractSummaryFile } from './summaryFileExtraction';
import { armProtectedAppLifecycleCheckSkip } from '@/lib/protectedAppLifecycleCheck';
import { Button, Input } from '@ssoo/web-ui';

export interface ExtractedImageItem {
  base64: string;
  mimeType: string;
  name: string;
  size: number;
}

export interface InlineSummaryFileItem {
  id: string;
  name: string;
  type?: string;
  size: number;
  textContent: string;
  images?: ExtractedImageItem[];
  warningReason?: string;
  unsupportedReason?: string;
  protectedMarkerDetected?: boolean;
  rawFile?: File;
  extractionState?: 'extracting' | 'ready' | 'failed';
}

export interface PickerSectionsConfig {
  documentSearch?: boolean;
  openDocuments?: boolean;
  fileUpload?: boolean;
  templateSelection?: boolean;
}

interface InlineContextProps {
  selectedTemplate: TemplateItem | null;
  summaryFiles: InlineSummaryFileItem[];
  onSelectTemplate: (template: TemplateItem) => void | Promise<void>;
  onUpsertSummaryFiles: (files: InlineSummaryFileItem[]) => void;
}

export function AssistantReferencePicker({
  disabled,
  mode = 'assistant',
  sections,
  inlineContext,
  overrideToggleReference,
  overrideAttachedPaths,
}: {
  disabled?: boolean;
  mode?: 'assistant' | 'inline';
  sections?: PickerSectionsConfig;
  inlineContext?: InlineContextProps;
  overrideToggleReference?: (ref: DocReferenceItem) => void;
  overrideAttachedPaths?: Set<string>;
}) {
  const resolved: Required<PickerSectionsConfig> = sections
    ? {
        documentSearch: sections.documentSearch ?? false,
        openDocuments: sections.openDocuments ?? false,
        fileUpload: sections.fileUpload ?? false,
        templateSelection: sections.templateSelection ?? false,
      }
    : mode === 'inline'
      ? { documentSearch: false, openDocuments: false, fileUpload: true, templateSelection: true }
      : { documentSearch: true, openDocuments: true, fileUpload: false, templateSelection: false };

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeSummaryFileIdsRef = useRef<Set<string>>(new Set());
  const extractionControllersRef = useRef<Map<string, AbortController>>(new Map());

  const tabs = useTabStore((state) => state.tabs);
  const assistantReferences = useAssistantContextStore((state) => state.attachedReferences);
  const assistantToggleReference = useAssistantContextStore((state) => state.toggleReference);
  const assistantToggleTemplate = useAssistantContextStore((state) => state.toggleTemplate);
  const assistantSelectedTemplates = useAssistantContextStore((state) => state.selectedTemplates);

  const selectedTemplate = inlineContext
    ? (inlineContext.selectedTemplate ?? null)
    : (assistantSelectedTemplates[assistantSelectedTemplates.length - 1] ?? null);

  const attachedPaths = useMemo(
    () => new Set(assistantReferences.map((reference) => reference.path)),
    [assistantReferences]
  );
  const effectiveAttachedPaths = overrideAttachedPaths ?? attachedPaths;
  const effectiveToggleReference = overrideToggleReference ?? assistantToggleReference;

  const openDocs = useMemo(() => collectOpenDocs(tabs), [tabs]);

  const fileTreeQuery = useFileTreeQuery({
    enabled: resolved.documentSearch && open,
  });
  const templateListQuery = useTemplateList({
    enabled: resolved.templateSelection && open,
  });

  const allDocs = useMemo(
    () => flattenFileTreeDocs(fileTreeQuery.data?.data ?? []),
    [fileTreeQuery.data?.data],
  );
  const templates = useMemo<TemplateItem[]>(
    () => [
      ...(templateListQuery.data?.data?.personal ?? []),
      ...(templateListQuery.data?.data?.global ?? []),
    ],
    [templateListQuery.data?.data?.global, templateListQuery.data?.data?.personal],
  );
  const isLoadingDocs = fileTreeQuery.isLoading || fileTreeQuery.isFetching;
  const isLoadingTemplates = templateListQuery.isLoading || templateListQuery.isFetching;

  const searchedAllDocs = useMemo(() => filterDocReferences(allDocs, query), [allDocs, query]);

  const personalDocumentTemplates = useMemo(
    () => templates.filter((item) => item.kind === 'document' && item.scope !== 'global'),
    [templates]
  );
  const globalDocumentTemplates = useMemo(
    () => templates.filter((item) => item.kind === 'document' && item.scope === 'global'),
    [templates]
  );
  const searchedTemplates = useMemo(
    () => filterPersonalDocumentTemplates(personalDocumentTemplates, query),
    [personalDocumentTemplates, query]
  );

  useEffect(() => {
    const activeIds = new Set(inlineContext?.summaryFiles.map((file) => file.id) ?? []);
    activeSummaryFileIdsRef.current = activeIds;
    for (const [id, controller] of extractionControllersRef.current.entries()) {
      if (!activeIds.has(id)) {
        controller.abort();
        extractionControllersRef.current.delete(id);
      }
    }
  }, [inlineContext?.summaryFiles]);

  useEffect(() => () => {
    for (const controller of extractionControllersRef.current.values()) {
      controller.abort();
    }
    extractionControllersRef.current.clear();
  }, []);

  const handleOpenSummaryFilePicker = () => {
    if (!resolved.fileUpload || !inlineContext) {
      return;
    }

    armProtectedAppLifecycleCheckSkip();
    fileInputRef.current?.click();
    setOpen(false);
  };

  const handlePickSummaryFiles = (event: ChangeEvent<HTMLInputElement>) => {
    if (!resolved.fileUpload) return;
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    if (!inlineContext) {
      event.target.value = '';
      return;
    }

    const pendingFiles = files.map(createPendingSummaryFile);
    const nextIds = new Set(activeSummaryFileIdsRef.current);
    for (const pendingFile of pendingFiles) {
      nextIds.add(pendingFile.id);
    }
    activeSummaryFileIdsRef.current = nextIds;
    inlineContext.onUpsertSummaryFiles(pendingFiles);
    event.target.value = '';

    void Promise.all(pendingFiles.map(async (pendingFile) => {
      const rawFile = pendingFile.rawFile;
      if (!rawFile) return;

      const existingController = extractionControllersRef.current.get(pendingFile.id);
      existingController?.abort();

      const controller = new AbortController();
      extractionControllersRef.current.set(pendingFile.id, controller);

      try {
        const extracted = await extractSummaryFile(rawFile, { signal: controller.signal });
        if (!activeSummaryFileIdsRef.current.has(extracted.id)) {
          return;
        }
        inlineContext.onUpsertSummaryFiles([extracted]);
      } catch {
        if (!controller.signal.aborted) {
          inlineContext.onUpsertSummaryFiles([{
            ...pendingFile,
            unsupportedReason: 'extraction-error',
            extractionState: 'failed',
          }]);
        }
      } finally {
        if (extractionControllersRef.current.get(pendingFile.id) === controller) {
          extractionControllersRef.current.delete(pendingFile.id);
        }
      }
    }));
  };

  const handleTemplateSelect = (template: TemplateItem) => {
    if (inlineContext) {
      void inlineContext.onSelectTemplate(template);
      return;
    }
    assistantToggleTemplate(template);
    if (template.referenceDocuments?.length) {
      const store = useAssistantContextStore.getState();
      const currentPaths = new Set(store.attachedReferences.map((r) => r.path));
      for (const doc of template.referenceDocuments) {
        if (doc.path && !currentPaths.has(doc.path)) {
          store.toggleReference({
            path: doc.path,
            title: doc.title || doc.path.split('/').pop() || doc.path,
          });
        }
      }
    }
  };

  const searchLabel = resolved.templateSelection && !resolved.documentSearch
    ? '내 템플릿 검색'
    : resolved.documentSearch && resolved.templateSelection
      ? '문서 및 템플릿 검색'
      : '문서 검색';

  const searchDescription = resolved.templateSelection && !resolved.documentSearch
    ? '검색어를 입력하면 내 문서 템플릿에서 찾습니다.'
    : resolved.documentSearch && resolved.templateSelection
      ? '검색어를 입력하면 전체 문서와 템플릿에서 찾습니다.'
      : '검색어를 입력하면 전체 문서에서 찾습니다.';

  const searchPlaceholder = resolved.templateSelection && !resolved.documentSearch
    ? '문서 템플릿 검색...'
    : resolved.documentSearch && resolved.templateSelection
      ? '문서 또는 템플릿 검색...'
      : '전체 문서 검색...';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="plain" size="plain"
          type="button"
          disabled={disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ssoo-primary text-white shadow-sm transition-colors hover:bg-ssoo-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          title="컨텍스트 첨부"
          aria-label="컨텍스트 첨부"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-[380px] border-ssoo-primary/20 bg-white p-2 text-ssoo-primary shadow-lg"
        data-assistant-dropdown="true"
      >
        <div className="space-y-2">
          {resolved.fileUpload && (
            <div className="rounded-md border border-ssoo-primary/20 bg-ssoo-content-bg/40 px-2 py-2">
              <p className="mb-1 flex items-center gap-1 text-badge text-ssoo-primary/80">
                <FileUp className="h-3.5 w-3.5" /> 참조 파일 첨부
              </p>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={handleOpenSummaryFilePicker}
                className="w-full gap-1.5 hover:border-ssoo-primary/40 hover:bg-ssoo-content-bg/40"
              >
                <FileUp className="h-3.5 w-3.5" />
                파일 선택
              </Button>
            </div>
          )}

          <div>
            <p className="px-1 pb-1 text-badge text-ssoo-primary/70">{searchLabel}</p>
            <p className="px-1 pb-1 text-caption text-ssoo-primary/60">{searchDescription}</p>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ssoo-primary/50" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-md border border-ssoo-primary/25 bg-white pl-7 pr-2 text-caption text-ssoo-primary placeholder:text-ssoo-primary/45 focus:border-ssoo-primary/50 focus:outline-none"
            />
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto">
            {(resolved.documentSearch || resolved.openDocuments) && (
              <AssistantReferenceDocSections
                query={query}
                isLoadingDocs={isLoadingDocs}
                searchedDocs={resolved.documentSearch ? searchedAllDocs : []}
                openDocs={resolved.openDocuments ? openDocs : []}
                attachedPaths={effectiveAttachedPaths}
                onToggleReference={effectiveToggleReference}
              />
            )}
            {resolved.templateSelection && (
              <InlineTemplateSections
                query={query}
                isLoadingTemplates={isLoadingTemplates}
                searchedTemplates={searchedTemplates}
                globalDocumentTemplates={globalDocumentTemplates}
                selectedTemplateId={selectedTemplate?.id}
                onSelectTemplate={handleTemplateSelect}
              />
            )}
          </div>
        </div>
      </DropdownMenuContent>
      {resolved.fileUpload && (
        <Input
          ref={fileInputRef}
          type="file"
          multiple
          onClick={armProtectedAppLifecycleCheckSkip}
          onChange={handlePickSummaryFiles}
          className="hidden"
          accept=".md,.txt,.json,.csv,.pdf,.docx,.pptx,.xlsx"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
    </DropdownMenu>
  );
}
