'use client';

import * as React from 'react';
import { useEditorCreatePathDialog } from './useEditorCreatePathDialog';
import type { CreatePathResult } from './useEditorCreatePathDialog';

export interface EditorInteractionDeps {
  requestCreatePath: (preferredPath?: string) => Promise<string | null>;
  requestSaveLocation: (params: {
    suggestedTitle?: string;
    suggestedDirectory?: string;
    fileName: string;
    isNewDocument: boolean;
  }) => Promise<CreatePathResult | null>;
  requestImageUrl: () => Promise<string | null>;
  requestLinkUrl: () => Promise<string | null>;
  openExternalHref: (href: string) => void;
  dialogs: React.ReactNode;
}

export function useEditorInteractions(): EditorInteractionDeps {
  const {
    requestCreatePath,
    requestSaveLocation,
    requestImageUrl,
    requestLinkUrl,
    createPathDialog,
  } = useEditorCreatePathDialog();

  const openExternalHref = React.useCallback((href: string) => {
    if (typeof window === 'undefined') return;
    window.open(href, '_blank', 'noopener,noreferrer');
  }, []);

  return {
    requestCreatePath,
    requestSaveLocation,
    requestImageUrl,
    requestLinkUrl,
    openExternalHref,
    dialogs: createPathDialog,
  };
}
