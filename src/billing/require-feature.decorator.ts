import { SetMetadata } from '@nestjs/common';
import { Feature } from './features.config';

export const REQUIRE_FEATURE_KEY = 'requireFeature';

/** Marks a route as requiring the tenant's plan to include `feature`. */
export const RequireFeature = (feature: Feature) =>
  SetMetadata(REQUIRE_FEATURE_KEY, feature);
