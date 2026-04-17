import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from './cn';

type ShellPageContainerElement = 'main' | 'section' | 'div';

export type ShellPageContainerProps<T extends ShellPageContainerElement = 'main'> = Omit<
  ComponentPropsWithoutRef<T>,
  'as' | 'children'
> & {
  as?: T;
  children: ReactNode;
  className?: string;
};

export function ShellPageContainer<T extends ShellPageContainerElement = 'main'>({
  as,
  children,
  className,
  ...props
}: ShellPageContainerProps<T>) {
  const Component = (as ?? 'main') as ElementType;

  return (
    <Component className={cn('mx-auto w-full max-w-7xl px-4 py-6', className)} {...props}>
      {children}
    </Component>
  );
}
