'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type SectionedShellVariant =
  | 'editor_with_footer'
  | 'viewer_with_toolbar'
  | 'chat_with_footer'
  | 'search_with_toolbar';

export interface SectionedShellProps {
  toolbar?: React.ReactNode;
  body: React.ReactNode;
  footer?: React.ReactNode;
  variant: SectionedShellVariant;
  className?: string;
}

const ROOT_CLASS = 'min-h-0';
const SLOT_TOOLBAR_BASE = 'relative z-10 flex shrink-0 items-center overflow-visible min-h-[52px] border-b border-ssoo-content-border';
const SLOT_BODY_BASE = 'min-h-0 flex-1 flex flex-col overflow-hidden border-x border-ssoo-content-border bg-white';
const SLOT_FOOTER_BASE = 'flex shrink-0 items-center border-t border-x border-b border-ssoo-content-border rounded-b-lg';
const BODY_SLOT_CONTENT_CLASS = 'h-full min-h-0 overflow-hidden';

const SHELL_VARIANT_PRESETS: Record<
  SectionedShellVariant,
  {
    shellClass?: string;
    toolbarToneClass?: string;
    toolbarPaddingClass?: string;
    bodyClass?: string;
    footerClass?: string;
  }
> = {
  editor_with_footer: {
    toolbarToneClass: 'bg-ssoo-content-bg/30',
    toolbarPaddingClass: 'px-4 py-2',
    footerClass: 'bg-white p-3',
  },
  viewer_with_toolbar: {
    toolbarToneClass: 'bg-ssoo-content-bg/30',
    toolbarPaddingClass: 'px-4 py-2',
  },
  chat_with_footer: { footerClass: 'bg-white p-3' },
  search_with_toolbar: {
    toolbarToneClass: 'bg-ssoo-content-bg/30',
    toolbarPaddingClass: 'px-4 py-2',
  },
};

export function SectionedShell({
  toolbar,
  body,
  footer,
  variant,
  className,
}: SectionedShellProps) {
  const preset = SHELL_VARIANT_PRESETS[variant];
  const hasToolbar = toolbar != null;
  const hasFooter = footer != null;

  return (
    <div className={cn('flex h-full flex-col', ROOT_CLASS, preset.shellClass, className)}>
      {hasToolbar && (
        <section
          className={cn(
            SLOT_TOOLBAR_BASE,
            preset.toolbarToneClass,
            preset.toolbarPaddingClass
          )}
        >
          {toolbar}
        </section>
      )}
      <section
        className={cn(
          SLOT_BODY_BASE,
          !hasToolbar && 'border-t border-ssoo-content-border rounded-t-lg',
          !hasFooter && 'border-b border-ssoo-content-border rounded-b-lg',
          preset.bodyClass
        )}
      >
        <div className={BODY_SLOT_CONTENT_CLASS}>
          {body}
        </div>
      </section>
      {hasFooter && (
        <footer
          className={cn(
            SLOT_FOOTER_BASE,
            preset.footerClass
          )}
        >
          {footer}
        </footer>
      )}
    </div>
  );
}
