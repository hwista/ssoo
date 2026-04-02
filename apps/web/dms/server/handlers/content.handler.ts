/**
 * Content Handler — 통합 콘텐츠(문서+템플릿) CRUD 핸들러
 * Route: /api/content
 *
 * REST 시맨틱(templateApi 패턴 차용):
 *   GET    /api/content?path=...         → 콘텐츠 로드
 *   POST   /api/content                  → 콘텐츠 저장
 *   DELETE  /api/content                  → 콘텐츠 삭제
 */

import { logger, PerformanceTimer } from '@/lib/utils/errorUtils';
import { contentService, type ContentResult } from '@/server/services/content/ContentService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentSaveBody {
  path: string;
  content: string;
  metadata?: Record<string, unknown>;
  /** true이면 메타데이터 없이 콘텐츠만 저장 */
  skipMetadata?: boolean;
}

export interface ContentDeleteBody {
  path: string;
  /** 삭제 시 검색할 대체 경로 목록 (템플릿 레거시 호환) */
  candidatePaths?: string[];
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * 콘텐츠 로드 (GET)
 */
export function handleLoadContent(
  contentPath: string,
  options?: { strict?: boolean },
): ContentResult {
  const timer = new PerformanceTimer('Content: 로드');
  try {
    return contentService.load(contentPath, options);
  } finally {
    timer.end({ path: contentPath });
  }
}

/**
 * 콘텐츠 저장 (POST)
 */
export function handleSaveContent(body: ContentSaveBody): ContentResult {
  const { path: contentPath, content, metadata, skipMetadata } = body;

  if (!contentPath || typeof content !== 'string') {
    return { success: false, error: 'path와 content는 필수입니다.', status: 400 };
  }

  const timer = new PerformanceTimer('Content: 저장');
  try {
    return contentService.save(contentPath, content, metadata, { skipMetadata });
  } finally {
    timer.end({ path: contentPath });
  }
}

/**
 * 콘텐츠 삭제 (DELETE)
 */
export function handleDeleteContent(body: ContentDeleteBody): ContentResult {
  const { path: contentPath, candidatePaths } = body;

  if (!contentPath) {
    return { success: false, error: 'path는 필수입니다.', status: 400 };
  }

  const timer = new PerformanceTimer('Content: 삭제');
  try {
    return contentService.delete(contentPath, candidatePaths);
  } finally {
    timer.end({ path: contentPath });
  }
}

/**
 * 사이드카 메타데이터만 부분 업데이트 (PATCH 시맨틱, POST /api/content/metadata)
 */
export function handleUpdateContentMetadata(
  contentPath: string,
  update: Record<string, unknown>,
): ContentResult {
  if (!contentPath) {
    return { success: false, error: 'path는 필수입니다.', status: 400 };
  }

  const timer = new PerformanceTimer('Content: 메타데이터 업데이트');
  try {
    const existing = contentService.readSidecar(contentPath);
    if (!existing) {
      return { success: false, error: 'Metadata not found', status: 404 };
    }

    const merged = {
      ...existing,
      ...update,
      updatedAt: new Date().toISOString(),
    };

    const { targetPath, valid } = contentService.resolveContentPath(contentPath);
    if (!valid) {
      return { success: false, error: 'Invalid path', status: 400 };
    }

    contentService.writeSidecar(targetPath, merged);
    logger.info('콘텐츠 메타데이터 업데이트 완료', { path: contentPath });

    return { success: true, data: merged };
  } finally {
    timer.end({ path: contentPath });
  }
}
