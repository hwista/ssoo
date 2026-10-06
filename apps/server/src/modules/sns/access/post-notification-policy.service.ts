import { ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import type { CommonNotificationDomainEvent, CommonNotificationItem } from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import { NotificationObjectPolicyService, type NotificationObjectPolicy } from '../../common/notification/notification-object-policy.service.js';
import { AccessService } from './access.service.js';

function id(value: unknown): bigint | undefined {
  return typeof value === 'string' && /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n ? BigInt(value) : undefined;
}

@Injectable()
export class PostNotificationPolicyService implements OnModuleInit, NotificationObjectPolicy {
  constructor(private readonly db: DatabaseService, private readonly policies: NotificationObjectPolicyService,
    private readonly access: AccessService) {}
  onModuleInit(): void { this.policies.register('sns', this); }

  async canReadNotification(item: CommonNotificationItem): Promise<boolean> {
    const referenceType = item.reference?.type?.toLowerCase();
    const payload = item.action?.payload;
    let postId = id(payload?.postId);
    if (payload?.postId !== undefined && !postId) return false;
    if (!postId && (referenceType === 'post' || referenceType === 'sns.post')) postId = id(item.reference?.id);
    if (!postId && (referenceType === 'comment' || referenceType === 'sns.comment')) {
      const commentId = id(item.reference?.id);
      if (!commentId) return false;
      const comment = await this.db.client.snsComment.findFirst({ where: { id: commentId, isActive: true }, select: { postId: true } });
      postId = comment?.postId;
    }
    if (!postId) {
      const link = item.reference?.path ?? payload?.path;
      if (typeof link === 'string') postId = id(/^\/post\/([1-9]\d*)$/.exec(link)?.[1]);
    }
    if (postId) return this.canRead(BigInt(item.recipientUserId), postId);
    // Profile/follow/board notifications do not carry private post content.
    return ['user', 'profile', 'board', 'sns.user', 'sns.profile', 'sns.board'].includes(referenceType ?? '');
  }

  async canReadDomainEvent(userId: bigint, event: CommonNotificationDomainEvent): Promise<boolean> {
    const postId = id(event.payload?.postId);
    if (event.payload?.postId !== undefined && !postId) return false;
    if (postId) return this.canRead(userId, postId);
    return ['sns.follow.changed', 'user.profile.updated'].includes(event.type);
  }

  private async canRead(userId: bigint, postId: bigint): Promise<boolean> {
    const user = { userId: userId.toString(), loginId: '' };
    try {
      await this.access.assertFeatures(user, ['canReadFeed']);
      await this.access.assertReadablePost(user, postId);
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) return false;
      throw error;
    }
  }
}
