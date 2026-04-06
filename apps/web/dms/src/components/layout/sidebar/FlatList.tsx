'use client';

import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FlatListProps {
  as?: 'div' | 'nav';
  ariaLabel?: string;
  className?: string;
  padded?: boolean;
  children: ReactNode;
}

interface FlatListItemProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  trailingAction?: ReactNode;
  containerClassName?: string;
  buttonClassName?: string;
  labelClassName?: string;
}

export function FlatList({
  as = 'div',
  ariaLabel,
  className,
  padded = true,
  children,
}: FlatListProps) {
  const classes = cn('space-y-0.5', padded && 'py-1', className);

  if (as === 'nav') {
    return (
      <nav aria-label={ariaLabel} className={classes}>
        {children}
      </nav>
    );
  }

  return <div className={classes}>{children}</div>;
}

export function FlatListItem({
  icon: Icon,
  label,
  active = false,
  disabled = false,
  onSelect,
  trailingAction,
  containerClassName,
  buttonClassName,
  labelClassName,
}: FlatListItemProps) {
  const textSizeClassName = active ? 'text-label-md' : 'text-body-sm';
  const textToneClassName = active ? 'text-ssoo-primary' : 'text-gray-700';
  const textClassName = `${textSizeClassName} ${textToneClassName}`;
  const rowBaseClassName = cn(
    'group flex h-control-h w-full min-w-0 items-center gap-2 rounded-md px-3 transition-colors',
    active ? 'bg-ssoo-content-border' : 'hover:bg-ssoo-sitemap-bg',
    disabled && 'cursor-not-allowed opacity-50'
  );

  // Keep semantic text-size and text-color tokens out of cn/twMerge so custom text-* utilities survive together.
  const rowClassName = [rowBaseClassName, textClassName, containerClassName].filter(Boolean).join(' ');
  const content = (
    <>
      <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-ssoo-primary' : 'text-gray-500')} />
      <span className={['flex-1 truncate', textClassName, labelClassName].filter(Boolean).join(' ')}>
        {label}
      </span>
    </>
  );

  if (!trailingAction) {
    return (
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className={[rowClassName, 'text-left', buttonClassName].filter(Boolean).join(' ')}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cn(rowClassName, containerClassName)}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className={cn(
          'flex h-full min-w-0 flex-1 items-center gap-2 text-left',
          disabled && 'cursor-not-allowed',
          buttonClassName
        )}
      >
        {content}
      </button>
      {trailingAction}
    </div>
  );
}
