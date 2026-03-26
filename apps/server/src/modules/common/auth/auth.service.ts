import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { UserService } from '../user/user.service.js';
import { LoginDto } from './dto/login.dto.js';
import { TokenPayload, AuthTokens } from './interfaces/auth.interface.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 로그인 처리
   */
  async login(loginDto: LoginDto): Promise<AuthTokens> {
    const { loginId, password } = loginDto;

    // 1. 사용자 조회 (loginId로)
    const user = await this.userService.findByLoginId(loginId);
    if (!user) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 일치하지 않습니다.');
    }

    // 2. 시스템 사용자 여부 확인
    if (!user.isSystemUser) {
      throw new UnauthorizedException('시스템 접근 권한이 없습니다.');
    }

    // 3. 계정 상태 확인
    if (user.userStatusCode !== 'active') {
      throw new UnauthorizedException('비활성화된 계정입니다. 관리자에게 문의하세요.');
    }

    // 4. 계정 잠금 확인
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('계정이 잠겨있습니다. 잠시 후 다시 시도하세요.');
    }

    // 5. 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash || '');
    if (!isPasswordValid) {
      // 로그인 실패 횟수 증가
      await this.userService.incrementLoginFailCount(user.id);
      throw new UnauthorizedException('아이디 또는 비밀번호가 일치하지 않습니다.');
    }

    // 6. 로그인 성공 - 실패 횟수 초기화 및 마지막 로그인 시간 업데이트
    await this.userService.resetLoginFailCount(user.id);
    await this.userService.updateLastLogin(user.id);

    // 7. 토큰 생성
    const tokens = await this.generateTokens({
      userId: user.id.toString(),  // BigInt를 string으로 변환
      loginId: user.loginId!,
      roleCode: user.roleCode,
      userTypeCode: user.userTypeCode,
      isAdmin: user.isAdmin,
    });

    // 8. Refresh Token 해시 저장
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일
    await this.userService.updateRefreshToken(user.id, refreshTokenHash, refreshExpiresAt);

    return tokens;
  }

  /**
   * 토큰 갱신
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      // 1. Refresh Token 검증
      const payload = this.jwtService.verify<TokenPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', { infer: true }),
      });

      // 2. 사용자 조회 (userId는 string이므로 BigInt로 변환)
      const user = await this.userService.findById(BigInt(payload.userId));
      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }

      // 3. 저장된 Refresh Token과 비교
      const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }

      // 4. 만료 확인
      if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt < new Date()) {
        throw new UnauthorizedException('토큰이 만료되었습니다. 다시 로그인하세요.');
      }

      // 5. 새 토큰 생성
      const tokens = await this.generateTokens({
        userId: user.id.toString(),  // BigInt를 string으로 변환
        loginId: user.loginId!,
        roleCode: user.roleCode,
        userTypeCode: user.userTypeCode,
        isAdmin: user.isAdmin,
      });

      // 6. 새 Refresh Token 저장
      const newRefreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
      const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await this.userService.updateRefreshToken(user.id, newRefreshTokenHash, refreshExpiresAt);

      return tokens;
    } catch {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }

  /**
   * 로그아웃
   */
  async logout(userId: bigint): Promise<void> {
    await this.userService.clearRefreshToken(userId);
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
