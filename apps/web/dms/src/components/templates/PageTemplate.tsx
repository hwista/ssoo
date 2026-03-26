'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores';
import { LAYOUT_SIZES } from '@/lib/constants/layout';
import {
  Breadcrumb,
  Header,
  type HeaderAction,
  DOCUMENT_WIDTHS,
  DEFAULT_DOCUMENT_ORIENTATION,
  type DocumentOrientation,
} from './page-frame';
import { LoadingState, ErrorState } from '@/components/common/StateDisplay';

export interface PageTemplateProps {
  filePath: string;
  mode: 'viewer' | 'editor' | 'create';
  children: React.ReactNode;
  description?: string;
  headerExtraActions?: HeaderAction[];
  headerExtraActionsPosition?: 'left' | 'right';
  headerEditorRightSlot?: React.ReactNode;
  headerEditorPreviewSlot?: React.ReactNode;
  contentOrientation?: DocumentOrientation;
  contentMaxWidth?: number | null;
  contentWrapperClassName?: string;
  contentSurfaceClassName?: string;
  sidecarWidth?: number;
  sidecarContent?: React.ReactNode;
  sidecarMode?: 'custom' | 'hidden';
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onBack?: () => void;
  onDelete?: () => void;
  onHistory?: () => void;
  onPathClick?: (path: string) => void;
  breadcrumbRootIconVariant?: 'default' | 'ai' | 'folder' | 'editor';
  breadcrumbLastSegmentLabel?: string;
  saving?: boolean;
  saveDisabled?: boolean;
  isPreview?: boolean;
  loading?: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  className?: string;
}

export function PageTemplate({
  filePath,
  mode,
  children,
  description,
  headerExtraActions,
  headerExtraActionsPosition = 'left',
  headerEditorRightSlot,
  headerEditorPreviewSlot,
  contentOrientation = DEFAULT_DOCUMENT_ORIENTATION,
  contentMaxWidth,
  contentWrapperClassName,
  contentSurfaceClassName,
  sidecarWidth = LAYOUT_SIZES.sidebar.expandedWidth,
  sidecarContent,
  sidecarMode,
  onEdit,
  onSave,
  onCancel,
  onBack,
  onDelete,
  onHistory,
  onPathClick,
  breadcrumbRootIconVariant = 'default',
  breadcrumbLastSegmentLabel,
  saving = false,
  saveDisabled = false,
  isPreview = false,
  loading = false,
  error,
  onRetry,
  className,
}: PageTemplateProps) {
  const isCompactMode = useSidebarStore((s) => s.isCompactMode);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [sidecarOpen, setSidecarOpen] = React.useState(!isCompactMode);
  const [hasMeasured, setHasMeasured] = React.useState(false);

  React.useEffect(() => {
    if (isCompactMode) {
      setSidecarOpen(false);
    }
  }, [isCompactMode]);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        if (entry.contentRect.width > 0) {
          setHasMeasured(true);
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const resolvedSidecarMode = sidecarMode ?? (sidecarContent ? 'custom' : 'hidden');
  const supportsSidecar = resolvedSidecarMode !== 'hidden';
  const resolvedContentMaxWidth = contentMaxWidth === null
    ? null
    : contentMaxWidth ?? DOCUMENT_WIDTHS[contentOrientation];
  const minWidthForSideBySide = (resolvedContentMaxWidth ?? DOCUMENT_WIDTHS[contentOrientation]) + sidecarWidth + 40;
  const canSideBySide = !isCompactMode && containerWidth >= minWidthForSideBySide;
  const showSidecar = supportsSidecar && sidecarOpen;

  const defaultVisualClasses = 'rounded-lg border border-ssoo-content-border bg-white';
  const isConstrained = resolvedContentMaxWidth !== null;

  const contentNode = (
    <div className={cn(
      'flex h-full overflow-hidden',
      isConstrained && 'justify-center px-4',
      contentWrapperClassName
    )}>
      <div
        className={cn(
          'h-full w-full',
          isConstrained && cn(
            'flex flex-col overflow-hidden',
            contentSurfaceClassName ?? defaultVisualClasses
          )
        )}
        style={isConstrained ? { maxWidth: resolvedContentMaxWidth ?? undefined } : undefined}
      >
        {children}
      </div>
    </div>
  );

  const headerNode = (
    <Header
      mode={mode}
      description={description}
      extraActions={headerExtraActions}
      extraActionsPosition={headerExtraActionsPosition}
      editorRightSlot={headerEditorRightSlot}
      editorPreviewSlot={headerEditorPreviewSlot}
      onEdit={onEdit}
      onSave={onSave}
      onCancel={onCancel}
      onBack={onBack}
      onDelete={onDelete}
      onHistory={onHistory}
      saving={saving}
      saveDisabled={saveDisabled}
      isPreview={isPreview}
    />
  );

  if (error) {
    return (
      <div className={cn('flex flex-col h-full p-4 gap-4', className)}>
        <Breadcrumb
          filePath={filePath}
          lastSegmentLabel={breadcrumbLastSegmentLabel}
          onPathClick={onPathClick}
          isEditing={mode === 'editor' || mode === 'create'}
          rootIconVariant={breadcrumbRootIconVariant}
        />
        {headerNode}
        <div className="flex-1 flex items-center justify-center bg-white border border-gray-200 rounded-lg">
          <ErrorState error={error} onRetry={onRetry} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn('flex flex-col h-full p-4 gap-4', className)}>
        <Breadcrumb
          filePath={filePath}
          lastSegmentLabel={breadcrumbLastSegmentLabel}
          onPathClick={onPathClick}
          isEditing={mode === 'editor' || mode === 'create'}
          rootIconVariant={breadcrumbRootIconVariant}
        />
        {headerNode}
        <div className="flex-1 flex items-center justify-center bg-white border border-gray-200 rounded-lg">
          <LoadingState message="문서를 불러오는 중..." />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full p-4 gap-4', className)}>
      <Breadcrumb
        filePath={filePath}
        lastSegmentLabel={breadcrumbLastSegmentLabel}
        onPathClick={onPathClick}
        isEditing={mode === 'editor' || mode === 'create'}
        rootIconVariant={breadcrumbRootIconVariant}
      />
      {headerNode}

      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        <div className="flex h-full">
          <div
            className={cn('h-full', hasMeasured && 'transition-all duration-300 ease-in-out')}
            style={{
              width: canSideBySide && showSidecar ? `calc(100% - ${sidecarWidth}px)` : '100%',
            }}
          >
            {contentNode}
          </div>

          {supportsSidecar && (
            <button
              onClick={() => setSidecarOpen((prev) => !prev)}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 z-20',
                'flex items-center justify-center',
                'w-5 h-12 rounded-l-md',
                'bg-ssoo-content-bg hover:bg-ssoo-content-border/50 border border-r-0 border-ssoo-content-border',
                'transition-all duration-300 ease-in-out',
                'shadow-sm'
              )}
              style={{ right: showSidecar ? sidecarWidth : 0 }}
              aria-label={showSidecar ? 'Sidecar 접기' : 'Sidecar 펼치기'}
            >
              {showSidecar ? (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-gray-500" />
              )}
            </button>
          )}

          {supportsSidecar && (
            <div
              className={cn(
                'h-full z-10',
                'bg-ssoo-content-bg border border-ssoo-content-border',
                'overflow-auto',
                hasMeasured && 'transition-all duration-300 ease-in-out',
                'rounded-l-lg',
                canSideBySide
                  ? (showSidecar
                    ? 'relative opacity-100'
                    : 'absolute right-0 top-0 opacity-0 translate-x-full pointer-events-none')
                  : (showSidecar
                    ? 'absolute right-0 top-0 opacity-100 translate-x-0 shadow-lg'
                    : 'absolute right-0 top-0 opacity-0 translate-x-full pointer-events-none')
              )}
              style={{
                width: sidecarWidth,
                flexShrink: canSideBySide ? 0 : undefined,
              }}
            >
              {resolvedSidecarMode === 'custom' && sidecarContent ? sidecarContent : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
