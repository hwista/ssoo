'use client';

import * as React from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { cn } from '@/lib/utils';

export interface SplitDiffViewerProps {
  originalText: string;
  currentText: string;
  originalTitle?: string;
  currentTitle?: string;
  language?: 'markdown' | 'json' | 'text';
  className?: string;
}

const splitDiffStyles = {
  variables: {
    light: {
      diffViewerBackground: '#ffffff',
      diffViewerTitleBackground: '#f8fafc',
      diffViewerTitleColor: '#0f172a',
      diffViewerTitleBorderColor: '#e2e8f0',
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
      gutterBackground: '#f8fafc',
      highlightBackground: 'rgba(59, 130, 246, 0.08)',
      highlightGutterBackground: 'rgba(59, 130, 246, 0.12)',
      codeFoldGutterBackground: '#f1f5f9',
      codeFoldBackground: '#f8fafc',
      emptyLineBackground: '#ffffff',
      gutterColor: '#64748b',
      addedGutterColor: '#166534',
      removedGutterColor: '#991b1b',
      codeFoldContentColor: '#475569',
    },
  },
  diffContainer: {
    border: '1px solid rgb(226 232 240)',
    borderRadius: '0.75rem',
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
  },
  titleBlock: {
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    padding: '0.75rem 1rem',
  },
  contentText: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: '0.8125rem',
    lineHeight: 1.7,
  },
  lineNumber: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: '0.75rem',
    minWidth: '2.75rem',
  },
  gutter: {
    minWidth: '2.75rem',
  },
  marker: {
    minWidth: '2rem',
  },
  summary: {
    display: 'none',
  },
} as const;

export function SplitDiffViewer({
  originalText,
  currentText,
  originalTitle = '이전',
  currentTitle = '현재',
  language = 'text',
  className,
}: SplitDiffViewerProps) {
  const compareMethod = language === 'json' ? DiffMethod.WORDS_WITH_SPACE : DiffMethod.WORDS;

  return (
    <div className={cn('h-full overflow-auto rounded-xl bg-white p-4', className)}>
      <ReactDiffViewer
        oldValue={originalText}
        newValue={currentText}
        splitView
        showDiffOnly={false}
        hideSummary
        disableWordDiff={false}
        compareMethod={compareMethod}
        leftTitle={originalTitle}
        rightTitle={currentTitle}
        styles={splitDiffStyles}
      />
    </div>
  );
}
