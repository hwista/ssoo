import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type {
  AiIndexAdapterSyncRequest,
  AiIndexAdapterSyncResult,
  AiIndexChunkProjection,
  AiIndexJsonObject,
  AiIndexJsonValue,
  AiIndexSensitivityCode,
} from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { AiIndexAdapter } from '../../common/ai-index/ai-index-adapter.js';
import { AiIndexRegistryService } from '../../common/ai-index/ai-index-registry.service.js';
import { configService } from '../runtime/dms-config.service.js';
import {
  extractTitle,
  normalizePath,
  resolveAbsolutePath,
  stripMarkdown,
  toRelativePath,
} from './search.helpers.js';
import { SearchRuntimeService } from './search-runtime.service.js';

const DMS_AI_INDEX_CHUNK_SIZE = 1600;
const DMS_AI_INDEX_CHUNK_OVERLAP = 180;

interface DmsDocumentProjectionRow {
  documentId: bigint;
  relativePath: string;
  visibilityScope: string;
  ownerUserId: bigint;
  revisionSeq: number;
  contentHash: string;
  metadataJson: unknown;
  updatedAt: Date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function toAiJsonValue(value: unknown): AiIndexJsonValue {
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => toAiJsonValue(entry));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, toAiJsonValue(entry)]),
    );
  }

  return String(value);
}

function toAiJsonObject(value: unknown): AiIndexJsonObject {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, toAiJsonValue(entry)]),
  );
}

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function chunkText(text: string, maxChunkSize: number, overlap: number): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      continue;
    }

    if (currentChunk.length + trimmed.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = `${currentChunk.slice(-overlap)}\n\n${trimmed}`;
      continue;
    }

    currentChunk += `${currentChunk ? '\n\n' : ''}${trimmed}`;
  }

  const finalChunk = currentChunk.trim();
  if (finalChunk) {
    chunks.push(finalChunk);
  }

  if (chunks.length > 0) {
    return chunks;
  }

  const fallback = text.trim();
  return fallback ? [fallback] : [];
}

function resolveSensitivity(visibilityScope: string): AiIndexSensitivityCode {
  if (visibilityScope === 'public') return 'public';
  if (visibilityScope === 'organization') return 'internal';
  if (visibilityScope === 'self') return 'confidential';
  return 'restricted';
}

@Injectable()
export class DmsAiIndexAdapter implements AiIndexAdapter, OnModuleInit {
  private readonly logger = new Logger(DmsAiIndexAdapter.name);

  readonly sourceApp = 'dms';
  readonly label = 'DMS';
  readonly sourceKind = 'domain';
  readonly adapterCode = 'dms.markdown.ai-index';
  readonly capabilities = {
    keyword: true,
    metadata: true,
    semantic: false,
    vector: false,
    ragContext: false,
    indexing: true,
  };

  constructor(
    private readonly db: DatabaseService,
    private readonly runtime: SearchRuntimeService,
    private readonly registry: AiIndexRegistryService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async syncObject(request: AiIndexAdapterSyncRequest): Promise<AiIndexAdapterSyncResult> {
    const requestedPath = pickString(request.payload?.['path']) ?? request.entityId;
    const relativePath = normalizePath(requestedPath).replace(/^\/+/, '');

    if (!relativePath) {
      return {
        status: 'skipped',
        reasonCode: 'empty_path',
        reasonMessage: 'DMS AI index path is empty.',
      };
    }

    if (request.jobType === 'delete') {
      return {
        status: 'deleted',
        reasonCode: 'deleted_by_source',
        reasonMessage: 'DMS source requested AI index deletion.',
      };
    }

    if (configService.isUserSurfaceHiddenPath(relativePath)) {
      return {
        status: 'skipped',
        reasonCode: 'hidden_user_surface_path',
        reasonMessage: 'DMS user surface hidden path is excluded from AI index.',
      };
    }

    const rootDir = this.runtime.getDocDir();
    const absolutePath = resolveAbsolutePath(relativePath, rootDir);

    if (!fs.existsSync(absolutePath)) {
      return {
        status: 'skipped',
        reasonCode: 'missing_file',
        reasonMessage: `DMS source file does not exist: ${relativePath}`,
      };
    }

    const stat = fs.statSync(absolutePath);
    if (!stat.isFile() || !/\.md$/i.test(absolutePath)) {
      return {
        status: 'skipped',
        reasonCode: 'unsupported_source_path',
        reasonMessage: `DMS AI index supports markdown files only: ${relativePath}`,
      };
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const document = await this.findDocumentProjection(relativePath);
    const metadata = toAiJsonObject(document?.metadataJson);
    const title = pickString(metadata['title']) ?? extractTitle(content, path.basename(absolutePath));
    const contentHash = document?.contentHash ?? hashText(content);
    const visibilityScope = document?.visibilityScope ?? 'legacy';
    const sensitivity = resolveSensitivity(visibilityScope);
    const chunks = this.buildChunks(content, title, metadata);
    const normalizedRelativePath = toRelativePath(absolutePath, rootDir);

    return {
      status: 'indexed',
      projection: {
        sourceApp: 'dms',
        sourceName: 'DMS',
        sourceKind: 'domain',
        adapterCode: this.adapterCode,
        embeddingProfileCode: 'default',
        capabilities: this.capabilities,
        entityType: 'document',
        entityId: normalizedRelativePath,
        sourceVersion: request.sourceVersion ?? document?.revisionSeq?.toString(),
        title,
        bodyText: content,
        summary: pickString(metadata['summary']) ?? stripMarkdown(content).slice(0, 500),
        target: {
          sourceApp: 'dms',
          path: `/doc/${encodeURIComponent(normalizedRelativePath)}`,
        },
        metadata: {
          ...metadata,
          path: normalizedRelativePath,
          documentId: document?.documentId.toString() ?? '',
          visibilityScope,
          ownerUserId: document?.ownerUserId.toString() ?? '',
          revisionSeq: document?.revisionSeq ?? 1,
          updatedAt: document?.updatedAt.toISOString() ?? new Date(stat.mtimeMs).toISOString(),
        },
        contentHash,
        sensitivity,
        acl: {
          accessScope: visibilityScope === 'public'
            ? 'public'
            : visibilityScope === 'organization'
              ? 'organization'
              : visibilityScope === 'self'
                ? 'owner'
                : 'acl',
          sensitivity,
          searchEligible: true,
          contextEligible: visibilityScope === 'public' || visibilityScope === 'organization',
          snapshot: {
            visibilityScope,
            ownerUserId: document?.ownerUserId.toString() ?? '',
            documentId: document?.documentId.toString() ?? '',
          },
        },
        chunks,
      },
    };
  }

  private async findDocumentProjection(relativePath: string): Promise<DmsDocumentProjectionRow | null> {
    try {
      const document = await this.db.client.dmsDocument.findFirst({
        where: {
          relativePath,
          isActive: true,
        },
        select: {
          documentId: true,
          relativePath: true,
          visibilityScope: true,
          ownerUserId: true,
          revisionSeq: true,
          contentHash: true,
          metadataJson: true,
          updatedAt: true,
        },
      });

      return document;
    } catch (error) {
      this.logger.warn(`DMS document projection lookup failed (${relativePath}): ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private buildChunks(
    content: string,
    title: string,
    metadata: AiIndexJsonObject,
  ): AiIndexChunkProjection[] {
    return chunkText(content, DMS_AI_INDEX_CHUNK_SIZE, DMS_AI_INDEX_CHUNK_OVERLAP)
      .map((chunk, index) => ({
        chunkKey: `dms-document-${index}`,
        chunkSeq: index,
        chunkText: chunk,
        chunkHash: hashText(chunk),
        citationLabel: `${title} #${index + 1}`,
        metadata: {
          ...metadata,
          chunkIndex: index,
        },
      }));
  }
}
