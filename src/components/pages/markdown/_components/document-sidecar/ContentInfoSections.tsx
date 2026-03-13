'use client';

import * as React from 'react';
import { FileText, Link2, Tag } from 'lucide-react';
import { ActivityListSection, ChipListSection, CollapsibleSection, TextSection } from '@/components/templates/page-frame/sidecar';
import { EditableSourceLinks, EditableTags } from './EditableFields';

export function TagsSection({
  editable,
  tags,
  onChange,
}: {
  editable: boolean;
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  if (editable) {
    return (
      <CollapsibleSection icon={<Tag className="mr-1.5 h-4 w-4 shrink-0" />} title="태그">
        <EditableTags tags={tags} onChange={onChange} />
      </CollapsibleSection>
    );
  }

  return (
    <ChipListSection
      title="태그"
      icon={<Tag className="mr-1.5 h-4 w-4 shrink-0" />}
      chips={tags.map((tag) => ({ id: tag, label: tag }))}
      emptyText="태그없음"
    />
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
  if (editable) {
    return (
      <CollapsibleSection icon={<Link2 className="mr-1.5 h-4 w-4 shrink-0" />} title="url">
        <EditableSourceLinks links={sourceLinks} onChange={onChange} />
      </CollapsibleSection>
    );
  }

  return (
    <ActivityListSection
      title="url"
      icon={<Link2 className="mr-1.5 h-4 w-4 shrink-0" />}
      items={sourceLinks.map((link) => ({ id: link, title: link }))}
      onItemClick={(item) => window.open(item.title, '_blank', 'noopener,noreferrer')}
      emptyText="링크없음"
      variant="compact"
      itemAppearance="link"
    />
  );
}
