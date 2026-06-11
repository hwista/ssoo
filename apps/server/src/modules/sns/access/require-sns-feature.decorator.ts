import { SetMetadata } from '@nestjs/common';
import type { SnsFeatureKey } from './access.service.js';

export const SNS_REQUIRED_FEATURES_KEY = 'sns-required-features';

export const RequireSnsFeature = (...features: SnsFeatureKey[]) =>
  SetMetadata(SNS_REQUIRED_FEATURES_KEY, features);
