import type { AuthUser } from '@openconnect/shared';

export function buildFacilityFilter(user: AuthUser): Record<string, unknown> {
  if (user.role === 'facility_admin' && user.facilityId) {
    return { facilityId: user.facilityId };
  }
  return {};
}
