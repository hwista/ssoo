import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from './cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-badge transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-ssoo-primary text-white shadow hover:bg-ssoo-primary-hover',
        secondary: 'border-transparent bg-ssoo-secondary text-white hover:bg-ssoo-primary',
        destructive: 'border-transparent bg-ls-red text-white shadow hover:bg-ls-red-hover',
        outline: 'border-ssoo-content-border text-ssoo-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
