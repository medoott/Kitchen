/**
 * Ray-casting algorithm to determine if a point is inside a polygon.
 * @param lat - Latitude of the point
 * @param lng - Longitude of the point
 * @param polygon - Array of [lat, lng] coordinate pairs forming the polygon
 */
export function isPointInPolygon(
  lat: number,
  lng: number,
  polygon: [number, number][]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];

    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}
