'use client';

import { SectionedShell } from '@/components/templates/page-frame';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { EditorToolbarStrip } from './editor';
import type { DiffTarget, PageMode } from '../documentPageTypes';
import type { EditorRef } from './editor';

interface DocumentPageEditorShellProps {
  mode: PageMode;
  surfaceMode: 'edit' | 'preview' | 'diff';
  setSurfaceMode: React.Dispatch<React.SetStateAction<'edit' | 'preview' | 'diff'>>;
  editorRef: React.RefObject<EditorRef | null>;
  canUndo: boolean;
  canRedo: boolean;
  hasUnsavedChanges: boolean;
  diffTarget: DiffTarget;
  setDiffTarget: (target: DiffTarget) => void;
  handleDiffToggle: () => void;
  contentBody: ReactNode;
  diffViewerNode: ReactNode;
  footer?: ReactNode;
}

export function DocumentPageEditorShell({
  mode,
  surfaceMode,
  setSurfaceMode,
  editorRef,
  canUndo,
  canRedo,
  hasUnsavedChanges,
  diffTarget,
  setDiffTarget,
  handleDiffToggle,
  contentBody,
  diffViewerNode,
  footer,
}: DocumentPageEditorShellProps) {
  return (
    <SectionedShell
      variant="editor_with_footer"
      toolbar={(
        <EditorToolbarStrip
          mode={mode}
          surfaceMode={surfaceMode}
          setSurfaceMode={setSurfaceMode}
          editorRef={editorRef}
          canUndo={canUndo}
          canRedo={canRedo}
          hasUnsavedChanges={hasUnsavedChanges}
          diffTarget={diffTarget}
          setDiffTarget={setDiffTarget}
          handleDiffToggle={handleDiffToggle}
        />
      )}
      body={(
        <div className="relative h-full min-h-0 overflow-hidden">
          {hasUnsavedChanges && (
            <span className="absolute top-2 right-4 z-10 rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive/60 pointer-events-none select-none">
              수정됨
            </span>
          )}
          <div
            className={cn(
              'h-full min-h-0',
              surfaceMode === 'diff' && 'absolute inset-0 opacity-0 pointer-events-none'
            )}
          >
            {contentBody}
          </div>
          {surfaceMode === 'diff' ? (
            <div className="absolute inset-0">
              {diffViewerNode}
            </div>
          ) : null}
        </div>
      )}
      footer={surfaceMode === 'edit' ? footer : undefined}
    />
  );
}
