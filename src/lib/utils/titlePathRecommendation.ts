'use client';

import type { DocAssistTitleAndPathResponse } from '@/lib/api/aiApi';

export type RecommendationStatus = 'idle' | 'loading' | 'resolved' | 'error';

export interface ResolvedTitlePathRecommendation {
  titleStatus: RecommendationStatus;
  pathStatus: RecommendationStatus;
  title: string;
  directory: string;
  fileName: string;
  path: string;
  pathValidationMessage?: string;
}

export function buildRecommendedTitleFallback(content: string): string {
  const firstLine = content.split('\n').find((line) => line.trim().length > 0) ?? '';
  const fallbackTitle = firstLine.replace(/^#+\s*/, '').slice(0, 60).trim();
  return fallbackTitle || '새 문서';
}

function buildPath(directory: string, fileName: string): string {
  return directory && fileName ? `${directory}/${fileName}` : '';
}

function validateRecommendedPath(directory: string, fileName: string): string | undefined {
  if (!directory && !fileName) return '문서 경로를 확인해 주세요';
  if (!directory || !fileName) return '문서 경로를 확인해 주세요';
  if (!fileName.endsWith('.md')) return '문서 경로를 확인해 주세요';
  if (directory.split('/').some((segment) => segment.trim().length === 0)) return '문서 경로를 확인해 주세요';
  return undefined;
}

export function resolveTitlePathRecommendation(
  data: DocAssistTitleAndPathResponse | null | undefined,
  options?: { loading?: boolean; fallbackContent?: string }
): ResolvedTitlePathRecommendation {
  if (options?.loading) {
    return {
      titleStatus: 'loading',
      pathStatus: 'loading',
      title: '',
      directory: '',
      fileName: '',
      path: '',
      pathValidationMessage: undefined,
    };
  }

  const title = data?.suggestedTitle?.trim() || buildRecommendedTitleFallback(options?.fallbackContent ?? '');
  const directory = data?.suggestedDirectory?.trim() ?? '';
  const fileName = data?.suggestedFileName?.trim() ?? '';
  const path = buildPath(directory, fileName);
  const pathValidationMessage = validateRecommendedPath(directory, fileName);

  return {
    titleStatus: 'resolved',
    pathStatus: 'resolved',
    title,
    directory,
    fileName,
    path,
    pathValidationMessage,
  };
}
