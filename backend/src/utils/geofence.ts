// Pure, unit-testable geofence logic extracted out of clockin.routes.ts so the
// clock-in/clock-out rules (including the "clock-out is never geofence-blocked"
// rule and the GPS-accuracy tolerance) can be tested without a live server or
// database — this is exactly the logic that had a real bug (GPS-accuracy check
// running before the clock-out exemption) found and fixed in this codebase.

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface GeofenceCheckPoint { lat: number; lng: number; label: string; radius: number }

export type GeofenceOutcome =
  | { geofencePassed: true; distanceMetres: number | null; closestLabel: string }
  | { geofencePassed: false; reason: 'weak_gps' | 'no_location' | 'too_far'; distanceMetres: number | null; closestLabel: string };

export function evaluateGeofence(params: {
  eventType: string;
  staffLat: number;
  staffLng: number;
  gpsAccuracy: number | null;
  checkPoints: GeofenceCheckPoint[];
}): GeofenceOutcome {
  const { eventType, staffLat, staffLng, gpsAccuracy, checkPoints } = params;

  // Clock-out is never geofence-blocked — staff can be anywhere when ending a
  // shift. This must be checked before anything else, including the GPS
  // accuracy check below, or a weak signal at clock-out time wrongly blocks it.
  if (eventType === 'clock_out') {
    return { geofencePassed: true, distanceMetres: null, closestLabel: '' };
  }

  if (gpsAccuracy !== null && gpsAccuracy > 300) {
    return { geofencePassed: false, reason: 'weak_gps', distanceMetres: null, closestLabel: '' };
  }

  if (checkPoints.length === 0) {
    return { geofencePassed: false, reason: 'no_location', distanceMetres: null, closestLabel: '' };
  }

  const accuracyTolerance = gpsAccuracy !== null ? Math.min(gpsAccuracy, 150) : 0;
  let closestDistance: number | null = null;
  let closestLabel = '';
  for (const pt of checkPoints) {
    const dist = Math.round(haversine(staffLat, staffLng, pt.lat, pt.lng));
    if (closestDistance === null || dist < closestDistance) {
      closestDistance = dist;
      closestLabel = pt.label;
    }
    if (dist <= pt.radius + accuracyTolerance) {
      return { geofencePassed: true, distanceMetres: dist, closestLabel: pt.label };
    }
  }

  return { geofencePassed: false, reason: 'too_far', distanceMetres: closestDistance, closestLabel };
}
