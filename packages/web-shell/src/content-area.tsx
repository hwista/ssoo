import type { ReactNode } from 'react';
import { cn } from './cn';

export type SsooContentAreaPadding = 'none' | 'md' | 'lg';
export type SsooContentAreaScroll = 'auto' | 'hidden' | 'visible';
export type SsooContentAreaTone = 'default' | 'muted' | 'transparent';
export type SsooContentAreaStateVariant = 'empty' | 'loading' | 'notice' | 'error';

export interface SsooContentAreaSurfaceProps {
  children: ReactNode;
  className?: string;
  padding?: SsooContentAreaPadding;
  scroll?: SsooContentAreaScroll;
  tone?: SsooContentAreaTone;
}

export function SsooContentAreaSurface({
  children,
  className,
  padding = 'none',
  scroll = 'auto',
  tone = 'default',
}: SsooContentAreaSurfaceProps) {
  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-1 flex-col',
        scroll === 'auto' && 'overflow-auto',
        scroll === 'hidden' && 'overflow-hidden',
        scroll === 'visible' && 'overflow-visible',
        padding === 'md' && 'p-4',
        padding === 'lg' && 'p-6',
        tone === 'default' && 'bg-background',
        tone === 'muted' && 'bg-muted/30',
        className
      )}
    >
      {children}
    </div>
  );
}

export interface SsooContentAreaEmptyStateProps {
  children: ReactNode;
  tone?: Extract<SsooContentAreaTone, 'default' | 'muted'>;
}

export function SsooContentAreaEmptyState({
  children,
  tone = 'muted',
}: SsooContentAreaEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-1 items-center justify-center',
        tone === 'default' && 'bg-background',
        tone === 'muted' && 'bg-muted/30'
      )}
    >
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}

export interface SsooContentAreaStateProps {
  children?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  tone?: Extract<SsooContentAreaTone, 'default' | 'muted'>;
  variant?: SsooContentAreaStateVariant;
}

export function SsooContentAreaState({
  children,
  title,
  description,
  tone = 'muted',
  variant = 'notice',
}: SsooContentAreaStateProps) {
  const resolvedTitle = title ?? children;

  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center px-6 py-8 text-center',
        tone === 'default' && 'bg-background',
        tone === 'muted' && 'bg-muted/30'
      )}
    >
      {variant === 'loading' ? (
        <span
          aria-hidden="true"
          className="mb-3 h-5 w-5 animate-spin rounded-full border-2 border-ssoo-content-border border-t-ssoo-primary"
        />
      ) : null}
      {resolvedTitle ? (
        <p
          className={cn(
            'text-sm',
            variant === 'error' ? 'font-medium text-destructive' : 'text-muted-foreground'
          )}
        >
          {resolvedTitle}
        </p>
      ) : null}
      {description ? <p className="mt-1 text-caption text-muted-foreground/70">{description}</p> : null}
    </div>
  );
}

export interface SsooMdiContentAreaProps {
  children: ReactNode;
  className?: string;
  emptySlot?: ReactNode;
  hasTabs: boolean;
}

export function SsooMdiContentArea({
  children,
  className,
  emptySlot,
  hasTabs,
}: SsooMdiContentAreaProps) {
  if (!hasTabs) {
    return emptySlot ?? null;
  }

  return (
    <div className={cn('relative flex-1 overflow-hidden', className)}>
      {children}
    </div>
  );
}

export interface SsooMdiContentPaneProps {
  active?: boolean;
  children: ReactNode;
}

export function SsooMdiContentPane({
  active = false,
  children,
}: SsooMdiContentPaneProps) {
  const inactiveDisplayGuard = active ? undefined : { display: 'none' as const };

  return (
    <div
      aria-hidden={!active}
      data-ssoo-mdi-pane="true"
      data-ssoo-mdi-active={active ? 'true' : 'false'}
      style={inactiveDisplayGuard}
      className={cn(
        'absolute inset-0 flex min-h-0 flex-col overflow-auto bg-background'
      )}
    >
      {children}
    </div>
  );
}

export interface SsooMdiTabbedContentAreaProps<TTab> {
  tabs: readonly TTab[];
  activeTabId: string | null;
  emptySlot?: ReactNode;
  getTabId: (tab: TTab) => string;
  isTabActive?: (tab: TTab, state: { tabId: string; activeTabId: string | null }) => boolean;
  renderTab: (tab: TTab, state: { active: boolean }) => ReactNode;
  className?: string;
}

export function SsooMdiTabbedContentArea<TTab>({
  tabs,
  activeTabId,
  emptySlot,
  getTabId,
  isTabActive,
  renderTab,
  className,
}: SsooMdiTabbedContentAreaProps<TTab>) {
  if (tabs.length === 0) {
    return emptySlot ?? null;
  }

  return (
    <SsooMdiContentArea hasTabs={tabs.length > 0} className={className}>
      {tabs.map((tab) => {
        const tabId = getTabId(tab);
        const active = isTabActive?.(tab, { tabId, activeTabId }) ?? tabId === activeTabId;

        return (
          <SsooMdiContentPane
            key={tabId}
            active={active}
          >
            {renderTab(tab, { active })}
          </SsooMdiContentPane>
        );
      })}
    </SsooMdiContentArea>
  );
}
