import { BadRequestException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { ProjectAccessService } from './project-access.service.js';
import {
  PMS_REQUIRED_PROJECT_FEATURE_KEY,
  type PmsProjectFeatureRequirement,
} from './require-project-feature.decorator.js';

@Injectable()
export class ProjectFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<PmsProjectFeatureRequirement>(
      PMS_REQUIRED_PROJECT_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest<
      Request & { params?: Record<string, string | undefined>; user?: TokenPayload }
    >();

    if (!request.user) {
      return false;
    }

    const rawProjectId = request.params?.[requirement.projectIdParam];
    if (!rawProjectId) {
      throw new BadRequestException('프로젝트 식별자가 필요합니다.');
    }

    let projectId: bigint;
    try {
      projectId = BigInt(rawProjectId);
    } catch {
      throw new BadRequestException('유효한 프로젝트 식별자가 아닙니다.');
    }

    await this.projectAccessService.assertProjectCapability(projectId, request.user, requirement.capability);
    return true;
  }
}
