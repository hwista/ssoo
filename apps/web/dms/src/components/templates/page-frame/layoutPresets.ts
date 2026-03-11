'use client';

export const DOC_PAGE_SURFACE_PRESETS = {
  ai: 'rounded-lg border-0 bg-transparent',
  document: 'bg-transparent border-0',
} as const;

export const PAGE_BACKGROUND_PRESETS = {
  ai: 'bg-ssoo-content-bg/30',
  documentViewer: 'bg-ssoo-content-bg/30',
  documentEditor: 'bg-ssoo-primary/15',
} as const;

export const SHELL_BODY_WRAPPER_PRESETS = {
  aiChat: 'h-full min-h-0 overflow-hidden relative p-4',
  aiSearch: 'h-full min-h-0 overflow-hidden',
} as const;
