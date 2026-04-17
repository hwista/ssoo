import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../../../database/database.service.js';
import { UserService } from '../user/user.service.js';
import { LoginDto } from './dto/login.dto.js';
import { type AuthUserRecord, type AuthTokens, type TokenPayload } from './interfaces/auth.interface.js';

interface AuthSessionContext {
  issuedApp?: string;
  userAgent?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private getRefreshTokenExpiryDate(): Date {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  private buildTokenPayload(user: AuthUserRecord, sessionId?: string): TokenPayload {
    return {
      userId: user.userId.toString(),
      loginId: user.loginId,
      sessionId,
    };
  }

  private verifyRefreshToken(refreshToken: string): TokenPayload {
    try {
      return this.jwtService.verify<TokenPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }

  private async persistSession(
    userId: bigint,
    sessionId: string,
    refreshToken: string,
    sessionContext: AuthSessionContext,
    currentIssuedApp?: string,
    currentUserAgent?: string | null,
  ): Promise<void> {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const issuedApp = sessionContext.issuedApp?.trim() || currentIssuedApp || 'unknown';
    const userAgent = sessionContext.userAgent ?? currentUserAgent ?? null;

    await this.db.client.userSession.upsert({
      where: { sessionId },
      update: {
        sessionTokenHash: refreshTokenHash,
        issuedApp,
        userAgent,
        lastSeenAt: new Date(),
        expiresAt: this.getRefreshTokenExpiryDate(),
        revokedAt: null,
        revokeReason: null,
      },
      create: {
        sessionId,
        userId,
        sessionTokenHash: refreshTokenHash,
        issuedApp,
        userAgent,
        lastSeenAt: new Date(),
        expiresAt: this.getRefreshTokenExpiryDate(),
      },
    });
  }

  /**
   * 로그인 처리
   */
  async login(loginDto: LoginDto, sessionContext: AuthSessionContext = {}): Promise<AuthTokens> {
    const { loginId, password } = loginDto;

    const foundUser = await this.userService.findAuthUserByLoginId(loginId);
    if (!foundUser) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 일치하지 않습니다.');
    }

    if (!foundUser.isActive || foundUser.accountStatusCode !== 'active') {
      throw new UnauthorizedException('비활성화된 계정입니다. 관리자에게 문의하세요.');
    }

    if (foundUser.lockedUntil && foundUser.lockedUntil > new Date()) {
      throw new UnauthorizedException('계정이 잠겨있습니다. 잠시 후 다시 시도하세요.');
    }

    const isPasswordValid = await bcrypt.compare(password, foundUser.passwordHash);
    if (!isPasswordValid) {
      await this.userService.incrementLoginFailCount(foundUser.userId);
      throw new UnauthorizedException('아이디 또는 비밀번호가 일치하지 않습니다.');
    }

    await this.userService.resetLoginFailCount(foundUser.userId);
    await this.userService.updateLastLogin(foundUser.userId);

    const sessionId = randomUUID();
    const tokens = await this.generateTokens(this.buildTokenPayload(foundUser, sessionId));
    await this.persistSession(foundUser.userId, sessionId, tokens.refreshToken, sessionContext);

    return tokens;
  }

  /**
   * 토큰 갱신
   */
  async refreshTokens(refreshToken: string, sessionContext: AuthSessionContext = {}): Promise<AuthTokens> {
    const payload = this.verifyRefreshToken(refreshToken);
    const user = await this.userService.findAuthUserById(BigInt(payload.userId));
    if (!user) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    if (!user.isActive || user.accountStatusCode !== 'active') {
      throw new UnauthorizedException('비활성화된 계정입니다.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('계정이 잠겨있습니다. 잠시 후 다시 시도하세요.');
    }

    const sessionId = payload.sessionId;
    let currentIssuedApp: string | undefined;
    let currentUserAgent: string | null | undefined;

    if (!sessionId) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    const session = await this.db.client.userSession.findUnique({
      where: { sessionId },
    });

    if (
      !session
      || session.userId !== BigInt(payload.userId)
      || session.revokedAt
      || session.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    const isRefreshTokenValid = await bcrypt.compare(refreshToken, session.sessionTokenHash);
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    currentIssuedApp = session.issuedApp;
    currentUserAgent = session.userAgent;

    const tokens = await this.generateTokens(this.buildTokenPayload(user, sessionId));
    await this.persistSession(
      user.userId,
      sessionId,
      tokens.refreshToken,
      sessionContext,
      currentIssuedApp,
      currentUserAgent,
    );

    return tokens;
  }

  /**
   * 로그아웃
   */
  async logout(userId: bigint, sessionId?: string): Promise<void> {
    if (sessionId) {
      await this.db.client.userSession.updateMany({
        where: {
          sessionId,
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokeReason: 'logout',
          lastSeenAt: new Date(),
        },
      });
      return;
    }

    await this.db.client.userSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokeReason: 'logout-all',
        lastSeenAt: new Date(),
      },
    });
  }

  /**
   * Access Token + Refresh Token 생성
   */
  private async generateTokens(payload: TokenPayload): Promise<AuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...payload, type: 'access' },
        {
          secret: this.configService.get<string>('JWT_SECRET', { infer: true }),
          expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', { infer: true }),
        },
      ),
      this.jwtService.signAsync(
        { ...payload, type: 'refresh' },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET', { infer: true }),
          expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', { infer: true }),
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * 토큰에서 사용자 정보 추출
   */
  async validateToken(token: string): Promise<TokenPayload | null> {
    try {
      return this.jwtService.verify<TokenPayload>(token);
    } catch {
      return null;
    }
  }
}
