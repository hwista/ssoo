import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { TokenPayload } from '../interfaces/auth.interface.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    // @Public() 데코레이터가 있으면 인증 건너뛰기
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    this.logger.debug(`Authorization header: ${authHeader ? 'Bearer ***' + authHeader.slice(-10) : 'MISSING'}`);

    return super.canActivate(context);
  }

  override handleRequest<TUser = TokenPayload>(
    err: Error | null,
    user: TUser | false,
    info: { message?: string } | undefined,
  ): TUser {
    this.logger.debug(`handleRequest - err: ${err}, user: ${user ? 'exists' : 'null'}, info: ${info?.message}`);
    if (err || !user) {
      throw err || new UnauthorizedException('인증이 필요합니다.');
    }
    return user;
  }
}
