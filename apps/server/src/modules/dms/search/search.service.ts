import fs from 'fs';
import path from 'path';
import { embed, embedMany } from 'ai';
import {
  BadRequestException,
  InternalServerErrorException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import type {
  AiContextOptions,
  SearchIndexSyncRequest,
  SearchIndexSyncResponse,
  SearchRequest,
  SearchResponse,
  SearchResultItem,
} from '@ssoo/types/dms';
import { DatabaseService } from '../../../database/database.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { AccessRequestService } from '../access/access-request.service.js';
import { DocumentAclService } from '../access/document-acl.service.js';
import {
  buildAutoSummary,
  buildExcerpt,
  buildPreviewSnippets,
  buildSearchResponse,
  extractTitle,
  getErrorMessage,
  listMarkdownFiles,
  normalizePath,
  resolveAbsolutePath,
  resolveDocumentPresentation,
  stripMarkdown,
  toDisplayPath,
  toRelativePath,
  tokenizeQuery,
} from './search.helpers.js';
import { getEmbeddingModel } from './search.provider.js';
import { SearchRuntimeService } from './search-runtime.service.js';

interface SemanticSearchRow {
  file_path: string;
  chunk_index: number;
  chunk_text: string;
  title: string | null;
  similarity: number | string;
}

interface PathSyncCounts {
  indexedFileCount: number;
  indexedChunkCount: number;
  deletedChunkCount: number;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private vectorStoreReady = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly runtime: SearchRuntimeService,
    private readonly accessRequestService: AccessRequestService,
    private readonly documentAclService: DocumentAclService,
  ) {}

  async onModuleInit() {
    await this.ensureVectorStore();
  }

  async search(request: SearchRequest, currentUser: TokenPayload): Promise<SearchResponse> {
    const query = request.query.trim();
    if (query.length < 2) {
      throw new BadRequestException('검색어가 비어 있습니다.');
    }

    const options: AiContextOptions = {
      contextMode: request.contextMode ?? 'doc',
      activeDocPath: request.activeDocPath,
    };

    const semanticResponse = await this.searchSemantic(query, currentUser, options);
    if (semanticResponse.results.length > 0) {
      return semanticResponse;
    }

    return this.searchKeyword(query, currentUser, options);
  }

  async syncIndex(request: SearchIndexSyncRequest): Promise<SearchIndexSyncResponse> {
    const action = request.action ?? 'upsert';
    const currentPath = normalizePath(request.path.trim());
    const previousPath = request.previousPath?.trim()
      ? normalizePath(request.previousPath.trim())
      : undefined;

    if (!currentPath) {
      throw new BadRequestException('경로가 비어 있습니다.');
    }

    await this.ensureVectorStore();
    if (!this.vectorStoreReady) {
      throw new InternalServerErrorException('DMS 벡터 스토어를 초기화할 수 없습니다.');
    }

    let deletedChunkCount = 0;
    if (previousPath && previousPath !== currentPath) {
      deletedChunkCount += await this.deleteEmbeddingsForPath(previousPath);
    }

    if (action === 'delete') {
      deletedChunkCount += await this.deleteEmbeddingsForPath(currentPath);
      return {
        action,
        path: currentPath,
        previousPath,
        indexedFileCount: 0,
        indexedChunkCount: 0,
        deletedChunkCount,
      };
    }

    const syncCounts = await this.syncIndexForPath(currentPath);
    return {
      action,
      path: currentPath,
      previousPath,
      indexedFileCount: syncCounts.indexedFileCount,
      indexedChunkCount: syncCounts.indexedChunkCount,
      deletedChunkCount: deletedChunkCount + syncCounts.deletedChunkCount,
    };
  }

  private async ensureVectorStore(): Promise<void> {
    if (this.vectorStoreReady) {
      return;
    }

    try {
      await this.db.client.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector');
      await this.db.client.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS dms_document_embeddings (
          id SERIAL PRIMARY KEY,
          file_path TEXT NOT NULL,
          chunk_index INTEGER NOT NULL DEFAULT 0,
          chunk_text TEXT NOT NULL,
          title TEXT,
          embedding vector(1536),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(file_path, chunk_index)
        )
      `);

      try {
        await this.db.client.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS idx_dms_embeddings_vector
          ON dms_document_embeddings
          USING ivfflat (embedding vector_cosine_ops)
          WITH (lists = 100)
        `);
      } catch (error) {
        this.logger.log(
          `DMS 벡터 인덱스 생성 스킵: ${getErrorMessage(error)}`,
        );
      }

      this.vectorStoreReady = true;
    } catch (error) {
      this.logger.warn(
        `DMS 벡터 스토어 초기화 실패, 키워드 검색으로만 동작합니다: ${getErrorMessage(error)}`,
      );
    }
  }

  private async searchSemantic(
    query: string,
    currentUser: TokenPayload,
    options?: AiContextOptions,
  ): Promise<SearchResponse> {
    try {
      await this.ensureVectorStore();

      const embeddingModel = await getEmbeddingModel();
      const { embedding } = await embed({
        model: embeddingModel,
        value: query,
      });

      const searchConfig = this.runtime.getSearchConfig();
      const rootDir = this.runtime.getDocDir();
      const terms = tokenizeQuery(query);
      const vector = `[${embedding.join(',')}]`;
      const rows = await this.db.client.$queryRawUnsafe<SemanticSearchRow[]>(
        `SELECT
           file_path,
           chunk_index,
           chunk_text,
           title,
           1 - (embedding <=> $1::vector) AS similarity
         FROM dms_document_embeddings
         WHERE 1 - (embedding <=> $1::vector) > $2
         ORDER BY embedding <=> $1::vector
         LIMIT $3`,
        vector,
        searchConfig.semanticThreshold,
        searchConfig.maxResults,
      );

      const results: SearchResultItem[] = [];

      rows.forEach((row, index) => {
        const displayPath = toDisplayPath(row.file_path, rootDir);
        const resolvedPath = resolveAbsolutePath(row.file_path, rootDir);
        const access = this.documentAclService.describeSearchResultAccess(currentUser, resolvedPath);

        let content = row.chunk_text;

        if (access.isReadable && fs.existsSync(resolvedPath)) {
          content = fs.readFileSync(resolvedPath, 'utf-8');
        }

        const fileName = path.basename(displayPath || row.file_path);
        const fallbackTitle = row.title?.trim() || fileName.replace(/\.md$/i, '');
        const presentation = resolveDocumentPresentation(
          row.file_path,
          rootDir,
          fallbackTitle,
        );
        const { snippets, totalCount } = buildPreviewSnippets(
          content || row.chunk_text,
          query,
          terms,
          4,
        );
        const excerpt = snippets[0] || stripMarkdown(row.chunk_text).slice(0, 200);
        const summary = presentation.sidecarSummary || buildAutoSummary(
          content || row.chunk_text,
          query,
          terms,
          snippets,
        );

        results.push({
          id: `semantic-${index}`,
          title: presentation.title,
          excerpt,
          path: displayPath,
          score: Number(row.similarity) || 0,
          summary,
          snippets,
          totalSnippetCount: totalCount,
          owner: access.owner,
          visibilityScope: access.visibilityScope,
          isReadable: access.isReadable,
          canRequestRead: access.canRequestRead,
        });
      });

      const resultsWithRequests = await this.accessRequestService.attachReadRequestStates(
        currentUser,
        results,
      );
      return buildSearchResponse(query, resultsWithRequests, options);
    } catch (error) {
      this.logger.warn(
        `시맨틱 검색 실패, 키워드 검색으로 전환합니다: ${getErrorMessage(error)}`,
      );
      return buildSearchResponse(query, [], options);
    }
  }

  private async searchKeyword(
    query: string,
    currentUser: TokenPayload,
    options?: AiContextOptions,
  ): Promise<SearchResponse> {
    const searchConfig = this.runtime.getSearchConfig();
    const rootDir = this.runtime.getDocDir();
    const normalizedQuery = query.trim();
    const lowerQuery = normalizedQuery.toLowerCase();
    const terms = tokenizeQuery(normalizedQuery);
    const files = listMarkdownFiles(rootDir);
    const results: SearchResultItem[] = [];

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lowerContent = content.toLowerCase();
      const relativePath = toRelativePath(filePath, rootDir);
      const lowerPath = relativePath.toLowerCase();
      const fileName = path.basename(filePath);
      const fallbackTitle = extractTitle(content, fileName);
      const presentation = resolveDocumentPresentation(filePath, rootDir, fallbackTitle);
      const lowerTitle = presentation.title.toLowerCase();
      const hasExactMatch = lowerContent.includes(lowerQuery);
      const hasTermMatch = terms.some((term) => (
        lowerContent.includes(term) || lowerPath.includes(term) || lowerTitle.includes(term)
      ));

      if (!hasExactMatch && !hasTermMatch) {
        continue;
      }

      const access = this.documentAclService.describeSearchResultAccess(currentUser, filePath);

      const { excerpt, score: contentScore } = buildExcerpt(
        content,
        normalizedQuery,
        terms,
      );
      const { snippets, totalCount } = buildPreviewSnippets(
        content,
        normalizedQuery,
        terms,
        4,
      );
      const summary = presentation.sidecarSummary || buildAutoSummary(
        content,
        normalizedQuery,
        terms,
        snippets,
      );
      const metaScore = terms.reduce((score, term) => {
        let nextScore = score;
        if (lowerTitle.includes(term)) nextScore += 6;
        if (lowerPath.includes(term)) nextScore += 4;
        return nextScore;
      }, 0);

      results.push({
        id: filePath,
        title: presentation.title,
        excerpt,
        path: relativePath,
        score: contentScore + metaScore,
        summary,
        snippets,
        totalSnippetCount: totalCount,
        owner: access.owner,
        visibilityScope: access.visibilityScope,
        isReadable: access.isReadable,
        canRequestRead: access.canRequestRead,
      });
    }

    results.sort((left, right) => right.score - left.score);
    const resultsWithRequests = await this.accessRequestService.attachReadRequestStates(
      currentUser,
      results.slice(0, searchConfig.maxResults),
    );
    return buildSearchResponse(
      query,
      resultsWithRequests,
      options,
    );
  }

  private async syncIndexForPath(docPath: string): Promise<PathSyncCounts> {
    const rootDir = this.runtime.getDocDir();
    const resolvedPath = resolveAbsolutePath(docPath, rootDir);

    if (!fs.existsSync(resolvedPath)) {
      this.logger.warn(`DMS 인덱스 동기화 스킵: 경로를 찾을 수 없습니다. (${docPath})`);
      return {
        indexedFileCount: 0,
        indexedChunkCount: 0,
        deletedChunkCount: 0,
      };
    }

    const stats = fs.statSync(resolvedPath);
    if (stats.isDirectory()) {
      const prefix = toRelativePath(resolvedPath, rootDir);
      const deletedChunkCount = await this.deleteEmbeddingsForPath(prefix);
      const markdownFiles = listMarkdownFiles(resolvedPath);
      let indexedChunkCount = 0;

      for (const markdownFile of markdownFiles) {
        indexedChunkCount += await this.upsertFileEmbeddings(markdownFile, rootDir);
      }

      return {
        indexedFileCount: markdownFiles.length,
        indexedChunkCount,
        deletedChunkCount,
      };
    }

    if (!/\.md$/i.test(resolvedPath)) {
      return {
        indexedFileCount: 0,
        indexedChunkCount: 0,
        deletedChunkCount: 0,
      };
    }

    const relativePath = toRelativePath(resolvedPath, rootDir);
    const deletedChunkCount = await this.deleteEmbeddingsForPath(relativePath);
    const indexedChunkCount = await this.upsertFileEmbeddings(resolvedPath, rootDir);

    return {
      indexedFileCount: indexedChunkCount > 0 ? 1 : 0,
      indexedChunkCount,
      deletedChunkCount,
    };
  }

  private async upsertFileEmbeddings(filePath: string, rootDir: string): Promise<number> {
    const searchConfig = this.runtime.getSearchConfig();
    const relativePath = toRelativePath(filePath, rootDir);
    const content = fs.readFileSync(filePath, 'utf-8');
    const chunks = this.chunkText(
      content,
      searchConfig.chunkSize,
      searchConfig.chunkOverlap,
    );

    if (chunks.length === 0) {
      return 0;
    }

    const embeddingModel = await getEmbeddingModel();
    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: chunks,
    });

    const metadata = this.readDocumentMetadata(filePath);
    const title = resolveDocumentPresentation(
      filePath,
      rootDir,
      extractTitle(content, path.basename(filePath)),
    ).title;

    for (let index = 0; index < chunks.length; index += 1) {
      const vector = `[${embeddings[index].join(',')}]`;
      await this.db.client.$executeRawUnsafe(
        `INSERT INTO dms_document_embeddings
           (file_path, chunk_index, chunk_text, title, embedding, metadata)
         VALUES ($1, $2, $3, $4, $5::vector, $6::jsonb)
         ON CONFLICT (file_path, chunk_index)
         DO UPDATE SET
           chunk_text = EXCLUDED.chunk_text,
           title = EXCLUDED.title,
           embedding = EXCLUDED.embedding,
           metadata = EXCLUDED.metadata,
           updated_at = NOW()`,
        relativePath,
        index,
        chunks[index],
        title,
        vector,
        JSON.stringify(metadata),
      );
    }

    return chunks.length;
  }

  private async deleteEmbeddingsForPath(docPath: string): Promise<number> {
    const rootDir = this.runtime.getDocDir();
    const normalizedPath = path.isAbsolute(docPath)
      ? toRelativePath(docPath, rootDir)
      : normalizePath(docPath).replace(/^\/+/, '');

    if (!normalizedPath) {
      return 0;
    }

    if (/\.md$/i.test(normalizedPath)) {
      return this.db.client.$executeRawUnsafe(
        'DELETE FROM dms_document_embeddings WHERE file_path = $1',
        normalizedPath,
      );
    }

    const prefix = normalizedPath.replace(/\/+$/, '');
    return this.db.client.$executeRawUnsafe(
      `DELETE FROM dms_document_embeddings
       WHERE file_path = $1 OR file_path LIKE $2`,
      prefix,
      `${prefix}/%`,
    );
  }

  private chunkText(text: string, maxChunkSize: number, overlap: number): string[] {
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
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = `${overlapText}\n\n${trimmed}`;
      } else {
        currentChunk += `${currentChunk ? '\n\n' : ''}${trimmed}`;
      }
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

  private readDocumentMetadata(filePath: string): Record<string, unknown> {
    try {
      const parsed = path.parse(filePath);
      const sidecarPath = path.join(parsed.dir, `${parsed.name}.sidecar.json`);
      if (!fs.existsSync(sidecarPath)) {
        return {};
      }

      return JSON.parse(fs.readFileSync(sidecarPath, 'utf-8')) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}
