'use client';

import { PageTemplate } from '@/components/templates';
import { ImagePreviewDialog } from '@/components/common/ImagePreviewDialog';
import { ImageLightbox } from '@/components/common/ImageLightbox';
import { cn } from '@/lib/utils';
import { PAGE_BACKGROUND_PRESETS } from '@/components/templates/page-frame';
import type { ReactNode } from 'react';
import type { PageMode } from '../documentPageTypes';

interface DocumentPageFrameProps {
  filePath: string;
  mode: PageMode;
  isCreateMode: boolean;
  surfaceMode: 'edit' | 'preview' | 'diff';
  documentTitle?: string;
  contentSurfaceClassName: string;
  sidecarContent: ReactNode;
  onEdit: () => void;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  onDelete?: () => void | Promise<void>;
  saving: boolean;
  saveDisabled: boolean;
  headerEditorRightSlot: ReactNode;
  children: ReactNode;
  imagePreview: { src: string; alt: string } | null;
  setImagePreview: React.Dispatch<React.SetStateAction<{ src: string; alt: string } | null>>;
  lightboxImage: { src: string; alt: string } | null;
  setLightboxImage: React.Dispatch<React.SetStateAction<{ src: string; alt: string } | null>>;
}

export function DocumentPageFrame({
  filePath,
  mode,
  isCreateMode,
  surfaceMode,
  documentTitle,
  contentSurfaceClassName,
  sidecarContent,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  saving,
  saveDisabled,
  headerEditorRightSlot,
  children,
  imagePreview,
  setImagePreview,
  lightboxImage,
  setLightboxImage,
}: DocumentPageFrameProps) {
  return (
    <main
      className={cn(
        'h-full overflow-hidden',
        mode === 'editor' || mode === 'create'
          ? PAGE_BACKGROUND_PRESETS.documentEditor
          : PAGE_BACKGROUND_PRESETS.documentViewer
      )}
    >
      <PageTemplate
        filePath={filePath}
        mode={mode}
        breadcrumbRootIconVariant={isCreateMode ? 'editor' : 'folder'}
        breadcrumbLastSegmentLabel={documentTitle}
        contentOrientation="portrait"
        contentMaxWidth={surfaceMode === 'diff' ? null : undefined}
        contentSurfaceClassName={contentSurfaceClassName}
        sidecarMode={surfaceMode === 'diff' ? 'hidden' : undefined}
        sidecarContent={sidecarContent}
        onEdit={onEdit}
        onSave={onSave}
        onCancel={onCancel}
        onDelete={onDelete}
        saving={saving}
        saveDisabled={saveDisabled}
        isPreview={surfaceMode !== 'edit'}
        headerEditorRightSlot={headerEditorRightSlot}
      >
        {children}
      </PageTemplate>

      <ImagePreviewDialog
        open={imagePreview !== null}
        onOpenChange={(open) => { if (!open) setImagePreview(null); }}
        src={imagePreview?.src ?? ''}
        alt={imagePreview?.alt}
      />

      <ImageLightbox
        open={lightboxImage !== null}
        onClose={() => setLightboxImage(null)}
        src={lightboxImage?.src ?? ''}
        alt={lightboxImage?.alt}
      />
    </main>
  );
}
