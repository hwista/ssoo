'use client';

import * as React from 'react';
import { FileText, Link2, Tag } from 'lucide-react';
import { CollapsibleSection } from '@/components/templates/page-frame/sidecar';
import { EditableSourceLinks, EditableTags } from './editable-fields';

function EmptyPlaceholder({ text }: { text: string }) {
  return <p className="py-1 text-xs text-gray-400">{text}</p>;
}

export function TagsSection({
  editable,
  tags,
  onChange,
}: {
  editable: boolean;
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  return (
    <CollapsibleSection icon={<Tag className="mr-1.5 h-4 w-4 shrink-0" />} title="태그">
      {editable ? (
        <EditableTags tags={tags} onChange={onChange} />
      ) : tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-ssoo-content-border px-2 py-0.5 text-xs text-ssoo-primary">
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <EmptyPlaceholder text="태그없음" />
      )}
    </CollapsibleSection>
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
  return (
    <CollapsibleSection icon={<FileText className="mr-1.5 h-4 w-4 shrink-0" />} title="요약">
      {editable ? (
        <textarea
          value={summary}
          onChange={onChange}
          placeholder="문서 요약을 입력하세요..."
          rows={3}
          className="w-full resize-none rounded border border-ssoo-content-border bg-transparent px-2 py-1.5 text-xs text-ssoo-primary focus:border-ssoo-primary focus:outline-none"
        />
      ) : summary ? (
        <p className="leading-relaxed text-xs text-ssoo-primary/80">{summary}</p>
      ) : (
        <EmptyPlaceholder text="요약없음" />
      )}
    </CollapsibleSection>
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
        <EmptyPlaceholder text="링크없음" />
      )}
    </CollapsibleSection>
  );
}
