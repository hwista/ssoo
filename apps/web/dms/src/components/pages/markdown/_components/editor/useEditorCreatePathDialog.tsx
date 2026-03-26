'use client';

import * as React from 'react';
import { ImageInsertDialog } from './ImageInsertDialog';
import { LinkInsertDialog } from './LinkInsertDialog';
import { SaveLocationDialog } from '@/components/common/save-location';
import type { SaveLocationResult } from '@/components/common/save-location';

interface SaveLocationState {
  open: boolean;
  initialTitle: string;
  initialDirectory: string;
  fileName: string;
  isNewDocument: boolean;
}

const INITIAL_SAVE_LOCATION: SaveLocationState = {
  open: false,
  initialTitle: '',
  initialDirectory: '',
  fileName: '',
  isNewDocument: true,
};

export interface CreatePathResult {
  path: string;
  title: string;
}

/** blob URL → File 맵 (문서 저장 시 일괄 업로드 용) */
export type PendingImageMap = Map<string, File>;

export function useEditorCreatePathDialog(currentFilePath?: string | null) {
  const [saveLocationState, setSaveLocationState] = React.useState<SaveLocationState>(INITIAL_SAVE_LOCATION);
  const [imageDialogOpen, setImageDialogOpen] = React.useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
  const saveLocationResolverRef = React.useRef<((value: CreatePathResult | null) => void) | null>(null);
  const imageResolverRef = React.useRef<((value: string | null) => void) | null>(null);
  const linkResolverRef = React.useRef<((value: string | null) => void) | null>(null);

  // 업로드 대기 중인 이미지 (blob URL → File)
  const pendingImagesRef = React.useRef<PendingImageMap>(new Map());

  const requestSaveLocation = React.useCallback((params: {
    suggestedTitle?: string;
    suggestedDirectory?: string;
    fileName: string;
    isNewDocument: boolean;
  }) => {
    return new Promise<CreatePathResult | null>((resolve) => {
      saveLocationResolverRef.current = resolve;
      setSaveLocationState({
        open: true,
        initialTitle: params.suggestedTitle || '',
        initialDirectory: params.suggestedDirectory || '',
        fileName: params.fileName,
        isNewDocument: params.isNewDocument,
      });
    });
  }, []);

  const requestCreatePath = React.useCallback((preferredPath?: string) => {
    const pathHint = preferredPath?.trim() || '';
    const parts = pathHint.split('/');
    const namePart = parts.pop()?.replace(/\.md$/i, '') || '';
    const dirPart = parts.join('/');

    return requestSaveLocation({
      suggestedTitle: namePart,
      suggestedDirectory: dirPart,
      fileName: '',
      isNewDocument: true,
    }).then((result) => result?.path ?? null);
  }, [requestSaveLocation]);

  const requestImageUrl = React.useCallback(() => {
    return new Promise<string | null>((resolve) => {
      imageResolverRef.current = resolve;
      setImageDialogOpen(true);
    });
  }, []);

  const requestLinkUrl = React.useCallback(() => {
    return new Promise<string | null>((resolve) => {
      linkResolverRef.current = resolve;
      setLinkDialogOpen(true);
    });
  }, []);

  const closeSaveLocation = React.useCallback((result: SaveLocationResult | null) => {
    if (result) {
      const fullPath = result.directory
        ? `${result.directory}/${result.fileName}`
        : result.fileName;
      saveLocationResolverRef.current?.({ path: fullPath, title: result.title });
    } else {
      saveLocationResolverRef.current?.(null);
    }
    saveLocationResolverRef.current = null;
    setSaveLocationState(INITIAL_SAVE_LOCATION);
  }, []);

  const closeImageDialog = React.useCallback((url: string | null, pendingFile?: File) => {
    if (url && pendingFile) {
      pendingImagesRef.current.set(url, pendingFile);
    }
    imageResolverRef.current?.(url || null);
    imageResolverRef.current = null;
    setImageDialogOpen(false);
  }, []);

  const closeLinkDialog = React.useCallback((url: string | null) => {
    linkResolverRef.current?.(url || null);
    linkResolverRef.current = null;
    setLinkDialogOpen(false);
  }, []);

  const clearPendingImages = React.useCallback(() => {
    for (const blobUrl of pendingImagesRef.current.keys()) {
      URL.revokeObjectURL(blobUrl);
    }
    pendingImagesRef.current.clear();
  }, []);

  return {
    requestCreatePath,
    requestSaveLocation,
    requestImageUrl,
    requestLinkUrl,
    pendingImagesRef,
    clearPendingImages,
    createPathDialog: (
      <>
        <SaveLocationDialog
          open={saveLocationState.open}
          onOpenChange={(open) => { if (!open) closeSaveLocation(null); }}
          initialTitle={saveLocationState.initialTitle}
          initialDirectory={saveLocationState.initialDirectory}
          fileName={saveLocationState.fileName}
          isNewDocument={saveLocationState.isNewDocument}
          onConfirm={closeSaveLocation}
        />
        <ImageInsertDialog
          open={imageDialogOpen}
          onConfirm={(url, pendingFile) => closeImageDialog(url, pendingFile)}
          onCancel={() => closeImageDialog(null)}
        />
        <LinkInsertDialog
          open={linkDialogOpen}
          currentFilePath={currentFilePath}
          onConfirm={(url) => closeLinkDialog(url)}
          onCancel={() => closeLinkDialog(null)}
        />
      </>
    ),
  };
}
