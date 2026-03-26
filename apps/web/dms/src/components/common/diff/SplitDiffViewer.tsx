'use client';

import * as React from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { cn } from '@/lib/utils';

export interface SplitDiffViewerProps {
  originalText: string;
  currentText: string;
  language?: 'markdown' | 'json' | 'text';
  className?: string;
}

const pageBg = 'var(--ssoo-background)';

const splitDiffStyles = {
  variables: {
    light: {
      diffViewerBackground: '#ffffff',
      diffViewerColor: '#334155',
      addedBackground: 'rgba(34, 197, 94, 0.10)',
      addedColor: '#14532d',
      removedBackground: 'rgba(239, 68, 68, 0.10)',
      removedColor: '#7f1d1d',
      changedBackground: 'rgba(59, 130, 246, 0.10)',
      wordAddedBackground: 'rgba(34, 197, 94, 0.20)',
      wordRemovedBackground: 'rgba(239, 68, 68, 0.20)',
      addedGutterBackground: 'rgba(34, 197, 94, 0.14)',
      removedGutterBackground: 'rgba(239, 68, 68, 0.14)',
      gutterBackground: pageBg,
      highlightBackground: 'rgba(59, 130, 246, 0.08)',
      highlightGutterBackground: 'rgba(59, 130, 246, 0.12)',
      codeFoldGutterBackground: pageBg,
      codeFoldBackground: pageBg,
      emptyLineBackground: '#ffffff',
      gutterColor: '#64748b',
      addedGutterColor: '#166534',
      removedGutterColor: '#991b1b',
      codeFoldContentColor: '#475569',
    },
  },
  diffContainer: {
    overflow: 'hidden',
  },
  contentText: {
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--doc-content-font-size)',
    lineHeight: 'var(--doc-content-line-height)',
  },
  lineNumber: {
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--doc-line-number-font-size)',
    fontWeight: 'var(--doc-line-number-font-weight)',
    lineHeight: 'var(--doc-content-line-height)',
    minWidth: '2.75rem',
    textAlign: 'center' as const,
  },
  gutter: {
    minWidth: '2.75rem',
    textAlign: 'center' as const,
    verticalAlign: 'middle' as const,
    padding: 0,
  },
  marker: {
    minWidth: '2rem',
  },
  summary: {
    display: 'none',
  },
};

export function SplitDiffViewer({
  originalText,
  currentText,
  language = 'text',
  className,
}: SplitDiffViewerProps) {
  const compareMethod = language === 'json' ? DiffMethod.WORDS_WITH_SPACE : DiffMethod.WORDS;

  return (
    <div className={cn('h-full overflow-auto', className)}>
      <ReactDiffViewer
        oldValue={originalText}
        newValue={currentText}
        splitView
        showDiffOnly={false}
        hideSummary
        disableWordDiff={false}
        compareMethod={compareMethod}
        styles={splitDiffStyles}
      />
    </div>
  );
}
