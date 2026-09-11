const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two coordinates, in meters. The single distance
 * implementation in the project — every geofence check must call this, never a
 * second copy (see CLAUDE.md). */
export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const rLat1 = toRadians(lat1);
  const rLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

export interface GeofenceCheckResult {
  isInside: boolean;
  distanceMeters: number;
}

/**
 * Server-side geofence check against a school's registered coordinates and
 * radius. Never accept a client-computed "inside" flag — always recompute
 * from raw coordinates sent with the request (CLAUDE.md, PRD §9).
 */
export function checkGeofence(
  punchLat: number,
  punchLng: number,
  schoolLat: number,
  schoolLng: number,
  radiusMeters: number,
): GeofenceCheckResult {
  const distanceMeters = haversineDistanceMeters(punchLat, punchLng, schoolLat, schoolLng);
  return { isInside: distanceMeters <= radiusMeters, distanceMeters };
}
