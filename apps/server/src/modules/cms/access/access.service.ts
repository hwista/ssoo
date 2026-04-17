import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import type { CmsAccessSnapshot, CmsFeatureAccess, CmsVisibilityScopeCode } from '@ssoo/types/cms';
import { DatabaseService } from '../../../database/database.service.js';
import { AccessFoundationService } from '../../common/access/access-foundation.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';

const CMS_PERMISSION_CODES = {
  readFeed: 'cms.feed.read',
  writePost: 'cms.post.write',
  writeComment: 'cms.comment.write',
  useReaction: 'cms.reaction.use',
  manageFollow: 'cms.follow.manage',
  manageSkills: 'cms.skill.manage',
  manageBoards: 'cms.board.manage',
  systemOverride: 'system.override',
} as const;

const FEATURE_ERROR_MESSAGES: Record<CmsFeatureKey, string> = {
  canReadFeed: 'CMS 피드를 조회할 권한이 없습니다.',
  canCreatePost: '게시물을 작성할 권한이 없습니다.',
  canComment: '댓글을 작성할 권한이 없습니다.',
  canReact: '반응 기능을 사용할 권한이 없습니다.',
  canFollow: '팔로우 기능을 사용할 권한이 없습니다.',
  canManageSkills: '스킬 관련 기능을 사용할 권한이 없습니다.',
  canManageBoards: '게시판을 관리할 권한이 없습니다.',
};

const buildFeatureAccess = (enabled: boolean): CmsFeatureAccess => ({
  canReadFeed: enabled,
  canCreatePost: enabled,
  canComment: enabled,
  canReact: enabled,
  canFollow: enabled,
  canManageSkills: enabled,
  canManageBoards: enabled,
});

export type CmsFeatureKey = keyof CmsFeatureAccess;

const CMS_VISIBILITY_SCOPE_CODES: CmsVisibilityScopeCode[] = [
  'public',
  'organization',
  'followers',
  'self',
];

@Injectable()
export class AccessService {
  constructor(
    private readonly db: DatabaseService,
    private readonly accessFoundationService: AccessFoundationService,
  ) {}

  async getAccessSnapshot(user: TokenPayload): Promise<CmsAccessSnapshot> {
    const accessContext = await this.accessFoundationService.resolveActionPermissionContext(user);
    const hasSystemOverride = accessContext.policy.hasSystemOverride;

    if (hasSystemOverride) {
      return {
        features: buildFeatureAccess(true),
        policy: accessContext.policy,
      };
    }

    return {
      features: {
        canReadFeed: accessContext.grantedPermissionCodes.has(CMS_PERMISSION_CODES.readFeed),
        canCreatePost: accessContext.grantedPermissionCodes.has(CMS_PERMISSION_CODES.writePost),
        canComment: accessContext.grantedPermissionCodes.has(CMS_PERMISSION_CODES.writeComment),
        canReact: accessContext.grantedPermissionCodes.has(CMS_PERMISSION_CODES.useReaction),
        canFollow: accessContext.grantedPermissionCodes.has(CMS_PERMISSION_CODES.manageFollow),
        canManageSkills: accessContext.grantedPermissionCodes.has(CMS_PERMISSION_CODES.manageSkills),
        canManageBoards: accessContext.grantedPermissionCodes.has(CMS_PERMISSION_CODES.manageBoards),
      },
      policy: accessContext.policy,
    };
  }

  async assertFeatures(
    user: TokenPayload,
    requiredFeatures: CmsFeatureKey[],
  ): Promise<CmsAccessSnapshot> {
    const snapshot = await this.getAccessSnapshot(user);
    const deniedFeature = requiredFeatures.find((feature) => !snapshot.features[feature]);

    if (deniedFeature) {
      throw new ForbiddenException(FEATURE_ERROR_MESSAGES[deniedFeature]);
    }

    return snapshot;
  }

  async assertSameUserOrOverride(
    user: TokenPayload,
    targetUserId: bigint,
    errorMessage: string,
  ): Promise<void> {
    if (BigInt(user.userId) === targetUserId) {
      return;
    }

    if (await this.hasSystemOverride(user)) {
      return;
    }

    throw new ForbiddenException(errorMessage);
  }

  async hasSystemOverride(user: TokenPayload): Promise<boolean> {
    const accessContext = await this.accessFoundationService.resolveActionPermissionContext(user);
    return accessContext.policy.hasSystemOverride;
  }

  async buildVisiblePostWhere(user: TokenPayload): Promise<Prisma.CmsPostWhereInput> {
    if (await this.hasSystemOverride(user)) {
      return { isActive: true };
    }

    const userId = BigInt(user.userId);
    const now = new Date();
    const [userOrgIds, followingUserIds] = await Promise.all([
      this.accessFoundationService.getUserOrganizationIds(userId, now),
      this.getFollowingUserIds(userId),
    ]);

    const orConditions: Prisma.CmsPostWhereInput[] = [
      { authorUserId: userId },
      { visibilityScopeCode: 'public' },
    ];

    if (userOrgIds.length > 0) {
      orConditions.push({
        visibilityScopeCode: 'organization',
        targetOrgId: { in: userOrgIds },
      });
    }

    if (followingUserIds.length > 0) {
      orConditions.push({
        visibilityScopeCode: 'followers',
        authorUserId: { in: followingUserIds },
      });
    }

    return {
      isActive: true,
      OR: orConditions,
    };
  }

  async assertReadablePost(user: TokenPayload, postId: bigint) {
    const visibilityWhere = await this.buildVisiblePostWhere(user);
    const post = await this.db.client.cmsPost.findFirst({
      where: {
        AND: [{ id: postId }, visibilityWhere],
      },
    });

    if (!post) {
      throw new NotFoundException(`Post ${postId} not found`);
    }

    return post;
  }

  async resolvePostVisibility(
    user: TokenPayload,
    requestedScopeCode?: string | null,
  ): Promise<{ visibilityScopeCode: CmsVisibilityScopeCode; targetOrgId: bigint | null }> {
    const visibilityScopeCode = this.normalizeVisibilityScope(requestedScopeCode);
    if (visibilityScopeCode !== 'organization') {
      return { visibilityScopeCode, targetOrgId: null };
    }

    const primaryOrgId = await this.getPrimaryOrganizationId(BigInt(user.userId), new Date());
    if (!primaryOrgId) {
      throw new BadRequestException('조직 공개 게시물을 작성하려면 primary 조직 소속이 필요합니다.');
    }

    return {
      visibilityScopeCode,
      targetOrgId: primaryOrgId,
    };
  }

  private async getPrimaryOrganizationId(userId: bigint, now: Date): Promise<bigint | null> {
    const relations = await this.db.client.userOrganizationRelation.findMany({
      where: {
        userId,
        isActive: true,
        organization: {
          isActive: true,
          orgClass: 'permanent',
        },
        AND: [
          {
            OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }],
          },
          {
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
          },
        ],
      },
      select: {
        orgId: true,
        isPrimary: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    return relations[0]?.orgId ?? null;
  }

  private async getFollowingUserIds(userId: bigint): Promise<bigint[]> {
    const followings = await this.db.client.cmsFollow.findMany({
      where: {
        followerUserId: userId,
      },
      select: {
        followingUserId: true,
      },
    });

    return followings.map((following) => following.followingUserId);
  }

  private normalizeVisibilityScope(
    requestedScopeCode?: string | null,
  ): CmsVisibilityScopeCode {
    const visibilityScopeCode = (requestedScopeCode ?? 'public') as CmsVisibilityScopeCode;
    if (CMS_VISIBILITY_SCOPE_CODES.includes(visibilityScopeCode)) {
      return visibilityScopeCode;
    }

    throw new BadRequestException('지원하지 않는 게시물 공개 범위입니다.');
  }
}
