'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  SsooContentPageTemplate,
  type SsooContentPageLayoutVariant,
  type SsooContentPageSidecarMode,
  type SsooContentPageSidecarNarrowBehavior,
  type SsooContentPageSurfaceVariant,
  type SsooContentPageTone,
} from '@ssoo/web-shell';
import { useSidebarStore } from '@/stores';
import {
  Breadcrumb,
  Header,
  type HeaderAction,
} from './page-frame';
import { LoadingState, ErrorState } from '@/components/common/StateDisplay';

export interface PageTemplateProps {
  filePath: string;
  mode: 'viewer' | 'editor' | 'create';
  children: React.ReactNode;
  description?: string;
  headerExtraActions?: HeaderAction[];
  headerExtraActionsPosition?: 'left' | 'right';
  headerViewerRightSlot?: React.ReactNode;
  headerEditorPreviewSlot?: React.ReactNode;
  leftSubContentSlot?: React.ReactNode;
  rightSubContentSlot?: React.ReactNode;
  bottomPanelSlot?: React.ReactNode;
  pageTone?: SsooContentPageTone;
  pageVariant?: SsooContentPageLayoutVariant;
  contentSurface?: SsooContentPageSurfaceVariant;
  bottomPanelHeight?: number;
  panelContent?: React.ReactNode;
  panelMode?: SsooContentPageSidecarMode;
  panelNarrowBehavior?: SsooContentPageSidecarNarrowBehavior;
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
  stateSlot?: React.ReactNode;
  onRetry?: () => void;
}

export function PageTemplate({
  filePath,
  mode,
  children,
  description,
  headerExtraActions,
  headerExtraActionsPosition = 'left',
  headerViewerRightSlot,
  headerEditorPreviewSlot,
  leftSubContentSlot,
  rightSubContentSlot,
  bottomPanelSlot,
  pageTone,
  pageVariant = 'standard',
  contentSurface = 'default',
  bottomPanelHeight,
  panelContent,
  panelMode,
  panelNarrowBehavior = 'overlay',
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
  stateSlot,
  onRetry,
}: PageTemplateProps) {
  const isCompactMode = useSidebarStore((s) => s.isCompactMode);
  const resolvedPageTone = pageTone ?? (mode === 'editor' || mode === 'create' ? 'document-editor' : 'document-viewer');

  const headerNode = (
    <Header
      mode={mode}
      description={description}
      extraActions={headerExtraActions}
      extraActionsPosition={headerExtraActionsPosition}
      viewerRightSlot={headerViewerRightSlot}
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
  const breadcrumbNode = (
    <Breadcrumb
      filePath={filePath}
      lastSegmentLabel={breadcrumbLastSegmentLabel}
      onPathClick={onPathClick}
      isEditing={mode === 'editor' || mode === 'create'}
      rootIconVariant={breadcrumbRootIconVariant}
    />
  );

  const stateNode = stateSlot ?? (error
    ? <ErrorState error={error} onRetry={onRetry} />
    : loading
      ? <LoadingState message="문서를 불러오는 중..." />
      : undefined);

  return (
    <SsooContentPageTemplate
      breadcrumbSlot={breadcrumbNode}
      headerSlot={headerNode}
      mainContentSlot={children}
      leftSubContentSlot={leftSubContentSlot}
      rightSubContentSlot={rightSubContentSlot}
      sidecarSlot={panelContent}
      bottomPanelSlot={bottomPanelSlot}
      stateSlot={stateNode}
      pageTone={resolvedPageTone}
      pageVariant={pageVariant}
      contentSurface={contentSurface}
      sidecarMode={panelMode}
      sidecarNarrowBehavior={panelNarrowBehavior}
      sidecarControlSlots={{
        collapseIcon: <ChevronRight className="h-4 w-4 text-gray-500" />,
        expandIcon: <ChevronLeft className="h-4 w-4 text-gray-500" />,
      }}
      compactMode={isCompactMode}
      bottomPanelHeight={bottomPanelHeight}
    />
  );
}
