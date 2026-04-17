import type { CSSProperties, ReactNode } from 'react';
import { cn } from './cn';

export interface ShellFrameProps {
  children: ReactNode;
  sidebar?: ReactNode;
  overlay?: ReactNode;
  floatingStart?: ReactNode;
  fullHeight?: boolean;
  mainOffset?: number | string;
  className?: string;
  mainClassName?: string;
  mainStyle?: CSSProperties;
}

function toMainOffsetStyle(mainOffset?: number | string): CSSProperties | undefined {
  if (typeof mainOffset === 'number') {
    return { marginLeft: `${mainOffset}px` };
  }

  if (typeof mainOffset === 'string') {
    return { marginLeft: mainOffset };
  }

  return undefined;
}

export function ShellFrame({
  children,
  sidebar,
  overlay,
  floatingStart,
  fullHeight = true,
  mainOffset,
  className,
  mainClassName,
  mainStyle,
}: ShellFrameProps) {
  const mainOffsetStyle = toMainOffsetStyle(mainOffset);
  const mergedMainStyle =
    mainOffsetStyle || mainStyle
      ? {
          ...mainOffsetStyle,
          ...mainStyle,
        }
      : undefined;

  return (
    <div
      className={cn(
        fullHeight ? 'flex h-screen overflow-hidden bg-gray-50' : 'flex min-h-screen bg-background',
        className
      )}
    >
      {floatingStart}
      {overlay}
      {sidebar}
      <div
        className={cn('flex min-w-0 flex-1 flex-col transition-all duration-300', mainClassName)}
        style={mergedMainStyle}
      >
        {children}
      </div>
    </div>
  );
}
