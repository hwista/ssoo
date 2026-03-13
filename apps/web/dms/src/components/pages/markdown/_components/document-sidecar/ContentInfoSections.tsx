'use client';

import * as React from 'react';
import { FileText, Link2, Plus, Tag, X } from 'lucide-react';
import { ActivityListSection, ChipListSection, TextSection } from '@/components/templates/page-frame/sidecar';
import type { ActivityAction } from '@/components/templates/page-frame/sidecar';

export function TagsSection({
  editable,
  tags,
  onChange,
}: {
  editable: boolean;
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [inputValue, setInputValue] = React.useState('');

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

  return (
    <ChipListSection
      title="태그"
      icon={<Tag className="mr-1.5 h-4 w-4 shrink-0" />}
      chips={tags.map((tag) => ({ id: tag, label: tag }))}
      emptyText="태그없음"
      onChipRemove={editable ? (chip) => onChange(tags.filter((t) => t !== chip.id)) : undefined}
    >
      {editable && (
        <div className="flex gap-1 pt-1">
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
}: {
  editable: boolean;
  summary: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  if (editable) {
    return (
      <TextSection
        title="요약"
        icon={<FileText className="mr-1.5 h-4 w-4 shrink-0" />}
        content={
          <textarea
            value={summary}
            onChange={onChange}
            placeholder="문서 요약을 입력하세요..."
            rows={3}
            className="w-full resize-none rounded border border-ssoo-content-border bg-transparent px-2 py-1.5 text-xs text-ssoo-primary focus:border-ssoo-primary focus:outline-none"
          />
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
