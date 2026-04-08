/**
 * ContentService — 통합 콘텐츠 저장/로드/삭제 서비스
 *
 * FileCrudService + DocumentMetadataService + TemplateService의
 * .md + .sidecar.json CRUD를 단일 서비스로 통합.
 *
 * 베이스: FileCrudService 패턴 (경로 검증, 에러 로깅, resilient 읽기)
 * 차용(템플릿): trailing newline, 다중 후보 경로 삭제
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createDmsLogger } from './dms-logger.js';
import { isMarkdownFile } from './file-utils.js';
import { configService } from './dms-config.service.js';
import { resolveContainedPath } from './path-utils.js';

const logger = createDmsLogger('DmsContentService');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentSaveOptions {
  /** 메타데이터 없이 콘텐츠만 저장할 때 true */
  skipMetadata?: boolean;
}

export interface ContentLoadOptions {
  /** true이면 .sidecar.json이 없을 때 null 반환 (템플릿 기본 동작) */
  strict?: boolean;
}

export interface ContentResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export interface ContentData {
  content: string;
  metadata: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function getSidecarPath(filePath: string): string {
  const parsed = path.parse(filePath);
  return path.join(parsed.dir, `${parsed.name}.sidecar.json`);
}

function getLegacySidecarPath(filePath: string): string {
  const parsed = path.parse(filePath);
  return path.join(parsed.dir, `${parsed.name}.json`);
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function extractTitleFromContent(content: string, filePath: string): string {
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch?.[1]) {
    return headingMatch[1].trim();
  }
  return path.parse(filePath).name;
}

// ---------------------------------------------------------------------------
// ContentService
// ---------------------------------------------------------------------------

class ContentService {
  /**
   * 콘텐츠 경로를 검증하고 절대 경로로 변환.
   * FileCrudService.resolveFilePath() 베이스.
   */
  resolveContentPath(contentPath: string): {
    targetPath: string;
    valid: boolean;
    safeRelPath: string;
  } {
    const rootDir = configService.getDocDir();
    return resolveContainedPath(rootDir, contentPath);
  }

  /**
   * .sidecar.json 경로를 반환.
   */
  getSidecarPath(filePath: string): string {
    return getSidecarPath(filePath);
  }

  // -------------------------------------------------------------------------
  // Save (write .md + .sidecar.json)
  // -------------------------------------------------------------------------

  /**
   * 콘텐츠(.md)와 메타데이터(.sidecar.json)를 저장.
   *
   * - 경로 검증 (directory traversal 방지)
   * - 디렉토리 자동 생성
   * - sidecar에 trailing newline 추가 (POSIX 표준, 템플릿 패턴 차용)
   */
  save(
    contentPath: string,
    content: string,
    metadata?: Record<string, unknown>,
    options?: ContentSaveOptions,
  ): ContentResult<{ message: string; savedPath: string }> {
    const { targetPath, valid, safeRelPath } = this.resolveContentPath(contentPath);

    if (!valid) {
      logger.warn('저장 경로 범위 벗어남', { contentPath, targetPath });
      return { success: false, error: 'Invalid path', status: 400 };
    }

    try {
      ensureDir(path.dirname(targetPath));
      fs.writeFileSync(targetPath, content, 'utf-8');
      logger.info('콘텐츠 저장 완료', { path: safeRelPath });

      if (!options?.skipMetadata && metadata && isMarkdownFile(targetPath)) {
        this.writeSidecar(targetPath, metadata);
      }

      return {
        success: true,
        data: { message: 'Content saved', savedPath: safeRelPath },
      };
    } catch (error) {
      logger.error('콘텐츠 저장 실패', error, { contentPath, targetPath });
      return { success: false, error: 'Failed to save content', status: 500 };
    }
  }

  // -------------------------------------------------------------------------
  // Load (read .md + .sidecar.json)
  // -------------------------------------------------------------------------

  /**
   * 콘텐츠(.md)와 메타데이터(.sidecar.json)를 로드.
   *
   * - strict=false (기본, 문서 동작): sidecar 없으면 자동 생성
   * - strict=true (템플릿 동작): sidecar 없으면 null 반환
   * - 레거시 .json 파일 자동 마이그레이션
   */
  load(
    contentPath: string,
    options?: ContentLoadOptions,
  ): ContentResult<ContentData> {
    const { targetPath, valid, safeRelPath } = this.resolveContentPath(contentPath);

    if (!valid) {
      logger.warn('로드 경로 범위 벗어남', { contentPath, targetPath });
      return { success: false, error: 'Invalid path', status: 400 };
    }

    if (!fs.existsSync(targetPath)) {
      logger.warn('콘텐츠 파일 없음', { contentPath, targetPath });
      return { success: false, error: 'Content not found', status: 404 };
    }

    try {
      const content = fs.readFileSync(targetPath, 'utf-8');
      let metadata: Record<string, unknown> | null = null;

      if (isMarkdownFile(targetPath)) {
        metadata = this.readSidecar(targetPath);

        if (!metadata && !options?.strict) {
          // 문서 모드: sidecar 없으면 자동 생성 (resilient)
          metadata = this.buildDefaultDocumentSidecar(content, targetPath);
          this.writeSidecar(targetPath, metadata);
          logger.info('사이드카 자동 생성', { path: safeRelPath });
        }

        if (!metadata && options?.strict) {
          logger.warn('strict 모드: 사이드카 없음', { path: safeRelPath });
          return { success: false, error: 'Sidecar not found', status: 404 };
        }
      }

      return { success: true, data: { content, metadata } };
    } catch (error) {
      logger.error('콘텐츠 로드 실패', error, { contentPath, targetPath });
      return { success: false, error: 'Failed to load content', status: 500 };
    }
  }

  // -------------------------------------------------------------------------
  // Delete (remove .md + .sidecar.json)
  // -------------------------------------------------------------------------

  /**
   * 콘텐츠(.md)와 메타데이터(.sidecar.json)를 삭제.
   *
   * candidatePaths가 제공되면 다중 후보 경로를 순회 (템플릿 패턴 차용).
   */
  delete(
    contentPath: string,
    candidatePaths?: string[],
  ): ContentResult<{ message: string; removed: boolean }> {
    const paths = candidatePaths ?? [contentPath];
    let removed = false;

    for (const candidate of paths) {
      const { targetPath, valid } = this.resolveContentPath(candidate);
      if (!valid) continue;

      try {
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
          removed = true;
          logger.info('콘텐츠 파일 삭제', { path: candidate });
        }

        const sidecarPath = getSidecarPath(targetPath);
        if (fs.existsSync(sidecarPath)) {
          fs.unlinkSync(sidecarPath);
          logger.info('사이드카 파일 삭제', { path: candidate });
        }
      } catch (error) {
        logger.error('삭제 실패', error, { candidate, targetPath });
      }
    }

    return {
      success: true,
      data: {
        message: removed ? 'Content deleted' : 'No content found to delete',
        removed,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Sidecar I/O
  // -------------------------------------------------------------------------

  /**
   * .sidecar.json 읽기 (레거시 .json 마이그레이션 포함).
   */
  readSidecar(filePath: string): Record<string, unknown> | null {
    const sidecarPath = getSidecarPath(filePath);

    if (fs.existsSync(sidecarPath)) {
      try {
        const raw = fs.readFileSync(sidecarPath, 'utf-8');
        return JSON.parse(raw) as Record<string, unknown>;
      } catch (error) {
        logger.warn('사이드카 파싱 실패', { sidecarPath, error });
        return null;
      }
    }

    // 레거시 .json 마이그레이션
    const legacyPath = getLegacySidecarPath(filePath);
    if (fs.existsSync(legacyPath)) {
      try {
        const raw = fs.readFileSync(legacyPath, 'utf-8');
        const data = JSON.parse(raw) as Record<string, unknown>;
        // 마이그레이션: .json → .sidecar.json
        this.writeSidecar(filePath, data);
        fs.unlinkSync(legacyPath);
        logger.info('레거시 사이드카 마이그레이션 완료', { legacyPath, sidecarPath });
        return data;
      } catch (error) {
        logger.warn('레거시 사이드카 마이그레이션 실패', { legacyPath, error });
        return null;
      }
    }

    return null;
  }

  /**
   * .sidecar.json 쓰기 (trailing newline 포함 — POSIX 표준).
   */
  writeSidecar(filePath: string, metadata: Record<string, unknown>): void {
    const sidecarPath = getSidecarPath(filePath);
    ensureDir(path.dirname(sidecarPath));
    fs.writeFileSync(
      sidecarPath,
      JSON.stringify(metadata, null, 2) + '\n',
      'utf-8',
    );
  }

  // -------------------------------------------------------------------------
  // Default metadata builders
  // -------------------------------------------------------------------------

  /**
   * 문서용 기본 사이드카 메타데이터 생성.
   * DocumentMetadataService.buildDefaultDocumentMetadata() 베이스.
   */
  buildDefaultDocumentSidecar(
    content: string,
    filePath: string,
    existing?: Record<string, unknown>,
  ): Record<string, unknown> {
    const now = new Date().toISOString();
    let createdAt = now;

    try {
      const stats = fs.statSync(filePath);
      createdAt = stats.birthtime.toISOString();
    } catch {
      // 파일이 아직 없을 수 있음
    }

    return {
      contentType: 'document',
      title: (existing?.['title'] as string) || extractTitleFromContent(content, filePath),
      summary: existing?.['summary'] ?? '',
      tags: existing?.['tags'] ?? [],
      sourceLinks: existing?.['sourceLinks'] ?? [],
      bodyLinks: existing?.['bodyLinks'] ?? [],
      createdAt: (existing?.['createdAt'] as string) ?? createdAt,
      updatedAt: now,
      fileHashes: {
        content: hashContent(content),
        sources: (existing?.['fileHashes'] as Record<string, unknown>)?.['sources'] ?? {},
      },
      chunkIds: existing?.['chunkIds'] ?? [],
      embeddingModel: existing?.['embeddingModel'] ?? '',
      referenceFiles: existing?.['referenceFiles'] ?? existing?.['sourceFiles'] ?? [],
      acl: existing?.['acl'] ?? { owners: [], editors: [], viewers: [] },
      versionHistory: existing?.['versionHistory'] ?? [],
      comments: existing?.['comments'] ?? [],
      templateId: existing?.['templateId'] ?? 'default',
      author: existing?.['author'] ?? 'Unknown',
      lastModifiedBy: existing?.['lastModifiedBy'] ?? existing?.['author'] ?? 'Unknown',
    };
  }
}

export const contentService = new ContentService();
