import type { ReactNode } from 'react';
import { cn } from './cn';
import { Button } from '@ssoo/web-ui';

export interface SsooPageIndexRailItem {
  id: string;
  label: ReactNode;
  description?: string;
  meta?: ReactNode;
  disabled?: boolean;
}

export interface SsooPageIndexRailProps {
  items: SsooPageIndexRailItem[];
  activeItemId?: string;
  title?: ReactNode;
  description?: ReactNode;
  ariaLabel?: string;
  className?: string;
  layout?: 'vertical' | 'horizontal';
  showItemMeta?: boolean;
  onItemSelect: (item: SsooPageIndexRailItem) => void;
}

export function SsooPageIndexRail({
  items,
  activeItemId,
  title,
  description,
  ariaLabel = '페이지 항목 색인',
  className,
  layout = 'vertical',
  showItemMeta = false,
  onItemSelect,
}: SsooPageIndexRailProps) {
  const hasHeader = Boolean(title || description);

  return (
    <nav className={cn('flex min-h-0 flex-col text-ssoo-primary', layout === 'vertical' && 'h-full', className)} aria-label={ariaLabel}>
      {hasHeader ? (
        <div className="shrink-0 border-b border-ssoo-content-border ssoo-border-content-70 px-1 pb-2">
          {title ? <p className="text-sm font-medium text-ssoo-primary">{title}</p> : null}
          {description ? (
            <p className={cn(title ? 'mt-1' : '', 'line-clamp-2 text-caption leading-4 ssoo-text-primary-60')}>
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className={cn('min-h-0 flex-1 overflow-y-auto', hasHeader ? 'pt-2' : 'pt-0')}>
        <div className={cn("flex gap-1", layout === "horizontal" ? "flex-wrap" : "flex-col")}>
          {items.map((item) => {
            const active = activeItemId === item.id;

            return (
              <Button variant="plain" size="plain"
                key={item.id}
                type="button"
                disabled={item.disabled}
                aria-current={active ? 'true' : undefined}
                title={item.description}
                onClick={() => onItemSelect(item)}
                className={cn(
                  'flex min-h-8 items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                  layout === 'vertical' && 'w-full',
                  active
                    ? 'bg-ssoo-content-border font-medium text-ssoo-primary'
                    : 'ssoo-text-primary-80 hover:bg-ssoo-sitemap-bg hover:text-ssoo-primary',
                  item.disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent'
                )}
              >
                <span className="min-w-0 truncate">{item.label}</span>
                {showItemMeta && item.meta ? (
                  <span className="shrink-0 rounded-full bg-card px-1.5 py-0.5 text-caption-xs leading-none ssoo-text-primary-60">
                    {item.meta}
                  </span>
                ) : null}
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
