'use client';

import * as React from 'react';
import { FileText, Link2, Tag } from 'lucide-react';
import { ChipListSection, CollapsibleSection, TextSection } from '@/components/templates/page-frame/sidecar';
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
      <CollapsibleSection icon={<FileText className="mr-1.5 h-4 w-4 shrink-0" />} title="요약">
        <textarea
          value={summary}
          onChange={onChange}
          placeholder="문서 요약을 입력하세요..."
          rows={3}
          className="w-full resize-none rounded border border-ssoo-content-border bg-transparent px-2 py-1.5 text-xs text-ssoo-primary focus:border-ssoo-primary focus:outline-none"
        />
      </CollapsibleSection>
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
  return (
    <CollapsibleSection icon={<Link2 className="mr-1.5 h-4 w-4 shrink-0" />} title="url">
      {editable ? (
        <EditableSourceLinks links={sourceLinks} onChange={onChange} />
      ) : sourceLinks.length > 0 ? (
        <div className="space-y-1">
          {sourceLinks.map((link) => (
            <a
              key={link}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-xs text-blue-500 hover:underline"
            >
              {link}
            </a>
          ))}
        </div>
      ) : (
        <p className="py-1 text-xs text-gray-400">링크없음</p>
      )}
    </CollapsibleSection>
  );
}
