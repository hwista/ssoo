import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { AccessService, type CmsFeatureKey } from './access.service.js';
import { CMS_REQUIRED_FEATURES_KEY } from './require-cms-feature.decorator.js';

@Injectable()
export class CmsFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessService: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeatures = this.reflector.getAllAndOverride<CmsFeatureKey[]>(
      CMS_REQUIRED_FEATURES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeatures || requiredFeatures.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: TokenPayload }>();
    if (!request.user) {
      return false;
    }

    await this.accessService.assertFeatures(request.user, requiredFeatures);
    return true;
  }
}
