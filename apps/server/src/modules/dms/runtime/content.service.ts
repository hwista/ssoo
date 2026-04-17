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
  /** true이면 .sidecar.json이 없을 때 null 반환 (템플릿 기본 동작) */
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
      const existingSidecar = existedBeforeSave && isMarkdownFile(targetPath)
        ? this.readSidecar(targetPath)
        : null;
      const currentRevisionSeq = normalizeRevisionSeq(existingSidecar?.['revisionSeq']) ?? 0;

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
            serverContentHash: normalizeOptionalString(existingSidecar?.['contentHash']) ?? hashContent(existingContent),
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
        nextMetadata = this.buildDefaultDocumentSidecar(
          content,
          targetPath,
          {
            ...(existingSidecar ?? {}),
            ...(metadata ?? {}),
            revisionSeq: nextRevisionSeq,
          },
          {
            defaultRevisionSeq: nextRevisionSeq,
          },
        );
        this.writeSidecar(targetPath, nextMetadata);
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
          metadata = this.buildDefaultDocumentSidecar(
            content,
            targetPath,
            undefined,
            { defaultRevisionSeq: 0 },
          );
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
        return this.normalizeDocumentSidecar(
          filePath,
          JSON.parse(raw) as Record<string, unknown>,
          { defaultRevisionSeq: 0 },
        );
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
        const data = this.normalizeDocumentSidecar(
          filePath,
          JSON.parse(raw) as Record<string, unknown>,
          { defaultRevisionSeq: 0 },
        );
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
    const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : undefined;
    const normalized = this.normalizeDocumentSidecar(
      filePath,
      metadata,
      { content, defaultRevisionSeq: fs.existsSync(sidecarPath) ? 0 : 1 },
    );
    fs.writeFileSync(
      sidecarPath,
      JSON.stringify(normalized, null, 2) + '\n',
      'utf-8',
    );
  }

  private normalizeDocumentSidecar(
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
      versionHistory: Array.isArray(metadata['versionHistory']) ? metadata['versionHistory'].flatMap((entry) => {
        if (!isRecord(entry)) {
          return [];
        }

        const id = normalizeOptionalString(entry.id);
        const createdAt = normalizeOptionalString(entry.createdAt);
        const author = normalizeOptionalString(entry.author);
        const summary = normalizeOptionalString(entry.summary);
        if (!id || !createdAt || !author || !summary) {
          return [];
        }

        return [{ id, createdAt, author, summary }];
      }) : [],
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
      author: normalizeOptionalString(metadata['author']) ?? 'Unknown',
      lastModifiedBy: normalizeOptionalString(metadata['lastModifiedBy'])
        ?? normalizeOptionalString(metadata['author'])
        ?? 'Unknown',
      ownerId: normalizeOptionalString(metadata['ownerId']) ?? acl.owners[0],
      ownerLoginId: normalizeOptionalString(metadata['ownerLoginId']),
    };

    return { ...normalized };
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

    return this.normalizeDocumentSidecar(
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
        versionHistory: existing?.['versionHistory'] ?? [],
        comments: existing?.['comments'] ?? [],
        templateId: existing?.['templateId'] ?? 'default',
        author: existing?.['author'] ?? 'Unknown',
        lastModifiedBy: existing?.['lastModifiedBy'] ?? existing?.['author'] ?? 'Unknown',
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
