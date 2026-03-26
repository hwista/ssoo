import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TokenPayload } from '../interfaces/auth.interface.js';

export const CurrentUser = createParamDecorator(
  (data: keyof TokenPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as TokenPayload;

    if (data) {
      return user[data];
    }

    return user;
  },
);
