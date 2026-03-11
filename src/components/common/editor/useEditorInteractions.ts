'use client';

import * as React from 'react';
import { useEditorCreatePathDialog } from './useEditorCreatePathDialog';

export interface EditorInteractionDeps {
  requestCreatePath: (preferredPath?: string) => Promise<string | null>;
  requestImageUrl: () => Promise<string | null>;
  requestLinkUrl: () => Promise<string | null>;
  openExternalHref: (href: string) => void;
  dialogs: React.ReactNode;
}

export function useEditorInteractions(): EditorInteractionDeps {
  const {
    requestCreatePath,
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
    requestImageUrl,
    requestLinkUrl,
    openExternalHref,
    dialogs: createPathDialog,
  };
}
