import { afterEach, describe, expect, it, vi } from 'vitest'
import { reverseGeocode, searchPlace } from '../geocode.js'

const API_BASE_URL = 'https://api.palaysigla.test'

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('searchPlace', () => {
  it('calls the search endpoint with the query and limit', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ data: [{ display_name: 'Manila' }] }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(searchPlace('Manila', 3)).resolves.toEqual([{ display_name: 'Manila' }])
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/geocode/search?q=Manila&limit=3`
    )
  })

  it('defaults the limit to 5', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ data: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await searchPlace('Palay')
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/api/geocode/search?q=Palay&limit=5`)
  })
})

describe('reverseGeocode', () => {
  it('calls the reverse endpoint with both coordinates', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ data: { display_name: 'Cebu' } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(reverseGeocode(10.3157, 123.8854)).resolves.toEqual({
      display_name: 'Cebu',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/geocode/reverse?lat=10.3157&lng=123.8854`
    )
  })
})

describe('error handling', () => {
  it('reports network failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      })
    )

    await expect(searchPlace('Manila')).rejects.toThrow(
      'Could not reach the location service. Check your connection.'
    )
  })

  it('uses the backend error envelope message when present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ data: null, error: { message: 'Throttled' } }, false))
    )

    await expect(searchPlace('Manila')).rejects.toThrow('Throttled')
  })

  it('falls back to a generic message when the envelope carries no message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, false)))

    await expect(reverseGeocode(1, 2)).rejects.toThrow('Location service returned an error.')
  })

  it('rejects when the API base URL is not configured', async () => {
    vi.stubEnv('VITE_API_URL', '')
    vi.resetModules()
    const { searchPlace: freshSearch } = await import('../geocode.js')

    await expect(freshSearch('Manila')).rejects.toThrow('VITE_API_URL is not configured.')
  })
})
