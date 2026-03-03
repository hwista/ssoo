'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { FileUp, FolderTree, Paperclip, Plus, Search, Shapes, X } from 'lucide-react';
import { useAssistantStore, useTabStore } from '@/stores';
import { filesApi, templateApi } from '@/lib/utils/apiClient';
import type { TemplateItem } from '@/types/template';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';

function decodeDocPath(path: string): string | null {
  if (!path.startsWith('/doc/')) return null;
  try {
    return decodeURIComponent(path.slice('/doc/'.length));
  } catch {
    return path.slice('/doc/'.length);
  }
}

export interface InlineSummaryFileItem {
  id: string;
  name: string;
  type?: string;
  size: number;
  textContent: string;
}

interface InlineContextProps {
  selectedTemplates: TemplateItem[];
  summaryFiles: InlineSummaryFileItem[];
  onToggleTemplate: (template: TemplateItem) => void;
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
  const assistantReferences = useAssistantStore((state) => state.attachedReferences);
  const assistantToggleReference = useAssistantStore((state) => state.toggleReference);

  const selectedTemplates = mode === 'inline' ? (inlineContext?.selectedTemplates ?? []) : [];

  const openDocs = useMemo(() => {
    const docs = tabs
      .map((tab) => {
        const filePath = decodeDocPath(tab.path);
        if (!filePath) return null;
        return {
          path: filePath,
          title: tab.title || filePath.split('/').pop() || filePath,
        };
      })
      .filter((item): item is { path: string; title: string } => Boolean(item));

    const deduped = new Map(docs.map((item) => [item.path, item]));
    return Array.from(deduped.values());
  }, [tabs]);

  const searchedAllDocs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return allDocs.filter((item) => (
      item.title.toLowerCase().includes(normalized) || item.path.toLowerCase().includes(normalized)
    ));
  }, [allDocs, query]);

  const documentTemplates = useMemo(
    () => templates.filter((item) => item.kind === 'document'),
    [templates]
  );
  const folderTemplates = useMemo(
    () => templates.filter((item) => item.kind === 'folder'),
    [templates]
  );
  const searchedTemplates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return templates.filter((item) => (
      item.name.toLowerCase().includes(normalized)
      || (item.description ?? '').toLowerCase().includes(normalized)
      || item.kind.toLowerCase().includes(normalized)
      || item.scope.toLowerCase().includes(normalized)
    ));
  }, [query, templates]);

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

      type TreeNode = {
        type: 'file' | 'directory';
        name: string;
        path: string;
        children?: TreeNode[];
      };

      const flatten = (nodes: TreeNode[]): Array<{ path: string; title: string }> => {
        const output: Array<{ path: string; title: string }> = [];
        for (const node of nodes) {
          if (node.type === 'file') {
            output.push({
              path: node.path,
              title: node.name || node.path.split('/').pop() || node.path,
            });
            continue;
          }
          if (node.type === 'directory' && Array.isArray(node.children)) {
            output.push(...flatten(node.children));
          }
        }
        return output;
      };

      const tree = response.data as unknown as TreeNode[];
      const flat = flatten(Array.isArray(tree) ? tree : []);
      const deduped = new Map(flat.map((item) => [item.path, item]));
      setAllDocs(Array.from(deduped.values()));
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
      try {
        textContent = (await file.text()).slice(0, 12000);
      } catch {
        textContent = '';
      }
      return {
        id: `${file.name}-${file.lastModified}-${file.size}`,
        name: file.name,
        type: file.type,
        size: file.size,
        textContent,
      } satisfies InlineSummaryFileItem;
    }));

    inlineContext?.onUpsertSummaryFiles(mapped);
    event.target.value = '';
  };

  const renderReferenceButton = (item: { path: string; title: string }, key: string) => {
    const attached = assistantReferences.some((ref) => ref.path === item.path);
    return (
      <button
        key={key}
        type="button"
        onClick={() => assistantToggleReference(item)}
        className={`w-full rounded-md border px-2 py-1.5 text-left transition-colors ${
          attached
            ? 'border-ssoo-primary/45 bg-ssoo-primary/10'
            : 'border-ssoo-primary/20 bg-white hover:border-ssoo-primary/40 hover:bg-ssoo-primary/5'
        }`}
      >
        <p className="truncate text-xs font-medium text-ssoo-primary">{item.title}</p>
        <p className="truncate text-[11px] text-ssoo-primary/60">{item.path}</p>
      </button>
    );
  };

  const renderTemplateButton = (template: TemplateItem) => {
    const selected = selectedTemplates.some((item) => item.id === template.id);
    return (
      <button
        key={template.id}
        type="button"
        onClick={() => inlineContext?.onToggleTemplate(template)}
        className={`w-full rounded-md border px-2 py-1.5 text-left transition-colors ${
          selected
            ? 'border-ssoo-primary/45 bg-ssoo-primary/10'
            : 'border-ssoo-primary/20 bg-white hover:border-ssoo-primary/40 hover:bg-ssoo-primary/5'
        }`}
      >
        <p className="truncate text-xs font-medium text-ssoo-primary">{template.name}</p>
        <p className="truncate text-[11px] text-ssoo-primary/60">{template.scope === 'global' ? '공용' : '개인'} · {template.kind === 'document' ? '문서 템플릿' : '폴더 템플릿'}</p>
      </button>
    );
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
                <FileUp className="h-3.5 w-3.5" /> 요약 파일 첨부
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
              {mode === 'inline' ? '템플릿 검색' : '문서 검색'}
            </p>
            <p className="px-1 pb-1 text-xs text-ssoo-primary/60">
              {mode === 'inline'
                ? '검색어를 입력하면 템플릿에서 찾습니다.'
                : '검색어를 입력하면 전체 문서에서 찾습니다.'}
            </p>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ssoo-primary/50" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={mode === 'inline' ? '템플릿 검색...' : '전체 문서 검색...'}
              className="h-9 w-full rounded-md border border-ssoo-primary/25 bg-white pl-7 pr-2 text-xs text-ssoo-primary placeholder:text-ssoo-primary/45 focus:border-ssoo-primary/50 focus:outline-none"
            />
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto">
            {mode === 'assistant' ? (
              <>
                <div className="space-y-1">
                  {query.trim().length === 0 ? null : isLoadingDocs ? (
                    <p className="px-1 py-1 text-xs text-ssoo-primary/60">문서 목록 불러오는 중...</p>
                  ) : searchedAllDocs.length === 0 ? (
                    <p className="px-1 py-1 text-xs text-ssoo-primary/60">검색 결과가 없습니다.</p>
                  ) : (
                    searchedAllDocs.slice(0, 20).map((item) => renderReferenceButton(item, `search-${item.path}`))
                  )}
                </div>

                <div className="border-t border-ssoo-primary/20 pt-2">
                  <p className="px-1 pb-1 text-[11px] font-semibold text-ssoo-primary/70">열린 문서</p>
                  <div className="space-y-1">
                    {openDocs.length === 0
                      ? <p className="px-1 py-1 text-xs text-ssoo-primary/60">현재 열린 문서가 없습니다.</p>
                      : openDocs.map((item) => renderReferenceButton(item, `open-${item.path}`))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="space-y-1">
                    {query.trim().length === 0 ? null : isLoadingTemplates ? (
                      <p className="px-1 py-1 text-xs text-ssoo-primary/60">템플릿 불러오는 중...</p>
                    ) : searchedTemplates.length === 0 ? (
                      <p className="px-1 py-1 text-xs text-ssoo-primary/60">검색 결과가 없습니다.</p>
                    ) : (
                      searchedTemplates.slice(0, 20).map(renderTemplateButton)
                    )}
                  </div>
                </div>

                <div className="border-t border-ssoo-primary/20 pt-2">
                  <p className="px-1 pb-1 text-[11px] font-semibold text-ssoo-primary/70">문서 템플릿</p>
                  <div className="space-y-1">
                    {isLoadingTemplates ? (
                      <p className="px-1 py-1 text-xs text-ssoo-primary/60">템플릿 불러오는 중...</p>
                    ) : documentTemplates.length === 0 ? (
                      <p className="px-1 py-1 text-xs text-ssoo-primary/60">선택 가능한 문서 템플릿이 없습니다.</p>
                    ) : (
                      documentTemplates.map(renderTemplateButton)
                    )}
                  </div>
                </div>

                <div className="border-t border-ssoo-primary/20 pt-2">
                  <p className="px-1 pb-1 text-[11px] font-semibold text-ssoo-primary/70">폴더 템플릿</p>
                  <div className="space-y-1">
                    {isLoadingTemplates ? (
                      <p className="px-1 py-1 text-xs text-ssoo-primary/60">템플릿 불러오는 중...</p>
                    ) : folderTemplates.length === 0 ? (
                      <p className="px-1 py-1 text-xs text-ssoo-primary/60">선택 가능한 폴더 템플릿이 없습니다.</p>
                    ) : (
                      folderTemplates.map(renderTemplateButton)
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AssistantReferenceChips({
  disabled,
  mode = 'assistant',
  inlineTemplates,
  inlineSummaryFiles,
  inlineWarnings,
  onInlineRemoveTemplate,
  onInlineRemoveSummaryFile,
  onInlineClearAll,
}: {
  disabled?: boolean;
  mode?: 'assistant' | 'inline';
  inlineTemplates?: TemplateItem[];
  inlineSummaryFiles?: InlineSummaryFileItem[];
  inlineWarnings?: string[];
  onInlineRemoveTemplate?: (id: string) => void;
  onInlineRemoveSummaryFile?: (id: string) => void;
  onInlineClearAll?: () => void;
}) {
  const assistantReferences = useAssistantStore((state) => state.attachedReferences);
  const removeAssistantReference = useAssistantStore((state) => state.removeReference);
  const clearAssistantReferences = useAssistantStore((state) => state.clearReferences);

  const references = mode === 'assistant' ? assistantReferences : [];
  const templates = mode === 'inline' ? (inlineTemplates ?? []) : [];
  const summaryFiles = mode === 'inline' ? (inlineSummaryFiles ?? []) : [];
  const warnings = mode === 'inline' ? (inlineWarnings ?? []) : [];

  const hasAnyContext = references.length > 0 || templates.length > 0 || summaryFiles.length > 0;
  if (!hasAnyContext) return null;

  const handleClearAll = () => {
    if (mode === 'assistant') {
      clearAssistantReferences();
      return;
    }
    onInlineClearAll?.();
  };

  return (
    <div className="mb-2 rounded-lg border border-ssoo-primary/25 bg-ssoo-content-bg/70 px-2 py-1.5">
      <div className="mb-1 flex items-center gap-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ssoo-primary/80">
          <Paperclip className="h-3.5 w-3.5" />
          첨부 컨텍스트
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={handleClearAll}
          className="ml-1 border-l border-ssoo-primary/20 pl-2 text-[11px] font-semibold text-ssoo-primary opacity-55 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="첨부 컨텍스트 전체 삭제"
        >
          전체 해제
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {references.map((ref) => (
          <span
            key={ref.path}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-ssoo-content-border bg-ssoo-content-border px-2 py-1 text-[11px] text-ssoo-primary"
            title={ref.path}
          >
            <span className="max-w-[180px] truncate">문서: {ref.title}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeAssistantReference(ref.path)}
              className="rounded p-0.5 text-ssoo-primary/70 hover:bg-ssoo-content-border/40 hover:text-ssoo-primary disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={`첨부 해제: ${ref.title}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {templates.map((template) => (
          <span
            key={template.id}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-ssoo-content-border bg-white px-2 py-1 text-[11px] text-ssoo-primary"
            title={template.name}
          >
            {template.kind === 'folder' ? <FolderTree className="h-3 w-3" /> : <Shapes className="h-3 w-3" />}
            <span className="max-w-[180px] truncate">템플릿: {template.name}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onInlineRemoveTemplate?.(template.id)}
              className="rounded p-0.5 text-ssoo-primary/70 hover:bg-ssoo-content-border/40 hover:text-ssoo-primary disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={`템플릿 해제: ${template.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {summaryFiles.map((file) => (
          <span
            key={file.id}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-ssoo-content-border bg-white px-2 py-1 text-[11px] text-ssoo-primary"
            title={file.name}
          >
            <FileUp className="h-3 w-3" />
            <span className="max-w-[180px] truncate">파일: {file.name}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onInlineRemoveSummaryFile?.(file.id)}
              className="rounded p-0.5 text-ssoo-primary/70 hover:bg-ssoo-content-border/40 hover:text-ssoo-primary disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={`파일 해제: ${file.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {warnings.length > 0 && (
        <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
          {warnings.join(' ')}
        </div>
      )}
    </div>
  );
}
