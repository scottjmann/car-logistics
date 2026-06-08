export interface LatLng {
  lat: number;
  lng: number;
}

export interface OptimizeResult {
  orderedIndices: number[]; // indices into the input waypoints array, in optimized order
  waypointOrder: number[];  // same as above (Google's field name)
}

// Uses Google Maps Directions API with optimize:true to get the best stop order.
// `origin` is the depot. `waypoints` are the job addresses.
export async function optimizeRoute(
  origin: string,
  waypoints: string[]
): Promise<OptimizeResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY is not set");
  if (waypoints.length === 0) return { orderedIndices: [], waypointOrder: [] };

  // optimize:true goes once at the start, then all waypoints pipe-separated
  const waypointParam = "optimize:true|" + waypoints.map((w) => encodeURIComponent(w)).join("|");

  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(origin)}` +
    `&waypoints=${waypointParam}` +
    `&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK") {
    throw new Error(`Google Directions API error: ${data.status} — ${data.error_message ?? ""}`);
  }

  const order: number[] = data.routes[0].waypoint_order;
  return { orderedIndices: order, waypointOrder: order };
}

// Geocode a single address string to lat/lng using Google Geocoding API.
export async function geocode(address: string): Promise<LatLng | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?address=${encodeURIComponent(address)}` +
    `&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" || !data.results[0]) return null;
  return data.results[0].geometry.location as LatLng;
}
