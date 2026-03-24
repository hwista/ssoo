'use client';

import { Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { DiffTargetToggle, DiffToggleButton, PreviewToggleButton } from '../EditorModeControls';
import { Toolbar } from './Toolbar';
import type { DiffTarget, PageMode } from '../../documentPageTypes';
import type { EditorRef } from './Editor';

interface EditorToolbarStripProps {
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
}

export function EditorToolbarStrip({
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
}: EditorToolbarStripProps) {
  return (
    <div className="flex w-full items-center gap-1">
      <PreviewToggleButton
        mode={mode}
        isPreview={surfaceMode !== 'edit'}
        onToggle={() => {
          setSurfaceMode((prev) => (prev === 'edit' ? 'preview' : 'edit'));
        }}
      />
      {surfaceMode === 'edit' && (
        <>
          <Divider orientation="vertical" className="h-6 mx-1" />
          <Toolbar onCommand={(id) => editorRef.current?.applyCommand(id)} />
        </>
      )}
      {(hasUnsavedChanges || surfaceMode === 'diff' || surfaceMode === 'edit') && (
        <>
          <div className="flex-1" />
          {surfaceMode === 'edit' && (
            <>
              <SimpleTooltip content="되돌리기 (Ctrl+Z)">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!canUndo}
                  onClick={() => editorRef.current?.undo()}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </SimpleTooltip>
              <SimpleTooltip content="다시 적용 (Ctrl+Shift+Z)">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!canRedo}
                  onClick={() => editorRef.current?.redo()}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </SimpleTooltip>
              <Divider orientation="vertical" className="h-6 mx-1" />
            </>
          )}
          {surfaceMode === 'diff' && (
            <DiffTargetToggle value={diffTarget} onChange={setDiffTarget} />
          )}
          <DiffToggleButton
            mode={mode}
            active={surfaceMode === 'diff'}
            disabled={!hasUnsavedChanges && surfaceMode !== 'diff'}
            onToggle={handleDiffToggle}
          />
        </>
      )}
    </div>
  );
}
