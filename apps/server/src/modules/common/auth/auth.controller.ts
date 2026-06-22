import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from '@nestjs/config';
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import type { AuthIdentity } from '@ssoo/types/common';
import type { Request as ExpressRequest, Response as ExpressResponse, CookieOptions } from 'express';
import { AuthService } from './auth.service.js';
import { AuthPolicyService } from './auth-policy.service.js';
import { MicrosoftIdentityService, type MicrosoftAuthIntent } from './microsoft-identity.service.js';
import { PasswordResetService } from './password-reset.service.js';
import { LoginDto } from './dto/login.dto.js';
import { ConfirmPasswordResetDto, RequestPasswordResetDto } from './dto/password-reset.dto.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { TokenPayload } from './interfaces/auth.interface.js';
import { success } from '../../../common/index.js';
import { ApiSuccess, ApiError } from '../../../common/swagger/api-response.dto.js';

interface AuthClientTokens {
  accessToken: string;
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authPolicyService: AuthPolicyService,
    private readonly microsoftIdentityService: MicrosoftIdentityService,
    private readonly passwordResetService: PasswordResetService,
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
    const configuredSecure = this.configService.get<boolean>('AUTH_SESSION_COOKIE_SECURE', { infer: true }) ?? false;

    return {
      httpOnly: true,
      secure: sameSite === 'none' ? true : configuredSecure,
      sameSite,
      path: '/',
      domain: domain || undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }

  private getOAuthStateCookieName(): string {
    return this.configService.get<string>('AUTH_MICROSOFT_OAUTH_STATE_COOKIE_NAME', { infer: true })
      || 'ssoo-ms-oauth-state';
  }

  private getOAuthStateCookieOptions(): CookieOptions {
    return {
      ...this.getSessionCookieOptions(),
      maxAge: 10 * 60 * 1000,
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

  private clearOAuthStateCookie(response: ExpressResponse): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { maxAge: _maxAge, ...cookieOptions } = this.getOAuthStateCookieOptions();
    response.clearCookie(this.getOAuthStateCookieName(), cookieOptions);
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
      return 'admin';
    }
    if (hostHeader.includes(':3001')) {
      return 'crm';
    }
    if (hostHeader.includes(':3002')) {
      return 'pms';
    }
    if (hostHeader.includes(':3003')) {
      return 'dms';
    }
    if (hostHeader.includes(':3004')) {
      return 'sns';
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
    return this.readNamedCookie(request, this.getSessionCookieName());
  }

  private readOAuthStateCookie(request: ExpressRequest): string | null {
    return this.readNamedCookie(request, this.getOAuthStateCookieName());
  }

  private readNamedCookie(request: ExpressRequest, cookieName: string): string | null {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) {
      return null;
    }

    for (const entry of cookieHeader.split(';')) {
      const [name, ...valueParts] = entry.trim().split('=');
      if (name === cookieName) {
        const rawValue = valueParts.join('=');
        return rawValue ? decodeURIComponent(rawValue) : null;
      }
    }

    return null;
  }

  private getAllowedOrigins(): string[] {
    return (this.configService.get<string>('CORS_ORIGIN', { infer: true }) || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  private getApiBaseUrl(request: ExpressRequest): string {
    const configuredPublicApiBaseUrl = this.configService.get<string>('AUTH_PUBLIC_API_BASE_URL', { infer: true })?.trim();
    if (configuredPublicApiBaseUrl) {
      return configuredPublicApiBaseUrl.replace(/\/+$/, '');
    }

    const trustForwardHeaders = this.configService.get<boolean>('AUTH_TRUST_FORWARD_HEADERS', { infer: true }) ?? false;
    const forwardedProto = trustForwardHeaders ? request.headers['x-forwarded-proto'] : undefined;
    const proto = typeof forwardedProto === 'string' && forwardedProto.trim()
      ? forwardedProto.split(',')[0]?.trim()
      : request.protocol || 'http';
    const forwardedHost = trustForwardHeaders ? request.headers['x-forwarded-host'] : undefined;
    const host = typeof forwardedHost === 'string' && forwardedHost.trim()
      ? forwardedHost.split(',')[0]?.trim()
      : request.headers.host || `localhost:${this.configService.get<number>('PORT', { infer: true }) || 4000}`;

    return `${proto}://${host}/api`;
  }

  private resolveOAuthReturnUrl(request: ExpressRequest): string {
    const fallback = this.configService.get<string>('AUTH_DEFAULT_LOGIN_URL', { infer: true }) || '/login';
    const referer = request.headers.referer;
    if (!referer) {
      return fallback;
    }

    try {
      const refererUrl = new URL(referer);
      if (this.getAllowedOrigins().includes(refererUrl.origin)) {
        return refererUrl.toString();
      }
    } catch {
      return fallback;
    }

    return fallback;
  }

  private assertTrustedOrigin(request: ExpressRequest): void {
    const originHeader = request.headers.origin;
    if (typeof originHeader !== 'string' || !originHeader.trim()) {
      return;
    }

    let origin: string;
    try {
      origin = new URL(originHeader).origin;
    } catch {
      throw new ForbiddenException('요청 출처가 올바르지 않습니다.');
    }

    if (this.getAllowedOrigins().includes(origin)) {
      return;
    }

    const host = request.headers.host;
    const sameOrigin = host ? `${request.protocol}://${host}` : null;
    if (sameOrigin === origin) {
      return;
    }

    throw new ForbiddenException('허용되지 않은 요청 출처입니다.');
  }

  private appendQueryParam(url: string, key: string, value: string): string {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set(key, value);
      return parsed.toString();
    } catch {
      return url;
    }
  }

  private toAuthIdentity(user: TokenPayload): AuthIdentity {
    return {
      userId: user.userId,
      loginId: user.loginId,
      userName: user.userName,
    };
  }

  private toClientTokens(tokens: { accessToken: string }): AuthClientTokens {
    return { accessToken: tokens.accessToken };
  }

  @Get("public-config")
  @Public()
  @ApiOperation({ summary: "공개 로그인 설정 조회" })
  @ApiOkResponse({ type: ApiSuccess })
  async publicConfig(@Req() request: ExpressRequest) {
    const settings = await this.authPolicyService.getOrCreateSettings();
    return success(
      this.authPolicyService.toPublicLoginConfig(settings, this.getApiBaseUrl(request)),
      "로그인 설정 조회 성공",
    );
  }

  @Get("microsoft/start")
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: "Microsoft 365 OAuth 시작" })
  async microsoftStart(
    @Query('intent') intent: string | undefined,
    @Req() request: ExpressRequest,
    @Res() response: ExpressResponse,
  ) {
    const normalizedIntent: MicrosoftAuthIntent = intent === 'signup' ? 'signup' : 'login';
    const start = await this.microsoftIdentityService.createAuthorizationStart(
      normalizedIntent,
      this.resolveOAuthReturnUrl(request),
    );

    response.cookie(
      this.getOAuthStateCookieName(),
      start.stateCookieValue,
      this.getOAuthStateCookieOptions(),
    );
    response.redirect(start.authorizationUrl);
  }

  @Get("microsoft/callback")
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: "Microsoft 365 OAuth callback" })
  async microsoftCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Req() request: ExpressRequest,
    @Res() response: ExpressResponse,
  ) {
    const stateCookie = this.readOAuthStateCookie(request);
    const parsedState = this.microsoftIdentityService.parseStateCookieValue(stateCookie ?? undefined);
    this.clearOAuthStateCookie(response);

    try {
      const result = await this.microsoftIdentityService.handleCallback({
        code,
        state,
        error,
        errorDescription,
        stateCookieValue: stateCookie ?? undefined,
        sessionContext: this.buildSessionContext(request),
      });

      if (result.kind === 'login') {
        this.applySessionCookie(response, result.tokens.refreshToken);
      }

      response.redirect(result.returnUrl);
    } catch {
      const returnUrl = this.appendQueryParam(
        parsedState?.returnUrl || this.resolveOAuthReturnUrl(request),
        'oauth',
        'error',
      );
      response.redirect(returnUrl);
    }
  }

  @Post("password-reset/request")
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: "비밀번호 재설정 코드 요청" })
  @ApiOkResponse({ type: ApiSuccess })
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
    @Req() request: ExpressRequest,
  ) {
    this.assertTrustedOrigin(request);
    const result = await this.passwordResetService.requestReset(dto);
    return success(result, "비밀번호 재설정 요청이 접수되었습니다");
  }

  @Post("password-reset/confirm")
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "비밀번호 재설정 코드 확인 및 변경" })
  @ApiOkResponse({ type: ApiSuccess })
  async confirmPasswordReset(
    @Body() dto: ConfirmPasswordResetDto,
    @Req() request: ExpressRequest,
  ) {
    this.assertTrustedOrigin(request);
    const result = await this.passwordResetService.confirmReset(dto);
    return success(result, "비밀번호가 재설정되었습니다");
  }

  /**
   * 로그인
   * POST /api/auth/login
   */
  @Post("login")
  @Public()
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
    this.assertTrustedOrigin(request);
    const tokens = await this.authService.login(loginDto, this.buildSessionContext(request));
    this.applySessionCookie(response, tokens.refreshToken);
    return success(this.toClientTokens(tokens), "로그인에 성공했습니다");
  }

  /**
   * 세션 복원
   * POST /api/auth/session
   */
  @Post("session")
  @Public()
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
    this.assertTrustedOrigin(request);
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
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "로그아웃", description: "서버에 저장된 Refresh Token 무효화" })
  @ApiOkResponse({ type: ApiSuccess })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: "서버 오류" })
  async logout(
    @CurrentUser() user: TokenPayload,
    @Req() request: ExpressRequest,
    @Res({ passthrough: true }) response: ExpressResponse,
  ) {
    this.assertTrustedOrigin(request);
    await this.authService.logout(BigInt(user.userId), user.sessionId);
    this.clearSessionCookie(response);
    return success(null, "로그아웃 성공");
  }

  /**
   * 현재 사용자 정보
   * POST /api/auth/me
   */
  @Post("me")
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
