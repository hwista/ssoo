import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { TokenPayload } from '../interfaces/auth.interface.js';
import { UserService } from '../../user/user.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', { infer: true }),
    });
  }

  async validate(payload: TokenPayload): Promise<TokenPayload> {
    this.logger.debug(`Validating JWT payload: ${JSON.stringify(payload)}`);

    // Access Token인지 확인
    if (payload.type !== 'access') {
      this.logger.warn(`Invalid token type: ${payload.type}`);
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    // 사용자 존재 및 상태 확인 (userId는 string이므로 BigInt로 변환)
    const user = await this.userService.findById(BigInt(payload.userId));
    if (!user) {
      this.logger.warn(`User not found: ${payload.userId}`);
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    if (!user.isSystemUser || user.userStatusCode !== 'active') {
      this.logger.warn(`User inactive - isSystemUser: ${user.isSystemUser}, status: ${user.userStatusCode}`);
      throw new UnauthorizedException('비활성화된 계정입니다.');
    }

    return {
      userId: payload.userId,
      loginId: payload.loginId,
      roleCode: payload.roleCode,
      userTypeCode: payload.userTypeCode,
      isAdmin: payload.isAdmin ?? user.isAdmin,
    };
  }
}
