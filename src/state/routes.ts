/**
 * Workout routes: what Arro keeps of the GPS track Apple Health recorded, and the
 * maths for drawing it. Pure functions only, so they run anywhere.
 *
 * Before a route leaves the phone it's trimmed at both ends (so nobody's front
 * door is on the map), thinned to the points that change its shape, and encoded
 * as a Google polyline string for the `workouts.route` column.
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** How much of each end is cut off before a route is shared. */
export const TRIM_METERS = 200;
/** Shorter than this after trimming and there's nothing worth drawing. */
const MIN_ROUTE_METERS = 300;
/** Points closer than this to the simplified line are dropped. */
const SIMPLIFY_METERS = 6;
/** The most points kept, which keeps a route under about 2 KB encoded. */
const MAX_POINTS = 400;

const EARTH_RADIUS = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Metres between two points (haversine). */
export function metersBetween(a: LatLng, b: LatLng): number {
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function routeLength(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += metersBetween(points[i - 1], points[i]);
  return total;
}

/** Drops the first and last `meters` of a route. */
export function trimEnds(points: LatLng[], meters: number = TRIM_METERS): LatLng[] {
  const fromStart = (pts: LatLng[]) => {
    let walked = 0;
    for (let i = 1; i < pts.length; i++) {
      walked += metersBetween(pts[i - 1], pts[i]);
      if (walked >= meters) return pts.slice(i);
    }
    return [];
  };
  const head = fromStart(points);
  return fromStart([...head].reverse()).reverse();
}

/** Ramer-Douglas-Peucker on a local flat projection, which is fine at the size of a workout. */
export function simplify(points: LatLng[], toleranceMeters: number = SIMPLIFY_METERS): LatLng[] {
  if (points.length < 3) return points;
  const lat0 = rad(points[0].latitude);
  const xy = points.map((p) => [rad(p.longitude) * Math.cos(lat0) * EARTH_RADIUS, rad(p.latitude) * EARTH_RADIUS]);
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    const [ax, ay] = xy[first];
    const [bx, by] = xy[last];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let worst = -1;
    let worstDist = 0;
    for (let i = first + 1; i < last; i++) {
      const [px, py] = xy[i];
      let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      if (d > worstDist) {
        worstDist = d;
        worst = i;
      }
    }
    if (worst > 0 && worstDist > toleranceMeters) {
      keep[worst] = 1;
      stack.push([first, worst], [worst, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Every nth point until it fits, always keeping both ends. */
function cap(points: LatLng[], max: number): LatLng[] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]);
}

/** The route as it's shared with the family, or null when there's too little left to draw. */
export function shareableRoute(points: LatLng[]): LatLng[] | null {
  const trimmed = trimEnds(points);
  if (trimmed.length < 2 || routeLength(trimmed) < MIN_ROUTE_METERS) return null;
  let tolerance = SIMPLIFY_METERS;
  let simple = simplify(trimmed, tolerance);
  while (simple.length > MAX_POINTS && tolerance < 100) {
    tolerance *= 2;
    simple = simplify(trimmed, tolerance);
  }
  return cap(simple, MAX_POINTS);
}

// ─── Google's encoded polyline format, 5 decimal places (about a metre) ──────

function encodeValue(v: number): string {
  let n = v < 0 ? ~(v << 1) : v << 1;
  let out = '';
  while (n >= 0x20) {
    out += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
    n >>= 5;
  }
  return out + String.fromCharCode(n + 63);
}

export function encodePolyline(points: LatLng[]): string {
  let lat = 0;
  let lng = 0;
  let out = '';
  for (const p of points) {
    const la = Math.round(p.latitude * 1e5);
    const lo = Math.round(p.longitude * 1e5);
    out += encodeValue(la - lat) + encodeValue(lo - lng);
    lat = la;
    lng = lo;
  }
  return out;
}

export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const next = () => {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index < encoded.length);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    lat += next();
    if (index >= encoded.length) break;
    lng += next();
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

// ─── Drawing ─────────────────────────────────────────────────────────────────

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export function boundsOf(routes: LatLng[][]): Bounds | null {
  let b: Bounds | null = null;
  for (const route of routes) {
    for (const p of route) {
      if (!b) b = { minLat: p.latitude, maxLat: p.latitude, minLng: p.longitude, maxLng: p.longitude };
      else {
        b.minLat = Math.min(b.minLat, p.latitude);
        b.maxLat = Math.max(b.maxLat, p.latitude);
        b.minLng = Math.min(b.minLng, p.longitude);
        b.maxLng = Math.max(b.maxLng, p.longitude);
      }
    }
  }
  return b;
}

/** A map region that shows every point with some room around it. */
export function regionFor(routes: LatLng[][], padding = 0.25) {
  const b = boundsOf(routes);
  if (!b) return null;
  const latDelta = Math.max(b.maxLat - b.minLat, 0.004);
  const lngDelta = Math.max(b.maxLng - b.minLng, 0.004);
  return {
    latitude: (b.minLat + b.maxLat) / 2,
    longitude: (b.minLng + b.maxLng) / 2,
    latitudeDelta: latDelta * (1 + padding * 2),
    longitudeDelta: lngDelta * (1 + padding * 2),
  };
}

/**
 * SVG path data for routes fitted into a width x height box, keeping the shape's
 * proportions (longitude is squeezed by the cosine of the latitude, like a map).
 */
export function projectRoutes(routes: LatLng[][], width: number, height: number, inset = 12): string[] {
  const b = boundsOf(routes);
  if (!b) return [];
  const k = Math.cos(rad((b.minLat + b.maxLat) / 2));
  const spanX = Math.max((b.maxLng - b.minLng) * k, 1e-6);
  const spanY = Math.max(b.maxLat - b.minLat, 1e-6);
  const scale = Math.min((width - inset * 2) / spanX, (height - inset * 2) / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  return routes.map((route) =>
    route
      .map((p, i) => {
        const x = offX + (p.longitude - b.minLng) * k * scale;
        const y = offY + (b.maxLat - p.latitude) * scale;
        return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' '),
  );
}
