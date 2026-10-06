import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import type { SnsAccessSnapshot, SnsFeatureAccess, SnsVisibilityScopeCode } from '@ssoo/types/sns';
import { DatabaseService } from '../../../database/database.service.js';
import { AccessFoundationService } from '../../common/access/access-foundation.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { PlatformAdmissionService } from '../../common/onboarding/platform-admission.service.js';

const SNS_PERMISSION_CODES = {
  readFeed: 'sns.feed.read',
  writePost: 'sns.post.write',
  writeComment: 'sns.comment.write',
  useReaction: 'sns.reaction.use',
  manageFollow: 'sns.follow.manage',
  manageSkills: 'sns.skill.manage',
  manageBoards: 'sns.board.manage',
  systemOverride: 'system.override',
} as const;

const FEATURE_ERROR_MESSAGES: Record<SnsFeatureKey, string> = {
  canReadFeed: 'SNS 피드를 조회할 권한이 없습니다.',
  canCreatePost: '게시물을 작성할 권한이 없습니다.',
  canComment: '댓글을 작성할 권한이 없습니다.',
  canReact: '반응 기능을 사용할 권한이 없습니다.',
  canFollow: '팔로우 기능을 사용할 권한이 없습니다.',
  canManageSkills: '스킬 관련 기능을 사용할 권한이 없습니다.',
  canManageBoards: '게시판을 관리할 권한이 없습니다.',
};

const buildFeatureAccess = (enabled: boolean): SnsFeatureAccess => ({
  canReadFeed: enabled,
  canCreatePost: enabled,
  canComment: enabled,
  canReact: enabled,
  canFollow: enabled,
  canManageSkills: enabled,
  canManageBoards: enabled,
});

export type SnsFeatureKey = keyof SnsFeatureAccess;

const SNS_VISIBILITY_SCOPE_CODES: SnsVisibilityScopeCode[] = [
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
    private readonly admission: PlatformAdmissionService = new PlatformAdmissionService(db),
  ) {}

  async getAccessSnapshot(user: TokenPayload): Promise<SnsAccessSnapshot> {
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
        canReadFeed: accessContext.grantedPermissionCodes.has(SNS_PERMISSION_CODES.readFeed),
        canCreatePost: accessContext.grantedPermissionCodes.has(SNS_PERMISSION_CODES.writePost),
        canComment: accessContext.grantedPermissionCodes.has(SNS_PERMISSION_CODES.writeComment),
        canReact: accessContext.grantedPermissionCodes.has(SNS_PERMISSION_CODES.useReaction),
        canFollow: accessContext.grantedPermissionCodes.has(SNS_PERMISSION_CODES.manageFollow),
        canManageSkills: accessContext.grantedPermissionCodes.has(SNS_PERMISSION_CODES.manageSkills),
        canManageBoards: accessContext.grantedPermissionCodes.has(SNS_PERMISSION_CODES.manageBoards),
      },
      policy: accessContext.policy,
    };
  }

  async assertFeatures(
    user: TokenPayload,
    requiredFeatures: SnsFeatureKey[],
  ): Promise<SnsAccessSnapshot> {
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

  async buildVisiblePostWhere(user: TokenPayload): Promise<Prisma.SnsPostWhereInput> {
    await this.admission.assertService(BigInt(user.userId), 'sns');
    if (await this.hasSystemOverride(user)) {
      return { isActive: true };
    }

    const userId = BigInt(user.userId);
    const [organizations, followingUserIds] = await Promise.all([
      this.admission.businessOrganizations(userId, 'sns'),
      this.getFollowingUserIds(userId),
    ]);
    const userOrgIds = organizations.map(organization => organization.orgId);

    const orConditions: Prisma.SnsPostWhereInput[] = [
      { authorUserId: userId },
      { visibilityScopeCode: 'public' },
      { accessRequests: { some: {
        requesterUserId: userId, statusCode: 'approved', isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      } } },
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
    const post = await this.db.client.snsPost.findFirst({
      where: {
        AND: [{ id: postId }, visibilityWhere],
      },
    });

    if (!post) {
      throw new NotFoundException(`Post ${postId} not found`);
    }

    return post;
  }

  async assertWritablePost(user: TokenPayload, postId: bigint): Promise<void> {
    const post = await this.assertReadablePost(user, postId);
    if (post.authorUserId === BigInt(user.userId) || await this.hasSystemOverride(user)) return;
    const granted = await this.db.client.snsPostAccessRequest.count({ where: {
      postId, requesterUserId: BigInt(user.userId), requestedRole: 'write', statusCode: 'approved', isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    } });
    if (!granted) throw new ForbiddenException('게시물을 수정할 권한이 없습니다.');
  }

  async resolvePostVisibility(
    user: TokenPayload,
    requestedScopeCode?: string | null,
    requestedOrganizationId?: string,
  ): Promise<{ visibilityScopeCode: SnsVisibilityScopeCode; targetOrgId: bigint | null }> {
    const visibilityScopeCode = this.normalizeVisibilityScope(requestedScopeCode);
    if (visibilityScopeCode !== 'organization') {
      return { visibilityScopeCode, targetOrgId: null };
    }

    const primaryOrgId = await this.admission.resolveBusinessOrganization(BigInt(user.userId), 'sns', requestedOrganizationId);

    return {
      visibilityScopeCode,
      targetOrgId: primaryOrgId,
    };
  }

  private async getFollowingUserIds(userId: bigint): Promise<bigint[]> {
    const followings = await this.db.client.snsFollow.findMany({
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
  ): SnsVisibilityScopeCode {
    const visibilityScopeCode = (requestedScopeCode ?? 'public') as SnsVisibilityScopeCode;
    if (SNS_VISIBILITY_SCOPE_CODES.includes(visibilityScopeCode)) {
      return visibilityScopeCode;
    }

    throw new BadRequestException('지원하지 않는 게시물 공개 범위입니다.');
  }
}
