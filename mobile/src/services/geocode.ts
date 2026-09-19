// Geocoding data access — direct port of website/src/services/geocode.ts.
// Nominatim is never called from the app: the backend proxies, throttles, and
// caches it (AGENTS.md external-API rule), and this client only forwards the
// query and translates the backend's {data, error} envelope into friendly
// thrown errors. The endpoints are public and IP rate-limited, so no session
// token is attached.
import type { ApiEnvelope, GeocodeResult } from '../types/api'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL

async function geocodeRequest<T>(
  path: string,
  params: Record<string, string | number>
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is not configured. Copy mobile/.env.example to mobile/.env and fill in the value.'
    )
  }
  const query = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)])
  ).toString()
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}?${query}`)
  } catch {
    throw new Error('Could not reach the location service. Check your connection.')
  }
  const body = (await response.json()) as ApiEnvelope<T>
  if (!response.ok || body.error) {
    const message = body.error?.message ?? 'Location service returned an error.'
    throw new Error(message)
  }
  return body.data
}

export async function searchPlace(query: string, limit = 5): Promise<GeocodeResult[]> {
  return geocodeRequest<GeocodeResult[]>('/api/geocode/search', { q: query, limit })
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  return geocodeRequest<GeocodeResult>('/api/geocode/reverse', { lat, lng })
}
