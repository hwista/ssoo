import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import {
  ACTIVE_REQUEST_ACTIVITY,
  ACTIVE_REQUEST_SOURCE,
  normalizeComments,
  normalizePathHistory,
  normalizeSourceFiles,
  toSourceFileProjectionJson,
} from './access-request.util.js';

@Injectable()
export class DocumentProjectionService {
  constructor(private readonly db: DatabaseService) {}

  async syncDocumentProjectionRelations(
    documentId: bigint,
    relativePath: string,
    metadata: Record<string, unknown> | null,
    actorUserId: bigint,
  ): Promise<void> {
    await Promise.all([
      this.syncSourceFiles(documentId, metadata, actorUserId),
      this.syncPathHistory(documentId, relativePath, metadata, actorUserId),
      this.syncComments(documentId, metadata, actorUserId),
    ]);
  }

  private async syncSourceFiles(
    documentId: bigint,
    metadata: Record<string, unknown> | null,
    actorUserId: bigint,
  ): Promise<void> {
    const sourceFiles = normalizeSourceFiles(metadata);
    await this.db.client.dmsDocumentSourceFile.deleteMany({ where: { documentId } });
    if (sourceFiles.length === 0) {
      return;
    }

    await this.db.client.dmsDocumentSourceFile.createMany({
      data: sourceFiles.map((sourceFile, index) => ({
        documentId,
        sourceName: sourceFile.name,
        sourcePath: sourceFile.path,
        mediaType: sourceFile.type ?? null,
        fileSize: sourceFile.size ?? null,
        url: sourceFile.url ?? null,
        storageUri: sourceFile.storageUri ?? null,
        providerCode: sourceFile.provider ?? null,
        versionId: sourceFile.versionId ?? null,
        etag: sourceFile.etag ?? null,
        checksum: sourceFile.checksum ?? null,
        originCode: sourceFile.origin ?? null,
        statusCode: sourceFile.status ?? null,
        storageMode: sourceFile.storage ?? null,
        kindCode: sourceFile.kind ?? null,
        sortOrder: index,
        projectionJson: toSourceFileProjectionJson(sourceFile),
        createdBy: actorUserId,
        updatedBy: actorUserId,
        lastSource: ACTIVE_REQUEST_SOURCE,
        lastActivity: ACTIVE_REQUEST_ACTIVITY,
      })),
    });
  }

  private async syncPathHistory(
    documentId: bigint,
    relativePath: string,
    metadata: Record<string, unknown> | null,
    actorUserId: bigint,
  ): Promise<void> {
    const pathHistory = normalizePathHistory(relativePath, metadata);
    await this.db.client.dmsDocumentPathHistory.deleteMany({ where: { documentId } });
    if (pathHistory.length === 0) {
      return;
    }

    await this.db.client.dmsDocumentPathHistory.createMany({
      data: pathHistory.map((entry) => ({
        documentId,
        relativePath: entry.path,
        previousRelativePath: entry.previousRelativePath ?? null,
        reasonCode: entry.reasonCode,
        changedAt: entry.changedAt,
        changedByUserId: actorUserId,
        createdBy: actorUserId,
        updatedBy: actorUserId,
        lastSource: ACTIVE_REQUEST_SOURCE,
        lastActivity: ACTIVE_REQUEST_ACTIVITY,
      })),
    });
  }

  private async syncComments(
    documentId: bigint,
    metadata: Record<string, unknown> | null,
    actorUserId: bigint,
  ): Promise<void> {
    const comments = normalizeComments(metadata);
    await this.db.client.dmsDocumentComment.deleteMany({ where: { documentId } });
    if (comments.length === 0) {
      return;
    }

    await this.db.client.dmsDocumentComment.createMany({
      data: comments.map((comment, index) => ({
        documentId,
        commentKey: comment.id,
        parentCommentKey: comment.parentId ?? null,
        commentContent: comment.content,
        authorName: comment.author,
        authorEmail: comment.email ?? null,
        avatarUrl: comment.avatarUrl ?? null,
        commentCreatedAt: new Date(comment.createdAt),
        commentDeletedAt: comment.deletedAt ? new Date(comment.deletedAt) : null,
        sortOrder: index,
        isActive: true,
        createdBy: actorUserId,
        updatedBy: actorUserId,
        lastSource: ACTIVE_REQUEST_SOURCE,
        lastActivity: ACTIVE_REQUEST_ACTIVITY,
      })),
    });
  }
}
