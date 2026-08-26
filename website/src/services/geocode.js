const API_BASE_URL = import.meta.env.VITE_API_URL

async function geocodeRequest(path, params) {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_URL is not configured.')
  }
  const query = new URLSearchParams(params).toString()
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}?${query}`)
  } catch {
    throw new Error('Could not reach the location service. Check your connection.')
  }
  const body = await response.json()
  if (!response.ok || body.error) {
    const message = body?.error?.message ?? 'Location service returned an error.'
    throw new Error(message)
  }
  return body.data
}

export async function searchPlace(query, limit = 5) {
  return geocodeRequest('/api/geocode/search', { q: query, limit })
}

export async function reverseGeocode(lat, lng) {
  return geocodeRequest('/api/geocode/reverse', { lat, lng })
}
