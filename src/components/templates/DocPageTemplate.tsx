'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores';
import { LAYOUT_SIZES } from '@/types';
import {
  Breadcrumb,
  Header,
  type HeaderAction,
  Sidecar,
  type SidecarProps,
  DOCUMENT_WIDTHS,
  DEFAULT_DOCUMENT_ORIENTATION,
  type DocumentOrientation,
} from '../common/page';
import { LoadingState, ErrorState } from '@/components/common/StateDisplay';
import type { DocumentMetadata } from '@/types';

export interface DocPageTemplateProps {
  filePath: string;
  mode: 'viewer' | 'editor' | 'create';
  children: React.ReactNode;
  description?: string;
  headerExtraActions?: HeaderAction[];
  headerExtraActionsPosition?: 'left' | 'right';
  headerEditorInlineSlot?: React.ReactNode;
  headerEditorPreviewSlot?: React.ReactNode;
  contentOrientation?: DocumentOrientation;
  contentMaxWidth?: number | null;
  contentWrapperClassName?: string;
  contentSurfaceClassName?: string;
  metadata?: SidecarProps['metadata'];
  tags?: string[];
  sidecarWidth?: number;
  documentMetadata?: DocumentMetadata | null;
  onMetadataChange?: (update: Partial<DocumentMetadata>) => void;
  sidecarContent?: React.ReactNode;
  sidecarMode?: 'default' | 'custom' | 'hidden';
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onHistory?: () => void;
  onPathClick?: (path: string) => void;
  breadcrumbRootIconVariant?: 'default' | 'ai' | 'folder' | 'editor';
  saving?: boolean;
  loading?: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  className?: string;
}

export function DocPageTemplate({
  filePath,
  mode,
  children,
  description,
  headerExtraActions,
  headerExtraActionsPosition = 'left',
  headerEditorInlineSlot,
  headerEditorPreviewSlot,
  contentOrientation = DEFAULT_DOCUMENT_ORIENTATION,
  contentMaxWidth,
  contentWrapperClassName,
  contentSurfaceClassName,
  metadata,
  tags,
  sidecarWidth = LAYOUT_SIZES.sidebar.expandedWidth,
  documentMetadata,
  onMetadataChange,
  sidecarContent,
  sidecarMode,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onHistory,
  onPathClick,
  breadcrumbRootIconVariant = 'default',
  saving = false,
  loading = false,
  error,
  onRetry,
  className,
}: DocPageTemplateProps) {
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

  const resolvedSidecarMode = sidecarMode ?? (sidecarContent ? 'custom' : 'default');
  const supportsSidecar = resolvedSidecarMode !== 'hidden';
  const resolvedContentMaxWidth = contentMaxWidth === null
    ? null
    : contentMaxWidth ?? DOCUMENT_WIDTHS[contentOrientation];
  const minWidthForSideBySide = (resolvedContentMaxWidth ?? DOCUMENT_WIDTHS[contentOrientation]) + sidecarWidth + 40;
  const canSideBySide = !isCompactMode && containerWidth >= minWidthForSideBySide;
  const showSidecar = supportsSidecar && sidecarOpen;

  const defaultVisualClasses = 'rounded-lg border border-ssoo-content-border bg-white';
  const resolvedSurfaceClassName = cn(
    'flex h-full w-full flex-col overflow-hidden',
    contentSurfaceClassName ?? defaultVisualClasses
  );

  const contentNode = resolvedContentMaxWidth !== null ? (
    <div className={cn('flex h-full justify-center overflow-hidden px-4', contentWrapperClassName)}>
      <div
        className={cn('h-full w-full', resolvedSurfaceClassName)}
        style={{ maxWidth: resolvedContentMaxWidth ?? undefined }}
      >
        {children}
      </div>
    </div>
  ) : children;

  const headerNode = (
    <Header
      mode={mode}
      description={description}
      extraActions={headerExtraActions}
      extraActionsPosition={headerExtraActionsPosition}
      editorInlineSlot={headerEditorInlineSlot}
      editorPreviewSlot={headerEditorPreviewSlot}
      onEdit={onEdit}
      onSave={onSave}
      onCancel={onCancel}
      onDelete={onDelete}
      onHistory={onHistory}
      saving={saving}
    />
  );

  if (error) {
    return (
      <div className={cn('flex flex-col h-full p-4 gap-4', className)}>
        <Breadcrumb
          filePath={filePath}
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
                'bg-ssoo-content-bg border-l border-ssoo-content-border',
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
              {resolvedSidecarMode === 'custom' && sidecarContent ? sidecarContent : (
                <Sidecar
                  metadata={metadata}
                  tags={tags}
                  editable={mode === 'editor' || mode === 'create'}
                  documentMetadata={documentMetadata}
                  onMetadataChange={onMetadataChange}
                  filePath={filePath}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
