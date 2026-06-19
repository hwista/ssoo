import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEventHandler,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { cn } from './cn';
import { SSOO_SHELL_METRICS } from './shell-metrics';
import { Button } from '@ssoo/web-ui';

interface SsooTabBarShellProps {
  leftControlSlot?: ReactNode;
  rightControlSlot?: ReactNode;
  children?: ReactNode;
  onScroll?: () => void;
  scrollRef?: Ref<HTMLDivElement>;
}

function SsooTabBarShell({
  leftControlSlot,
  rightControlSlot,
  children,
  onScroll,
  scrollRef,
}: SsooTabBarShellProps) {
  return (
    <div
      className="flex shrink-0 items-end border-b border-gray-200 bg-gray-50"
      style={{ height: SSOO_SHELL_METRICS.tabBar.containerHeight }}
    >
      {leftControlSlot}
      <div ref={scrollRef} onScroll={onScroll} className="flex flex-1 items-end overflow-x-auto scrollbar-hide">
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
    <Button variant="plain" size="plain"
      type="button"
      title={title}
      onClick={onClick}
      className={cn('h-control-h shrink-0 px-2 transition-colors hover:bg-gray-100', className)}
    >
      {children}
    </Button>
  );
}

export type SsooTabBarIconSize = 'control' | 'item' | 'home';
export type SsooTabBarIconTone = 'default' | 'editing' | 'inverse';

export interface SsooTabBarIconProps {
  active?: boolean;
  children: ReactNode;
  className?: string;
  size?: SsooTabBarIconSize;
  tone?: SsooTabBarIconTone;
}

function cloneIconElement(icon: ReactNode, className: string) {
  if (!isValidElement<{ className?: string }>(icon)) {
    return icon;
  }

  return cloneElement(icon as ReactElement<{ className?: string }>, {
    className: cn(className, icon.props.className),
  });
}

export function SsooTabBarIcon({
  active = false,
  children,
  className,
  size = 'item',
  tone = 'default',
}: SsooTabBarIconProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        tone === 'default' && (active ? 'text-ssoo-primary' : 'text-gray-500'),
        tone === 'editing' && (active ? 'text-ssoo-primary/80' : 'text-ssoo-primary/70'),
        tone === 'inverse' && (active ? 'text-ssoo-primary' : 'text-white'),
        className
      )}
      aria-hidden
    >
      {cloneIconElement(
        children,
        cn(
          size === 'control' && 'h-4 w-4',
          size === 'item' && 'h-4 w-4',
          size === 'home' && 'h-5 w-5'
        )
      )}
    </span>
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
      <Button variant="plain" size="plain" type="button" onClick={onClick} className={cn('flex h-full w-full items-center justify-center', buttonClassName)}>
        {children}
      </Button>
    </div>
  );
}

export interface SsooTabBarItemProps {
  active?: boolean;
  disabled?: boolean;
  draggable?: boolean;
  dragging?: boolean;
  dragOver?: boolean;
  iconSlot?: ReactNode;
  modified?: boolean;
  title: string;
  actionIconSlot?: ReactNode;
  actionTitle?: string;
  onActionClick?: MouseEventHandler<HTMLButtonElement>;
  statusTone?: SsooTabBarStatusDotTone;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onDragStart?: DragEventHandler<HTMLDivElement>;
  onDragOver?: DragEventHandler<HTMLDivElement>;
  onDragEnd?: DragEventHandler<HTMLDivElement>;
  onDragLeave?: DragEventHandler<HTMLDivElement>;
  className?: string;
}

export function SsooTabBarItem({
  active = false,
  disabled = false,
  draggable = false,
  dragging = false,
  dragOver = false,
  iconSlot,
  modified = false,
  title,
  actionIconSlot,
  actionTitle,
  onActionClick,
  statusTone,
  onClick,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragLeave,
  className,
}: SsooTabBarItemProps) {
  const handleActionClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.stopPropagation();
    onActionClick?.(event);
  };

  return (
    <div
      draggable={draggable && !disabled}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragLeave={onDragLeave}
      className={cn(
        'group flex h-control-h shrink-0 cursor-pointer select-none items-center gap-1.5 border-r border-gray-200 px-3 transition-all',
        disabled && 'cursor-not-allowed opacity-50',
        !disabled && active ? 'border-b-2 border-b-ls-red bg-ssoo-content-border' : null,
        !disabled && !active ? 'hover:bg-gray-100' : null,
        dragging && 'opacity-50',
        dragOver && !disabled && 'border-l-2 border-l-ssoo-primary',
        modified && 'italic',
        className
      )}
    >
      <Button
        variant="plain"
        size="plain"
        type="button"
        role="tab"
        aria-selected={active}
        disabled={disabled}
        onClick={onClick}
        className="flex h-full min-w-0 flex-1 justify-start gap-1.5 px-3 text-left disabled:pointer-events-none disabled:opacity-100"
      >
        {iconSlot}
        <span className={cn('max-w-[120px] truncate text-sm', !disabled && active ? 'font-medium text-ssoo-primary' : 'text-gray-600')}>
          {title}
        </span>
      </Button>
      {statusTone ? <SsooTabBarStatusDot tone={statusTone} /> : null}
      {actionIconSlot ? (
        <SsooTabBarCloseButton active={active} title={actionTitle} onClick={handleActionClick}>
          {actionIconSlot}
        </SsooTabBarCloseButton>
      ) : null}
    </div>
  );
}

export interface SsooTabBarCloseButtonProps {
  active?: boolean;
  children: ReactNode;
  title?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

export function SsooTabBarCloseButton({
  active = false,
  children,
  title,
  onClick,
}: SsooTabBarCloseButtonProps) {
  return (
    <Button variant="plain" size="plain"
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'flex h-control-h-sm w-control-h-sm items-center justify-center rounded opacity-0 transition-opacity',
        'pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100',
        active ? 'hover:bg-ssoo-primary/20' : 'hover:bg-gray-200'
      )}
    >
      {cloneIconElement(children, cn('h-3 w-3', active ? 'text-ssoo-primary' : 'text-gray-500'))}
    </Button>
  );
}

export type SsooTabBarStatusDotTone = 'transparent' | 'primary' | 'danger';

export interface SsooTabBarStatusDotProps {
  tone?: SsooTabBarStatusDotTone;
}

export function SsooTabBarStatusDot({ tone = 'transparent' }: SsooTabBarStatusDotProps) {
  return (
    <span
      className={cn(
        'h-1.5 w-1.5 shrink-0 rounded-full',
        tone === 'transparent' && 'bg-transparent',
        tone === 'primary' && 'bg-ssoo-primary/70',
        tone === 'danger' && 'bg-destructive/60'
      )}
      aria-hidden
    />
  );
}

export interface SsooMdiTabDescriptor {
  id: string;
  title: string;
  closable?: boolean;
}

export interface SsooMdiTabRenderState {
  active: boolean;
  dragging: boolean;
  dragOver: boolean;
  home: boolean;
}

export interface SsooMdiTabBarProps<TTab extends SsooMdiTabDescriptor> {
  tabs: readonly TTab[];
  activeTabId: string | null;
  homeTabId?: string;
  leftControlIconSlot?: ReactNode;
  rightControlIconSlot?: ReactNode;
  getTabId?: (tab: TTab) => string;
  getTabTitle?: (tab: TTab) => string;
  getTabIcon?: (tab: TTab, state: SsooMdiTabRenderState) => ReactNode;
  getTabIconTone?: (tab: TTab, state: SsooMdiTabRenderState) => SsooTabBarIconTone;
  getTabModified?: (tab: TTab, state: SsooMdiTabRenderState) => boolean;
  getTabStatusTone?: (tab: TTab, state: SsooMdiTabRenderState) => SsooTabBarStatusDotTone | undefined;
  getTabActionIcon?: (tab: TTab, state: SsooMdiTabRenderState) => ReactNode;
  getTabActionTitle?: (tab: TTab, state: SsooMdiTabRenderState) => string | undefined;
  isTabHome?: (tab: TTab) => boolean;
  isTabClosable?: (tab: TTab) => boolean;
  onActivateTab: (tab: TTab) => void;
  onActionTab?: (tab: TTab, event: Parameters<NonNullable<SsooTabBarItemProps['onActionClick']>>[0]) => void;
  onReorderTabs?: (fromIndex: number, toIndex: number) => void;
}

function getDefaultTabId<TTab extends SsooMdiTabDescriptor>(tab: TTab): string {
  return tab.id;
}

function getDefaultTabTitle<TTab extends SsooMdiTabDescriptor>(tab: TTab): string {
  return tab.title;
}

function isScrollable(element: HTMLDivElement | null): boolean {
  if (!element) return false;
  return element.scrollWidth > element.clientWidth;
}

export function SsooMdiTabBar<TTab extends SsooMdiTabDescriptor>({
  tabs,
  activeTabId,
  homeTabId,
  leftControlIconSlot,
  rightControlIconSlot,
  getTabId = getDefaultTabId,
  getTabTitle = getDefaultTabTitle,
  getTabIcon,
  getTabIconTone,
  getTabModified,
  getTabStatusTone,
  getTabActionIcon,
  getTabActionTitle,
  isTabHome,
  isTabClosable,
  onActivateTab,
  onActionTab,
  onReorderTabs,
}: SsooMdiTabBarProps<TTab>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const resolveIsHome = useCallback((tab: TTab) => {
    if (isTabHome) return isTabHome(tab);
    return homeTabId ? getTabId(tab) === homeTabId : !tab.closable;
  }, [getTabId, homeTabId, isTabHome]);

  const checkScrollState = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    setShowLeftArrow(element.scrollLeft > 0);
    setShowRightArrow(element.scrollLeft < element.scrollWidth - element.clientWidth - 1);
  }, []);

  useEffect(() => {
    checkScrollState();
  }, [checkScrollState, tabs.length]);

  const handleScroll = useCallback((direction: 'left' | 'right') => {
    const element = scrollRef.current;
    if (!element) return;

    element.scrollBy({
      left: direction === 'left' ? -200 : 200,
      behavior: 'smooth',
    });
  }, []);

  const handleDragStart = useCallback((index: number): DragEventHandler<HTMLDivElement> => (event) => {
    if (resolveIsHome(tabs[index])) {
      event.preventDefault();
      return;
    }
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = 'move';
  }, [resolveIsHome, tabs]);

  const handleDragOver = useCallback((index: number): DragEventHandler<HTMLDivElement> => (event) => {
    if (resolveIsHome(tabs[index])) return;
    event.preventDefault();
    if (draggedIndex !== null && index !== draggedIndex) {
      setDragOverIndex(index);
    }
  }, [draggedIndex, resolveIsHome, tabs]);

  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      onReorderTabs?.(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [dragOverIndex, draggedIndex, onReorderTabs]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const canScroll = isScrollable(scrollRef.current);

  return (
    <SsooTabBarShell
      scrollRef={scrollRef}
      onScroll={checkScrollState}
      leftControlSlot={
        canScroll && showLeftArrow ? (
          <SsooTabBarControlButton onClick={() => handleScroll('left')}>
            {leftControlIconSlot ? (
              <SsooTabBarIcon size="control">{leftControlIconSlot}</SsooTabBarIcon>
            ) : null}
          </SsooTabBarControlButton>
        ) : null
      }
      rightControlSlot={
        canScroll && showRightArrow ? (
          <SsooTabBarControlButton onClick={() => handleScroll('right')}>
            {rightControlIconSlot ? (
              <SsooTabBarIcon size="control">{rightControlIconSlot}</SsooTabBarIcon>
            ) : null}
          </SsooTabBarControlButton>
        ) : null
      }
    >
      {tabs.map((tab, index) => {
        const tabId = getTabId(tab);
        const active = tabId === activeTabId;
        const home = resolveIsHome(tab);
        const renderState: SsooMdiTabRenderState = {
          active,
          dragging: draggedIndex === index,
          dragOver: dragOverIndex === index,
          home,
        };
        const tabIcon = getTabIcon?.(tab, renderState);

        if (home) {
          return (
            <SsooTabBarHomeButton key={tabId} active={active} onClick={() => onActivateTab(tab)}>
              {tabIcon ? (
                <SsooTabBarIcon active={active} size="home" tone={getTabIconTone?.(tab, renderState) ?? 'inverse'}>
                  {tabIcon}
                </SsooTabBarIcon>
              ) : null}
            </SsooTabBarHomeButton>
          );
        }

        const closable = isTabClosable?.(tab) ?? Boolean(tab.closable);
        return (
          <SsooTabBarItem
            key={tabId}
            title={getTabTitle(tab)}
            active={active}
            draggable={Boolean(onReorderTabs)}
            dragging={renderState.dragging}
            dragOver={renderState.dragOver}
            onClick={() => onActivateTab(tab)}
            onDragStart={handleDragStart(index)}
            onDragOver={handleDragOver(index)}
            onDragEnd={handleDragEnd}
            onDragLeave={handleDragLeave}
            iconSlot={
              tabIcon ? (
                <SsooTabBarIcon active={active} tone={getTabIconTone?.(tab, renderState)}>
                  {tabIcon}
                </SsooTabBarIcon>
              ) : null
            }
            modified={getTabModified?.(tab, renderState)}
            statusTone={getTabStatusTone?.(tab, renderState)}
            actionTitle={getTabActionTitle?.(tab, renderState)}
            actionIconSlot={closable ? getTabActionIcon?.(tab, renderState) : null}
            onActionClick={onActionTab ? (event) => onActionTab(tab, event) : undefined}
          />
        );
      })}
    </SsooTabBarShell>
  );
}
