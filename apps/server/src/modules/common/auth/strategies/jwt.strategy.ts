import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { TokenPayload } from '../interfaces/auth.interface.js';
import { UserService } from '../../user/user.service.js';
import { AccessFoundationService } from '../../access/access-foundation.service.js';
import { DatabaseService } from '../../../../database/database.service.js';
import { getRequiredJwtSecret, getSessionIdleTimeoutMs, isSessionIdle } from '../jwt-config.js';
import { isCurrentSessionHash } from '../session-token.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly accessFoundationService: AccessFoundationService,
    private readonly db: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getRequiredJwtSecret(configService, 'JWT_SECRET'),
    });
  }

  private normalizePrincipalIds(values: unknown): string[] | undefined {
    if (!Array.isArray(values)) {
      return undefined;
    }

    const normalized = Array.from(
      new Set(
        values
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    );

    return normalized.length > 0 ? normalized : undefined;
  }

  private async assertSessionIsValid(payload: TokenPayload, userId: bigint): Promise<void> {
    if (!payload.sessionId) {
      this.logger.warn(`Access token missing sessionId for user: ${payload.userId}`);
      throw new UnauthorizedException('유효하지 않은 세션입니다.');
    }

    const session = await this.db.client.userSession.findUnique({
      where: { sessionId: payload.sessionId },
    });

    if (!session) {
      this.logger.warn(`Session not found: ${payload.sessionId}`);
      throw new UnauthorizedException('유효하지 않은 세션입니다.');
    }

    if (session.userId !== userId) {
      this.logger.warn(`Session user mismatch for session: ${payload.sessionId}`);
      throw new UnauthorizedException('유효하지 않은 세션입니다.');
    }

    if (session.revokedAt) {
      this.logger.warn(`Session revoked: ${payload.sessionId}`);
      throw new UnauthorizedException('만료된 세션입니다. 다시 로그인하세요.');
    }

    if (!isCurrentSessionHash(session.sessionTokenHash)) {
      throw new UnauthorizedException('세션 보호 방식이 변경되었습니다. 다시 로그인하세요.');
    }

    const now = new Date();
    if (session.expiresAt < now) {
      this.logger.warn(`Session expired: ${payload.sessionId}`);
      throw new UnauthorizedException('만료된 세션입니다. 다시 로그인하세요.');
    }

    if (isSessionIdle(this.configService, session.lastSeenAt, session.createdAt, now)) {
      await this.db.client.userSession.updateMany({
        where: { sessionId: session.sessionId, revokedAt: null },
        data: {
          revokedAt: now,
          revokeReason: 'idle-timeout',
          lastActivity: 'auth.session.idle-timeout',
        },
      });
      this.logger.warn(`Session idle timeout: ${payload.sessionId}`);
      throw new UnauthorizedException('30분 동안 활동이 없어 세션이 만료되었습니다. 다시 로그인하세요.');
    }

    const touchIntervalMs = Math.min(60_000, Math.floor(getSessionIdleTimeoutMs(this.configService) / 4));
    const lastSeenAt = session.lastSeenAt ?? session.createdAt;
    if (now.getTime() - lastSeenAt.getTime() >= touchIntervalMs) {
      await this.db.client.userSession.update({
        where: { sessionId: session.sessionId },
        data: { lastSeenAt: now, lastActivity: 'auth.session.activity' },
      });
    }
  }

  async validate(payload: TokenPayload): Promise<TokenPayload> {
    // Access Token인지 확인
    if (payload.type !== 'access') {
      this.logger.warn(`Invalid token type: ${payload.type}`);
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    // 사용자 존재 및 상태 확인 (userId는 string이므로 BigInt로 변환)
    const userId = BigInt(payload.userId);
    const [user, organizationIds] = await Promise.all([
      this.userService.findAuthUserById(userId),
      this.accessFoundationService.getUserOrganizationIds(userId),
      this.assertSessionIsValid(payload, userId),
    ]);
    if (!user) {
      this.logger.warn(`User not found: ${payload.userId}`);
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    if (!user.isActive || user.accountStatusCode !== 'active') {
      this.logger.warn(`User inactive - status: ${user.accountStatusCode}`);
      throw new UnauthorizedException('비활성화된 계정입니다.');
    }

    return {
      userId: payload.userId,
      loginId: user.loginId,
      userName: user.userName,
      organizationIds: organizationIds.map((orgId) => orgId.toString()),
      // 현재 공통 런타임에서 안정적으로 해석되는 principal membership 은 organization 까지다.
      // team/group membership source 가 연결되면 payload 주입만으로 ACL matching 경로를 재사용할 수 있다.
      teamIds: this.normalizePrincipalIds(payload.teamIds),
      groupIds: this.normalizePrincipalIds(payload.groupIds),
      sessionId: payload.sessionId,
    };
  }
}
