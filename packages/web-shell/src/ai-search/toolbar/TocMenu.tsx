'use client';

import * as React from 'react';
import { List } from 'lucide-react';
import { cn } from '../../cn';
import type { SsooAiSearchViewerTocControls } from './toolbarTypes';
import { Button } from '@ssoo/web-ui';

export function SsooAiSearchToolbarTocMenu({
  items,
  label = '목차',
  listStyle = 'hierarchy',
  onItemClick,
}: SsooAiSearchViewerTocControls) {
  const [tocHovered, setTocHovered] = React.useState(false);

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setTocHovered(true)}
      onMouseLeave={() => setTocHovered(false)}
    >
      <Button
        variant="ghost"
        type="button"
        className={cn(
          'gap-1.5 px-3 text-[0.8125rem] hover:bg-gray-100',
          tocHovered && 'bg-gray-100'
        )}
      >
        <List className="h-4 w-4" />
        <span>{label}</span>
      </Button>

      {tocHovered ? (
        <div
          className={cn(
            'absolute left-0 top-full z-50',
            'w-72 max-h-80 overflow-y-auto',
            'rounded-lg rounded-tl-none bg-gray-100',
            'shadow-lg',
            'animate-in fade-in-0 zoom-in-95 duration-100'
          )}
        >
          <div className="p-2">
            <nav className="space-y-0.5">
              {items.map((item) => (
                <Button
                  variant="ghost"
                  key={item.id}
                  onClick={() => onItemClick?.(item.id)}
                  className={cn(
                    'w-full justify-start truncate px-2 text-left text-[0.8125rem] leading-6 tracking-normal hover:bg-white hover:text-ssoo-primary',
                    listStyle === 'hierarchy' && item.level === 1 && 'font-medium text-gray-900',
                    listStyle === 'hierarchy' && item.level === 2 && 'font-normal text-gray-700',
                    listStyle === 'hierarchy' && item.level >= 3 && 'font-normal text-gray-500',
                    listStyle === 'flat' && 'text-gray-800'
                  )}
                  style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
                  title={item.text}
                >
                  {item.text}
                </Button>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { SsooAiSearchToolbarTocMenu as ToolbarTocMenu };
