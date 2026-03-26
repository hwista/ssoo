'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { markdownToHtmlSync } from '@/lib/utils/markdown';
import type { EditorCommandDefinition, ToolbarCommandId } from '../Toolbar';

interface BlockEditorPreviewProps {
  markdown: string;
  onModifiedClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export function BlockEditorPreview({
  markdown,
  onModifiedClick,
}: BlockEditorPreviewProps) {
  return (
    <div className="h-full overflow-auto px-8 py-6" onClick={onModifiedClick}>
      <div
        className={cn(
          'prose prose-base max-w-none font-sans',
          'prose-headings:scroll-mt-4',
          'prose-p:my-2 prose-p:leading-relaxed prose-li:leading-relaxed',
          'prose-pre:bg-ssoo-content-bg prose-pre:text-ssoo-primary prose-pre:border-0 prose-pre:font-mono',
          'prose-code:text-ssoo-primary prose-code:bg-ssoo-content-bg prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border-0 prose-code:font-mono'
        )}
        dangerouslySetInnerHTML={{ __html: markdownToHtmlSync(markdown) }}
      />
    </div>
  );
}

interface SlashCommandMenuProps {
  open: boolean;
  items: EditorCommandDefinition[];
  selectedIndex: number;
  position: { top: number; left: number } | null;
  itemRefs: React.MutableRefObject<Array<HTMLButtonElement | null>>;
  onSelect: (id: ToolbarCommandId) => void;
}

export function SlashCommandMenu({
  open,
  items,
  selectedIndex,
  position,
  itemRefs,
  onSelect,
}: SlashCommandMenuProps) {
  if (!open || items.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute z-50 max-h-72 w-[320px] overflow-y-auto rounded-lg border border-ssoo-content-border bg-white shadow-lg"
      style={position ? { top: position.top, left: position.left } : { top: 48, left: 32 }}
    >
      {items.map((item, index) => (
        <button
          key={item.id}
          ref={(element) => {
            itemRefs.current[index] = element;
          }}
          type="button"
          className={`flex w-full items-center gap-3 px-3 py-2 text-left ${
            index === selectedIndex
              ? 'bg-ssoo-content-border text-ssoo-primary'
              : 'text-ssoo-primary hover:bg-ssoo-sitemap-bg'
          }`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(item.id)}
        >
          <span className="flex w-8 items-center justify-center text-ssoo-primary/80">
            <item.icon className="h-4 w-4" />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{item.title}</span>
            <span className="text-xs text-ssoo-primary/60">{item.description}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
