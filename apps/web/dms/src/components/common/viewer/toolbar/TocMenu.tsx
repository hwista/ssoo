'use client';

import * as React from 'react';
import { List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ViewerTocControls } from './toolbarTypes';

export function ToolbarTocMenu({
  items,
  label = '목차',
  listStyle = 'hierarchy',
  onItemClick,
}: ViewerTocControls) {
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
        type="button"
        variant="ghost"
        size="default"
        className={cn('h-control-h gap-1.5 text-[0.8125rem] font-medium text-ssoo-primary', tocHovered && 'bg-gray-100')}
      >
        <List className="h-4 w-4" />
        <span>{label}</span>
      </Button>

      {tocHovered && (
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
                <button
                  key={item.id}
                  onClick={() => onItemClick?.(item.id)}
                  className={cn(
                    'flex h-control-h w-full items-center truncate rounded px-2 text-left text-[0.8125rem] leading-6 tracking-normal transition-colors hover:bg-white hover:text-ssoo-primary',
                    listStyle === 'hierarchy' && item.level === 1 && 'font-medium text-gray-900',
                    listStyle === 'hierarchy' && item.level === 2 && 'font-normal text-gray-700',
                    listStyle === 'hierarchy' && item.level >= 3 && 'font-normal text-gray-500',
                    listStyle === 'flat' && 'text-gray-800'
                  )}
                  style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
                  title={item.text}
                >
                  {item.text}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
