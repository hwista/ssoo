import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PATH_METADATA } from '@nestjs/common/constants.js';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator.js';
import type { TokenPayload } from '../auth/interfaces/auth.interface.js';
import { PlatformAdmissionService, serviceForController } from './platform-admission.service.js';


@Injectable()
export class PlatformAdmissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly admission: PlatformAdmissionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<{ user?: TokenPayload; method: string }>();
    if (!request.user) return false;
    const userId = BigInt(request.user.userId);
    const controllerPath = this.reflector.get<string | string[]>(PATH_METADATA, context.getClass());
    const path = Array.isArray(controllerPath) ? controllerPath[0] : controllerPath ?? '';
    const root = path.replace(/^\//, '').split('/')[0];
    const handlerPath = this.reflector.get<string>(PATH_METADATA, context.getHandler()) ?? '';
    // Authentication/session repair and onboarding must remain usable before admission.
    if (root === 'auth' || root === 'onboarding' || (root === 'users' && ['me', 'me/profile', 'profile'].includes(handlerPath))) return true;
    await this.admission.assertActive(userId);
    const service = serviceForController(path);
    if (service) await this.admission.assertService(userId, service);
    return true;
  }
}
