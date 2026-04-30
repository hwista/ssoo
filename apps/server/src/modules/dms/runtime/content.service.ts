/**
 * ContentService — 통합 콘텐츠 저장/로드/삭제 서비스
 *
 * FileCrudService + DocumentMetadataService + TemplateService의
 * .md content + metadata projection 처리를 단일 서비스로 통합.
 *
 * 베이스: FileCrudService 패턴 (경로 검증, 에러 로깅, resilient 읽기)
 * 차용(템플릿): trailing newline, 다중 후보 경로 삭제
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  DocumentAcl,
  DocumentMetadata,
  DocumentPathHistoryEntry,
  DocumentPermissionGrant,
  DocumentVisibility,
  DocumentVisibilityScope,
  SourceFileMeta,
} from '@ssoo/types/dms';
import { createDmsLogger } from './dms-logger.js';
import { isMarkdownFile } from './file-utils.js';
import { configService } from './dms-config.service.js';
import { normalizePath, resolveContainedPath } from './path-utils.js';

const logger = createDmsLogger('DmsContentService');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentSaveOptions {
  /** 메타데이터 없이 콘텐츠만 저장할 때 true */
  skipMetadata?: boolean;
  /** optimistic concurrency base revision */
  expectedRevisionSeq?: number;
}

export interface ContentLoadOptions {
  /** true이면 persisted metadata source 가 없을 때 null 반환 (템플릿 기본 동작) */
  strict?: boolean;
}

export interface ContentResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  details?: Record<string, unknown>;
}

export interface ContentData {
  content: string;
  metadata: Record<string, unknown> | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  ));
}

function normalizeDocumentAcl(value: unknown): DocumentAcl {
  if (!isRecord(value)) {
    return { owners: [], editors: [], viewers: [] };
  }

  return {
    owners: normalizeStringArray(value.owners),
    editors: normalizeStringArray(value.editors),
    viewers: normalizeStringArray(value.viewers),
  };
}

function normalizeVisibility(value: unknown): DocumentVisibility | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const scope = value.scope;
  if (scope !== 'public' && scope !== 'organization' && scope !== 'self') {
    return undefined;
  }

  return {
    scope,
    targetOrgId: normalizeOptionalString(value.targetOrgId),
  };
}

function normalizePermissionGrants(value: unknown): DocumentPermissionGrant[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    const principalType = entry.principalType;
    const role = entry.role;
    const principalId = normalizeOptionalString(entry.principalId);
    if (
      (principalType !== 'user' && principalType !== 'organization' && principalType !== 'team' && principalType !== 'group')
      || (role !== 'read' && role !== 'write' && role !== 'manage')
      || !principalId
    ) {
      return [];
    }

    return [{
      principalType,
      principalId,
      role,
      expiresAt: normalizeOptionalString(entry.expiresAt),
      grantedAt: normalizeOptionalString(entry.grantedAt),
      grantedBy: normalizeOptionalString(entry.grantedBy),
      source: entry.source === 'request'
        || entry.source === 'share'
        || entry.source === 'migration'
        || entry.source === 'owner-default'
        ? entry.source
        : undefined,
    }];
  });
}

function normalizePathHistory(value: unknown): DocumentPathHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    const pathValue = normalizeOptionalString(entry.path);
    const changedAt = normalizeOptionalString(entry.changedAt);
    if (!pathValue || !changedAt) {
      return [];
    }

    return [{
      path: pathValue,
      changedAt,
      changedBy: normalizeOptionalString(entry.changedBy),
      reason: entry.reason === 'create'
        || entry.reason === 'rename'
        || entry.reason === 'move'
        || entry.reason === 'reconcile'
        ? entry.reason
        : undefined,
    }];
  });
}

function normalizeSourceFiles(value: unknown): SourceFileMeta[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    const name = normalizeOptionalString(entry.name);
    const filePath = normalizeOptionalString(entry.path);
    if (!name || !filePath) {
      return [];
    }

    return [{
      name,
      path: filePath,
      type: normalizeOptionalString(entry.type),
      size: typeof entry.size === 'number' && Number.isFinite(entry.size) ? entry.size : undefined,
      url: normalizeOptionalString(entry.url),
      storageUri: normalizeOptionalString(entry.storageUri),
      provider: normalizeOptionalString(entry.provider),
      versionId: normalizeOptionalString(entry.versionId),
      etag: normalizeOptionalString(entry.etag),
      checksum: normalizeOptionalString(entry.checksum),
      origin: entry.origin === 'manual'
        || entry.origin === 'ingest'
        || entry.origin === 'teams'
        || entry.origin === 'network_drive'
        || entry.origin === 'reference'
        || entry.origin === 'template'
        || entry.origin === 'picker'
        || entry.origin === 'assistant'
        || entry.origin === 'current-document'
        || entry.origin === 'template-selected'
        ? entry.origin
        : undefined,
      status: entry.status === 'draft' || entry.status === 'pending_confirm' || entry.status === 'published'
        ? entry.status
        : undefined,
      textContent: normalizeOptionalString(entry.textContent),
      storage: entry.storage === 'path' || entry.storage === 'inline' ? entry.storage : undefined,
      kind: entry.kind === 'document' || entry.kind === 'file' ? entry.kind : undefined,
      tempId: normalizeOptionalString(entry.tempId),
      images: Array.isArray(entry.images)
        ? entry.images.flatMap((image) => {
          if (!isRecord(image)) {
            return [];
          }

          const base64 = normalizeOptionalString(image.base64);
          const mimeType = normalizeOptionalString(image.mimeType);
          const imageName = normalizeOptionalString(image.name);
          if (!base64 || !mimeType || !imageName) {
            return [];
          }

          return [{
            base64,
            mimeType,
            name: imageName,
            size: typeof image.size === 'number' && Number.isFinite(image.size) ? image.size : 0,
          }];
        })
        : undefined,
    }];
  });
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  const entries = Object.entries(value)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([key, entryValue]) => [key, entryValue.trim()])
    .filter(([, entryValue]) => entryValue.length > 0);

  return Object.fromEntries(entries);
}

function normalizeRevisionSeq(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Save (write .md only, return normalized metadata for DB sync)
  // -------------------------------------------------------------------------

  /**
   * 콘텐츠(.md)를 저장하고, DB control-plane 으로 보낼 정규화 메타데이터를 반환.
   *
   * - 경로 검증 (directory traversal 방지)
   * - 디렉토리 자동 생성
   * - markdown trailing newline 보정 (POSIX 표준, 템플릿 패턴 차용)
   */
  save(
    contentPath: string,
    content: string,
    metadata?: Record<string, unknown>,
    options?: ContentSaveOptions,
  ): ContentResult<{ message: string; savedPath: string; metadata?: Record<string, unknown> | null }> {
    const { targetPath, valid, safeRelPath } = this.resolveContentPath(contentPath);

    if (!valid) {
      logger.warn('저장 경로 범위 벗어남', { contentPath, targetPath });
      return { success: false, error: 'Invalid path', status: 400 };
    }

    try {
      const existedBeforeSave = fs.existsSync(targetPath);
      const existingContent = existedBeforeSave && fs.existsSync(targetPath)
        ? fs.readFileSync(targetPath, 'utf-8')
        : '';
      const baseMetadata = isRecord(metadata) ? metadata : null;
      const currentRevisionSeq = normalizeRevisionSeq(baseMetadata?.['revisionSeq'])
        ?? 0;

      if (
        existedBeforeSave
        && options?.expectedRevisionSeq !== undefined
        && currentRevisionSeq !== options.expectedRevisionSeq
      ) {
        return {
          success: false,
          error: 'Document conflict',
          status: 409,
          details: {
            expectedRevisionSeq: options.expectedRevisionSeq,
            currentRevisionSeq,
            serverContent: existingContent,
            serverContentHash: normalizeOptionalString(baseMetadata?.['contentHash'])
              ?? hashContent(existingContent),
            clientContentHash: hashContent(content),
          },
        };
      }

      ensureDir(path.dirname(targetPath));
      fs.writeFileSync(targetPath, content, 'utf-8');
      logger.info('콘텐츠 저장 완료', { path: safeRelPath });

      let nextMetadata: Record<string, unknown> | null = null;
      if (!options?.skipMetadata && isMarkdownFile(targetPath)) {
        const nextRevisionSeq = existedBeforeSave ? currentRevisionSeq + 1 : 1;
        nextMetadata = this.buildDefaultDocumentMetadata(
          content,
          targetPath,
          {
            ...(baseMetadata ?? {}),
            ...(metadata ?? {}),
            revisionSeq: nextRevisionSeq,
          },
          {
            defaultRevisionSeq: nextRevisionSeq,
          },
        );
      }

      return {
        success: true,
        data: { message: 'Content saved', savedPath: safeRelPath, metadata: nextMetadata },
      };
    } catch (error) {
      logger.error('콘텐츠 저장 실패', error, { contentPath, targetPath });
      return { success: false, error: 'Failed to save content', status: 500 };
    }
  }

  // -------------------------------------------------------------------------
  // Load (read .md and derive transient metadata only)
  // -------------------------------------------------------------------------

  /**
   * 콘텐츠(.md)를 로드하고, 저장소 파일에 의존하지 않는 in-memory metadata 를 반환.
   *
   * - strict=false (기본): in-memory default metadata 반환
   * - strict=true: persisted metadata source 가 없으므로 404 반환
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
        if (options?.strict) {
          logger.warn('strict 모드: persisted metadata source 없음', { path: safeRelPath });
          return { success: false, error: 'Metadata not found', status: 404 };
        }

        metadata = this.buildDefaultDocumentMetadata(
          content,
          targetPath,
          undefined,
          { defaultRevisionSeq: 0 },
        );
      }

      return { success: true, data: { content, metadata } };
    } catch (error) {
      logger.error('콘텐츠 로드 실패', error, { contentPath, targetPath });
      return { success: false, error: 'Failed to load content', status: 500 };
    }
  }

  // -------------------------------------------------------------------------
  // Delete (remove .md only)
  // -------------------------------------------------------------------------

  /**
   * 콘텐츠(.md)를 삭제한다.
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

  private normalizeDocumentMetadata(
    filePath: string,
    metadata: Record<string, unknown>,
    options?: {
      content?: string;
      defaultRevisionSeq?: number;
      defaultVisibilityScope?: DocumentVisibilityScope;
    },
  ): Record<string, unknown> {
    const acl = normalizeDocumentAcl(metadata['acl']);
    const visibility = normalizeVisibility(metadata['visibility'])
      ?? (options?.defaultVisibilityScope ? { scope: options.defaultVisibilityScope } : undefined);
    const legacyFileHashes = isRecord(metadata['fileHashes']) ? metadata['fileHashes'] : undefined;
    const contentHash = normalizeOptionalString(metadata['contentHash'])
      ?? (legacyFileHashes ? normalizeOptionalString(legacyFileHashes.content) : undefined)
      ?? (options?.content !== undefined ? hashContent(options.content) : '');
    const relativePath = normalizeOptionalString(metadata['relativePath'])
      ?? normalizePath(path.relative(configService.getDocDir(), filePath));
    const revisionSeq = normalizeRevisionSeq(metadata['revisionSeq']) ?? options?.defaultRevisionSeq ?? 0;
    const normalized: DocumentMetadata = {
      documentId: normalizeOptionalString(metadata['documentId']),
      title: normalizeOptionalString(metadata['title']) ?? extractTitleFromContent(options?.content ?? '', filePath),
      summary: normalizeOptionalString(metadata['summary']) ?? '',
      tags: normalizeStringArray(metadata['tags']),
      sourceLinks: normalizeStringArray(metadata['sourceLinks']),
      bodyLinks: Array.isArray(metadata['bodyLinks'])
        ? metadata['bodyLinks'].flatMap((entry) => {
          if (!isRecord(entry)) {
            return [];
          }

          const url = normalizeOptionalString(entry.url);
          const label = normalizeOptionalString(entry.label);
          if (!url || !label) {
            return [];
          }

          return [{
            url,
            label,
            type: entry.type === 'image' ? 'image' : 'link',
          }];
        })
        : [],
      createdAt: normalizeOptionalString(metadata['createdAt']) ?? new Date().toISOString(),
      updatedAt: normalizeOptionalString(metadata['updatedAt']) ?? new Date().toISOString(),
      relativePath,
      pathHistory: normalizePathHistory(metadata['pathHistory']),
      visibility,
      grants: normalizePermissionGrants(metadata['grants']),
      revisionSeq,
      contentHash,
      fileHashes: {
        content: contentHash,
        sources: isRecord(metadata['fileHashes'])
          ? normalizeStringRecord(metadata['fileHashes'].sources)
          : {},
      },
      chunkIds: normalizeStringArray(metadata['chunkIds']),
      embeddingModel: normalizeOptionalString(metadata['embeddingModel']) ?? '',
      sourceFiles: normalizeSourceFiles(metadata['sourceFiles'] ?? metadata['referenceFiles']),
      acl,
      comments: Array.isArray(metadata['comments']) ? metadata['comments'].flatMap((entry) => {
        if (!isRecord(entry)) {
          return [];
        }

        const id = normalizeOptionalString(entry.id);
        const author = normalizeOptionalString(entry.author);
        const content = normalizeOptionalString(entry.content);
        const createdAt = normalizeOptionalString(entry.createdAt);
        if (!id || !author || !content || !createdAt) {
          return [];
        }

        return [{
          id,
          author,
          content,
          createdAt,
          email: normalizeOptionalString(entry.email),
          avatarUrl: normalizeOptionalString(entry.avatarUrl),
          parentId: normalizeOptionalString(entry.parentId),
          deletedAt: normalizeOptionalString(entry.deletedAt),
        }];
      }) : [],
      templateId: normalizeOptionalString(metadata['templateId']) ?? 'default',
      author: normalizeOptionalString(metadata['author'])
        ?? normalizeOptionalString(metadata['ownerLoginId'])
        ?? 'Unknown',
      lastModifiedBy: normalizeOptionalString(metadata['lastModifiedBy'])
        ?? normalizeOptionalString(metadata['author'])
        ?? normalizeOptionalString(metadata['ownerLoginId'])
        ?? 'Unknown',
      ownerId: normalizeOptionalString(metadata['ownerId']) ?? acl.owners[0],
      ownerLoginId: normalizeOptionalString(metadata['ownerLoginId'])
        ?? normalizeOptionalString(metadata['author']),
    };

    return { ...normalized };
  }

  // -------------------------------------------------------------------------
  // Default metadata builders
  // -------------------------------------------------------------------------

  /**
   * 문서용 기본 메타데이터 생성.
   * DocumentMetadataService.buildDefaultDocumentMetadata() 베이스.
   */
  buildDefaultDocumentMetadata(
    content: string,
    filePath: string,
    existing?: Record<string, unknown>,
    defaults?: {
      defaultRevisionSeq?: number;
      defaultVisibilityScope?: DocumentVisibilityScope;
      defaultOwnerId?: string;
      defaultOwnerLoginId?: string;
    },
  ): Record<string, unknown> {
    const now = new Date().toISOString();
    let createdAt = now;

    try {
      const stats = fs.statSync(filePath);
      createdAt = stats.birthtime.toISOString();
    } catch {
      // 파일이 아직 없을 수 있음
    }

    return this.normalizeDocumentMetadata(
      filePath,
      {
        ...existing,
        ownerId: existing?.['ownerId'] ?? defaults?.defaultOwnerId,
        ownerLoginId: existing?.['ownerLoginId'] ?? defaults?.defaultOwnerLoginId,
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
        contentHash: hashContent(content),
        revisionSeq: existing?.['revisionSeq'] ?? defaults?.defaultRevisionSeq,
        chunkIds: existing?.['chunkIds'] ?? [],
        embeddingModel: existing?.['embeddingModel'] ?? '',
        sourceFiles: existing?.['sourceFiles'] ?? existing?.['referenceFiles'] ?? [],
        acl: existing?.['acl'] ?? { owners: [], editors: [], viewers: [] },
        visibility: existing?.['visibility'],
        grants: existing?.['grants'] ?? [],
        pathHistory: existing?.['pathHistory'] ?? [],
        comments: existing?.['comments'] ?? [],
        templateId: existing?.['templateId'] ?? 'default',
        author: existing?.['author'] ?? existing?.['ownerLoginId'] ?? defaults?.defaultOwnerLoginId ?? 'Unknown',
        lastModifiedBy: existing?.['lastModifiedBy'] ?? existing?.['author'] ?? existing?.['ownerLoginId'] ?? defaults?.defaultOwnerLoginId ?? 'Unknown',
      },
      {
        content,
        defaultRevisionSeq: defaults?.defaultRevisionSeq ?? 1,
        defaultVisibilityScope: defaults?.defaultVisibilityScope,
      },
    );
  }
}

export const contentService = new ContentService();
