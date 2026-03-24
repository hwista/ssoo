'use client';

import * as React from 'react';
import { Plus, Sparkles, Tag } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/StateDisplay';
import { ChipListSection } from '@/components/templates/page-frame/sidecar';
import { docAssistApi } from '@/lib/api';

function WandButton({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="rounded p-1 text-ssoo-primary/50 transition-all hover:bg-black/5 hover:text-ssoo-primary disabled:opacity-40"
      aria-label={label}
      title={label}
    >
      {loading ? <LoadingSpinner className="h-3.5 w-3.5 text-current" /> : <Sparkles className="h-3.5 w-3.5" />}
    </button>
  );
}

export function TagsSection({
  editable,
  tags,
  onChange,
  getEditorContent,
  originalTags,
  externalSuggestedTags,
  externalLoading = false,
  onExternalSuggestedTagsConsumed,
}: {
  editable: boolean;
  tags: string[];
  onChange: (tags: string[]) => void;
  getEditorContent?: () => string;
  originalTags?: string[];
  externalSuggestedTags?: string[];
  externalLoading?: boolean;
  onExternalSuggestedTagsConsumed?: () => void;
}) {
  const [inputValue, setInputValue] = React.useState('');
  const [suggestedTags, setSuggestedTags] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [pendingDeletes, setPendingDeletes] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (externalSuggestedTags && externalSuggestedTags.length > 0) {
      const nextSuggestions = externalSuggestedTags.filter((tag) => !tags.includes(tag));
      if (nextSuggestions.length > 0) {
        setSuggestedTags(nextSuggestions);
      }
      onExternalSuggestedTagsConsumed?.();
    }
  }, [externalSuggestedTags, onExternalSuggestedTagsConsumed, tags]);

  const highlightedTagIds = React.useMemo(() => {
    if (!originalTags || !editable) return undefined;
    const originalSet = new Set(originalTags);
    const ids = new Set<string>();
    for (const tag of tags) {
      if (!originalSet.has(tag) && !pendingDeletes.has(tag)) ids.add(tag);
    }
    return ids.size > 0 ? ids : undefined;
  }, [editable, originalTags, pendingDeletes, tags]);

  const handleSoftDelete = (chip: { id: string }) => {
    setPendingDeletes((prev) => new Set(prev).add(chip.id));
    onChange(tags.filter((tag) => tag !== chip.id));
  };

  const handleRestore = (chip: { id: string }) => {
    setPendingDeletes((prev) => {
      const next = new Set(prev);
      next.delete(chip.id);
      return next;
    });
    if (!tags.includes(chip.id)) {
      onChange([...tags, chip.id]);
    }
  };

  const allChips = React.useMemo(() => {
    const existing = tags.map((tag) => ({ id: tag, label: tag }));
    const deletedOnly = Array.from(pendingDeletes)
      .filter((tag) => !tags.includes(tag))
      .map((tag) => ({ id: tag, label: tag }));
    return [...existing, ...deletedOnly];
  }, [pendingDeletes, tags]);

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputValue('');
    }
  };

  const handleAcceptSuggested = (tag: string) => {
    if (!tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setSuggestedTags((prev) => prev.filter((item) => item !== tag));
  };

  const handleWand = async () => {
    if (externalLoading) return;
    const content = getEditorContent?.() ?? '';
    if (!content.trim()) return;

    setIsLoading(true);
    setSuggestedTags([]);
    try {
      const res = await docAssistApi.compose({
        instruction: '다음 문서를 대표하는 핵심 태그를 5개 이내로 추출하세요. 태그만 쉼표로 구분하여 반환하세요. 다른 설명 없이 태그만 출력하세요.',
        currentContent: content,
      });
      if (res.data?.text) {
        const parsed = res.data.text
          .split(/[,،、\n]+/)
          .map((tag: string) => tag.replace(/^[#\-*\s]+/, '').trim())
          .filter((tag: string) => tag.length > 0 && !tags.includes(tag));
        setSuggestedTags(parsed);
      }
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  };

  const isWandLoading = isLoading || externalLoading;

  return (
    <ChipListSection
      title="태그"
      icon={<Tag className="mr-1.5 h-4 w-4 shrink-0" />}
      headerRight={editable && getEditorContent ? <WandButton loading={isWandLoading} onClick={handleWand} label="AI 태그 추천" /> : undefined}
      chips={allChips}
      highlightedChipIds={highlightedTagIds}
      deletedChipIds={pendingDeletes.size > 0 ? pendingDeletes : undefined}
      emptyText="태그없음"
      onChipRemove={editable ? handleSoftDelete : undefined}
      onChipRestore={editable ? handleRestore : undefined}
    >
      {suggestedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2">
          {suggestedTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleAcceptSuggested(tag)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-ssoo-primary/40 bg-ssoo-primary/5 px-2.5 py-1 text-xs text-ssoo-primary/70 transition-colors hover:border-ssoo-primary hover:bg-ssoo-primary/10 hover:text-ssoo-primary"
              title={`\"${tag}\" 태그 추가`}
            >
              <Plus className="h-3 w-3" />
              {tag}
            </button>
          ))}
        </div>
      )}
      {editable && (
        <div className="flex gap-1 pt-2">
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleAdd();
              }
            }}
            placeholder="태그 추가..."
            className="h-7 flex-1 rounded border border-ssoo-content-border bg-transparent px-2 text-xs text-ssoo-primary focus:border-ssoo-primary focus:outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!inputValue.trim()}
            className="flex h-7 items-center p-1 text-ssoo-primary/60 transition-colors hover:text-ssoo-primary disabled:opacity-30"
            aria-label="태그 추가"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </ChipListSection>
  );
}
