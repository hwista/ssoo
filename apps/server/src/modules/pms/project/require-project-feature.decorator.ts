import { SetMetadata } from '@nestjs/common';
import type { PmsProjectCapabilityKey } from './project-access.service.js';

export interface PmsProjectFeatureRequirement {
  capability: PmsProjectCapabilityKey;
  projectIdParam: string;
}

export const PMS_REQUIRED_PROJECT_FEATURE_KEY = 'pms-required-project-feature';

export const RequireProjectFeature = (
  capability: PmsProjectCapabilityKey,
  options?: { projectIdParam?: string },
) =>
  SetMetadata(PMS_REQUIRED_PROJECT_FEATURE_KEY, {
    capability,
    projectIdParam: options?.projectIdParam ?? 'projectId',
  } satisfies PmsProjectFeatureRequirement);
