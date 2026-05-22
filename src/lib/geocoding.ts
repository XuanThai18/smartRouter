/**
 * Geocoding via Nominatim (OpenStreetMap) — miễn phí, không cần API key
 * Rate limit: 1 request/giây — cache kết quả trong DB
 */

export interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
}

const cache = new Map<string, GeoResult>();

export async function geocodeAddress(address: string): Promise<GeoResult | null> {
  const key = address.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  try {
    const encoded = encodeURIComponent(address + ", Việt Nam");
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=vn`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "SmartRoute-ERP/1.0 (academic project)",
        "Accept-Language": "vi",
      },
    });

    const data = await res.json();
    if (!data || data.length === 0) return null;

    const result: GeoResult = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };

    cache.set(key, result);

    // Rate limit: 1 req/giây
    await new Promise(r => setTimeout(r, 1100));

    return result;
  } catch (err) {
    console.error("[Geocoding Error]", err);
    return null;
  }
}

export async function geocodeBatch(addresses: string[]): Promise<(GeoResult | null)[]> {
  const results: (GeoResult | null)[] = [];
  for (const addr of addresses) {
    results.push(await geocodeAddress(addr));
  }
  return results;
}

// Reverse geocoding: lat/lng → địa chỉ
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, {
      headers: { "User-Agent": "SmartRoute-ERP/1.0" }
    });
    const data = await res.json();
    return data?.display_name ?? null;
  } catch {
    return null;
  }
}
