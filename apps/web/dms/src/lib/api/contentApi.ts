/**
 * Content API — 통합 콘텐츠(문서+템플릿) 클라이언트 API
 *
 * /api/content 엔드포인트에 직접 호출 (파사드 아님).
 * REST 시맨틱: GET(로드), POST(저장), DELETE(삭제)
 */

import { request, type ApiResponse } from './core';

export interface ContentData {
  content: string;
  metadata: Record<string, unknown> | null;
}

export interface ContentSaveResult {
  message: string;
  savedPath: string;
}

export interface ContentDeleteResult {
  message: string;
  removed: boolean;
}

export const contentApi = {
  /**
   * 콘텐츠 로드 (GET)
   * @param contentPath 상대 경로 (docRoot 기준)
   * @param options.strict true이면 sidecar 없을 때 404 반환 (템플릿 기본 동작)
   */
  load: async (
    contentPath: string,
    options?: { strict?: boolean; signal?: AbortSignal },
  ): Promise<ApiResponse<ContentData>> => {
    const params = new URLSearchParams({ path: contentPath });
    if (options?.strict) params.set('strict', 'true');

    return request<ContentData>(`/api/content?${params.toString()}`, {
      signal: options?.signal,
    });
  },

  /**
   * 콘텐츠 저장 (POST)
   * @param contentPath 저장 경로
   * @param content 마크다운 콘텐츠
   * @param metadata 사이드카 메타데이터 (선택)
   */
  save: async (
    contentPath: string,
    content: string,
    metadata?: Record<string, unknown>,
    options?: { skipMetadata?: boolean; signal?: AbortSignal },
  ): Promise<ApiResponse<ContentSaveResult>> => {
    return request<ContentSaveResult>('/api/content', {
      method: 'POST',
      body: {
        path: contentPath,
        content,
        metadata,
        skipMetadata: options?.skipMetadata,
      },
      signal: options?.signal,
    });
  },

  /**
   * 콘텐츠 삭제 (DELETE)
   * @param contentPath 삭제 경로
   * @param candidatePaths 대체 경로 목록 (레거시 호환)
   */
  delete: async (
    contentPath: string,
    candidatePaths?: string[],
    options?: { signal?: AbortSignal },
  ): Promise<ApiResponse<ContentDeleteResult>> => {
    return request<ContentDeleteResult>('/api/content', {
      method: 'DELETE',
      body: { path: contentPath, candidatePaths },
      signal: options?.signal,
    });
  },

  /**
   * 메타데이터만 부분 업데이트 (POST with metadataUpdate)
   */
  updateMetadata: async (
    contentPath: string,
    update: Record<string, unknown>,
    options?: { signal?: AbortSignal },
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return request<Record<string, unknown>>('/api/content', {
      method: 'POST',
      body: { path: contentPath, metadataUpdate: update },
      signal: options?.signal,
    });
  },
};
