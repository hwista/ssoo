'use client';

import * as React from 'react';
import { Check, CornerDownRight, FileText, Globe, ImageIcon, Link2, Plus, Sparkles, Tag, X } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/StateDisplay';
import { ActivityListSection, ChipListSection, TextSection } from '@/components/templates/page-frame/sidecar';
import type { ActivityAction } from '@/components/templates/page-frame/sidecar';
import { docAssistApi } from '@/lib/api/endpoints/ai';
import { isExternalUrl } from '@/lib/utils/linkUtils';
import type { BodyLink } from '@/types';

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
  /** 외부에서 주입된 AI 추천 태그 (compose 후 자동 트리거) */
  externalSuggestedTags?: string[];
  externalLoading?: boolean;
  /** 외부 추천 태그가 소비(표시)된 후 호출 */
  onExternalSuggestedTagsConsumed?: () => void;
}) {
  const [inputValue, setInputValue] = React.useState('');
  const [suggestedTags, setSuggestedTags] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [pendingDeletes, setPendingDeletes] = React.useState<Set<string>>(new Set());

  // 외부에서 주입된 태그 제안 반영
  React.useEffect(() => {
    if (externalSuggestedTags && externalSuggestedTags.length > 0) {
      const newSuggestions = externalSuggestedTags.filter((t) => !tags.includes(t));
      if (newSuggestions.length > 0) {
        setSuggestedTags(newSuggestions);
      }
      onExternalSuggestedTagsConsumed?.();
    }
  }, [externalSuggestedTags, tags, onExternalSuggestedTagsConsumed]);

  const highlightedTagIds = React.useMemo(() => {
    if (!originalTags || !editable) return undefined;
    const originalSet = new Set(originalTags);
    const ids = new Set<string>();
    for (const tag of tags) {
      if (!originalSet.has(tag) && !pendingDeletes.has(tag)) ids.add(tag);
    }
    return ids.size > 0 ? ids : undefined;
  }, [tags, originalTags, editable, pendingDeletes]);

  const handleSoftDelete = (chip: { id: string }) => {
    setPendingDeletes((prev) => new Set(prev).add(chip.id));
    onChange(tags.filter((t) => t !== chip.id));
  };

  const handleRestore = (chip: { id: string }) => {
    setPendingDeletes((prev) => {
      const next = new Set(prev);
      next.delete(chip.id);
      return next;
    });
    // 부모 데이터에 다시 추가
    if (!tags.includes(chip.id)) {
      onChange([...tags, chip.id]);
    }
  };

  // 삭제된 태그를 포함한 전체 칩 목록 (삭제된 것도 보여주기 위해)
  const allChips = React.useMemo(() => {
    const existing = tags.map((tag) => ({ id: tag, label: tag }));
    const deletedOnly = Array.from(pendingDeletes)
      .filter((tag) => !tags.includes(tag))
      .map((tag) => ({ id: tag, label: tag }));
    return [...existing, ...deletedOnly];
  }, [tags, pendingDeletes]);

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputValue('');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAdd();
    }
  };

  const handleAcceptSuggested = (tag: string) => {
    if (!tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setSuggestedTags((prev) => prev.filter((t) => t !== tag));
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
          .map((t: string) => t.replace(/^[#\-*\s]+/, '').trim())
          .filter((t: string) => t.length > 0 && !tags.includes(t));
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
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-ssoo-primary/40 bg-ssoo-primary/5 px-2.5 py-1 text-caption text-ssoo-primary/70 transition-colors hover:border-ssoo-primary hover:bg-ssoo-primary/10 hover:text-ssoo-primary"
              title={`"${tag}" 태그 추가`}
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
            onKeyDown={handleKeyDown}
            placeholder="태그 추가..."
            className="h-7 flex-1 rounded border border-ssoo-content-border bg-transparent px-2 text-caption text-ssoo-primary focus:border-ssoo-primary focus:outline-none"
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

export function SummarySection({
  editable,
  summary,
  onChange,
  onSummaryReplace,
  getEditorContent,
  originalSummary,
  externalAiSuggestion,
  externalLoading = false,
  onExternalAiSuggestionConsumed,
}: {
  editable: boolean;
  summary: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSummaryReplace?: (text: string) => void;
  getEditorContent?: () => string;
  originalSummary?: string;
  /** 외부에서 주입된 AI 요약 제안 (compose 후 자동 트리거) */
  externalAiSuggestion?: string | null;
  externalLoading?: boolean;
  /** 외부 요약 제안이 소비(표시)된 후 호출 */
  onExternalAiSuggestionConsumed?: () => void;
}) {
  const [aiSuggestion, setAiSuggestion] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // 외부에서 주입된 요약 제안 반영
  React.useEffect(() => {
    if (externalAiSuggestion && externalAiSuggestion.trim()) {
      setAiSuggestion(externalAiSuggestion);
      onExternalAiSuggestionConsumed?.();
    }
  }, [externalAiSuggestion, onExternalAiSuggestionConsumed]);

  const handleWand = async () => {
    if (externalLoading) return;
    const content = getEditorContent?.() ?? '';
    if (!content.trim()) return;

    setIsLoading(true);
    setAiSuggestion(null);
    try {
      const res = await docAssistApi.compose({
        instruction: '다음 문서의 핵심 내용을 2~3문장으로 요약하세요. 요약문만 출력하세요.',
        currentContent: content,
      });
      if (res.data?.text) {
        setAiSuggestion(res.data.text.trim());
      }
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  };

  const isWandLoading = isLoading || externalLoading;

  const handleAppend = () => {
    if (!aiSuggestion) return;
    const newSummary = summary ? `${summary}\n${aiSuggestion}` : aiSuggestion;
    onSummaryReplace?.(newSummary);
    setAiSuggestion(null);
  };

  const handleReplace = () => {
    if (!aiSuggestion) return;
    onSummaryReplace?.(aiSuggestion);
    setAiSuggestion(null);
  };

  const handleDismiss = () => {
    setAiSuggestion(null);
  };

  const wandButton = editable && getEditorContent
    ? <WandButton loading={isWandLoading} onClick={handleWand} label="AI 요약 생성" />
    : undefined;
  const isChanged = editable && originalSummary !== undefined && summary !== originalSummary;

  if (editable) {
    return (
      <TextSection
        title="요약"
        icon={<FileText className="mr-1.5 h-4 w-4 shrink-0" />}
        headerRight={wandButton}
        content={
          <div className="space-y-2">
            <textarea
              value={summary}
              onChange={onChange}
              placeholder="문서 요약을 입력하세요..."
              rows={3}
              className={[
                'w-full resize-y rounded border px-2 py-1.5 text-caption leading-relaxed text-ssoo-primary focus:outline-none',
                isChanged
                  ? 'border-destructive/30 bg-destructive/5 focus:border-destructive/40'
                  : 'border-ssoo-content-border bg-transparent focus:border-ssoo-primary',
              ].join(' ')}
            />
            {aiSuggestion && (
              <div className="rounded border border-dashed border-ssoo-primary/30 bg-ssoo-primary/5 p-2">
                <p className="mb-2 text-caption leading-relaxed text-ssoo-primary/80 whitespace-pre-wrap">{aiSuggestion}</p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleAppend}
                    className="inline-flex items-center gap-1 rounded bg-ssoo-primary/10 px-2 py-0.5 text-caption text-ssoo-primary transition-colors hover:bg-ssoo-primary/20"
                  >
                    <Plus className="h-3 w-3" />
                    덧붙이기
                  </button>
                  <button
                    type="button"
                    onClick={handleReplace}
                    className="inline-flex items-center gap-1 rounded bg-ssoo-primary/10 px-2 py-0.5 text-caption text-ssoo-primary transition-colors hover:bg-ssoo-primary/20"
                  >
                    <Check className="h-3 w-3" />
                    변경
                  </button>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-caption text-ssoo-primary/60 transition-colors hover:text-ssoo-primary"
                  >
                    <X className="h-3 w-3" />
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        }
      />
    );
  }

  return (
    <TextSection
      title="요약"
      icon={<FileText className="mr-1.5 h-4 w-4 shrink-0" />}
      text={summary}
      emptyText="요약없음"
    />
  );
}

export function SourceLinksSection({
  editable,
  sourceLinks,
  onChange,
  originalSourceLinks,
  bodyLinks = [],
  onScrollToBodyLink,
  onOpenLink,
  defaultOpen = true,
}: {
  editable: boolean;
  sourceLinks: string[];
  onChange: (links: string[]) => void;
  originalSourceLinks?: string[];
  bodyLinks?: BodyLink[];
  onScrollToBodyLink?: (url: string) => void;
  onOpenLink?: (url: string, type?: 'link' | 'image') => void;
  defaultOpen?: boolean;
}) {
  const [inputValue, setInputValue] = React.useState('');
  const [pendingDeletes, setPendingDeletes] = React.useState<Set<string>>(new Set());

  const bodyLinkUrlSet = React.useMemo(
    () => new Set(bodyLinks.map((l) => l.url)),
    [bodyLinks],
  );

  const newLinkSet = React.useMemo(() => {
    if (!originalSourceLinks || !editable) return undefined;
    const originalSet = new Set(originalSourceLinks);
    const ids = new Set<string>();
    for (const link of sourceLinks) {
      if (!originalSet.has(link) && !pendingDeletes.has(link)) ids.add(link);
    }
    return ids.size > 0 ? ids : undefined;
  }, [sourceLinks, originalSourceLinks, editable, pendingDeletes]);

  const handleSoftDelete = (link: string) => {
    setPendingDeletes((prev) => new Set(prev).add(link));
    onChange(sourceLinks.filter((l) => l !== link));
  };

  const handleRestore = (item: { id: string }) => {
    setPendingDeletes((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
    if (!sourceLinks.includes(item.id)) {
      onChange([...sourceLinks, item.id]);
    }
  };

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !sourceLinks.includes(trimmed)) {
      onChange([...sourceLinks, trimmed]);
      setInputValue('');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAdd();
    }
  };

  // 내부 문서 링크 여부 판별 (공용 유틸리티 사용)
  const isInternalLink = React.useCallback((url: string) => {
    return !isExternalUrl(url);
  }, []);

  // 수동 링크 (삭제된 것 포함, 본문 링크와 중복 제외)
  const manualLinks = React.useMemo(() => {
    const deletedOnly = Array.from(pendingDeletes).filter((l) => !sourceLinks.includes(l));
    const active = sourceLinks.filter((l) => !bodyLinkUrlSet.has(l));
    return [...active, ...deletedOnly];
  }, [sourceLinks, pendingDeletes, bodyLinkUrlSet]);

  // 본문 링크 아이템 (본문 위치 이동 아이콘, 삭제 불가)
  const bodyItems = bodyLinks.map((link) => {
    const isInternal = isInternalLink(link.url);
    const iconEl = link.type === 'image'
      ? <ImageIcon className="h-3 w-3 shrink-0 text-ssoo-primary/50" />
      : isInternal
        ? <FileText className="h-3 w-3 shrink-0 text-ssoo-primary/50" />
        : <Globe className="h-3 w-3 shrink-0 text-ssoo-primary/50" />;
    return {
      id: `body:${link.url}`,
      title: link.label,
      icon: iconEl,
      actions: [{
        id: `goto-${link.url}`,
        kind: 'icon' as const,
        tone: 'default' as const,
        icon: <CornerDownRight className="h-3 w-3" />,
        title: '본문에서 찾기',
        onClick: () => onScrollToBodyLink?.(link.url),
      }],
    };
  });

  // 수동 링크 아이템 (X 아이콘, 삭제 가능)
  const manualItems = manualLinks.map((link) => {
    const isDeleted = pendingDeletes.has(link);
    const isInternal = isInternalLink(link);
    const actions: ActivityAction[] = !isDeleted && editable
      ? [{ id: `delete-${link}`, kind: 'icon', tone: 'danger', icon: <X className="h-3 w-3" />, title: '링크 삭제', onClick: () => handleSoftDelete(link) }]
      : [];
    return {
      id: link,
      title: link,
      icon: isInternal
        ? <FileText className="h-3 w-3 shrink-0 text-ssoo-primary/50" />
        : <Globe className="h-3 w-3 shrink-0 text-ssoo-primary/50" />,
      actions,
    };
  });

  const items = [...bodyItems, ...manualItems];

  const manualDeletedIds = React.useMemo(() => {
    if (pendingDeletes.size === 0) return undefined;
    return pendingDeletes;
  }, [pendingDeletes]);

  return (
    <ActivityListSection
      title="링크"
      icon={<Link2 className="mr-1.5 h-4 w-4 shrink-0" />}
      badge={items.length > 0 ? <span className="mr-1 text-caption text-gray-400">({items.length})</span> : undefined}
      items={items}
      highlightedItemIds={newLinkSet}
      deletedItemIds={manualDeletedIds}
      onItemRestore={handleRestore}
      onItemClick={(item) => {
        if (pendingDeletes.has(item.id)) return;
        const isBody = item.id.startsWith('body:');
        const url = isBody ? item.id.slice(5) : item.title;
        const bodyLink = isBody ? bodyLinks.find((l) => l.url === url) : undefined;
        onOpenLink?.(url, bodyLink?.type);
      }}
      emptyText="링크없음"
      variant="compact"
      itemAppearance="link"
      defaultOpen={defaultOpen}
    >
      {editable && (
        <div className="flex gap-1 pt-2">
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="링크 추가..."
            className="h-7 flex-1 rounded border border-ssoo-content-border bg-transparent px-2 text-caption text-ssoo-primary focus:border-ssoo-primary focus:outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!inputValue.trim()}
            className="flex h-7 items-center p-1 text-ssoo-primary/60 transition-colors hover:text-ssoo-primary disabled:opacity-30"
            aria-label="링크 추가"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </ActivityListSection>
  );
}
