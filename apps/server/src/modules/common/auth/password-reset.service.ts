import { BadRequestException, Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import type {
  ConfirmPasswordResetResult,
  RequestPasswordResetResult,
} from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import { AuthPolicyService } from './auth-policy.service.js';
import { ConfirmPasswordResetDto, RequestPasswordResetDto } from './dto/password-reset.dto.js';

const RESET_FAIL_LOCK_THRESHOLD = 5;
const RESET_FAIL_LOCK_MINUTES = 30;
const RESET_REQUEST_COOLDOWN_SECONDS = 60;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createNumericCode(length: number): string {
  const safeLength = Math.min(Math.max(length, 6), 10);
  const upperBound = 10 ** safeLength;
  return randomInt(0, upperBound).toString().padStart(safeLength, '0');
}

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly db: DatabaseService,
    private readonly authPolicyService: AuthPolicyService,
  ) {}

  async requestReset(dto: RequestPasswordResetDto): Promise<RequestPasswordResetResult> {
    const settings = await this.authPolicyService.getOrCreateSettings();
    if (!settings.passwordResetEnabled) {
      throw new BadRequestException('비밀번호 재설정이 비활성화되어 있습니다.');
    }

    const email = normalizeEmail(dto.email);
    const user = await this.db.client.user.findUnique({
      where: { email },
      include: { authAccount: true },
    });

    if (!user || !user.isActive || !user.authAccount || user.authAccount.accountStatusCode !== 'active') {
      return { accepted: true };
    }

    const code = createNumericCode(settings.resetCodeLength);
    const codeHash = await bcrypt.hash(code, 12);
    const now = new Date();
    const cooldownSince = new Date(now.getTime() - RESET_REQUEST_COOLDOWN_SECONDS * 1000);
    const expiresAt = new Date(now.getTime() + settings.resetCodeTtlMinutes * 60 * 1000);

    const recentChallenge = await this.db.client.userPasswordResetChallenge.findFirst({
      where: {
        userId: user.id,
        email,
        consumedAt: null,
        createdAt: { gte: cooldownSince },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentChallenge) {
      return { accepted: true };
    }

    await this.db.client.$transaction(async (tx) => {
      const previousChallenges = await tx.userPasswordResetChallenge.findMany({
        where: {
          userId: user.id,
          email,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        select: { challengeId: true },
      });

      await tx.userPasswordResetChallenge.updateMany({
        where: {
          userId: user.id,
          email,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { expiresAt: now },
      });

      const previousChallengeIds = previousChallenges.map((item) => item.challengeId);
      if (previousChallengeIds.length > 0) {
        await tx.authEmailOutbox.updateMany({
          where: {
            referenceType: 'password-reset-challenge',
            referenceId: { in: previousChallengeIds },
            statusCode: 'pending',
          },
          data: { statusCode: 'superseded' },
        });
      }

      const challenge = await tx.userPasswordResetChallenge.create({
        data: {
          userId: user.id,
          email,
          codeHash,
          expiresAt,
        },
      });

      if (this.authPolicyService.getEmailDeliveryMode(settings) === 'outbox') {
        await tx.authEmailOutbox.create({
          data: {
            toEmail: email,
            fromEmail: settings.emailFromAddress,
            templateCode: 'auth.password-reset',
            subject: '[SSOT] 비밀번호 재설정 코드',
            bodyText: [
              'SSOT 비밀번호 재설정 코드입니다.',
              '',
              `코드: ${code}`,
              `만료: ${settings.resetCodeTtlMinutes}분`,
              '',
              '본인이 요청하지 않았다면 이 메일을 무시하세요.',
            ].join('\n'),
            referenceType: 'password-reset-challenge',
            referenceId: challenge.challengeId,
          },
        });
      }
    });

    return { accepted: true };
  }

  async confirmReset(dto: ConfirmPasswordResetDto): Promise<ConfirmPasswordResetResult> {
    const settings = await this.authPolicyService.getOrCreateSettings();
    if (!settings.passwordResetEnabled) {
      throw new BadRequestException('비밀번호 재설정이 비활성화되어 있습니다.');
    }

    const email = normalizeEmail(dto.email);
    const now = new Date();
    const challenge = await this.db.client.userPasswordResetChallenge.findFirst({
      where: {
        email,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge || (challenge.lockedUntil && challenge.lockedUntil > now)) {
      throw new BadRequestException('재설정 코드가 올바르지 않거나 만료되었습니다.');
    }

    const isCodeValid = await bcrypt.compare(dto.code, challenge.codeHash);
    if (!isCodeValid) {
      const nextFailCount = challenge.failCount + 1;
      await this.db.client.userPasswordResetChallenge.update({
        where: { challengeId: challenge.challengeId },
        data: {
          failCount: nextFailCount,
          lockedUntil:
            nextFailCount >= RESET_FAIL_LOCK_THRESHOLD
              ? new Date(Date.now() + RESET_FAIL_LOCK_MINUTES * 60 * 1000)
              : null,
        },
      });
      throw new BadRequestException('재설정 코드가 올바르지 않거나 만료되었습니다.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.db.client.$transaction(async (tx) => {
      const activeChallenges = await tx.userPasswordResetChallenge.findMany({
        where: {
          userId: challenge.userId,
          email,
          consumedAt: null,
        },
        select: { challengeId: true },
      });

      await tx.userAuth.update({
        where: { userId: challenge.userId },
        data: {
          passwordHash,
          loginFailCount: 0,
          lockedUntil: null,
          accountStatusCode: 'active',
        },
      });

      await tx.userPasswordResetChallenge.updateMany({
        where: {
          userId: challenge.userId,
          email,
          consumedAt: null,
        },
        data: { consumedAt: new Date() },
      });

      const activeChallengeIds = activeChallenges.map((item) => item.challengeId);
      if (activeChallengeIds.length > 0) {
        await tx.authEmailOutbox.updateMany({
          where: {
            referenceType: 'password-reset-challenge',
            referenceId: { in: activeChallengeIds },
            statusCode: 'pending',
          },
          data: { statusCode: 'consumed' },
        });
      }

      await tx.userSession.updateMany({
        where: {
          userId: challenge.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokeReason: 'password-reset',
        },
      });
    });

    return { reset: true };
  }
}
