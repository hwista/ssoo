import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@ssoo/types';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { TokenPayload } from '../interfaces/auth.interface.js';

/**
 * 역할 기반 접근 제어 가드
 *
 * @description
 * - JwtAuthGuard와 함께 사용 (JwtAuthGuard가 먼저 실행되어야 함)
 * - @Roles() 데코레이터로 지정된 역할 검사
 * - @Roles()가 없으면 모든 인증된 사용자 허용
 *
 * @example
 * @Controller('admin')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('admin')
 * export class AdminController { ... }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // @Public() 데코레이터가 있으면 역할 검사 건너뛰기
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // @Roles() 데코레이터에서 필요한 역할 가져오기
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // @Roles()가 없으면 모든 인증된 사용자 허용
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 요청에서 사용자 정보 가져오기 (JwtAuthGuard에서 설정)
    const request = context.switchToHttp().getRequest();
    const user = request.user as TokenPayload | undefined;

    if (!user) {
      this.logger.warn('RolesGuard: 사용자 정보 없음 - JwtAuthGuard가 먼저 실행되었는지 확인');
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    const userRole = user.roleCode as UserRole;
    const hasRole = requiredRoles.includes(userRole);

    this.logger.debug(
      `RolesGuard: user=${user.loginId}, role=${userRole}, required=${requiredRoles.join(',')}, allowed=${hasRole}`,
    );

    if (!hasRole) {
      throw new ForbiddenException(`이 기능은 ${requiredRoles.join(', ')} 역할만 사용할 수 있습니다.`);
    }

    return true;
  }
}
