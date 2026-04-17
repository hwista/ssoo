import { SetMetadata } from '@nestjs/common';
import type { DmsFeatureKey } from './access.service.js';

export const DMS_REQUIRED_FEATURES_KEY = 'dms-required-features';

export const RequireDmsFeature = (...features: DmsFeatureKey[]) =>
  SetMetadata(DMS_REQUIRED_FEATURES_KEY, features);
