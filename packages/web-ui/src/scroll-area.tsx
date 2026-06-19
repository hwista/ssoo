'use client';

import * as React from 'react';

import { cn } from './cn';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both';
  scrollbarSize?: 'thin' | 'default' | 'wide';
  scrollbarTheme?: 'default' | 'primary' | 'accent' | 'transparent';
  showOnHover?: boolean;
  variant?: 'default' | 'sidebar' | 'table';
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    {
      className,
      children,
      orientation = 'vertical',
      scrollbarSize = 'default',
      scrollbarTheme = 'default',
      showOnHover = false,
      variant = 'default',
      ...props
    },
    ref
  ) => {
    const overflowClasses = {
      vertical: 'overflow-y-auto overflow-x-hidden',
      horizontal: 'overflow-x-auto overflow-y-hidden',
      both: 'overflow-auto',
    };

    const sizeClasses = {
      thin: 'scrollbar-thin',
      default: 'scrollbar-default',
      wide: 'scrollbar-wide',
    };

    const themeClasses = {
      default: '',
      primary: 'scrollbar-primary',
      accent: 'scrollbar-accent',
      transparent: 'scrollbar-transparent',
    };

    const variantClasses = {
      default: '',
      sidebar: 'scrollbar-sidebar',
      table: 'scrollbar-table',
    };

    return (
      <div
        ref={ref}
        className={cn(
          overflowClasses[orientation],
          variant !== 'default'
            ? variantClasses[variant]
            : [sizeClasses[scrollbarSize], themeClasses[scrollbarTheme], 'scrollbar-rounded'],
          showOnHover && 'scrollbar-on-hover',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ScrollArea.displayName = 'ScrollArea';

export { ScrollArea };
