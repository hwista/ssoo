import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { PasswordResetService } from './password-reset.service.js';

@Injectable()
export class AuthAdminOperationsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  async getAccountSnapshot(userId: bigint) {
    const user = await this.db.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userName: true,
        email: true,
        isActive: true,
        authAccount: {
          select: {
            loginId: true,
            accountStatusCode: true,
            loginFailCount: true,
            lockedUntil: true,
            lastLoginAt: true,
          },
        },
        externalIdentities: {
          where: { isActive: true },
          select: {
            providerCode: true,
            tenantId: true,
            lastLoginAt: true,
          },
        },
        authSessions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            sessionId: true,
            issuedApp: true,
            userAgent: true,
            lastSeenAt: true,
            expiresAt: true,
            revokedAt: true,
            revokeReason: true,
            createdAt: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const now = new Date();
    const sessions = user.authSessions.map((session) => ({
      ...session,
      active: !session.revokedAt && session.expiresAt > now,
    }));
    const [active, revoked, expired] = await Promise.all([
      this.db.client.userSession.count({ where: { userId, revokedAt: null, expiresAt: { gt: now } } }),
      this.db.client.userSession.count({ where: { userId, revokedAt: { not: null } } }),
      this.db.client.userSession.count({ where: { userId, revokedAt: null, expiresAt: { lte: now } } }),
    ]);
    return {
      userId: user.id.toString(),
      userName: user.userName,
      email: user.email,
      isActive: user.isActive,
      authAccount: user.authAccount,
      externalIdentities: user.externalIdentities,
      sessionSummary: { active, revoked, expired },
      sessions,
    };
  }

  async revokeSessions(userId: bigint, operatorUserId: bigint, reason?: string) {
    await this.assertUserExists(userId);
    const result = await this.db.client.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokeReason: reason?.trim() || 'operator-force-logout',
        updatedBy: operatorUserId,
        lastSource: 'admin-auth-operations',
        lastActivity: 'auth.admin.revoke-user-sessions',
      },
    });
    return { revokedCount: result.count };
  }

  async unlockAccount(userId: bigint, operatorUserId: bigint) {
    await this.assertUserExists(userId);
    const result = await this.db.client.userAuth.updateMany({
      where: { userId },
      data: {
        loginFailCount: 0,
        lockedUntil: null,
        updatedBy: operatorUserId,
        lastSource: 'admin-auth-operations',
        lastActivity: 'auth.admin.unlock-account',
      },
    });
    if (result.count === 0) {
      throw new NotFoundException('로그인 계정을 찾을 수 없습니다.');
    }
    return { unlocked: true };
  }

  async requestPasswordReset(userId: bigint) {
    const user = await this.db.client.user.findUnique({
      where: { id: userId },
      select: { email: true, authAccount: { select: { userId: true } } },
    });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
    if (!user.authAccount) {
      throw new NotFoundException('로그인 계정을 찾을 수 없습니다.');
    }
    return this.passwordResetService.requestReset({ email: user.email });
  }

  private async assertUserExists(userId: bigint): Promise<void> {
    const user = await this.db.client.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
  }
}
