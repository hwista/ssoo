import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { DocumentMetadata } from '@/types/document-metadata';
import { logger } from '@/lib/utils/errorUtils';

interface MetadataFileStat {
  size: number;
  createdAt: string;
  modifiedAt: string;
  accessedAt: string;
}

function extractTitleFromContent(content: string, filePath: string): string {
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch?.[1]) {
    return headingMatch[1].trim();
  }
  return path.parse(filePath).name;
}

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

class DocumentMetadataService {
  getDocumentMetadataPath(filePath: string): string {
    const parsed = path.parse(filePath);
    return path.join(parsed.dir, `${parsed.name}.sidecar.json`);
  }

  private getLegacyMetadataPath(filePath: string): string {
    const parsed = path.parse(filePath);
    return path.join(parsed.dir, `${parsed.name}.json`);
  }

  buildDefaultDocumentMetadata(
    content: string,
    filePath: string,
    fileMeta: MetadataFileStat,
    existing?: DocumentMetadata
  ): DocumentMetadata {
    const now = new Date().toISOString();

    return {
      title: existing?.title || extractTitleFromContent(content, filePath),
      summary: existing?.summary ?? '',
      tags: existing?.tags ?? [],
      sourceLinks: existing?.sourceLinks ?? [],
      bodyLinks: existing?.bodyLinks ?? [],
      createdAt: existing?.createdAt ?? fileMeta.createdAt,
      updatedAt: now,
      fileHashes: {
        content: hashContent(content),
        sources: existing?.fileHashes?.sources ?? {},
      },
      chunkIds: existing?.chunkIds ?? [],
      embeddingModel: existing?.embeddingModel ?? '',
      sourceFiles: existing?.sourceFiles ?? [],
      acl: existing?.acl ?? { owners: [], editors: [], viewers: [] },
      versionHistory: existing?.versionHistory ?? [],
      comments: existing?.comments ?? [],
      templateId: existing?.templateId ?? 'default',
      author: existing?.author ?? 'Unknown',
      lastModifiedBy: existing?.author ?? 'Unknown',
    };
  }

  readDocumentMetadata(filePath: string): DocumentMetadata | null {
    const metadataPath = this.getDocumentMetadataPath(filePath);

    if (fs.existsSync(metadataPath)) {
      try {
        const raw = fs.readFileSync(metadataPath, 'utf-8');
        return JSON.parse(raw) as DocumentMetadata;
      } catch (error) {
        logger.warn('문서 메타데이터 파싱 실패', { metadataPath, error });
        return null;
      }
    }

    const legacyPath = this.getLegacyMetadataPath(filePath);
    if (fs.existsSync(legacyPath)) {
      try {
        const raw = fs.readFileSync(legacyPath, 'utf-8');
        const data = JSON.parse(raw) as DocumentMetadata;
        fs.writeFileSync(metadataPath, JSON.stringify(data, null, 2), 'utf-8');
        fs.unlinkSync(legacyPath);
        logger.info('사이드카 메타데이터 마이그레이션 완료', { legacyPath, metadataPath });
        return data;
      } catch (error) {
        logger.warn('레거시 메타데이터 마이그레이션 실패', { legacyPath, error });
        return null;
      }
    }

    return null;
  }

  writeDocumentMetadata(filePath: string, metadata: DocumentMetadata): void {
    const metadataPath = this.getDocumentMetadataPath(filePath);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  }

  ensureDocumentMetadata(content: string, filePath: string, fileMeta: MetadataFileStat): DocumentMetadata {
    const existing = this.readDocumentMetadata(filePath);
    const metadata = this.buildDefaultDocumentMetadata(content, filePath, fileMeta, existing ?? undefined);
    this.writeDocumentMetadata(filePath, metadata);
    return metadata;
  }
}

export const documentMetadataService = new DocumentMetadataService();
