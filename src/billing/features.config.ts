/**
 * Plan → feature mapping used by FeatureGuard to gate access to premium
 * capabilities. Keeping this in one place makes the entitlement matrix easy to
 * audit and change without touching guard logic.
 */
export enum Feature {
  AdvancedAnalytics = 'advanced_analytics',
  ApiAccess = 'api_access',
  CustomDomain = 'custom_domain',
  PrioritySupport = 'priority_support',
}

export const PLAN_FEATURES: Record<string, Feature[]> = {
  free: [],
  pro: [Feature.AdvancedAnalytics, Feature.ApiAccess],
  enterprise: [
    Feature.AdvancedAnalytics,
    Feature.ApiAccess,
    Feature.CustomDomain,
    Feature.PrioritySupport,
  ],
};

/** Features unlocked by a given plan tier (unknown tiers fall back to free). */
export function featuresForPlan(plan: string): Feature[] {
  return PLAN_FEATURES[plan] ?? PLAN_FEATURES.free;
}

export function planHasFeature(plan: string, feature: Feature): boolean {
  return featuresForPlan(plan).includes(feature);
}
