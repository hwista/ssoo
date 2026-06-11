import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { AccessService, type SnsFeatureKey } from './access.service.js';
import { SNS_REQUIRED_FEATURES_KEY } from './require-sns-feature.decorator.js';

@Injectable()
export class SnsFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessService: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeatures = this.reflector.getAllAndOverride<SnsFeatureKey[]>(
      SNS_REQUIRED_FEATURES_KEY,
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
