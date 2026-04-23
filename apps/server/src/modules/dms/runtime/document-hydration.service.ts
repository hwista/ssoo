import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { configService } from '../runtime/dms-config.service.js';

const logger = new Logger('DocumentHydrationService');

interface HydrationResult {
  documentsCreated: number;
  documentsSkipped: number;
  documentsMissing: number;
  templatesCreated: number;
  templatesSkipped: number;
}

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function extractTitle(content: string, filePath: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? path.parse(filePath).name;
}

interface SidecarData {
  title?: string;
  summary?: string;
  tags?: string[];
  sourceLinks?: unknown[];
  bodyLinks?: unknown[];
  sourceFiles?: Array<{ name: string; path: string; type: string; size: number; origin: string; status: string; provider: string }>;
  referenceFiles?: Array<{ name: string; path: string; type: string; size: number; origin: string; status: string; provider: string }>;
  comments?: Array<{ id: string; author: string; text: string; createdAt: string; updatedAt?: string; resolved?: boolean }>;
  acl?: { owners?: string[]; editors?: string[]; viewers?: string[] };
  templateId?: string;
  author?: string;
  lastModifiedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  fileHashes?: Record<string, unknown>;
  chunkIds?: string[];
  embeddingModel?: string;
  versionHistory?: unknown[];
  contentType?: string;
}

function readSidecar(mdFullPath: string): SidecarData | null {
  const sidecarPath = mdFullPath.replace(/\.md$/, '.sidecar.json');
  if (!fs.existsSync(sidecarPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(sidecarPath, 'utf-8')) as SidecarData;
  } catch {
    return null;
  }
}

function collectMarkdownFiles(rootDir: string, relativeTo: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
    return results;
  }

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(fullPath, relativeTo));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(path.relative(relativeTo, fullPath));
    }
  }
  return results;
}

@Injectable()
export class DocumentHydrationService {
  constructor(private readonly db: DatabaseService) {}

  async hydrateFromDisk(): Promise<HydrationResult> {
    const docDir = configService.getDocDir();
    const templateDir = configService.getTemplateDir();

    logger.log(`문서 하이드레이션 시작 — docDir: ${docDir}`);

    if (!fs.existsSync(docDir)) {
      logger.warn('문서 루트 디렉토리 없음 — 하이드레이션 스킵');
      return { documentsCreated: 0, documentsSkipped: 0, documentsMissing: 0, templatesCreated: 0, templatesSkipped: 0 };
    }

    const adminUser = await this.findAdminUser();
    if (!adminUser) {
      logger.warn('admin 사용자 미발견 — 하이드레이션 스킵');
      return { documentsCreated: 0, documentsSkipped: 0, documentsMissing: 0, templatesCreated: 0, templatesSkipped: 0 };
    }

    const docResult = await this.hydrateDocuments(docDir, templateDir, adminUser.id);
    const tplResult = await this.hydrateTemplates(templateDir, docDir, adminUser.id);

    const result: HydrationResult = {
      ...docResult,
      ...tplResult,
    };

    logger.log(
      `하이드레이션 완료 — 문서: +${result.documentsCreated} 신규, ${result.documentsSkipped} 스킵, ${result.documentsMissing} missing | ` +
      `템플릿: +${result.templatesCreated} 신규, ${result.templatesSkipped} 스킵`,
    );

    return result;
  }

  private async findAdminUser(): Promise<{ id: bigint } | null> {
    return this.db.client.user.findFirst({
      where: {
        roleCode: 'admin',
        isActive: true,
      },
      select: { id: true },
    });
  }

  private async hydrateDocuments(
    docDir: string,
    templateDir: string,
    adminUserId: bigint,
  ): Promise<Pick<HydrationResult, 'documentsCreated' | 'documentsSkipped' | 'documentsMissing'>> {
    const allFiles = collectMarkdownFiles(docDir, docDir);
    const templatePrefix = path.relative(docDir, templateDir);

    // _templates/ 하위는 문서가 아닌 템플릿으로 처리
    const docFiles = allFiles.filter((f) => !f.startsWith(templatePrefix));

    const existingDocs = await this.db.client.dmsDocument.findMany({
      where: { isActive: true },
      select: { relativePath: true },
    });
    const existingPaths = new Set(existingDocs.map((d) => d.relativePath));

    let created = 0;
    let skipped = 0;

    for (const relPath of docFiles) {
      if (existingPaths.has(relPath)) {
        skipped++;
        continue;
      }

      const fullPath = path.join(docDir, relPath);
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const hash = hashContent(content);
        const sidecar = readSidecar(fullPath);
        const title = sidecar?.title || extractTitle(content, relPath);

        // sourceFiles / referenceFiles를 하나로 합침
        const mergedSourceFiles = [
          ...(sidecar?.sourceFiles ?? []),
          ...(sidecar?.referenceFiles ?? []),
        ];

        const metadataJson: Record<string, unknown> = {
          title,
          ownerId: adminUserId.toString(),
          ownerLoginId: 'admin',
          ...(sidecar?.summary ? { summary: sidecar.summary } : {}),
          ...(sidecar?.tags?.length ? { tags: sidecar.tags } : {}),
          ...(sidecar?.sourceLinks?.length ? { sourceLinks: sidecar.sourceLinks } : {}),
          ...(sidecar?.bodyLinks?.length ? { bodyLinks: sidecar.bodyLinks } : {}),
          ...(sidecar?.templateId ? { templateId: sidecar.templateId } : {}),
          ...(sidecar?.author && sidecar.author !== 'Unknown' ? { author: sidecar.author } : { author: 'admin' }),
          ...(sidecar?.lastModifiedBy ? { lastModifiedBy: sidecar.lastModifiedBy } : { lastModifiedBy: 'admin' }),
          ...(sidecar?.fileHashes ? { fileHashes: sidecar.fileHashes } : {}),
          ...(sidecar?.chunkIds?.length ? { chunkIds: sidecar.chunkIds } : {}),
          ...(sidecar?.embeddingModel ? { embeddingModel: sidecar.embeddingModel } : {}),
          ...(sidecar?.versionHistory?.length ? { versionHistory: sidecar.versionHistory } : {}),
          ...(sidecar?.contentType ? { contentType: sidecar.contentType } : {}),
          ...(mergedSourceFiles.length ? { sourceFiles: mergedSourceFiles } : {}),
          ...(sidecar?.comments?.length ? { comments: sidecar.comments } : {}),
          visibility: { scope: 'organization' },
          grants: [],
          fileHashes: sidecar?.fileHashes ?? { content: hash, sources: {} },
        };

        const doc = await this.db.client.dmsDocument.create({
          data: {
            relativePath: relPath,
            ownerUserId: adminUserId,
            visibilityScope: 'organization',
            documentStatusCode: 'active',
            syncStatusCode: 'synced',
            contentHash: hash,
            metadataJson,
            lastSource: 'hydration',
            lastActivity: 'document-hydration.bootstrap',
            createdBy: adminUserId,
            updatedBy: adminUserId,
          },
        });

        // admin에게 manage grant 부여
        await this.db.client.dmsDocumentGrant.create({
          data: {
            documentId: doc.documentId,
            principalType: 'user',
            principalRef: adminUserId.toString(),
            roleCode: 'manage',
            grantSourceCode: 'owner-default',
            grantedByUserId: adminUserId,
            lastSource: 'hydration',
            lastActivity: 'document-hydration.bootstrap',
            createdBy: adminUserId,
            updatedBy: adminUserId,
          },
        });

        // sidecar sourceFiles / referenceFiles → dm_document_source_file_m
        if (mergedSourceFiles.length > 0) {
          logger.debug(`sourceFiles ${mergedSourceFiles.length}건 등록 시도: ${relPath}`);
        }
        for (const sf of mergedSourceFiles) {
          try {
            await this.db.client.dmsDocumentSourceFile.create({
              data: {
                documentId: doc.documentId,
                sourceName: sf.name,
                sourcePath: sf.path,
                mediaType: sf.type,
                fileSize: sf.size ?? 0,
                originCode: sf.origin ?? 'reference',
                statusCode: sf.status ?? 'published',
                providerCode: sf.provider ?? 'local',
                lastSource: 'hydration',
                lastActivity: 'sidecar-migration',
                createdBy: adminUserId,
                updatedBy: adminUserId,
              },
            });
          } catch (sfErr) {
            logger.warn(`sourceFile 등록 실패 (${relPath}): ${sf.name}`, sfErr instanceof Error ? sfErr.message : String(sfErr));
          }
        }

        // sidecar comments → dm_document_comment_m
        for (const comment of sidecar?.comments ?? []) {
          try {
            const commentKey = comment.id || crypto.randomUUID();
            await this.db.client.dmsDocumentComment.create({
              data: {
                documentId: doc.documentId,
                commentKey,
                commentContent: comment.text ?? '',
                authorName: comment.author ?? 'Unknown',
                commentCreatedAt: comment.createdAt ? new Date(comment.createdAt) : new Date(),
                lastSource: 'hydration',
                lastActivity: 'sidecar-migration',
                createdBy: adminUserId,
                updatedBy: adminUserId,
              },
            });
          } catch {
            // best-effort
          }
        }

        if (sidecar) {
          logger.debug(`sidecar 메타데이터 적용: ${relPath}`);
        }

        created++;
      } catch (err) {
        logger.warn(`문서 등록 실패: ${relPath}`, err instanceof Error ? err.message : String(err));
      }
    }

    // DB에는 있지만 디스크에 없는 문서 → missing 마킹
    const diskPaths = new Set(docFiles);
    const missingPaths = existingDocs
      .map((d) => d.relativePath)
      .filter((p) => !diskPaths.has(p));

    let missing = 0;
    for (const missingPath of missingPaths) {
      try {
        await this.db.client.dmsDocument.updateMany({
          where: { relativePath: missingPath, syncStatusCode: { not: 'missing' } },
          data: {
            syncStatusCode: 'missing',
            lastSource: 'hydration',
            lastActivity: 'document-hydration.missing-check',
          },
        });
        missing++;
      } catch {
        // best-effort
      }
    }

    return { documentsCreated: created, documentsSkipped: skipped, documentsMissing: missing };
  }

  private async hydrateTemplates(
    templateDir: string,
    docDir: string,
    adminUserId: bigint,
  ): Promise<Pick<HydrationResult, 'templatesCreated' | 'templatesSkipped'>> {
    if (!fs.existsSync(templateDir)) {
      return { templatesCreated: 0, templatesSkipped: 0 };
    }

    const tplFiles = collectMarkdownFiles(templateDir, templateDir);
    const existingTpls = await this.db.client.dmsTemplate.findMany({
      where: { isActive: true },
      select: { relativePath: true },
    });
    const existingPaths = new Set(existingTpls.map((t) => t.relativePath));

    let created = 0;
    let skipped = 0;

    for (const relPath of tplFiles) {
      if (existingPaths.has(relPath)) {
        skipped++;
        continue;
      }

      try {
        const fullPath = path.join(templateDir, relPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const title = extractTitle(content, relPath);
        const templateKey = path.parse(relPath).name;

        const scopeCode = relPath.startsWith('system/') ? 'system' : 'personal';
        const kindCode = relPath.startsWith('system/') ? 'system-doc' : 'personal';

        await this.db.client.dmsTemplate.create({
          data: {
            templateKey,
            relativePath: relPath,
            templateScopeCode: scopeCode,
            templateKindCode: kindCode,
            ownerRef: scopeCode === 'system' ? 'system' : String(adminUserId),
            visibilityCode: scopeCode === 'system' ? 'public' : 'private',
            templateStatusCode: 'active',
            sourceTypeCode: 'markdown-file',
            metadataJson: { title },
            lastSource: 'hydration',
            lastActivity: 'document-hydration.bootstrap',
            createdBy: adminUserId,
            updatedBy: adminUserId,
          },
        });
        created++;
      } catch (err) {
        logger.warn(`템플릿 등록 실패: ${relPath}`, err instanceof Error ? err.message : String(err));
      }
    }

    return { templatesCreated: created, templatesSkipped: skipped };
  }
}
