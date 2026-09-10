import { evaluateGeofence, haversine } from '../utils/geofence';

// Regression coverage for the exact bug fixed in this codebase: a GPS-accuracy
// check was running before the "clock-out is never geofence-blocked" rule, so
// staff with a weak signal couldn't clock out.
describe('evaluateGeofence', () => {
  const home = { lat: 51.5, lng: -0.1, label: 'Home', radius: 200 };

  it('always passes clock_out, even with a terrible GPS accuracy and no check points', () => {
    const result = evaluateGeofence({
      eventType: 'clock_out',
      staffLat: 0,
      staffLng: 0,
      gpsAccuracy: 5000,
      checkPoints: [],
    });
    expect(result.geofencePassed).toBe(true);
  });

  it('blocks clock_in with weak GPS accuracy (>300m)', () => {
    const result = evaluateGeofence({
      eventType: 'clock_in',
      staffLat: home.lat,
      staffLng: home.lng,
      gpsAccuracy: 350,
      checkPoints: [home],
    });
    expect(result.geofencePassed).toBe(false);
    if (!result.geofencePassed) expect(result.reason).toBe('weak_gps');
  });

  it('blocks clock_in when no check points are configured', () => {
    const result = evaluateGeofence({
      eventType: 'clock_in',
      staffLat: home.lat,
      staffLng: home.lng,
      gpsAccuracy: 20,
      checkPoints: [],
    });
    expect(result.geofencePassed).toBe(false);
    if (!result.geofencePassed) expect(result.reason).toBe('no_location');
  });

  it('passes clock_in when within radius', () => {
    const result = evaluateGeofence({
      eventType: 'clock_in',
      staffLat: home.lat,
      staffLng: home.lng,
      gpsAccuracy: 20,
      checkPoints: [home],
    });
    expect(result.geofencePassed).toBe(true);
  });

  it('blocks clock_in when genuinely far away, even with generous accuracy tolerance', () => {
    const result = evaluateGeofence({
      eventType: 'clock_in',
      staffLat: home.lat + 1, // roughly 111km away
      staffLng: home.lng,
      gpsAccuracy: 50,
      checkPoints: [home],
    });
    expect(result.geofencePassed).toBe(false);
    if (!result.geofencePassed) expect(result.reason).toBe('too_far');
  });

  it('gives benefit of the doubt up to the accuracy tolerance (capped at 150m)', () => {
    // ~250m away from home, radius 200m, accuracy 100m -> within 200+100=300m tolerance
    const farPoint = { lat: home.lat + 0.00225, lng: home.lng, label: 'Home', radius: 200 };
    const result = evaluateGeofence({
      eventType: 'clock_in',
      staffLat: farPoint.lat,
      staffLng: farPoint.lng,
      gpsAccuracy: 100,
      checkPoints: [home],
    });
    expect(result.geofencePassed).toBe(true);
  });
});

describe('haversine', () => {
  it('returns ~0 for identical points', () => {
    expect(haversine(51.5, -0.1, 51.5, -0.1)).toBeCloseTo(0, 5);
  });

  it('returns a sensible distance for two known points', () => {
    // London to Paris is roughly 344km
    const dist = haversine(51.5074, -0.1278, 48.8566, 2.3522);
    expect(dist).toBeGreaterThan(330000);
    expect(dist).toBeLessThan(350000);
  });
});
