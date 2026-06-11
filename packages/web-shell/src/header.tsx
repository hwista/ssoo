import type { ButtonHTMLAttributes, FocusEventHandler, KeyboardEventHandler, ReactNode } from 'react';
import { cn } from './cn';

export type SsooHeaderMode = 'primary' | 'neutral' | 'transparent';

export interface SsooHeaderProps {
  mode?: SsooHeaderMode;
  leadingSlot?: ReactNode;
  searchSlot?: ReactNode;
  centerSlot?: ReactNode;
  actionsSlot?: ReactNode;
  className?: string;
  leadingClassName?: string;
  searchClassName?: string;
  centerClassName?: string;
  actionsClassName?: string;
}

export function SsooHeader({
  mode = 'primary',
  leadingSlot,
  searchSlot,
  centerSlot,
  actionsSlot,
  className,
  leadingClassName,
  searchClassName,
  centerClassName,
  actionsClassName,
}: SsooHeaderProps) {
  return (
    <header
      data-ssoo-header-mode={mode}
      className={cn(
        'flex h-header-h shrink-0 items-center justify-between px-4',
        mode === 'primary' && 'bg-ssoo-primary',
        mode === 'neutral' && 'border-b border-ssoo-content-border bg-ssoo-content-bg',
        mode === 'transparent' && 'bg-transparent',
        className
      )}
    >
      <div className={cn('flex min-w-0 flex-1 items-center gap-3', leadingClassName)}>
        {leadingSlot}
        {searchSlot && <div className={cn('flex w-full max-w-md items-center', searchClassName)}>{searchSlot}</div>}
      </div>
      {centerSlot && <div className={cn('min-w-0 flex-1', centerClassName)}>{centerSlot}</div>}
      {actionsSlot && <div className={cn('flex shrink-0 items-center gap-2', actionsClassName)}>{actionsSlot}</div>}
    </header>
  );
}

export interface SsooHeaderActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tone?: 'primary-on-color' | 'ghost-on-color' | 'disabled-on-color' | 'neutral';
}

export function SsooHeaderActionButton({
  children,
  tone = 'primary-on-color',
  className,
  disabled,
  type = 'button',
  ...props
}: SsooHeaderActionButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'flex h-control-h items-center gap-1 rounded-md px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed',
        tone === 'primary-on-color' && 'bg-white text-ssoo-primary hover:bg-gray-100 disabled:bg-white/70 disabled:opacity-70',
        tone === 'ghost-on-color' && 'bg-white/10 text-white hover:bg-white/15 disabled:text-white/70 disabled:opacity-70',
        tone === 'disabled-on-color' && 'bg-white/10 text-white/70 opacity-70',
        tone === 'neutral' && 'border border-ssoo-content-border bg-white text-ssoo-primary hover:bg-ssoo-sitemap-bg disabled:opacity-60',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface SsooHeaderIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tone?: 'ghost-on-color' | 'disabled-on-color' | 'neutral';
}

export function SsooHeaderIconButton({
  children,
  tone = 'ghost-on-color',
  className,
  disabled,
  type = 'button',
  ...props
}: SsooHeaderIconButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'relative flex h-control-h w-control-h items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed',
        tone === 'ghost-on-color' && 'text-white hover:bg-white/10 disabled:opacity-60',
        tone === 'disabled-on-color' && 'text-white opacity-60',
        tone === 'neutral' && 'border border-ssoo-content-border bg-white text-ssoo-primary hover:bg-ssoo-sitemap-bg disabled:opacity-60',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface SsooHeaderSearchBoxProps {
  placeholder?: string;
  iconSlot?: ReactNode;
  disabled?: boolean;
  readOnly?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  className?: string;
  inputClassName?: string;
}

export function SsooHeaderSearchBox({
  placeholder = '통합 검색...',
  iconSlot,
  disabled = false,
  readOnly = false,
  value,
  onChange,
  onFocus,
  onKeyDown,
  className,
  inputClassName,
}: SsooHeaderSearchBoxProps) {
  return (
    <div className={cn('relative w-full', className)}>
      {iconSlot && <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">{iconSlot}</div>}
      <input
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        className={cn(
          'h-control-h w-full rounded-lg border border-white/20 bg-white/10 pl-9 pr-4 text-sm text-white placeholder-white/50',
          disabled && 'cursor-not-allowed',
          inputClassName
        )}
      />
    </div>
  );
}
