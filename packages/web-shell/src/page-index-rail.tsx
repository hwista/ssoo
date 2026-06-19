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
  onItemSelect: (item: SsooPageIndexRailItem) => void;
}

export function SsooPageIndexRail({
  items,
  activeItemId,
  title = '항목',
  description,
  ariaLabel = '페이지 항목 색인',
  className,
  onItemSelect,
}: SsooPageIndexRailProps) {
  return (
    <nav className={cn('flex h-full min-h-0 flex-col', className)} aria-label={ariaLabel}>
      <div className="shrink-0 border-b ssoo-border-content-70 pb-2">
        <p className="text-caption font-semibold text-ssoo-primary">{title}</p>
        {description ? (
          <p className="mt-1 max-h-8 overflow-hidden text-[11px] leading-4 text-ssoo-secondary">
            {description}
          </p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pt-2">
        <div className="flex flex-col gap-1">
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
                  'flex min-h-8 w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-caption transition-colors',
                  active
                    ? 'ssoo-border-primary-30 bg-ssoo-content-bg text-ssoo-primary'
                    : 'border-transparent ssoo-text-primary-80 ssoo-hover-border-primary-30 hover:bg-ssoo-content-bg',
                  item.disabled && 'cursor-not-allowed opacity-50 hover:border-transparent hover:bg-transparent'
                )}
              >
                <span className="min-w-0 truncate">{item.label}</span>
                {item.meta ? (
                  <span className="shrink-0 rounded-full bg-ssoo-content-bg px-1.5 py-0.5 text-[10px] leading-none ssoo-text-primary-60">
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
