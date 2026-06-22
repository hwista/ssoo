import * as React from 'react';

import { cn } from './cn';

type SegmentedControlSize = 'sm' | 'default';
type SegmentedControlSurface = 'subtle' | 'white';

export type SegmentedControlProps = React.HTMLAttributes<HTMLDivElement>;

const SegmentedControl = React.forwardRef<HTMLDivElement, SegmentedControlProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex gap-1.5 overflow-x-auto', className)}
      {...props}
    />
  ),
);
SegmentedControl.displayName = 'SegmentedControl';

export interface SegmentedControlItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  badge?: React.ReactNode;
  selected?: boolean;
  size?: SegmentedControlSize;
  surface?: SegmentedControlSurface;
}

const SegmentedControlItem = React.forwardRef<HTMLButtonElement, SegmentedControlItemProps>(
  (
    {
      badge,
      children,
      className,
      selected = false,
      size = 'sm',
      surface = 'subtle',
      type = 'button',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={selected}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1 border transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        size === 'default'
          ? 'h-control-h rounded-md px-3 text-sm font-medium'
          : 'h-7 rounded px-2 text-xs font-normal leading-4',
        selected
          ? 'border-ssoo-primary bg-ssoo-primary text-white'
          : surface === 'white'
            ? 'border-ssoo-content-border bg-white text-ssoo-primary hover:bg-ssoo-content-bg'
            : 'border-ssoo-content-border bg-ssoo-content-bg text-ssoo-primary/70 hover:bg-muted/60',
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {badge ? (
        <span
          className={cn(
            'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium leading-none',
            selected ? 'bg-white/20 text-white' : 'bg-muted text-ssoo-primary/70',
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  ),
);
SegmentedControlItem.displayName = 'SegmentedControlItem';

export { SegmentedControl, SegmentedControlItem };
