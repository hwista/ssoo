import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { PlatformAdmissionService } from '../../common/onboarding/platform-admission.service.js';
import { AiIndexingService } from '../../common/ai-index/ai-indexing.service.js';
import { CommonNotificationService } from '../../common/notification/notification.service.js';
import { AccessService } from '../access/access.service.js';
import type { DecidePostAccessDto, RequestPostAccessDto } from './dto/post-access.dto.js';

@Injectable()
export class PostAccessService {
  private readonly logger = new Logger(PostAccessService.name);
  constructor(private readonly db: DatabaseService, private readonly access: AccessService,
    private readonly admission: PlatformAdmissionService, private readonly indexing: AiIndexingService,
    private readonly notifications: CommonNotificationService) {}

  private async post(id: bigint) {
    const post = await this.db.client.snsPost.findFirst({ where: { id, isActive: true }, select: { id: true, authorUserId: true } });
    if (!post) throw new NotFoundException('게시물을 찾을 수 없습니다.');
    return post;
  }

  async state(postId: bigint, user: TokenPayload) {
    await this.admission.assertService(BigInt(user.userId), 'sns');
    const post = await this.post(postId);
    const canManage = post.authorUserId === BigInt(user.userId) || await this.access.hasSystemOverride(user);
    const canRead = Boolean(await this.db.client.snsPost.findFirst({ where: { AND: [{ id: postId }, await this.access.buildVisiblePostWhere(user)] }, select: { id: true } }));
    const requests = await this.db.client.snsPostAccessRequest.findMany({ where: {
      postId, isActive: true, ...(canManage ? {} : { requesterUserId: BigInt(user.userId) }),
    }, orderBy: { createdAt: 'desc' } });
    // No title, body, attachment, or other applicant information is exposed to a non-reader.
    return { postId, canRead, canManage, requests };
  }

  async request(postId: bigint, user: TokenPayload, dto: RequestPostAccessDto) {
    const state = await this.state(postId, user);
    if (state.canManage || (dto.role === 'read' && state.canRead)) throw new BadRequestException('이미 해당 게시물을 읽을 수 있습니다.');
    if (dto.role === 'write' && !state.canRead) throw new ForbiddenException('읽기 승인 후 수정 권한을 신청해 주세요.');
    if (dto.role === 'write') {
      await this.access.assertFeatures(user, ['canCreatePost']);
      if (state.requests.some(request => request.statusCode === 'approved' && request.requestedRole === 'write' && (!request.expiresAt || request.expiresAt > new Date()))) {
        throw new BadRequestException('이미 수정 권한이 있습니다.');
      }
    }
    const message = dto.message.trim();
    if (!message) throw new BadRequestException('신청 사유를 입력해 주세요.');
    try {
      return await this.db.client.snsPostAccessRequest.create({ data: {
        postId, requesterUserId: BigInt(user.userId), requestedRole: dto.role, requestMessage: message,
        createdBy: BigInt(user.userId), lastSource: 'sns', lastActivity: 'post-access-request',
      } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('이미 승인 대기 중인 신청이 있습니다.');
      throw error;
    }
  }

  async decide(requestId: bigint, user: TokenPayload, dto: DecidePostAccessDto) {
    await this.admission.assertService(BigInt(user.userId), 'sns');
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date())) throw new BadRequestException('만료 시각은 현재 이후여야 합니다.');
    const result = await this.db.client.$transaction(async tx => {
      const request = await tx.snsPostAccessRequest.findFirst({ where: { id: requestId, isActive: true }, include: { post: true } });
      if (!request || !request.post.isActive) throw new NotFoundException('신청을 찾을 수 없습니다.');
      const userId = BigInt(user.userId);
      const cancelling = dto.decision === 'cancel';
      if (cancelling ? request.requesterUserId !== userId : request.post.authorUserId !== userId && !await this.admission.isPlatformAdmin(userId, tx)) {
        throw new ForbiddenException('이 신청을 처리할 권한이 없습니다.');
      }
      if (!cancelling && request.requesterUserId === userId) throw new ForbiddenException('본인의 신청은 승인할 수 없습니다.');
      const expected = dto.decision === 'revoke' ? 'approved' : 'pending';
      if (request.statusCode !== expected) throw new ConflictException('이미 처리된 신청입니다. 새로고침해 주세요.');
      if (dto.decision === 'approve') {
        // Approved grants have no effect once the applicant loses SNS admission.
        await this.admission.assertService(request.requesterUserId, 'sns');
        await tx.snsPostAccessRequest.updateMany({ where: { postId: request.postId, requesterUserId: request.requesterUserId, statusCode: 'approved', isActive: true }, data: { statusCode: 'revoked', updatedBy: userId, lastActivity: 'post-access-replaced' } });
      }
      const statusCode = { approve: 'approved', reject: 'rejected', cancel: 'cancelled', revoke: 'revoked' }[dto.decision];
      const changed = await tx.snsPostAccessRequest.updateMany({ where: { id: requestId, isActive: true, statusCode: expected }, data: {
        statusCode, decidedBy: userId, decidedAt: new Date(), decisionMessage: dto.message?.trim() || null,
        ...(dto.decision === 'approve' ? { expiresAt } : {}), updatedBy: userId, lastSource: 'sns', lastActivity: `post-access-${dto.decision}`,
      } });
      if (changed.count !== 1) throw new ConflictException('다른 요청에서 이미 처리했습니다. 새로고침해 주세요.');
      return tx.snsPostAccessRequest.findUniqueOrThrow({ where: { id: requestId } });
    });
    this.notifications.publishDomainEvent('sns', 'sns.post-access.changed', { postId: result.postId.toString() });
    // Source authorization is rechecked at retrieval even if index refresh is delayed.
    try {
      await this.indexing.queueJob({ sourceApp: 'sns', entityType: 'post', entityId: result.postId.toString(), jobType: 'upsert', payload: { reasonCode: 'post_access_changed' } }, user);
    } catch (error) {
      this.logger.warn(`게시물 공유는 반영됐으나 검색 갱신 대기에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
    return result;
  }
}
