import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';

const logger = new Logger('WsJwtGuard');

let jwtServiceInstance: JwtService | null = null;

/**
 * WebSocket JWT 토큰 검증.
 * HTTP JwtStrategy와 동일한 시크릿/옵션을 사용하되,
 * WebSocket handshake에서는 Passport 미사용.
 */
export async function verifyWsToken(token: string): Promise<TokenPayload | null> {
  try {
    if (!jwtServiceInstance) {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        logger.error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
        return null;
      }
      jwtServiceInstance = new JwtService({ secret });
    }
    return jwtServiceInstance.verify<TokenPayload>(token);
  } catch {
    return null;
  }
}
