import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPublicKey,
  createHmac,
  createVerify,
  randomBytes,
  timingSafeEqual,
  type KeyObject,
} from 'node:crypto';
import { AuthPolicyService, type MicrosoftRuntimeConfig } from './auth-policy.service.js';
import {
  AuthRegistrationService,
  type VerifiedMicrosoftIdentity,
} from './auth-registration.service.js';
import { AuthService } from './auth.service.js';
import type { AuthTokens } from './interfaces/auth.interface.js';

export type MicrosoftAuthIntent = 'login' | 'signup';

export interface MicrosoftOAuthState {
  state: string;
  nonce: string;
  intent: MicrosoftAuthIntent;
  returnUrl: string;
}

export interface MicrosoftOAuthStart {
  authorizationUrl: string;
  stateCookieValue: string;
}

export interface MicrosoftOAuthCallbackLogin {
  kind: 'login';
  tokens: AuthTokens;
  returnUrl: string;
}

export interface MicrosoftOAuthCallbackSignupRequest {
  kind: 'signup-request';
  returnUrl: string;
}

export type MicrosoftOAuthCallbackResult =
  | MicrosoftOAuthCallbackLogin
  | MicrosoftOAuthCallbackSignupRequest;

interface MicrosoftTokenResponse {
  token_type?: string;
  scope?: string;
  expires_in?: number;
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface MicrosoftJwk {
  kid?: string;
  kty?: string;
  n?: string;
  e?: string;
  use?: string;
  alg?: string;
}

interface MicrosoftJwksResponse {
  keys?: MicrosoftJwk[];
}

interface MicrosoftIdTokenHeader {
  alg?: string;
  kid?: string;
  typ?: string;
}

interface MicrosoftIdTokenClaims {
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  nonce?: string;
  tid?: string;
  oid?: string;
  sub?: string;
  email?: string;
  preferred_username?: string;
  upn?: string;
  name?: string;
}

interface AuthSessionContext {
  issuedApp?: string;
  userAgent?: string | null;
}

interface CachedMicrosoftPublicKey {
  key: KeyObject;
  expiresAt: number;
}

const MICROSOFT_FETCH_TIMEOUT_MS = 10000;
const MICROSOFT_JWKS_CACHE_TTL_MS = 60 * 60 * 1000;
const MICROSOFT_TOKEN_CLOCK_SKEW_SECONDS = 300;
const microsoftPublicKeyCache = new Map<string, CachedMicrosoftPublicKey>();

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function parseBase64UrlJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
}

function decodeJwtPart<T>(encoded: string): T {
  return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T;
}

function isMicrosoftAuthIntent(value: string): value is MicrosoftAuthIntent {
  return value === 'login' || value === 'signup';
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getEmailDomain(email: string): string {
  const [, domain = ''] = email.split('@');
  return domain.toLowerCase();
}

function appendQueryParam(url: string, key: string, value: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set(key, value);
    return parsed.toString();
  } catch {
    return url;
  }
}

function fetchJsonWithTimeout<T>(
  url: string,
  init: RequestInit = {},
): Promise<{ response: Response; payload: T | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MICROSOFT_FETCH_TIMEOUT_MS);

  return fetch(url, {
    ...init,
    signal: init.signal ?? controller.signal,
  })
    .then(async (response) => {
      const payload = await response.json().catch(() => null) as T | null;
      return { response, payload };
    })
    .finally(() => {
      clearTimeout(timeout);
    });
}

@Injectable()
export class MicrosoftIdentityService {
  constructor(
    private readonly authPolicyService: AuthPolicyService,
    private readonly authRegistrationService: AuthRegistrationService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private getStateSigningSecret(): string {
    const configured = this.configService.get<string>('AUTH_OAUTH_STATE_SIGNING_SECRET', { infer: true })?.trim();
    const fallback = this.configService.get<string>('JWT_SECRET', { infer: true })?.trim();
    const secret = configured || fallback;

    if (!secret) {
      throw new BadRequestException('OAuth state signing secret이 설정되지 않았습니다.');
    }

    return secret;
  }

  private signStatePayload(payload: string): string {
    return createHmac('sha256', this.getStateSigningSecret())
      .update(payload)
      .digest('base64url');
  }

  private verifyStateSignature(payload: string, signature: string): boolean {
    const expected = Buffer.from(this.signStatePayload(payload), 'base64url');
    const actual = Buffer.from(signature, 'base64url');

    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private async getRuntimeConfig(intent: MicrosoftAuthIntent): Promise<MicrosoftRuntimeConfig> {
    const config = await this.authPolicyService.getMicrosoftRuntimeConfig();
    if (!config) {
      throw new BadRequestException('Microsoft 365 인증 설정이 완료되지 않았습니다.');
    }

    if (intent === 'login' && !config.loginEnabled) {
      throw new BadRequestException('Microsoft 365 로그인이 비활성화되어 있습니다.');
    }

    if (intent === 'signup' && !config.signupRequestEnabled) {
      throw new BadRequestException('Microsoft 365 가입 신청이 비활성화되어 있습니다.');
    }

    return config;
  }

  createStateCookieValue(state: MicrosoftOAuthState): string {
    const payload = base64UrlJson(state);
    return `${payload}.${this.signStatePayload(payload)}`;
  }

  parseStateCookieValue(value: string | undefined): MicrosoftOAuthState | null {
    if (!value) {
      return null;
    }

    try {
      const [payload, signature] = value.split('.');
      if (!payload || !signature || !this.verifyStateSignature(payload, signature)) {
        return null;
      }

      const parsed = parseBase64UrlJson<Partial<MicrosoftOAuthState>>(payload);
      if (
        typeof parsed.state === 'string'
        && typeof parsed.nonce === 'string'
        && typeof parsed.returnUrl === 'string'
        && typeof parsed.intent === 'string'
        && isMicrosoftAuthIntent(parsed.intent)
      ) {
        return parsed as MicrosoftOAuthState;
      }
    } catch {
      return null;
    }

    return null;
  }

  async createAuthorizationStart(intent: MicrosoftAuthIntent, returnUrl: string): Promise<MicrosoftOAuthStart> {
    const config = await this.getRuntimeConfig(intent);
    const state: MicrosoftOAuthState = {
      state: randomBytes(24).toString('base64url'),
      nonce: randomBytes(24).toString('base64url'),
      intent,
      returnUrl,
    };

    const authorizationUrl = new URL(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`);
    authorizationUrl.searchParams.set('client_id', config.clientId);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('redirect_uri', config.redirectUri);
    authorizationUrl.searchParams.set('response_mode', 'query');
    authorizationUrl.searchParams.set('scope', config.scopes.join(' '));
    authorizationUrl.searchParams.set('state', state.state);
    authorizationUrl.searchParams.set('nonce', state.nonce);
    authorizationUrl.searchParams.set('prompt', 'select_account');

    return {
      authorizationUrl: authorizationUrl.toString(),
      stateCookieValue: this.createStateCookieValue(state),
    };
  }

  async handleCallback(params: {
    code?: string;
    state?: string;
    error?: string;
    errorDescription?: string;
    stateCookieValue?: string;
    sessionContext: AuthSessionContext;
  }): Promise<MicrosoftOAuthCallbackResult> {
    if (params.error) {
      throw new UnauthorizedException(params.errorDescription || params.error);
    }
    if (!params.code || !params.state) {
      throw new BadRequestException('Microsoft OAuth callback 파라미터가 올바르지 않습니다.');
    }

    const storedState = this.parseStateCookieValue(params.stateCookieValue);
    if (!storedState || storedState.state !== params.state) {
      throw new UnauthorizedException('Microsoft OAuth state가 유효하지 않습니다.');
    }

    const config = await this.getRuntimeConfig(storedState.intent);
    const tokenResponse = await this.exchangeCodeForToken(config, params.code);
    const claims = await this.verifyIdToken(config, tokenResponse.id_token, storedState.nonce);
    const identity = this.toVerifiedIdentity(config, claims);

    if (storedState.intent === 'signup') {
      await this.authRegistrationService.upsertMicrosoftRequest(identity);
      return {
        kind: 'signup-request',
        returnUrl: appendQueryParam(storedState.returnUrl, 'signupRequest', 'pending'),
      };
    }

    const tokens = await this.authService.loginWithExternalIdentity(
      'microsoft',
      identity.tenantId,
      identity.subjectId,
      params.sessionContext,
    );

    return {
      kind: 'login',
      tokens,
      returnUrl: appendQueryParam(storedState.returnUrl, 'oauth', 'success'),
    };
  }

  private async exchangeCodeForToken(
    config: MicrosoftRuntimeConfig,
    code: string,
  ): Promise<Required<Pick<MicrosoftTokenResponse, 'id_token'>>> {
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
    });

    const { response, payload } = await fetchJsonWithTimeout<MicrosoftTokenResponse>(
      `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    );

    if (!response.ok || !payload?.id_token) {
      throw new UnauthorizedException(payload?.error_description || payload?.error || 'Microsoft token 교환에 실패했습니다.');
    }

    return { id_token: payload.id_token };
  }

  private async verifyIdToken(
    config: MicrosoftRuntimeConfig,
    idToken: string,
    expectedNonce: string,
  ): Promise<MicrosoftIdTokenClaims> {
    const parts = idToken.split('.');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      throw new UnauthorizedException('Microsoft ID token 형식이 올바르지 않습니다.');
    }

    const header = decodeJwtPart<MicrosoftIdTokenHeader>(parts[0]);
    const claims = decodeJwtPart<MicrosoftIdTokenClaims>(parts[1]);
    if (header.alg !== 'RS256' || !header.kid) {
      throw new UnauthorizedException('Microsoft ID token 서명 알고리즘이 올바르지 않습니다.');
    }

    const publicKey = await this.getMicrosoftPublicKey(config.tenantId, header.kid);
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${parts[0]}.${parts[1]}`);
    verifier.end();

    if (!verifier.verify(publicKey, Buffer.from(parts[2], 'base64url'))) {
      throw new UnauthorizedException('Microsoft ID token 서명 검증에 실패했습니다.');
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!claims.exp || claims.exp <= nowSeconds - MICROSOFT_TOKEN_CLOCK_SKEW_SECONDS) {
      throw new UnauthorizedException('Microsoft ID token이 만료되었습니다.');
    }
    if (claims.nbf && claims.nbf > nowSeconds + MICROSOFT_TOKEN_CLOCK_SKEW_SECONDS) {
      throw new UnauthorizedException('Microsoft ID token이 아직 유효하지 않습니다.');
    }
    if (claims.iat && claims.iat > nowSeconds + MICROSOFT_TOKEN_CLOCK_SKEW_SECONDS) {
      throw new UnauthorizedException('Microsoft ID token 발급 시간이 올바르지 않습니다.');
    }
    if (claims.aud !== config.clientId) {
      throw new UnauthorizedException('Microsoft ID token audience가 올바르지 않습니다.');
    }
    if (!this.isExpectedIssuer(config, claims)) {
      throw new UnauthorizedException('Microsoft ID token issuer가 올바르지 않습니다.');
    }
    if (claims.nonce !== expectedNonce) {
      throw new UnauthorizedException('Microsoft ID token nonce가 올바르지 않습니다.');
    }

    return claims;
  }

  private async getMicrosoftPublicKey(tenantId: string, kid: string): Promise<KeyObject> {
    const cacheKey = `${tenantId}:${kid}`;
    const cached = microsoftPublicKeyCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.key;
    }

    const { response, payload } = await fetchJsonWithTimeout<MicrosoftJwksResponse>(
      `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
    );
    const jwk = payload?.keys?.find((key) => key.kid === kid);

    if (!response.ok || !jwk) {
      throw new UnauthorizedException('Microsoft 공개키를 조회할 수 없습니다.');
    }

    const publicKeyInput = { key: jwk, format: 'jwk' } as unknown as Parameters<typeof createPublicKey>[0];
    const publicKey = createPublicKey(publicKeyInput);
    microsoftPublicKeyCache.set(cacheKey, {
      key: publicKey,
      expiresAt: Date.now() + MICROSOFT_JWKS_CACHE_TTL_MS,
    });
    return publicKey;
  }

  private isExpectedIssuer(config: MicrosoftRuntimeConfig, claims: MicrosoftIdTokenClaims): boolean {
    const issuer = claims.iss?.trim();
    if (!issuer) {
      return false;
    }

    const tenantId = (claims.tid?.trim() || config.tenantId).toLowerCase();
    return issuer === `https://login.microsoftonline.com/${tenantId}/v2.0`;
  }

  private toVerifiedIdentity(
    config: MicrosoftRuntimeConfig,
    claims: MicrosoftIdTokenClaims,
  ): VerifiedMicrosoftIdentity {
    const tenantId = claims.tid?.trim() || config.tenantId;
    const subjectId = claims.oid?.trim() || claims.sub?.trim();
    const email = normalizeEmail(claims.email || claims.preferred_username || claims.upn || '');

    if (!subjectId) {
      throw new UnauthorizedException('Microsoft ID token subject가 없습니다.');
    }
    if (!email) {
      throw new UnauthorizedException('Microsoft ID token email claim이 없습니다.');
    }
    if (config.allowedTenantIds.length > 0 && !config.allowedTenantIds.includes(tenantId)) {
      throw new ForbiddenException('허용되지 않은 Microsoft tenant입니다.');
    }

    const emailDomain = getEmailDomain(email);
    if (config.allowedEmailDomains.length > 0 && !config.allowedEmailDomains.includes(emailDomain)) {
      throw new ForbiddenException('허용되지 않은 이메일 도메인입니다.');
    }

    return {
      tenantId,
      subjectId,
      email,
      userPrincipalName: claims.preferred_username || claims.upn || null,
      displayName: claims.name || null,
      rawClaims: {
        tid: tenantId,
        oid: claims.oid || null,
        sub: claims.sub || null,
        email,
        preferred_username: claims.preferred_username || null,
        upn: claims.upn || null,
        name: claims.name || null,
      },
    };
  }
}
