'use client';

import * as React from 'react';

import { cn } from './cn';

export const POPUP_BACKDROP_TONE_CLASS = 'bg-black/35';

export const POPUP_BACKDROP_ANIMATION_CLASS =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0';

export type PopupBackdropProps = React.HTMLAttributes<HTMLDivElement>;

export const PopupBackdrop = React.forwardRef<HTMLDivElement, PopupBackdropProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn('fixed inset-0', POPUP_BACKDROP_TONE_CLASS, className)}
      {...props}
    />
  )
);
PopupBackdrop.displayName = 'PopupBackdrop';
