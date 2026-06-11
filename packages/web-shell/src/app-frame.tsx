import type { CSSProperties, ReactNode } from 'react';
import type { SsooSidebarMode } from './sidebar';
import { cn } from './cn';

export type SsooAppFrameMode = 'workbench' | 'document' | 'social' | 'content-only';

export interface SsooAppFrameProps {
  mode?: SsooAppFrameMode;
  sidebarMode?: SsooSidebarMode;
  sidebarExpanded?: boolean;
  sidebarWidth?: number | string;
  collapsedSidebarWidth?: number | string;
  sidebarSlot?: ReactNode;
  headerSlot?: ReactNode;
  tabBarSlot?: ReactNode;
  contentSlot?: ReactNode;
  children?: ReactNode;
  fullHeight?: boolean;
  mainOffset?: number | string;
  className?: string;
  mainClassName?: string;
  contentClassName?: string;
  mainStyle?: CSSProperties;
}

function toCssLength(value: number | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

export function resolveSsooAppFrameMainOffset({
  sidebarMode = 'none',
  sidebarExpanded = true,
  sidebarWidth,
  collapsedSidebarWidth,
  mainOffset,
}: Pick<
  SsooAppFrameProps,
  'sidebarMode' | 'sidebarExpanded' | 'sidebarWidth' | 'collapsedSidebarWidth' | 'mainOffset'
>): number | string | undefined {
  if (mainOffset !== undefined) return mainOffset;

  if (sidebarMode === 'none') {
    return undefined;
  }

  if (!sidebarExpanded) {
    return collapsedSidebarWidth ?? 56;
  }

  return sidebarWidth;
}

export function SsooAppFrame({
  mode = 'workbench',
  sidebarMode = 'none',
  sidebarExpanded = true,
  sidebarWidth,
  collapsedSidebarWidth,
  sidebarSlot,
  headerSlot,
  tabBarSlot,
  contentSlot,
  children,
  fullHeight = true,
  mainOffset,
  className,
  mainClassName,
  contentClassName,
  mainStyle,
}: SsooAppFrameProps) {
  const resolvedMainOffset = resolveSsooAppFrameMainOffset({
    sidebarMode,
    sidebarExpanded,
    sidebarWidth,
    collapsedSidebarWidth,
    mainOffset,
  });
  const marginLeft = toCssLength(resolvedMainOffset);
  const mergedMainStyle = marginLeft || mainStyle ? { marginLeft, ...mainStyle } : undefined;

  return (
    <div
      data-ssoo-app-frame-mode={mode}
      data-ssoo-sidebar-mode={sidebarMode}
      className={cn(
        fullHeight ? 'flex h-screen overflow-hidden bg-gray-50' : 'flex min-h-screen bg-background',
        mode === 'content-only' && 'bg-background',
        className
      )}
    >
      {sidebarSlot}
      <div
        className={cn('flex min-w-0 flex-1 flex-col transition-all duration-300', mainClassName)}
        style={mergedMainStyle}
      >
        {headerSlot}
        {tabBarSlot}
        <main className={cn('flex min-h-0 flex-1 flex-col overflow-auto bg-background', contentClassName)}>
          {contentSlot ?? children}
        </main>
      </div>
    </div>
  );
}
