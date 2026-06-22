import type { ReactNode } from 'react';
import type { SsooSidebarMode } from './sidebar';
import { cn } from './cn';
import { SSOO_SHELL_METRICS } from './shell-metrics';
import type { SsooThemePresetKey } from './theme';

export type SsooAppFrameMode = 'workbench' | 'document' | 'social' | 'content-only';

export interface SsooAppFrameProps {
  mode?: SsooAppFrameMode;
  sidebarMode?: SsooSidebarMode;
  sidebarExpanded?: boolean;
  sidebarSlot?: ReactNode;
  headerSlot?: ReactNode;
  tabBarSlot?: ReactNode;
  contentSlot?: ReactNode;
  children?: ReactNode;
  fullHeight?: boolean;
  theme?: SsooThemePresetKey;
}

function toCssLength(value: number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return `${value}px`;
}

export function resolveSsooAppFrameMainOffset({
  sidebarMode = 'none',
  sidebarExpanded = true,
}: Pick<SsooAppFrameProps, 'sidebarMode' | 'sidebarExpanded'>): number | undefined {
  if (sidebarMode === 'none') {
    return undefined;
  }

  if (!sidebarExpanded) {
    return SSOO_SHELL_METRICS.sidebar.collapsedWidth;
  }

  return SSOO_SHELL_METRICS.sidebar.expandedWidth;
}

export function SsooAppFrame({
  mode = 'workbench',
  sidebarMode = 'none',
  sidebarExpanded = true,
  sidebarSlot,
  headerSlot,
  tabBarSlot,
  contentSlot,
  children,
  fullHeight = true,
  theme,
}: SsooAppFrameProps) {
  const resolvedMainOffset = resolveSsooAppFrameMainOffset({
    sidebarMode,
    sidebarExpanded,
  });
  const marginLeft = toCssLength(resolvedMainOffset);

  return (
    <div
      data-ssoo-app-frame-mode={mode}
      data-ssoo-sidebar-mode={sidebarMode}
      data-ssoo-theme={theme}
      className={cn(
        fullHeight ? 'flex h-screen overflow-hidden bg-muted/30' : 'flex min-h-screen bg-background',
        mode === 'content-only' && 'bg-background'
      )}
    >
      {sidebarSlot}
      <div
        className="flex min-w-0 flex-1 flex-col transition-all duration-300"
        style={marginLeft ? { marginLeft } : undefined}
      >
        {headerSlot}
        {tabBarSlot}
        <main className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
          {contentSlot ?? children}
        </main>
      </div>
    </div>
  );
}
