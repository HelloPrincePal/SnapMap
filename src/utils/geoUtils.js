// Bounding box calculation for a geometry
export function getBBox(geometry) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const processCoords = (coords) => {
    coords.forEach(p => {
      const x = p[0], y = p[1];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });
  };

  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach(processCoords);
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach(poly => poly.forEach(processCoords));
  }
  return [minX, minY, maxX, maxY];
}

// Ray-casting point-in-polygon check
export function pointInPolygon(point, geometry) {
  const [x, y] = point;
  const checkRing = (ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      const intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  if (geometry.type === "Polygon") {
    return checkRing(geometry.coordinates[0]);
  } else if (geometry.type === "MultiPolygon") {
    for (const poly of geometry.coordinates) {
      if (checkRing(poly[0])) return true;
    }
  }
  return false;
}

// Check if a point is inside a bounding box
export function pointInBBox(point, bbox) {
  const [x, y] = point;
  const [minX, minY, maxX, maxY] = bbox;
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

// Get a representative point inside a GeoJSON feature (average of first polygon's outer ring)
export function getPointInFeature(feature) {
  if (!feature || !feature.geometry) return null;
  const geom = feature.geometry;
  let ring = null;

  if (geom.type === "Polygon") {
    ring = geom.coordinates[0];
  } else if (geom.type === "MultiPolygon") {
    ring = geom.coordinates[0][0];
  }

  if (ring && ring.length > 0) {
    let sumX = 0, sumY = 0;
    ring.forEach(p => { sumX += p[0]; sumY += p[1]; });
    return [sumX / ring.length, sumY / ring.length];
  }
  return null;
}

// Map ADM2 districts to their parent ADM1 states
export function mapDistrictsToStates(statesGeoJSON, districtsGeoJSON) {
  const mapping = {};

  // Calculate bounding boxes for all states
  const statesWithBBox = statesGeoJSON.features.map(state => {
    return {
      state,
      bbox: getBBox(state.geometry),
      name: state.properties.shapeName
    };
  });

  districtsGeoJSON.features.forEach(district => {
    const testPoint = getPointInFeature(district);
    if (!testPoint) return;

    let matched = false;
    for (const { state, bbox, name } of statesWithBBox) {
      if (pointInBBox(testPoint, bbox)) {
        if (pointInPolygon(testPoint, state.geometry)) {
          if (!mapping[name]) mapping[name] = [];
          mapping[name].push(district);
          matched = true;
          break;
        }
      }
    }

    // Fallback: If not matched directly (e.g., due to tiny coastal offsets), check by name overlap or put in unassigned
    if (!matched) {
      if (!mapping["Other/Unassigned"]) mapping["Other/Unassigned"] = [];
      mapping["Other/Unassigned"].push(district);
    }
  });

  return mapping;
}

// ── Visvalingam-Whyatt simplification ──────────────────────────────────────

// Planar: treats lon/lat as flat 2-D coordinates
function vwTriArea(a, b, c) {
  return Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
}

// Spherical: scales longitude differences by cos(lat) so polar regions
// are not over-simplified relative to equatorial regions
function vwSphericalTriArea(a, b, c) {
  const cosLat = Math.cos(((a[1] + b[1] + c[1]) / 3) * (Math.PI / 180));
  return Math.abs(
    (b[0] - a[0]) * cosLat * (c[1] - a[1]) -
    (c[0] - a[0]) * cosLat * (b[1] - a[1])
  ) / 2;
}

function _vwRun(points, tolerance, areaFn) {
  if (points.length <= 3 || tolerance <= 0) return points;
  const n = points.length;
  const prv = Array.from({ length: n }, (_, i) => i - 1);
  const nxt = Array.from({ length: n }, (_, i) => i + 1);
  const areas = new Float64Array(n).fill(Infinity);
  const removed = new Uint8Array(n);
  for (let i = 1; i < n - 1; i++) areas[i] = areaFn(points[prv[i]], points[i], points[nxt[i]]);
  let maxArea = 0;
  for (;;) {
    let minArea = Infinity, minIdx = -1;
    for (let i = 1; i < n - 1; i++) {
      if (!removed[i] && areas[i] < minArea) { minArea = areas[i]; minIdx = i; }
    }
    if (minIdx === -1 || minArea >= tolerance) break;
    maxArea = Math.max(maxArea, minArea);
    removed[minIdx] = 1;
    const p = prv[minIdx], nx = nxt[minIdx];
    if (p >= 0) nxt[p] = nx;
    if (nx < n) prv[nx] = p;
    if (p > 0 && !removed[p])
      areas[p] = Math.max(maxArea, areaFn(points[prv[p]], points[p], points[nxt[p]]));
    if (nx < n - 1 && !removed[nx])
      areas[nx] = Math.max(maxArea, areaFn(points[prv[nx]], points[nx], points[nxt[nx]]));
  }
  return points.filter((_, i) => !removed[i]);
}

export function simplifyVisvalingam(points, tolerance) {
  return _vwRun(points, tolerance, vwTriArea);
}

export function simplifyVisvalingamSpherical(points, tolerance) {
  return _vwRun(points, tolerance, vwSphericalTriArea);
}

// ── Douglas-Peucker point simplification ───────────────────────────────────
function getSqSegDist(p, p1, p2) {
  let x = p1[0], y = p1[1];
  let dx = p2[0] - x, dy = p2[1] - y;
  if (dx !== 0 || dy !== 0) {
    let t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = p2[0]; y = p2[1];
    } else if (t > 0) {
      x += dx * t; y += dy * t;
    }
  }
  dx = p[0] - x; dy = p[1] - y;
  return dx * dx + dy * dy;
}

function simplifyDPStep(points, first, last, sqTolerance, simplified) {
  let maxSqDist = sqTolerance;
  let index;
  for (let i = first + 1; i < last; i++) {
    const sqDist = getSqSegDist(points[i], points[first], points[last]);
    if (sqDist > maxSqDist) {
      index = i;
      maxSqDist = sqDist;
    }
  }
  if (maxSqDist > sqTolerance) {
    if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
    simplified.push(points[index]);
    if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
  }
}

export function simplifyPoints(points, tolerance) {
  if (points.length <= 2 || tolerance <= 0) return points;
  const sqTolerance = tolerance * tolerance;
  const last = points.length - 1;
  const simplified = [points[0]];
  simplifyDPStep(points, 0, last, sqTolerance, simplified);
  simplified.push(points[last]);
  return simplified;
}

// Simplifies coordinates in a GeoJSON geometry object
export function simplifyGeometry(geometry, tolerance, method = 'visvalingam-spherical') {
  if (tolerance <= 0) return geometry;

  const simplifyRing = (ring) =>
    method === 'visvalingam-planar'
      ? simplifyVisvalingam(ring, tolerance)
      : simplifyVisvalingamSpherical(ring, tolerance);

  if (geometry.type === "Polygon") {
    return { type: "Polygon", coordinates: geometry.coordinates.map(simplifyRing) };
  } else if (geometry.type === "MultiPolygon") {
    return { type: "MultiPolygon", coordinates: geometry.coordinates.map(poly => poly.map(simplifyRing)) };
  }
  return geometry;
}

// Simplifies a complete GeoJSON feature collection
export function simplifyGeoJSON(geojson, tolerance, method = 'visvalingam-spherical') {
  if (tolerance <= 0) return geojson;
  return {
    ...geojson,
    features: geojson.features.map(f => ({
      ...f,
      geometry: simplifyGeometry(f.geometry, tolerance, method)
    }))
  };
}

// Calculate signed area of a 2D ring (Shoelace formula)
// Negative area indicates clockwise winding in Cartesian space.
function getRingArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j][0] * ring[i][1]) - (ring[i][0] * ring[j][1]);
  }
  return area / 2;
}

// Rewind a coordinate ring to match requested winding direction
function rewindRing(ring, clockwise) {
  const area = getRingArea(ring);
  const isClockwise = area < 0;
  if (isClockwise !== clockwise) {
    ring.reverse();
  }
}

// Rewind geometry polygons to be clockwise for exterior rings and counter-clockwise for interior holes
export function rewindGeometry(geometry) {
  if (!geometry) return geometry;
  if (geometry.type === "Polygon") {
    const coordinates = geometry.coordinates.map((ring, idx) => {
      const clonedRing = [...ring];
      // idx === 0: exterior (should be clockwise), idx > 0: hole (should be counter-clockwise)
      rewindRing(clonedRing, idx === 0);
      return clonedRing;
    });
    return { ...geometry, coordinates };
  } else if (geometry.type === "MultiPolygon") {
    const coordinates = geometry.coordinates.map(polygon => {
      return polygon.map((ring, idx) => {
        const clonedRing = [...ring];
        rewindRing(clonedRing, idx === 0);
        return clonedRing;
      });
    });
    return { ...geometry, coordinates };
  }
  return geometry;
}

// Enforces clockwise winding order on all features of a GeoJSON collection
export function rewindGeoJSON(geojson) {
  if (!geojson || !geojson.features) return geojson;
  return {
    ...geojson,
    features: geojson.features.map(f => ({
      ...f,
      geometry: rewindGeometry(f.geometry)
    }))
  };
}

