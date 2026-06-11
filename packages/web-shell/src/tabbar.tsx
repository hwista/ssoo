import type { DragEventHandler, MouseEventHandler, ReactNode, Ref } from 'react';
import { cn } from './cn';

export type SsooTabBarMode = 'mdi' | 'route' | 'static' | 'none';

export interface SsooTabBarShellProps {
  mode?: SsooTabBarMode;
  height?: number | string;
  leftControlSlot?: ReactNode;
  rightControlSlot?: ReactNode;
  children?: ReactNode;
  className?: string;
  scrollClassName?: string;
  onScroll?: () => void;
  scrollRef?: Ref<HTMLDivElement>;
}

function toCssLength(value: number | string | undefined, fallback: number): string | number {
  return value ?? fallback;
}

export function SsooTabBarShell({
  mode = 'mdi',
  height = 53,
  leftControlSlot,
  rightControlSlot,
  children,
  className,
  scrollClassName,
  onScroll,
  scrollRef,
}: SsooTabBarShellProps) {
  if (mode === 'none') return null;

  return (
    <div
      data-ssoo-tabbar-mode={mode}
      className={cn('flex shrink-0 items-end border-b border-gray-200 bg-gray-50', className)}
      style={{ height: toCssLength(height, 53) }}
    >
      {leftControlSlot}
      <div ref={scrollRef} onScroll={onScroll} className={cn('flex flex-1 items-end overflow-x-auto scrollbar-hide', scrollClassName)}>
        {children}
      </div>
      {rightControlSlot}
    </div>
  );
}

export interface SsooTabBarControlButtonProps {
  children: ReactNode;
  title?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
}

export function SsooTabBarControlButton({ children, title, onClick, className }: SsooTabBarControlButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn('h-control-h shrink-0 px-2 transition-colors hover:bg-gray-100', className)}
    >
      {children}
    </button>
  );
}

export interface SsooTabBarHomeButtonProps {
  active?: boolean;
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  buttonClassName?: string;
}

export function SsooTabBarHomeButton({ active = false, children, onClick, className, buttonClassName }: SsooTabBarHomeButtonProps) {
  return (
    <div
      className={cn(
        'flex h-control-h w-10 shrink-0 items-center justify-center border-r border-gray-200 transition-colors',
        active ? 'border-b-2 border-b-ls-red bg-ssoo-content-border' : 'bg-ls-gray hover:bg-ssoo-content-border/80',
        className
      )}
    >
      <button type="button" onClick={onClick} className={cn('flex h-full w-full items-center justify-center', buttonClassName)}>
        {children}
      </button>
    </div>
  );
}

export interface SsooTabBarItemProps {
  active?: boolean;
  draggable?: boolean;
  dragging?: boolean;
  dragOver?: boolean;
  iconSlot?: ReactNode;
  title: string;
  closeSlot?: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onDragStart?: DragEventHandler<HTMLDivElement>;
  onDragOver?: DragEventHandler<HTMLDivElement>;
  onDragEnd?: DragEventHandler<HTMLDivElement>;
  onDragLeave?: DragEventHandler<HTMLDivElement>;
  className?: string;
}

export function SsooTabBarItem({
  active = false,
  draggable = false,
  dragging = false,
  dragOver = false,
  iconSlot,
  title,
  closeSlot,
  onClick,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragLeave,
  className,
}: SsooTabBarItemProps) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragLeave={onDragLeave}
      className={cn(
        'group flex h-control-h shrink-0 items-center gap-1.5 border-r border-gray-200 px-3 transition-all',
        draggable && 'cursor-grab',
        active ? 'border-b-2 border-b-ls-red bg-ssoo-content-border' : 'hover:bg-gray-100',
        dragging && 'opacity-50',
        dragOver && 'border-l-2 border-l-ssoo-primary',
        className
      )}
    >
      <button type="button" onClick={onClick} className="flex items-center gap-1.5">
        {iconSlot}
        <span className={cn('max-w-[120px] truncate text-sm', active ? 'font-medium text-ssoo-primary' : 'text-gray-600')}>
          {title}
        </span>
      </button>
      {closeSlot}
    </div>
  );
}
