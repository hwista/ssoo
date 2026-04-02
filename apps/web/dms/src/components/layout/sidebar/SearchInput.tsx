'use client';

import type { FocusEventHandler, KeyboardEventHandler } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  inputClassName?: string;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  clearAriaLabel?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  inputClassName,
  onFocus,
  onBlur,
  onKeyDown,
  clearAriaLabel = '검색 초기화',
}: SearchInputProps) {
  return (
    <div className={cn('relative flex-1', className)}>
      <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(
          'h-control-h w-full rounded-lg border border-ssoo-content-border pl-8 pr-8 text-body-sm',
          'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ssoo-primary',
          inputClassName
        )}
      />
      {value && (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 flex h-control-h-sm w-control-h-sm -translate-y-1/2 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label={clearAriaLabel}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
