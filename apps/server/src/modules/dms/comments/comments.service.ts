import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import type { CommonNotificationJsonValue } from '@ssoo/types/common';
import type {
  DmsDocumentCommentMutationResult,
  DmsDocumentCommentsResult,
  DocumentComment,
} from '@ssoo/types/dms';
import { DatabaseService } from '../../../database/database.service.js';
import { UserService } from '../../common/user/user.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CommonNotificationService } from '../../common/notification/notification.service.js';
import { DocumentAclService } from '../access/document-acl.service.js';
import { DocumentRecordService } from '../access/document-record.service.js';
import { contentService } from '../runtime/content.service.js';
import { normalizeRelativePath } from '../runtime/path-utils.js';

const COMMENT_SELECT = {
  commentId: true,
  commentKey: true,
  parentCommentKey: true,
  commentContent: true,
  authorName: true,
  authorEmail: true,
  avatarUrl: true,
  commentCreatedAt: true,
  commentDeletedAt: true,
  commentDeletedBy: true,
  commentDeletedByName: true,
  createdBy: true,
  updatedBy: true,
  sortOrder: true,
} satisfies Prisma.DmsDocumentCommentSelect;

type CommentRecord = Prisma.DmsDocumentCommentGetPayload<{
  select: typeof COMMENT_SELECT;
}>;

interface DocumentCommentContext {
  documentId: bigint;
  ownerUserId: bigint;
  relativePath: string;
  absolutePath: string;
}

interface ParentCommentRecord {
  commentId: bigint;
  commentKey: string;
  authorName: string;
  createdBy: bigint | null;
}

function toBigIntUserId(user: TokenPayload): bigint {
  return BigInt(user.userId);
}

function toDocumentComment(record: CommentRecord): DocumentComment {
  const deletedByUserId = record.commentDeletedAt
    ? (record.commentDeletedBy ?? record.updatedBy)?.toString()
    : undefined;

  return {
    id: record.commentKey,
    author: record.authorName,
    authorUserId: record.createdBy?.toString(),
    email: record.authorEmail ?? undefined,
    avatarUrl: record.avatarUrl ?? undefined,
    content: record.commentContent,
    createdAt: record.commentCreatedAt.toISOString(),
    parentId: record.parentCommentKey ?? undefined,
    deletedAt: record.commentDeletedAt?.toISOString(),
    deletedByUserId,
    deletedByName: record.commentDeletedAt
      ? record.commentDeletedByName ?? undefined
      : undefined,
  };
}

function toJsonProjection(comments: DocumentComment[]): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(comments)) as Prisma.InputJsonValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly userService: UserService,
    private readonly documentAclService: DocumentAclService,
    private readonly documentRecordService: DocumentRecordService,
    private readonly notificationService: CommonNotificationService,
  ) {}

  async list(pathValue: string, currentUser: TokenPayload): Promise<DmsDocumentCommentsResult> {
    const context = await this.resolveContext(pathValue, currentUser);
    const comments = await this.listComments(context.documentId);
    return {
      path: context.relativePath,
      comments,
    };
  }

  async create(
    payload: { path: string; content: string; parentId?: string },
    currentUser: TokenPayload,
  ): Promise<DmsDocumentCommentMutationResult> {
    const context = await this.resolveContext(payload.path, currentUser);
    const content = payload.content.trim();
    if (!content) {
      throw new BadRequestException('댓글 내용을 입력하세요.');
    }

    const parentComment = payload.parentId?.trim()
      ? await this.assertReplyTarget(context.documentId, payload.parentId.trim())
      : null;

    const actorUserId = toBigIntUserId(currentUser);
    const author = await this.resolveAuthor(currentUser);
    const sortOrder = await this.resolveNextSortOrder(context.documentId);
    const created = await this.db.client.dmsDocumentComment.create({
      data: {
        documentId: context.documentId,
        commentKey: `comment-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`,
        parentCommentKey: payload.parentId?.trim() || null,
        commentContent: content,
        authorName: author.name,
        authorEmail: author.email,
        avatarUrl: author.avatarUrl,
        commentCreatedAt: new Date(),
        sortOrder,
        createdBy: actorUserId,
        updatedBy: actorUserId,
        lastSource: 'dms-comments-api',
        lastActivity: payload.parentId?.trim() ? 'reply' : 'create',
      },
      select: COMMENT_SELECT,
    });

    const action = parentComment ? 'reply' : 'create';
    const comments = await this.afterMutation(context, currentUser);
    try {
      await this.notifyCommentCreated(context, created, parentComment, author.name, actorUserId, action);
    } catch (error) {
      this.logger.warn(`댓글 알림 생성 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
    this.publishCommentChanged(context, currentUser, action, created.commentKey);
    return {
      path: context.relativePath,
      comment: toDocumentComment(created),
      comments,
    };
  }

  async delete(
    pathValue: string,
    commentKey: string,
    currentUser: TokenPayload,
  ): Promise<DmsDocumentCommentMutationResult> {
    const context = await this.resolveContext(pathValue, currentUser);
    const comment = await this.getCommentRecord(context.documentId, commentKey);
    this.assertCanModerateComment(context, comment, currentUser);

    const actorUserId = toBigIntUserId(currentUser);
    const actor = await this.resolveAuthor(currentUser);
    const deleted = await this.db.client.dmsDocumentComment.update({
      where: { commentId: comment.commentId },
      data: {
        commentDeletedAt: new Date(),
        commentDeletedBy: actorUserId,
        commentDeletedByName: actor.name,
        updatedBy: actorUserId,
        lastSource: 'dms-comments-api',
        lastActivity: 'delete',
      },
      select: COMMENT_SELECT,
    });

    const comments = await this.afterMutation(context, currentUser);
    this.publishCommentChanged(context, currentUser, 'delete', commentKey);
    return {
      path: context.relativePath,
      comment: toDocumentComment(deleted),
      comments,
    };
  }

  async restore(
    pathValue: string,
    commentKey: string,
    currentUser: TokenPayload,
  ): Promise<DmsDocumentCommentMutationResult> {
    const context = await this.resolveContext(pathValue, currentUser);
    const comment = await this.getCommentRecord(context.documentId, commentKey);
    this.assertCanRestoreComment(comment, currentUser);

    const restored = await this.db.client.dmsDocumentComment.update({
      where: { commentId: comment.commentId },
      data: {
        commentDeletedAt: null,
        commentDeletedBy: null,
        commentDeletedByName: null,
        updatedBy: toBigIntUserId(currentUser),
        lastSource: 'dms-comments-api',
        lastActivity: 'restore',
      },
      select: COMMENT_SELECT,
    });

    const comments = await this.afterMutation(context, currentUser);
    this.publishCommentChanged(context, currentUser, 'restore', commentKey);
    return {
      path: context.relativePath,
      comment: toDocumentComment(restored),
      comments,
    };
  }

  private async resolveContext(pathValue: string, currentUser: TokenPayload): Promise<DocumentCommentContext> {
    const { targetPath, valid, safeRelPath } = contentService.resolveContentPath(pathValue);
    const relativePath = normalizeRelativePath(safeRelPath);
    if (!valid || !relativePath || !/\.md$/i.test(relativePath)) {
      throw new BadRequestException('유효한 마크다운 문서 경로가 필요합니다.');
    }
    if (!fs.existsSync(targetPath)) {
      throw new NotFoundException('문서를 찾을 수 없습니다.');
    }

    this.documentAclService.assertCanReadAbsolutePath(currentUser, targetPath);
    const document = await this.documentRecordService.ensureDocumentRecord(relativePath);
    return {
      documentId: document.documentId,
      ownerUserId: document.ownerUserId,
      relativePath,
      absolutePath: targetPath,
    };
  }

  private async resolveAuthor(currentUser: TokenPayload) {
    const profile = await this.userService.findProfileById(toBigIntUserId(currentUser));
    return {
      name: profile?.displayName?.trim()
        || profile?.userName?.trim()
        || currentUser.userName?.trim()
        || currentUser.loginId,
      email: profile?.email?.trim() || null,
      avatarUrl: profile?.avatarUrl?.trim() || null,
    };
  }

  private async resolveNextSortOrder(documentId: bigint): Promise<number> {
    const aggregate = await this.db.client.dmsDocumentComment.aggregate({
      where: { documentId },
      _max: { sortOrder: true },
    });
    return (aggregate._max.sortOrder ?? -1) + 1;
  }

  private async assertReplyTarget(documentId: bigint, parentCommentKey: string): Promise<ParentCommentRecord> {
    const target = await this.db.client.dmsDocumentComment.findFirst({
      where: {
        documentId,
        commentKey: parentCommentKey,
        isActive: true,
        commentDeletedAt: null,
      },
      select: {
        commentId: true,
        commentKey: true,
        authorName: true,
        createdBy: true,
      },
    });
    if (!target) {
      throw new BadRequestException('답글 대상 댓글을 찾을 수 없습니다.');
    }
    return target;
  }

  private async getCommentRecord(documentId: bigint, commentKey: string): Promise<CommentRecord> {
    const comment = await this.db.client.dmsDocumentComment.findFirst({
      where: {
        documentId,
        commentKey,
        isActive: true,
      },
      select: COMMENT_SELECT,
    });
    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }
    return comment;
  }

  private assertCanModerateComment(
    context: DocumentCommentContext,
    comment: CommentRecord,
    currentUser: TokenPayload,
  ): void {
    const actorUserId = currentUser.userId;
    const isAuthor = comment.createdBy?.toString() === actorUserId;
    const canManage = this.documentAclService.isManageableAbsolutePath(currentUser, context.absolutePath);
    if (!isAuthor && !canManage) {
      throw new ForbiddenException('댓글을 수정할 권한이 없습니다.');
    }
  }

  private assertCanRestoreComment(
    comment: CommentRecord,
    currentUser: TokenPayload,
  ): void {
    if (!comment.commentDeletedAt) {
      throw new BadRequestException('삭제된 댓글만 복원할 수 있습니다.');
    }

    const deletedByUserId = (comment.commentDeletedBy ?? comment.updatedBy)?.toString();
    if (!deletedByUserId || deletedByUserId !== currentUser.userId) {
      throw new ForbiddenException('댓글을 복원할 권한이 없습니다.');
    }
  }

  private async listComments(documentId: bigint): Promise<DocumentComment[]> {
    const rows = await this.db.client.dmsDocumentComment.findMany({
      where: {
        documentId,
        isActive: true,
      },
      select: COMMENT_SELECT,
      orderBy: [
        { sortOrder: 'asc' },
        { commentId: 'asc' },
      ],
    });
    return rows.map(toDocumentComment);
  }

  private async afterMutation(
    context: DocumentCommentContext,
    currentUser: TokenPayload,
  ): Promise<DocumentComment[]> {
    const comments = await this.listComments(context.documentId);
    await this.refreshDocumentCommentProjection(context.documentId, currentUser, comments);
    return comments;
  }

  private publishCommentChanged(
    context: DocumentCommentContext,
    currentUser: TokenPayload,
    action: 'create' | 'reply' | 'delete' | 'restore',
    commentKey: string,
  ): void {
    this.notificationService.publishDomainEvent('dms', 'dms.document-comment.changed', {
      action,
      documentId: context.documentId.toString(),
      path: context.relativePath,
      commentId: commentKey,
      actorUserId: currentUser.userId,
      actorUserName: currentUser.userName ?? currentUser.loginId,
    });
  }

  private async notifyCommentCreated(
    context: DocumentCommentContext,
    comment: CommentRecord,
    parentComment: ParentCommentRecord | null,
    actorName: string,
    actorUserId: bigint,
    action: 'create' | 'reply',
  ): Promise<void> {
    const recipientIds = new Set<string>();
    recipientIds.add(context.ownerUserId.toString());
    if (parentComment?.createdBy) {
      recipientIds.add(parentComment.createdBy.toString());
    }
    recipientIds.delete(actorUserId.toString());

    if (recipientIds.size === 0) {
      return;
    }

    const isReply = action === 'reply';
    const notificationType = isReply
      ? 'dms.document-comment.replied'
      : 'dms.document-comment.created';
    const title = isReply ? '댓글 답글' : '새 댓글';
    const message = isReply
      ? `${actorName}님이 ${context.relativePath} 문서 댓글에 답글을 남겼습니다.`
      : `${actorName}님이 ${context.relativePath} 문서에 댓글을 남겼습니다.`;
    const actionPayload: Record<string, CommonNotificationJsonValue> = {
      documentId: context.documentId.toString(),
      path: context.relativePath,
      commentId: comment.commentKey,
      section: 'comments',
    };
    if (parentComment?.commentKey) {
      actionPayload.parentCommentId = parentComment.commentKey;
    }

    await this.notificationService.notifyMany(Array.from(recipientIds).map((recipientUserId) => ({
      recipientUserId: BigInt(recipientUserId),
      actorUserId,
      sourceApp: 'dms',
      notificationType,
      severity: 'info',
      title,
      message,
      reference: {
        type: 'dms.document-comment',
        id: comment.commentKey,
        path: context.relativePath,
      },
      action: {
        type: 'open-dms-document',
        label: '문서 열기',
        payload: actionPayload,
      },
      dedupeKey: [
        'dms',
        'document-comment',
        action,
        recipientUserId,
        context.documentId.toString(),
        comment.commentKey,
      ].join(':'),
    })));
  }

  private async refreshDocumentCommentProjection(
    documentId: bigint,
    currentUser: TokenPayload,
    comments: DocumentComment[],
  ): Promise<void> {
    const document = await this.db.client.dmsDocument.findUnique({
      where: { documentId },
      select: { metadataJson: true },
    });
    const metadata = isRecord(document?.metadataJson) ? document.metadataJson : {};
    await this.db.client.dmsDocument.update({
      where: { documentId },
      data: {
        metadataJson: {
          ...metadata,
          comments: toJsonProjection(comments),
        } as Prisma.InputJsonValue,
        updatedBy: toBigIntUserId(currentUser),
      },
    });
  }
}
