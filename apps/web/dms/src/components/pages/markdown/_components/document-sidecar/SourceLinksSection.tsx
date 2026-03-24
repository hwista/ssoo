'use client';

import * as React from 'react';
import { CornerDownRight, FileText, Globe, ImageIcon, Link2, Plus, X } from 'lucide-react';
import { ActivityListSection, type ActivityAction } from '@/components/templates/page-frame/sidecar';
import { isExternalUrl } from '@/lib/utils/linkUtils';
import type { BodyLink } from '@/types';

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

  const bodyLinkUrlSet = React.useMemo(() => new Set(bodyLinks.map((link) => link.url)), [bodyLinks]);

  const newLinkSet = React.useMemo(() => {
    if (!originalSourceLinks || !editable) return undefined;
    const originalSet = new Set(originalSourceLinks);
    const ids = new Set<string>();
    for (const link of sourceLinks) {
      if (!originalSet.has(link) && !pendingDeletes.has(link)) ids.add(link);
    }
    return ids.size > 0 ? ids : undefined;
  }, [editable, originalSourceLinks, pendingDeletes, sourceLinks]);

  const manualLinks = React.useMemo(() => {
    const deletedOnly = Array.from(pendingDeletes).filter((link) => !sourceLinks.includes(link));
    const active = sourceLinks.filter((link) => !bodyLinkUrlSet.has(link));
    return [...active, ...deletedOnly];
  }, [bodyLinkUrlSet, pendingDeletes, sourceLinks]);

  const bodyItems = bodyLinks.map((link) => {
    const isInternal = !isExternalUrl(link.url);
    const icon = link.type === 'image'
      ? <ImageIcon className="h-3 w-3 shrink-0 text-ssoo-primary/50" />
      : isInternal
        ? <FileText className="h-3 w-3 shrink-0 text-ssoo-primary/50" />
        : <Globe className="h-3 w-3 shrink-0 text-ssoo-primary/50" />;
    return {
      id: `body:${link.url}`,
      title: link.label,
      icon,
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

  const manualItems = manualLinks.map((link) => {
    const isDeleted = pendingDeletes.has(link);
    const isInternal = !isExternalUrl(link);
    const actions: ActivityAction[] = !isDeleted && editable
      ? [{ id: `delete-${link}`, kind: 'icon', tone: 'danger', icon: <X className="h-3 w-3" />, title: '링크 삭제', onClick: () => {
        setPendingDeletes((prev) => new Set(prev).add(link));
        onChange(sourceLinks.filter((item) => item !== link));
      } }]
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

  return (
    <ActivityListSection
      title="링크"
      icon={<Link2 className="mr-1.5 h-4 w-4 shrink-0" />}
      badge={items.length > 0 ? <span className="mr-1 text-xs text-gray-400">({items.length})</span> : undefined}
      items={items}
      highlightedItemIds={newLinkSet}
      deletedItemIds={pendingDeletes.size > 0 ? pendingDeletes : undefined}
      onItemRestore={(item) => {
        setPendingDeletes((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        if (!sourceLinks.includes(item.id)) {
          onChange([...sourceLinks, item.id]);
        }
      }}
      onItemClick={(item) => {
        if (pendingDeletes.has(item.id)) return;
        const isBody = item.id.startsWith('body:');
        const url = isBody ? item.id.slice(5) : item.title;
        const bodyLink = isBody ? bodyLinks.find((link) => link.url === url) : undefined;
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
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                const trimmed = inputValue.trim();
                if (trimmed && !sourceLinks.includes(trimmed)) {
                  onChange([...sourceLinks, trimmed]);
                  setInputValue('');
                }
              }
            }}
            placeholder="링크 추가..."
            className="h-7 flex-1 rounded border border-ssoo-content-border bg-transparent px-2 text-xs text-ssoo-primary focus:border-ssoo-primary focus:outline-none"
          />
          <button
            onClick={() => {
              const trimmed = inputValue.trim();
              if (trimmed && !sourceLinks.includes(trimmed)) {
                onChange([...sourceLinks, trimmed]);
                setInputValue('');
              }
            }}
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
