'use client';

import React, {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { cn } from './cn';
import { SsooPageChromeStack } from './page-chrome';
import { Button } from '@ssoo/web-ui';

export const SSOO_CONTENT_PAGE_METRICS = {
  mainContentWidthPx: 975,
  landscapeContentWidthPx: 1380,
  auxiliarySlotWidthPx: 340,
  documentMaxWidthPx: 975,
  subContentWidthPx: 340,
  sidecarWidthPx: 340,
  bottomPanelHeightPx: 320,
  sidecarToggleWidthPx: 20,
} as const;

export type SsooContentPageTone = 'neutral' | 'document-viewer' | 'document-editor' | 'ai' | 'settings' | 'transparent';
export type SsooContentPageLayoutVariant = 'standard' | 'fluid' | 'main-only' | 'canvas';
export type SsooContentPageSurfaceVariant = 'default' | 'transparent' | 'transparent-rounded' | 'plain';
export type SsooContentPageSidecarMode = 'custom' | 'hidden';
export type SsooContentPageSidecarNarrowBehavior = 'overlay' | 'auto-close';

export interface SsooContentPageSidecarControlSlots {
  collapseIcon?: ReactNode;
  expandIcon?: ReactNode;
}

export interface SsooContentPageTemplateProps {
  breadcrumbSlot: ReactNode;
  headerSlot: ReactNode;
  mainContentSlot: ReactNode;
  leftSubContentSlot?: ReactNode;
  rightSubContentSlot?: ReactNode;
  sidecarSlot?: ReactNode;
  bottomPanelSlot?: ReactNode;
  stateSlot?: ReactNode;
  pageTone?: SsooContentPageTone;
  pageVariant?: SsooContentPageLayoutVariant;
  contentSurface?: SsooContentPageSurfaceVariant;
  sidecarMode?: SsooContentPageSidecarMode;
  sidecarNarrowBehavior?: SsooContentPageSidecarNarrowBehavior;
  sidecarOpen?: boolean;
  sidecarDefaultOpen?: boolean;
  onSidecarOpenChange?: (open: boolean) => void;
  sidecarControlSlots?: SsooContentPageSidecarControlSlots;
  sidecarCollapseLabel?: string;
  sidecarExpandLabel?: string;
  sidecarOverlayCloseLabel?: string;
  compactMode?: boolean;
  bottomPanelHeight?: number;
  bottomPanelOpen?: boolean;
  bottomPanelDefaultOpen?: boolean;
  onBottomPanelOpenChange?: (open: boolean) => void;
  bottomPanelExpandLabel?: string;
  bottomPanelCollapseLabel?: string;
}

const mainSurfaceClassMap: Record<SsooContentPageSurfaceVariant, string> = {
  default: 'rounded-lg border border-ssoo-content-border bg-white',
  transparent: 'border-0 bg-transparent',
  'transparent-rounded': 'rounded-lg border-0 bg-transparent',
  plain: '',
};

export const SSOO_CONTENT_PAGE_TONE_CLASSES: Record<SsooContentPageTone, string> = {
  neutral: 'ssoo-content-page-tone-neutral',
  'document-viewer': 'ssoo-content-page-tone-document-viewer',
  'document-editor': 'ssoo-content-page-tone-document-editor',
  ai: 'ssoo-content-page-tone-ai',
  settings: 'ssoo-content-page-tone-settings',
  transparent: 'ssoo-content-page-tone-transparent',
} as const;

const SSOO_CONTENT_PAGE_STATE_TONE_CLASSES: Record<SsooContentPageTone, string> = {
  neutral: 'ssoo-content-page-state-tone-neutral',
  'document-viewer': 'ssoo-content-page-state-tone-document-viewer',
  'document-editor': 'ssoo-content-page-state-tone-document-editor',
  ai: 'ssoo-content-page-state-tone-ai',
  settings: 'ssoo-content-page-state-tone-settings',
  transparent: 'ssoo-content-page-state-tone-transparent',
} as const;

function getNextBoolean(next: boolean | ((current: boolean) => boolean), current: boolean) {
  return typeof next === 'function' ? next(current) : next;
}

function DefaultCollapseIcon() {
  return <span aria-hidden="true">&gt;</span>;
}

function DefaultExpandIcon() {
  return <span aria-hidden="true">&lt;</span>;
}

export function SsooContentPageTemplate({
  breadcrumbSlot,
  headerSlot,
  mainContentSlot,
  leftSubContentSlot,
  rightSubContentSlot,
  sidecarSlot,
  bottomPanelSlot,
  stateSlot,
  pageTone = 'neutral',
  pageVariant = 'standard',
  contentSurface = 'default',
  sidecarMode: sidecarModeProp,
  sidecarNarrowBehavior = 'overlay',
  sidecarOpen: controlledSidecarOpen,
  sidecarDefaultOpen,
  onSidecarOpenChange,
  sidecarControlSlots,
  sidecarCollapseLabel = '패널 접기',
  sidecarExpandLabel = '패널 펼치기',
  sidecarOverlayCloseLabel = '패널 닫기',
  compactMode = false,
  bottomPanelHeight = SSOO_CONTENT_PAGE_METRICS.bottomPanelHeightPx,
  bottomPanelOpen: controlledBottomPanelOpen,
  bottomPanelDefaultOpen = false,
  onBottomPanelOpenChange,
  bottomPanelExpandLabel = '하단 패널 펼치기',
  bottomPanelCollapseLabel = '하단 패널 접기',
}: SsooContentPageTemplateProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [shellWidth, setShellWidth] = useState(0);
  const [hasMeasured, setHasMeasured] = useState(false);
  const [sidecarForcedOpen, setSidecarForcedOpen] = useState(false);
  const [uncontrolledSidecarOpen, setUncontrolledSidecarOpen] = useState(() => {
    if (typeof sidecarDefaultOpen === 'boolean') return sidecarDefaultOpen;
    return !compactMode;
  });
  const [uncontrolledBottomPanelOpen, setUncontrolledBottomPanelOpen] = useState(bottomPanelDefaultOpen);

  const isMainOnlyVariant = pageVariant === 'main-only' || pageVariant === 'canvas';
  const isMainConstrained = pageVariant === 'standard' || pageVariant === 'main-only';
  const effectiveLeftSubContentSlot = isMainOnlyVariant ? undefined : leftSubContentSlot;
  const effectiveRightSubContentSlot = isMainOnlyVariant ? undefined : rightSubContentSlot;
  const effectiveSidecarSlot = isMainOnlyVariant ? undefined : sidecarSlot;
  const effectiveBottomPanelSlot = isMainOnlyVariant ? undefined : bottomPanelSlot;
  const sidecarMode = isMainOnlyVariant ? 'hidden' : (sidecarModeProp ?? (effectiveSidecarSlot ? 'custom' : 'hidden'));
  const hasSidecar = sidecarMode === 'custom' && Boolean(effectiveSidecarSlot);
  const sidecarOpen = controlledSidecarOpen ?? uncontrolledSidecarOpen;
  const bottomPanelOpen = controlledBottomPanelOpen ?? uncontrolledBottomPanelOpen;

  const setSidecarOpen = useCallback(
    (next: boolean | ((current: boolean) => boolean)) => {
      const nextOpen = getNextBoolean(next, controlledSidecarOpen ?? uncontrolledSidecarOpen);
      if (controlledSidecarOpen === undefined) {
        setUncontrolledSidecarOpen(nextOpen);
      }
      onSidecarOpenChange?.(nextOpen);
    },
    [controlledSidecarOpen, onSidecarOpenChange, uncontrolledSidecarOpen],
  );

  const setBottomPanelOpen = useCallback(
    (next: boolean | ((current: boolean) => boolean)) => {
      const nextOpen = getNextBoolean(next, controlledBottomPanelOpen ?? uncontrolledBottomPanelOpen);
      if (controlledBottomPanelOpen === undefined) {
        setUncontrolledBottomPanelOpen(nextOpen);
      }
      onBottomPanelOpenChange?.(nextOpen);
    },
    [controlledBottomPanelOpen, onBottomPanelOpenChange, uncontrolledBottomPanelOpen],
  );

  useLayoutEffect(() => {
    const node = shellRef.current;
    if (!node) return undefined;

    const measure = () => {
      const nextWidth = node.getBoundingClientRect().width;
      setShellWidth(nextWidth);
      setHasMeasured(true);
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(() => measure());
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (compactMode && sidecarNarrowBehavior !== 'auto-close') {
      setSidecarOpen(false);
      setSidecarForcedOpen(false);
    }
  }, [compactMode, setSidecarOpen, sidecarNarrowBehavior]);

  useEffect(() => {
    if (sidecarNarrowBehavior === 'auto-close' && !sidecarOpen) {
      setSidecarForcedOpen(false);
    }
  }, [sidecarNarrowBehavior, sidecarOpen]);

  const resolvedMainMaxWidth = isMainConstrained ? SSOO_CONTENT_PAGE_METRICS.mainContentWidthPx : null;
  const leftSubWidth = effectiveLeftSubContentSlot ? SSOO_CONTENT_PAGE_METRICS.subContentWidthPx : 0;
  const rightSubWidth = effectiveRightSubContentSlot ? SSOO_CONTENT_PAGE_METRICS.subContentWidthPx : 0;
  const minWidthForSideBySide = (resolvedMainMaxWidth ?? SSOO_CONTENT_PAGE_METRICS.mainContentWidthPx) + leftSubWidth + rightSubWidth + SSOO_CONTENT_PAGE_METRICS.sidecarWidthPx + 40;
  const canFitSideBySide = hasSidecar && !compactMode && shellWidth >= minWidthForSideBySide;
  const canShowSideBySide = sidecarOpen && canFitSideBySide;
  const shouldOverlaySidecar = hasSidecar && sidecarOpen && !canShowSideBySide && (sidecarNarrowBehavior === 'overlay' || sidecarForcedOpen);
  const shouldRenderSidecar = hasSidecar && (canShowSideBySide || shouldOverlaySidecar);
  const showSidecar = shouldRenderSidecar && sidecarOpen;
  const showBottomPanel = Boolean(effectiveBottomPanelSlot && bottomPanelOpen);

  useEffect(() => {
    if (canShowSideBySide && sidecarForcedOpen) {
      setSidecarForcedOpen(false);
    }
  }, [canShowSideBySide, sidecarForcedOpen]);

  const contentLaneStyle = useMemo<CSSProperties>(
    () => ({
      width: canShowSideBySide ? `calc(100% - ${SSOO_CONTENT_PAGE_METRICS.sidecarWidthPx}px)` : '100%',
    }),
    [canShowSideBySide],
  );

  const mainSurfaceClassName = cn(
    isMainConstrained && 'flex flex-col overflow-hidden',
    isMainConstrained && mainSurfaceClassMap[contentSurface],
  );

  const collapseIcon = sidecarControlSlots?.collapseIcon ?? <DefaultCollapseIcon />;
  const expandIcon = sidecarControlSlots?.expandIcon ?? <DefaultExpandIcon />;
  const pageClassName = cn('overflow-hidden', SSOO_CONTENT_PAGE_TONE_CLASSES[pageTone]);
  const stateSurfaceClassName = cn(
    'flex flex-1 items-center justify-center rounded-lg border border-ssoo-content-border',
    SSOO_CONTENT_PAGE_STATE_TONE_CLASSES[pageTone],
  );

  const renderSubContentLane = (slot: ReactNode, side: 'left' | 'right', width: number) => {
    if (!slot) return null;
    return (
      <aside
        className={cn(
          'h-full min-h-0 shrink-0 overflow-hidden bg-white',
          side === 'left' ? 'border-r border-ssoo-content-border' : 'border-l border-ssoo-content-border',
        )}
        style={{ width }}
        data-ssoo-content-page-slot={`${side}-sub-content`}
      >
        <div className="h-full min-h-0 overflow-hidden p-3">{slot}</div>
      </aside>
    );
  };

  if (stateSlot) {
    return (
      <SsooPageChromeStack breadcrumbSlot={breadcrumbSlot} headerSlot={headerSlot} className={pageClassName}>
        <div className={stateSurfaceClassName} data-ssoo-content-page-state data-ssoo-content-page-tone={pageTone}>
          {stateSlot}
        </div>
      </SsooPageChromeStack>
    );
  }

  return (
    <SsooPageChromeStack breadcrumbSlot={breadcrumbSlot} headerSlot={headerSlot} className={pageClassName}>
      <div
        ref={shellRef}
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
        data-ssoo-content-page-template
        data-ssoo-content-page-tone={pageTone}
      >
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {shouldOverlaySidecar ? (
            <Button variant="plain" size="plain"
              type="button"
              aria-label={sidecarOverlayCloseLabel}
              className="absolute inset-0 z-0 bg-transparent"
              onClick={() => {
                setSidecarOpen(false);
                setSidecarForcedOpen(false);
              }}
            />
          ) : null}

          <div className="relative flex h-full min-h-0 overflow-hidden">
            <div
              className={cn('flex h-full min-h-0 min-w-0', hasMeasured && 'transition-all duration-300 ease-in-out')}
              style={contentLaneStyle}
            >
              {renderSubContentLane(effectiveLeftSubContentSlot, 'left', SSOO_CONTENT_PAGE_METRICS.subContentWidthPx)}

              <div className="h-full min-h-0 min-w-0 flex-1 overflow-hidden" data-ssoo-content-page-slot="main-content">
                <div className={cn('flex h-full overflow-hidden', isMainConstrained && 'justify-center px-4')}>
                  <div className={cn('h-full w-full', mainSurfaceClassName)} style={resolvedMainMaxWidth ? { maxWidth: resolvedMainMaxWidth } : undefined}>
                    {mainContentSlot}
                  </div>
                </div>
              </div>

              {renderSubContentLane(effectiveRightSubContentSlot, 'right', SSOO_CONTENT_PAGE_METRICS.subContentWidthPx)}
            </div>

            {hasSidecar ? (
              <Button variant="plain" size="plain"
                type="button"
                aria-label={showSidecar ? sidecarCollapseLabel : sidecarExpandLabel}
                className={cn(
                  'absolute top-1/2 z-20 -translate-y-1/2',
                  'flex items-center justify-center',
                  'h-12 w-5 rounded-l-md',
                  'border border-r-0 border-ssoo-content-border bg-ssoo-content-bg ssoo-hover-bg-content-border-50',
                  'transition-all duration-300 ease-in-out',
                  'shadow-sm',
                )}
                style={{ right: showSidecar ? SSOO_CONTENT_PAGE_METRICS.sidecarWidthPx : 0 }}
                onClick={() => {
                  if (showSidecar) {
                    setSidecarOpen(false);
                    setSidecarForcedOpen(false);
                    return;
                  }

                  setSidecarOpen(true);
                  setSidecarForcedOpen((sidecarNarrowBehavior === 'auto-close' && !canFitSideBySide) || compactMode);
                }}
              >
                {showSidecar ? collapseIcon : expandIcon}
              </Button>
            ) : null}

            {showSidecar ? (
              <div
                className={cn(
                  'z-10 h-full',
                  'border border-ssoo-content-border bg-ssoo-content-bg',
                  'overflow-auto',
                  hasMeasured && 'transition-all duration-300 ease-in-out',
                  'rounded-l-lg',
                  canShowSideBySide
                    ? 'relative opacity-100'
                    : 'absolute right-0 top-0 translate-x-0 opacity-100 shadow-lg',
                )}
                style={{
                  width: SSOO_CONTENT_PAGE_METRICS.sidecarWidthPx,
                  flexShrink: canShowSideBySide ? 0 : undefined,
                }}
                data-ssoo-content-page-slot="sidecar"
              >
                {effectiveSidecarSlot}
              </div>
            ) : null}
          </div>
        </div>

        {effectiveBottomPanelSlot ? (
          <section
            className={cn('shrink-0 overflow-hidden border-t border-ssoo-content-border bg-white', hasMeasured && 'transition-[height] duration-200 ease-out')}
            style={{ height: showBottomPanel ? bottomPanelHeight : 36 }}
            data-ssoo-content-page-slot="bottom-panel"
          >
            <div className="flex h-9 items-center justify-end border-b border-ssoo-content-border px-3">
              <Button variant="plain" size="plain"
                type="button"
                className="rounded-md px-2 py-1 text-xs font-medium text-ssoo-secondary transition-colors hover:bg-ssoo-menu-hover hover:text-ssoo-primary"
                aria-label={showBottomPanel ? bottomPanelCollapseLabel : bottomPanelExpandLabel}
                onClick={() => setBottomPanelOpen((open) => !open)}
              >
                {showBottomPanel ? bottomPanelCollapseLabel : bottomPanelExpandLabel}
              </Button>
            </div>
            {showBottomPanel ? <div className="h-[calc(100%-36px)] min-h-0 overflow-hidden">{effectiveBottomPanelSlot}</div> : null}
          </section>
        ) : null}
      </div>
    </SsooPageChromeStack>
  );
}
