'use client';

import * as React from 'react';
import { FileText, Link2, Loader2, Plus, Sparkles, Tag, X } from 'lucide-react';
import { ActivityListSection, ChipListSection, TextSection } from '@/components/templates/page-frame/sidecar';
import type { ActivityAction } from '@/components/templates/page-frame/sidecar';
import { docAssistApi } from '@/lib/api';

function WandButton({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="p-0.5 text-ssoo-primary/40 transition-colors hover:text-ssoo-primary disabled:opacity-40"
      aria-label={label}
      title={label}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
    </button>
  );
}

export function TagsSection({
  editable,
  tags,
  onChange,
  getEditorContent,
}: {
  editable: boolean;
  tags: string[];
  onChange: (tags: string[]) => void;
  getEditorContent?: () => string;
}) {
  const [inputValue, setInputValue] = React.useState('');
  const [suggestedTags, setSuggestedTags] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

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

  return (
    <ChipListSection
      title="태그"
      icon={<Tag className="mr-1.5 h-4 w-4 shrink-0" />}
      headerRight={editable && getEditorContent ? <WandButton loading={isLoading} onClick={handleWand} label="AI 태그 추천" /> : undefined}
      chips={tags.map((tag) => ({ id: tag, label: tag }))}
      emptyText="태그없음"
      onChipRemove={editable ? (chip) => onChange(tags.filter((t) => t !== chip.id)) : undefined}
    >
      {suggestedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2">
          {suggestedTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleAcceptSuggested(tag)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-ssoo-primary/40 bg-ssoo-primary/5 px-2.5 py-1 text-xs text-ssoo-primary/70 transition-colors hover:border-ssoo-primary hover:bg-ssoo-primary/10 hover:text-ssoo-primary"
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
            className="flex-1 rounded border border-ssoo-content-border bg-transparent px-2 py-1 text-xs text-ssoo-primary focus:border-ssoo-primary focus:outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!inputValue.trim()}
            className="p-1 text-ssoo-primary/60 transition-colors hover:text-ssoo-primary disabled:opacity-30"
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
}: {
  editable: boolean;
  summary: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSummaryReplace?: (text: string) => void;
  getEditorContent?: () => string;
}) {
  const [aiSuggestion, setAiSuggestion] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleWand = async () => {
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
    ? <WandButton loading={isLoading} onClick={handleWand} label="AI 요약 생성" />
    : undefined;

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
              className="w-full resize-none rounded border border-ssoo-content-border bg-transparent px-2 py-1.5 text-xs text-ssoo-primary focus:border-ssoo-primary focus:outline-none"
            />
            {aiSuggestion && (
              <div className="rounded border border-dashed border-ssoo-primary/30 bg-ssoo-primary/5 p-2">
                <p className="mb-2 text-xs leading-relaxed text-ssoo-primary/80 whitespace-pre-wrap">{aiSuggestion}</p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleAppend}
                    className="rounded bg-ssoo-primary/10 px-2 py-0.5 text-[11px] text-ssoo-primary transition-colors hover:bg-ssoo-primary/20"
                  >
                    추가
                  </button>
                  <button
                    type="button"
                    onClick={handleReplace}
                    className="rounded bg-ssoo-primary/10 px-2 py-0.5 text-[11px] text-ssoo-primary transition-colors hover:bg-ssoo-primary/20"
                  >
                    변경
                  </button>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="rounded px-2 py-0.5 text-[11px] text-ssoo-primary/60 transition-colors hover:text-ssoo-primary"
                  >
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
}: {
  editable: boolean;
  sourceLinks: string[];
  onChange: (links: string[]) => void;
}) {
  const [inputValue, setInputValue] = React.useState('');

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

  const items = sourceLinks.map((link) => {
    const actions: ActivityAction[] = editable
      ? [{ id: `delete-${link}`, kind: 'icon', tone: 'danger', icon: <X className="h-3 w-3" />, title: '링크 삭제', onClick: () => onChange(sourceLinks.filter((l) => l !== link)) }]
      : [];
    return { id: link, title: link, actions };
  });

  return (
    <ActivityListSection
      title="url"
      icon={<Link2 className="mr-1.5 h-4 w-4 shrink-0" />}
      items={items}
      onItemClick={(item) => window.open(item.title, '_blank', 'noopener,noreferrer')}
      emptyText="링크없음"
      variant="compact"
      itemAppearance="link"
    >
      {editable && (
        <div className="flex gap-1 pt-1">
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="URL 추가..."
            className="flex-1 rounded border border-ssoo-content-border bg-transparent px-2 py-1 text-xs text-ssoo-primary focus:border-ssoo-primary focus:outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!inputValue.trim()}
            className="p-1 text-ssoo-primary/60 transition-colors hover:text-ssoo-primary disabled:opacity-30"
            aria-label="링크 추가"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </ActivityListSection>
  );
}
