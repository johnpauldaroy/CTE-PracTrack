import { ForbiddenError } from "@/lib/session";
import type { SessionUser } from "@/lib/auth";

export interface GeocodeResult {
  label: string;
  latitude: number;
  longitude: number;
}

// Nominatim (OpenStreetMap) usage policy: identify the app with a User-Agent,
// at most 1 request/second, and cache results. Searches are biased to Antique
// province (not bounded, so a school just outside the box still resolves).
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const ANTIQUE_VIEWBOX = "121.75,11.90,122.30,10.35"; // left,top,right,bottom
const MIN_INTERVAL_MS = 1100;
const CACHE_LIMIT = 200;

const cache = new Map<string, GeocodeResult[]>();
let lastRequestAt = 0;

export class GeocoderUnavailableError extends Error {
  constructor(message = "Place search is unavailable right now. Click the map or enter coordinates instead.") {
    super(message);
    this.name = "GeocoderUnavailableError";
  }
}

/** Looks up places for the admin's map picker. Admin-only: it's a school-management tool. */
export async function searchPlaces(actor: SessionUser, query: string): Promise<GeocodeResult[]> {
  if (actor.role !== "ADMIN") throw new ForbiddenError("Only the CTE office can search locations.");
  const key = query.trim().toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    countrycodes: "ph",
    viewbox: ANTIQUE_VIEWBOX,
    limit: "6",
    addressdetails: "0",
  });

  let response: Response;
  try {
    response = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: {
        "User-Agent": process.env.GEOCODER_USER_AGENT || "CTE-PracTrack/1.0 (University of Antique CTE practicum monitoring)",
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[geocode] request failed", error);
    throw new GeocoderUnavailableError();
  }
  if (!response.ok) {
    console.error(`[geocode] Nominatim answered ${response.status}`);
    throw new GeocoderUnavailableError();
  }

  const rows = (await response.json()) as { display_name: string; lat: string; lon: string }[];
  const results = rows.map((row) => ({ label: row.display_name, latitude: Number(row.lat), longitude: Number(row.lon) }));

  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  cache.set(key, results);
  return results;
}
