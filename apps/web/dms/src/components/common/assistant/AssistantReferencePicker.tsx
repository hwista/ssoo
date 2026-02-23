'use client';

import { useEffect, useMemo, useState } from 'react';
import { Paperclip, Plus, Search, X } from 'lucide-react';
import { useAssistantStore, useTabStore } from '@/stores';
import { filesApi } from '@/lib/utils/apiClient';
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

export function AssistantReferencePicker({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [allDocs, setAllDocs] = useState<Array<{ path: string; title: string }>>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const tabs = useTabStore((state) => state.tabs);
  const attachedReferences = useAssistantStore((state) => state.attachedReferences);
  const toggleReference = useAssistantStore((state) => state.toggleReference);

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

  useEffect(() => {
    if (!open || allDocs.length > 0) return;

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
  }, [allDocs.length, open]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ssoo-primary text-white shadow-sm transition-colors hover:bg-ssoo-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          title="파일 첨부"
          aria-label="파일 첨부"
        >
          <Plus className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-[360px] border-ssoo-primary/20 bg-white p-2 text-ssoo-primary shadow-lg"
        data-assistant-dropdown="true"
      >
        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ssoo-primary/50" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="전체 문서 검색..."
              className="h-9 w-full rounded-md border border-ssoo-primary/25 bg-white pl-7 pr-2 text-xs text-ssoo-primary placeholder:text-ssoo-primary/45 focus:border-ssoo-primary/50 focus:outline-none"
            />
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            <div>
              <p className="px-1 pb-1 text-[11px] font-semibold text-ssoo-primary/70">문서 검색</p>
              <div className="space-y-1">
                {query.trim().length === 0 ? (
                  <p className="px-1 py-1 text-xs text-ssoo-primary/60">검색어를 입력하면 전체 문서에서 찾습니다.</p>
                ) : isLoadingDocs ? (
                  <p className="px-1 py-1 text-xs text-ssoo-primary/60">문서 목록 불러오는 중...</p>
                ) : searchedAllDocs.length === 0 ? (
                  <p className="px-1 py-1 text-xs text-ssoo-primary/60">검색 결과가 없습니다.</p>
                ) : (
                  searchedAllDocs.slice(0, 20).map((item) => {
                    const attached = attachedReferences.some((ref) => ref.path === item.path);
                    return (
                      <button
                        key={`search-${item.path}`}
                        type="button"
                        onClick={() => toggleReference(item)}
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
                  })
                )}
              </div>
            </div>

            <div className="border-t border-ssoo-primary/20 pt-2">
              <p className="px-1 pb-1 text-[11px] font-semibold text-ssoo-primary/70">열린 문서</p>
              <div className="space-y-1">
                {openDocs.length === 0 ? (
                  <p className="px-1 py-1 text-xs text-ssoo-primary/60">현재 열린 문서가 없습니다.</p>
                ) : (
                  openDocs.map((item) => {
                    const attached = attachedReferences.some((ref) => ref.path === item.path);
                    return (
                      <button
                        key={`open-${item.path}`}
                        type="button"
                        onClick={() => toggleReference(item)}
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
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AssistantReferenceChips({ disabled }: { disabled?: boolean }) {
  const attachedReferences = useAssistantStore((state) => state.attachedReferences);
  const removeReference = useAssistantStore((state) => state.removeReference);

  if (attachedReferences.length === 0) return null;

  return (
    <div className="mb-2 rounded-lg border border-ssoo-primary/25 bg-ssoo-content-bg/70 px-2 py-1.5">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-ssoo-primary/80">
        <Paperclip className="h-3.5 w-3.5" />
        첨부 문서
      </div>
      <div className="flex flex-wrap gap-1.5">
        {attachedReferences.map((ref) => (
          <span
            key={ref.path}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-ssoo-content-border bg-ssoo-content-border px-2 py-1 text-[11px] text-ssoo-primary"
            title={ref.path}
          >
            <span className="max-w-[180px] truncate">{ref.title}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeReference(ref.path)}
              className="rounded p-0.5 text-ssoo-primary/70 hover:bg-ssoo-content-border/40 hover:text-ssoo-primary disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={`첨부 해제: ${ref.title}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
