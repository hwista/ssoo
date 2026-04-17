import { SetMetadata } from '@nestjs/common';
import type { CmsFeatureKey } from './access.service.js';

export const CMS_REQUIRED_FEATURES_KEY = 'cms-required-features';

export const RequireCmsFeature = (...features: CmsFeatureKey[]) =>
  SetMetadata(CMS_REQUIRED_FEATURES_KEY, features);
