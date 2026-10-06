import { AccessService } from '../access/access.service.js';
import type { AiIndexObjectRef } from '@ssoo/types/common';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { createHash } from 'crypto';
import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import type {
  AiIndexAclProjection,
  AiIndexAdapterSyncRequest,
  AiIndexAdapterSyncResult,
  AiIndexChunkProjection,
  AiIndexJsonObject,
  AiIndexSensitivityCode,
} from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { AiIndexAdapter } from '../../common/ai-index/ai-index-adapter.js';
import { AiEmbeddingProviderService } from '../../common/ai-index/ai-embedding-provider.service.js';
import { AiIndexRegistryService } from '../../common/ai-index/ai-index-registry.service.js';

type SnsPostProjection = Prisma.SnsPostGetPayload<{
  include: {
    board: { select: { boardCode: true; boardName: true; boardType: true } };
    category: { select: { categoryName: true } };
    postTags: { include: { tag: true } };
    accessRequests: { select: { requesterUserId: true } };
    _count: { select: { comments: true; reactions: true; attachments: true; bookmarks: true } };
  };
}>;

interface ProjectionSection {
  key: string;
  title: string;
  text: string;
}

function parsePositiveBigIntId(value: string): bigint | null {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const id = BigInt(normalized);
  return id > 0n ? id : null;
}

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function pickString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function formatDateTime(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined;
}

function appendLine(lines: string[], label: string, value: string | undefined): void {
  if (value && value.trim().length > 0) {
    lines.push(`${label}: ${value}`);
  }
}

function createSection(key: string, title: string, lines: string[]): ProjectionSection | null {
  const textLines = lines.filter((line) => line.trim().length > 0);
  if (textLines.length === 0) {
    return null;
  }

  return {
    key,
    title,
    text: [`## ${title}`, ...textLines].join('\n'),
  };
}

function resolveTitle(post: SnsPostProjection): string {
  return pickString(post.title) ?? `SNS post ${post.id.toString()}`;
}

function buildSummary(post: SnsPostProjection): string {
  return pickString(post.content)?.slice(0, 180)
    ?? `${post.visibilityScopeCode} SNS post ${post.id.toString()}`;
}

function buildSections(post: SnsPostProjection): ProjectionSection[] {
  const overviewLines: string[] = [];
  appendLine(overviewLines, 'Title', resolveTitle(post));
  appendLine(overviewLines, 'Board', post.board?.boardName);
  appendLine(overviewLines, 'Board code', post.board?.boardCode);
  appendLine(overviewLines, 'Board type', post.board?.boardType);
  appendLine(overviewLines, 'Category', post.category?.categoryName);
  appendLine(overviewLines, 'Visibility', post.visibilityScopeCode);
  appendLine(overviewLines, 'Author user id', post.authorUserId.toString());
  appendLine(overviewLines, 'Content type', post.contentType);
  appendLine(overviewLines, 'Pinned', post.isPinned ? 'true' : 'false');
  appendLine(overviewLines, 'Created at', formatDateTime(post.createdAt));
  appendLine(overviewLines, 'Updated at', formatDateTime(post.updatedAt));

  const contentLines: string[] = [];
  appendLine(contentLines, 'Content', pickString(post.content));

  const tagNames = post.postTags
    .map((postTag) => pickString(postTag.tag.tagName))
    .filter((tagName): tagName is string => Boolean(tagName));
  const engagementLines: string[] = [];
  appendLine(engagementLines, 'Tags', tagNames.length > 0 ? tagNames.join(', ') : undefined);
  appendLine(engagementLines, 'View count', post.viewCount.toString());
  appendLine(engagementLines, 'Comment count', post._count.comments.toString());
  appendLine(engagementLines, 'Reaction count', post._count.reactions.toString());
  appendLine(engagementLines, 'Attachment count', post._count.attachments.toString());
  appendLine(engagementLines, 'Bookmark count', post._count.bookmarks.toString());

  return [
    createSection('overview', 'SNS Post Overview', overviewLines),
    createSection('content', 'SNS Post Content', contentLines),
    createSection('engagement', 'SNS Post Engagement', engagementLines),
  ].filter((section): section is ProjectionSection => Boolean(section));
}

function buildMetadata(post: SnsPostProjection, sourceVersion: string): AiIndexJsonObject {
  const tagNames = post.postTags
    .map((postTag) => pickString(postTag.tag.tagName))
    .filter((tagName): tagName is string => Boolean(tagName));

  return {
    postId: post.id.toString(),
    authorUserId: post.authorUserId.toString(),
    boardId: post.boardId?.toString() ?? null,
    boardCode: post.board?.boardCode ?? null,
    boardName: post.board?.boardName ?? null,
    boardType: post.board?.boardType ?? null,
    categoryId: post.categoryId?.toString() ?? null,
    categoryName: post.category?.categoryName ?? null,
    contentType: post.contentType,
    visibilityScopeCode: post.visibilityScopeCode,
    targetOrgId: post.targetOrgId?.toString() ?? null,
    isPinned: post.isPinned,
    viewCount: post.viewCount,
    commentCount: post._count.comments,
    reactionCount: post._count.reactions,
    attachmentCount: post._count.attachments,
    bookmarkCount: post._count.bookmarks,
    tags: tagNames,
    sourceVersion,
    updatedAt: post.updatedAt.toISOString(),
  };
}

function buildAcl(post: SnsPostProjection): { sensitivity: AiIndexSensitivityCode; acl: AiIndexAclProjection } {
  const authorUserId = post.authorUserId.toString();
  const readableUserIds = [...new Set([authorUserId, ...post.accessRequests.map(request => request.requesterUserId.toString())])];
  const visibilityScopeCode = post.visibilityScopeCode;

  if (visibilityScopeCode === 'public') {
    const sensitivity: AiIndexSensitivityCode = 'public';
    const snapshot: AiIndexJsonObject = {
      policy: 'sns.post.read',
      access: 'public',
      visibilityScopeCode,
      authorUserId,
    };

    return {
      sensitivity,
      acl: {
        accessScope: 'public',
        sensitivity,
        searchEligible: true,
        contextEligible: true,
        policyHash: hashText(JSON.stringify(snapshot)),
        snapshot,
      },
    };
  }

  if (visibilityScopeCode === 'organization') {
    const sensitivity: AiIndexSensitivityCode = 'internal';
    const organizationIds = post.targetOrgId ? [post.targetOrgId.toString()] : [];
    const snapshot: AiIndexJsonObject = {
      policy: 'sns.post.read',
      access: 'organization-acl',
      visibilityScopeCode,
      authorUserId,
      ownerUserId: authorUserId,
      readableUserIds,
      organizationIds,
      targetOrgId: post.targetOrgId?.toString() ?? null,
    };

    return {
      sensitivity,
      acl: {
        accessScope: 'acl',
        sensitivity,
        searchEligible: true,
        contextEligible: true,
        policyHash: hashText(JSON.stringify(snapshot)),
        snapshot,
      },
    };
  }

  const sensitivity: AiIndexSensitivityCode = 'restricted';
  const snapshot: AiIndexJsonObject = {
    policy: 'sns.post.read',
    access: readableUserIds.length > 1 ? 'individual-acl' : 'owner-only',
    visibilityScopeCode,
    authorUserId,
    ownerUserId: authorUserId,
    readableUserIds,
    userIds: readableUserIds,
  };

  return {
    sensitivity,
    acl: {
      accessScope: readableUserIds.length > 1 ? 'acl' : 'owner',
      sensitivity,
      searchEligible: true,
      contextEligible: true,
      policyHash: hashText(JSON.stringify(snapshot)),
      snapshot,
    },
  };
}

function buildChunks(post: SnsPostProjection, sections: ProjectionSection[]): AiIndexChunkProjection[] {
  return sections.map((section, index) => ({
    chunkKey: `sns-post-${section.key}`,
    chunkSeq: index,
    chunkText: section.text,
    chunkHash: hashText(section.text),
    citationLabel: `${resolveTitle(post)} ${section.title}`,
    metadata: {
      section: section.key,
      postId: post.id.toString(),
    },
  }));
}

@Injectable()
export class SnsAiIndexAdapter implements AiIndexAdapter, OnModuleInit {
  readonly sourceApp = 'sns';
  readonly label = 'SNS';
  readonly sourceKind = 'domain';
  readonly adapterCode = 'sns.post.ai-index';

  get capabilities() {
    const embeddingReady = this.embeddingProvider.getStatus('default').ready;

    return {
      keyword: true,
      metadata: true,
      semantic: embeddingReady,
      vector: embeddingReady,
      ragContext: embeddingReady,
      indexing: true,
    };
  }

  constructor(
    private readonly db: DatabaseService,
    private readonly registry: AiIndexRegistryService,
    private readonly embeddingProvider: AiEmbeddingProviderService,
    private readonly access: AccessService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async canRead(request: AiIndexObjectRef, user: TokenPayload): Promise<boolean> {
    if (request.entityType !== 'post' || !/^\d+$/.test(request.entityId)) return false;
    if (!(await this.access.getAccessSnapshot(user)).features.canReadFeed) return false;
    return Boolean(await this.db.client.snsPost.findFirst({ where: { AND: [{ id: BigInt(request.entityId) }, await this.access.buildVisiblePostWhere(user)] }, select: { id: true } }));
  }

  async syncObject(request: AiIndexAdapterSyncRequest): Promise<AiIndexAdapterSyncResult> {
    if (request.entityType !== 'post') {
      return {
        status: 'skipped',
        reasonCode: 'unsupported_entity_type',
        reasonMessage: `SNS AI index supports post entities only: ${request.entityType}`,
      };
    }

    const postId = parsePositiveBigIntId(request.entityId);
    if (!postId) {
      return {
        status: 'skipped',
        reasonCode: 'invalid_post_id',
        reasonMessage: `SNS AI index post id is invalid: ${request.entityId}`,
      };
    }

    if (request.jobType === 'delete') {
      return {
        status: 'deleted',
        reasonCode: 'deleted_by_source',
        reasonMessage: 'SNS post source requested AI index deletion.',
      };
    }

    const post = await this.findPostProjection(postId);
    if (!post) {
      return {
        status: 'skipped',
        reasonCode: 'missing_post',
        reasonMessage: `SNS post does not exist or is inactive: ${request.entityId}`,
      };
    }

    const sourceVersion = request.sourceVersion ?? post.updatedAt.toISOString();
    const sections = buildSections(post);
    const bodyText = sections.map((section) => section.text).join('\n\n');
    const { sensitivity, acl } = buildAcl(post);

    return {
      status: 'indexed',
      projection: {
        sourceApp: 'sns',
        sourceName: 'SNS',
        sourceKind: 'domain',
        adapterCode: this.adapterCode,
        embeddingProfileCode: 'default',
        capabilities: this.capabilities,
        entityType: 'post',
        entityId: post.id.toString(),
        sourceVersion,
        title: resolveTitle(post),
        bodyText,
        summary: buildSummary(post),
        target: {
          sourceApp: 'sns',
          path: post.boardId
            ? `/board/${post.boardId.toString()}?postId=${post.id.toString()}`
            : `/?postId=${post.id.toString()}`,
        },
        metadata: buildMetadata(post, sourceVersion),
        contentHash: hashText(bodyText),
        sensitivity,
        acl,
        chunks: buildChunks(post, sections),
      },
    };
  }

  private async findPostProjection(postId: bigint): Promise<SnsPostProjection | null> {
    return this.db.client.snsPost.findFirst({
      where: {
        id: postId,
        isActive: true,
      },
      include: {
        accessRequests: {
          where: { isActive: true, statusCode: 'approved', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          select: { requesterUserId: true },
        },
        board: {
          select: {
            boardCode: true,
            boardName: true,
            boardType: true,
          },
        },
        category: {
          select: {
            categoryName: true,
          },
        },
        postTags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
            attachments: true,
            bookmarks: true,
          },
        },
      },
    }) as Promise<SnsPostProjection | null>;
  }
}
