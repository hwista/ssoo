import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { TokenPayload } from '../interfaces/auth.interface.js';
import { UserService } from '../../user/user.service.js';
import { AccessFoundationService } from '../../access/access-foundation.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly accessFoundationService: AccessFoundationService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', { infer: true }),
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

  async validate(payload: TokenPayload): Promise<TokenPayload> {
    this.logger.debug(`Validating JWT payload: ${JSON.stringify(payload)}`);

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
      roleCode: user.roleCode,
      organizationIds: organizationIds.map((orgId) => orgId.toString()),
      // 현재 공통 런타임에서 안정적으로 해석되는 principal membership 은 organization 까지다.
      // team/group membership source 가 연결되면 payload 주입만으로 ACL matching 경로를 재사용할 수 있다.
      teamIds: this.normalizePrincipalIds(payload.teamIds),
      groupIds: this.normalizePrincipalIds(payload.groupIds),
      sessionId: payload.sessionId,
    };
  }
}
