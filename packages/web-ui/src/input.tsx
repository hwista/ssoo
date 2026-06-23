import * as React from 'react';

import { cn } from './cn';

export interface InputProps extends React.ComponentProps<'input'> {
  variant?: 'default' | 'filePicker';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = 'default', ...props }, ref) => (
    <input
      type={type}
      className={cn(
        variant === 'filePicker'
          ? 'block w-full text-caption text-ssoo-primary file:mr-2 file:rounded-md file:border file:border-ssoo-content-border file:bg-white file:px-2 file:py-1 file:text-label-sm file:text-ssoo-primary focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50'
          : 'flex h-control-h w-full rounded-md border border-input bg-transparent px-3 py-1 text-body-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-label-sm file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
