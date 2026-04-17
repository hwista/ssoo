import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { TokenPayload } from '../interfaces/auth.interface.js';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(OptionalJwtAuthGuard.name);

  override canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      request.user = undefined;
      return true;
    }

    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  override handleRequest<TUser = TokenPayload>(
    err: Error | null,
    user: TUser | false,
    info: { message?: string } | undefined,
  ): TUser | undefined {
    if (err || !user) {
      this.logger.debug(`Optional auth skipped: ${info?.message ?? err?.message ?? 'unknown reason'}`);
      return undefined;
    }

    return user;
  }
}
