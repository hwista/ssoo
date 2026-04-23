import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from '@nestjs/config';
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import type { AuthIdentity } from '@ssoo/types/common';
import type { Request as ExpressRequest, Response as ExpressResponse, CookieOptions } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { TokenPayload } from './interfaces/auth.interface.js';
import { success } from '../../../common/index.js';
import { ApiSuccess, ApiError } from '../../../common/swagger/api-response.dto.js';

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private getSessionCookieName(): string {
    return this.configService.get<string>('AUTH_SESSION_COOKIE_NAME', { infer: true }) || 'ssoo-session';
  }

  private getSessionCookieOptions(): CookieOptions {
    const domain = this.configService.get<string>('AUTH_SESSION_COOKIE_DOMAIN', { infer: true })?.trim();
    const configuredSameSite = this.configService.get<string>('AUTH_SESSION_COOKIE_SAME_SITE', { infer: true });
    const sameSite: CookieOptions['sameSite'] =
      configuredSameSite === 'strict' || configuredSameSite === 'none'
        ? configuredSameSite
        : 'lax';

    return {
      httpOnly: true,
      secure: this.configService.get<boolean>('AUTH_SESSION_COOKIE_SECURE', { infer: true }) ?? false,
      sameSite,
      path: '/',
      domain: domain || undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }

  private applySessionCookie(response: ExpressResponse, refreshToken: string): void {
    response.cookie(this.getSessionCookieName(), refreshToken, this.getSessionCookieOptions());
  }

  private clearSessionCookie(response: ExpressResponse): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { maxAge: _maxAge, ...cookieOptions } = this.getSessionCookieOptions();
    response.clearCookie(this.getSessionCookieName(), cookieOptions);
  }

  private resolveIssuedApp(request: ExpressRequest): string | undefined {
    const explicitApp = request.headers['x-ssoo-app'];
    if (typeof explicitApp === 'string' && explicitApp.trim()) {
      return explicitApp.trim();
    }

    const hostHeader = request.headers['x-forwarded-host'] ?? request.headers.host;
    if (typeof hostHeader !== 'string') {
      return undefined;
    }

    if (hostHeader.includes(':3000')) {
      return 'pms';
    }
    if (hostHeader.includes(':3001')) {
      return 'dms';
    }
    if (hostHeader.includes(':3002')) {
      return 'cms';
    }

    return undefined;
  }

  private buildSessionContext(request: ExpressRequest) {
    const userAgentHeader = request.headers['user-agent'];
    return {
      issuedApp: this.resolveIssuedApp(request),
      userAgent: typeof userAgentHeader === 'string' ? userAgentHeader : null,
    };
  }

  private readSessionCookie(request: ExpressRequest): string | null {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) {
      return null;
    }

    const cookieName = this.getSessionCookieName();
    for (const entry of cookieHeader.split(';')) {
      const [name, ...valueParts] = entry.trim().split('=');
      if (name === cookieName) {
        const rawValue = valueParts.join('=');
        return rawValue ? decodeURIComponent(rawValue) : null;
      }
    }

    return null;
  }

  private toAuthIdentity(user: TokenPayload): AuthIdentity {
    return {
      userId: user.userId,
      loginId: user.loginId,
    };
  }

  /**
   * 로그인
   * POST /api/auth/login
   */
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "로그인", description: "JWT Access/Refresh 토큰 발급" })
  @ApiOkResponse({ type: ApiSuccess })
  @ApiUnauthorizedResponse({ type: ApiError, description: "잘못된 자격 증명" })
  @ApiTooManyRequestsResponse({ type: ApiError, description: "로그인 레이트리밋 초과" })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: ExpressRequest,
    @Res({ passthrough: true }) response: ExpressResponse,
  ) {
    const tokens = await this.authService.login(loginDto, this.buildSessionContext(request));
    this.applySessionCookie(response, tokens.refreshToken);
    return success(tokens, "로그인에 성공했습니다");
  }

  /**
   * 토큰 갱신
   * POST /api/auth/refresh
   */
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Refresh 토큰으로 재발급" })
  @ApiOkResponse({ type: ApiSuccess })
  @ApiUnauthorizedResponse({ type: ApiError, description: "토큰 무효/만료" })
  @ApiTooManyRequestsResponse({ type: ApiError, description: "갱신 레이트리밋 초과" })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() request: ExpressRequest,
    @Res({ passthrough: true }) response: ExpressResponse,
  ) {
    const tokens = await this.authService.refreshTokens(
      refreshTokenDto.refreshToken,
      this.buildSessionContext(request),
    );
    this.applySessionCookie(response, tokens.refreshToken);
    return success(tokens, "토큰 갱신 성공");
  }

  /**
   * 세션 복원
   * POST /api/auth/session
   */
  @Post("session")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "공유 세션 복원", description: "HttpOnly shared session cookie 로 Access Token 재발급" })
  @ApiOkResponse({ type: ApiSuccess })
  @ApiUnauthorizedResponse({ type: ApiError, description: "세션 없음 또는 만료" })
  @ApiTooManyRequestsResponse({ type: ApiError, description: "세션 복원 레이트리밋 초과" })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async session(
    @Req() request: ExpressRequest,
    @Res({ passthrough: true }) response: ExpressResponse,
  ) {
    const refreshToken = this.readSessionCookie(request);
    if (!refreshToken) {
      this.clearSessionCookie(response);
      throw new UnauthorizedException('세션이 없습니다. 다시 로그인하세요.');
    }

    const tokens = await this.authService.refreshTokens(refreshToken, this.buildSessionContext(request));
    this.applySessionCookie(response, tokens.refreshToken);

    const user = await this.authService.validateToken(tokens.accessToken);
    if (!user) {
      this.clearSessionCookie(response);
      throw new UnauthorizedException('유효하지 않은 세션입니다.');
    }

    return success(
      {
        accessToken: tokens.accessToken,
        user: this.toAuthIdentity(user),
      },
      "세션 복원 성공",
    );
  }

  /**
   * 로그아웃
   * POST /api/auth/logout
   */
  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "로그아웃", description: "서버에 저장된 Refresh Token 무효화" })
  @ApiOkResponse({ type: ApiSuccess })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async logout(
    @CurrentUser() user: TokenPayload,
    @Res({ passthrough: true }) response: ExpressResponse,
  ) {
    await this.authService.logout(BigInt(user.userId), user.sessionId);
    this.clearSessionCookie(response);
    return success(null, "로그아웃 성공");
  }

  /**
   * 현재 사용자 정보
   * POST /api/auth/me
   */
  @Post("me")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "내 정보 조회" })
  @ApiOkResponse({ type: ApiSuccess })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async me(@CurrentUser() user: TokenPayload) {
    return success(
      {
        userId: user.userId,
        loginId: user.loginId,
        userName: user.userName,
      },
      "사용자 정보 조회 성공",
    );
  }
}
