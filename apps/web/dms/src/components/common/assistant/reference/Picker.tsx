'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { FileUp, Plus, Search } from 'lucide-react';
import { useAssistantContextStore, useTabStore } from '@/stores';
import { filesApi, templateApi } from '@/lib/api';
import type { TemplateItem } from '@/types/template';
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
} from './pickerUtils';

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
  inlineContext,
}: {
  disabled?: boolean;
  mode?: 'assistant' | 'inline';
  inlineContext?: InlineContextProps;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [allDocs, setAllDocs] = useState<Array<{ path: string; title: string }>>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);

  const tabs = useTabStore((state) => state.tabs);
  const assistantReferences = useAssistantContextStore((state) => state.attachedReferences);
  const assistantToggleReference = useAssistantContextStore((state) => state.toggleReference);

  const selectedTemplate = mode === 'inline' ? (inlineContext?.selectedTemplate ?? null) : null;
  const attachedPaths = useMemo(
    () => new Set(assistantReferences.map((reference) => reference.path)),
    [assistantReferences]
  );

  const openDocs = useMemo(() => collectOpenDocs(tabs), [tabs]);

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
    if (mode !== 'assistant' || !open || allDocs.length > 0) return;

    let mounted = true;
    const loadAllDocs = async () => {
      setIsLoadingDocs(true);
      const response = await filesApi.getFileTree();
      if (!mounted) return;

      if (!response.success || !response.data) {
        setAllDocs([]);
        setIsLoadingDocs(false);
        return;
      }

      setAllDocs(flattenFileTreeDocs(response.data));
      setIsLoadingDocs(false);
    };

    void loadAllDocs();
    return () => {
      mounted = false;
    };
  }, [allDocs.length, mode, open]);

  useEffect(() => {
    if (mode !== 'inline' || !open || templates.length > 0) return;

    let mounted = true;
    const loadTemplates = async () => {
      setIsLoadingTemplates(true);
      const response = await templateApi.list();
      if (!mounted) return;
      if (response.success && response.data) {
        setTemplates([...(response.data.personal ?? []), ...(response.data.global ?? [])]);
      }
      setIsLoadingTemplates(false);
    };

    void loadTemplates();
    return () => {
      mounted = false;
    };
  }, [mode, open, templates.length]);

  const handlePickSummaryFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    if (mode !== 'inline') return;
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const mapped = await Promise.all(files.map(async (file) => {
      let textContent = '';
      let images: InlineSummaryFileItem['images'];
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/file/extract-text', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          textContent = typeof data?.textContent === 'string' ? data.textContent : '';
          images = Array.isArray(data?.images) ? data.images : undefined;
        }
      } catch {
        textContent = '';
      }
      return {
        id: `${file.name}-${file.lastModified}-${file.size}`,
        name: file.name,
        type: file.type,
        size: file.size,
        textContent,
        images,
      } satisfies InlineSummaryFileItem;
    }));

    inlineContext?.onUpsertSummaryFiles(mapped);
    event.target.value = '';
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ssoo-primary text-white shadow-sm transition-colors hover:bg-ssoo-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          title="컨텍스트 첨부"
          aria-label="컨텍스트 첨부"
        >
          <Plus className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-[380px] border-ssoo-primary/20 bg-white p-2 text-ssoo-primary shadow-lg"
        data-assistant-dropdown="true"
      >
        <div className="space-y-2">
          {mode === 'inline' && (
            <div className="rounded-md border border-ssoo-primary/20 bg-ssoo-content-bg/40 px-2 py-2">
              <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-ssoo-primary/80">
                <FileUp className="h-3.5 w-3.5" /> 참조 파일 첨부
              </p>
              <input
                type="file"
                multiple
                onChange={handlePickSummaryFiles}
                className="block w-full text-xs text-ssoo-primary file:mr-2 file:rounded-md file:border file:border-ssoo-content-border file:bg-white file:px-2 file:py-1 file:text-xs file:text-ssoo-primary"
                accept=".md,.txt,.json,.csv,.pdf,.docx,.pptx,.xlsx"
              />
            </div>
          )}

          <div>
            <p className="px-1 pb-1 text-[11px] font-semibold text-ssoo-primary/70">
              {mode === 'inline' ? '내 템플릿 검색' : '문서 검색'}
            </p>
            <p className="px-1 pb-1 text-xs text-ssoo-primary/60">
              {mode === 'inline'
                ? '검색어를 입력하면 내 문서 템플릿에서 찾습니다.'
                : '검색어를 입력하면 전체 문서에서 찾습니다.'}
            </p>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ssoo-primary/50" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={mode === 'inline' ? '문서 템플릿 검색...' : '전체 문서 검색...'}
              className="h-9 w-full rounded-md border border-ssoo-primary/25 bg-white pl-7 pr-2 text-xs text-ssoo-primary placeholder:text-ssoo-primary/45 focus:border-ssoo-primary/50 focus:outline-none"
            />
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto">
            {mode === 'assistant' ? (
              <AssistantReferenceDocSections
                query={query}
                isLoadingDocs={isLoadingDocs}
                searchedDocs={searchedAllDocs}
                openDocs={openDocs}
                attachedPaths={attachedPaths}
                onToggleReference={assistantToggleReference}
              />
            ) : (
              <InlineTemplateSections
                query={query}
                isLoadingTemplates={isLoadingTemplates}
                searchedTemplates={searchedTemplates}
                globalDocumentTemplates={globalDocumentTemplates}
                selectedTemplateId={selectedTemplate?.id}
                onSelectTemplate={(template) => inlineContext?.onSelectTemplate(template)}
              />
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
