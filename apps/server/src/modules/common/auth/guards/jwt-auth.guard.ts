import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { TokenPayload } from '../interfaces/auth.interface.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
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
    return super.canActivate(context);
  }

  override handleRequest<TUser = TokenPayload>(
    err: Error | null,
    user: TUser | false,
    _info: { message?: string } | undefined,
  ): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('인증이 필요합니다.');
    }
    return user;
  }
}
