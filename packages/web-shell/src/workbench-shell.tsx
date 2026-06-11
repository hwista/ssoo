import type { ReactNode } from 'react';
import type { SsooAppFrameProps } from './app-frame';
import { SsooAppFrame } from './app-frame';

export type SsooWorkbenchShellProps = Omit<SsooAppFrameProps, 'mode' | 'children' | 'contentSlot'> & {
  children?: ReactNode;
  contentSlot?: ReactNode;
};

/**
 * Canonical SSOO workbench shell.
 *
 * Domain apps own sidebar/header/tab/content data through slots; this wrapper
 * fixes the shared frame mode so app layouts do not fork the outer shell.
 */
export function SsooWorkbenchShell({ children, contentSlot, ...props }: SsooWorkbenchShellProps) {
  return (
    <SsooAppFrame mode="workbench" contentSlot={contentSlot ?? children} {...props} />
  );
}
