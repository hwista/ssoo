import fs from 'node:fs';
import { jest } from '@jest/globals';
import type { TokenPayload } from '../../src/modules/common/auth/interfaces/auth.interface.js';
import { CommentsService } from '../../src/modules/dms/comments/comments.service.js';
import { contentService } from '../../src/modules/dms/runtime/content.service.js';

interface CommentRow {
  commentId: bigint;
  documentId: bigint;
  commentKey: string;
  parentCommentKey: string | null;
  commentContent: string;
  authorName: string;
  authorEmail: string | null;
  avatarUrl: string | null;
  commentCreatedAt: Date;
  commentDeletedAt: Date | null;
  commentDeletedBy: bigint | null;
  commentDeletedByName: string | null;
  sortOrder: number;
  isActive: boolean;
  createdBy: bigint | null;
  updatedBy: bigint | null;
  lastSource?: string | null;
  lastActivity?: string | null;
}

class FakeDmsDocumentCommentTable {
  rows: CommentRow[] = [];
  private nextId = 1n;

  async findMany(args: { where: { documentId: bigint }; select?: Record<string, boolean>; orderBy?: unknown[] }) {
    const rows = this.rows
      .filter((row) => row.documentId === args.where.documentId && row.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder || Number(a.commentId - b.commentId));

    if (args.select && Object.keys(args.select).length === 1 && args.select.commentKey) {
      return rows.map((row) => ({ commentKey: row.commentKey }));
    }

    return rows.map(toSelectedCommentRow);
  }

  async createMany(args: { data: Array<Omit<CommentRow, 'commentId'>>; skipDuplicates?: boolean }) {
    let count = 0;
    for (const item of args.data) {
      if (args.skipDuplicates && this.rows.some((row) => row.documentId === item.documentId && row.commentKey === item.commentKey)) {
        continue;
      }
      this.rows.push({ ...item, commentId: this.nextId++ });
      count += 1;
    }
    return { count };
  }

  async create(args: { data: Omit<CommentRow, 'commentId' | 'isActive'> & Partial<Pick<CommentRow, 'isActive'>> }) {
    const row: CommentRow = {
      ...args.data,
      commentId: this.nextId++,
      isActive: args.data.isActive ?? true,
    };
    this.rows.push(row);
    return toSelectedCommentRow(row);
  }

  async aggregate(args: { where: { documentId: bigint }; _max: { sortOrder: true } }) {
    const sortOrders = this.rows
      .filter((row) => row.documentId === args.where.documentId)
      .map((row) => row.sortOrder);
    return { _max: { sortOrder: sortOrders.length > 0 ? Math.max(...sortOrders) : null } };
  }

  async findFirst(args: { where: { documentId: bigint; commentKey: string; isActive: true; commentDeletedAt?: null } }) {
    const row = this.rows.find((candidate) => (
      candidate.documentId === args.where.documentId
      && candidate.commentKey === args.where.commentKey
      && candidate.isActive
      && (args.where.commentDeletedAt === undefined || candidate.commentDeletedAt === args.where.commentDeletedAt)
    ));
    return row ? toSelectedCommentRow(row) : null;
  }
}

function toSelectedCommentRow(row: CommentRow) {
  return {
    commentId: row.commentId,
    commentKey: row.commentKey,
    parentCommentKey: row.parentCommentKey,
    commentContent: row.commentContent,
    authorName: row.authorName,
    authorEmail: row.authorEmail,
    avatarUrl: row.avatarUrl,
    commentCreatedAt: row.commentCreatedAt,
    commentDeletedAt: row.commentDeletedAt,
    commentDeletedBy: row.commentDeletedBy,
    commentDeletedByName: row.commentDeletedByName,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    sortOrder: row.sortOrder,
  };
}

const tokenFor = (userId: string, loginId: string): TokenPayload => ({
  userId,
  loginId,
  userName: loginId,
  sessionId: `session-${userId}`,
} as unknown as TokenPayload);

describe('CommentsService', () => {
  let commentsTable: FakeDmsDocumentCommentTable;
  let metadataJson: Record<string, unknown>;
  let notificationService: {
    notifyMany: jest.Mock<(inputs: unknown[]) => Promise<unknown[]>>;
    publishDomainEvent: jest.Mock<(sourceApp: string, eventType: string, payload: unknown) => void>;
  };
  let service: CommentsService;

  beforeEach(() => {
    commentsTable = new FakeDmsDocumentCommentTable();
    metadataJson = {};
    const db = {
      client: {
        dmsDocument: {
          findUnique: jest.fn(async () => ({ metadataJson })),
          update: jest.fn(async ({ data }: { data: { metadataJson: Record<string, unknown> } }) => {
            metadataJson = data.metadataJson;
            return { metadataJson };
          }),
        },
        dmsDocumentComment: commentsTable,
      },
    };
    const userService = {
      findProfileById: jest.fn(async (id: bigint) => ({
        displayName: id === 1n ? 'Actor' : `User ${id.toString()}`,
        userName: `user-${id.toString()}`,
        email: id === 1n ? 'actor@example.com' : `user-${id.toString()}@example.com`,
        avatarUrl: null,
      })),
      findByEmail: jest.fn(async (email: string) => (
        email === 'parent@example.com' ? { id: 2n } : null
      )),
    };
    const documentAclService = {
      assertCanReadAbsolutePath: jest.fn(),
      isManageableAbsolutePath: jest.fn(() => false),
    };
    const documentRecordService = {
      ensureDocumentRecord: jest.fn(async () => ({
        documentId: 10n,
        ownerUserId: 9n,
      })),
    };
    notificationService = {
      notifyMany: jest.fn(async (inputs: unknown[]) => inputs),
      publishDomainEvent: jest.fn(),
    };

    jest.spyOn(contentService, 'resolveContentPath').mockReturnValue({
      targetPath: '/tmp/dms-comment-test.md',
      valid: true,
      safeRelPath: 'docs/comment-test.md',
    });
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    service = new CommentsService(
      db as never,
      userService as never,
      documentAclService as never,
      documentRecordService as never,
      notificationService as never,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('backfills metadata-only comments before creating a new comment', async () => {
    metadataJson = {
      title: 'Comment Test',
      comments: [{
        id: 'legacy-comment',
        author: 'Parent User',
        authorUserId: '2',
        email: 'parent@example.com',
        content: '기존 댓글',
        createdAt: '2026-06-04T00:00:00.000Z',
      }],
    };

    const result = await service.create({
      path: 'docs/comment-test.md',
      content: '새 댓글',
    }, tokenFor('1', 'actor'));

    expect(result.comments.map((comment) => comment.id)).toEqual([
      'legacy-comment',
      result.comment?.id,
    ]);
    expect(commentsTable.rows.find((row) => row.commentKey === 'legacy-comment')?.createdBy).toBe(2n);
    expect((metadataJson.comments as Array<{ id: string }>).map((comment) => comment.id)).toEqual([
      'legacy-comment',
      result.comment?.id,
    ]);
  });

  it('notifies the document owner and parent comment author when a reply is created', async () => {
    commentsTable.rows.push({
      commentId: 1n,
      documentId: 10n,
      commentKey: 'parent-comment',
      parentCommentKey: null,
      commentContent: '원 댓글',
      authorName: 'Parent User',
      authorEmail: 'parent@example.com',
      avatarUrl: null,
      commentCreatedAt: new Date('2026-06-04T00:00:00.000Z'),
      commentDeletedAt: null,
      commentDeletedBy: null,
      commentDeletedByName: null,
      sortOrder: 0,
      isActive: true,
      createdBy: 99n,
      updatedBy: 99n,
      lastSource: 'dms.access.request',
      lastActivity: 'sync',
    });

    await service.create({
      path: 'docs/comment-test.md',
      content: '답글',
      parentId: 'parent-comment',
    }, tokenFor('1', 'actor'));

    const recipients = (notificationService.notifyMany.mock.calls[0]?.[0] as Array<{ recipientUserId: bigint }>)
      .map((input) => input.recipientUserId.toString())
      .sort();

    expect(recipients).toEqual(['2', '9']);
  });
});
