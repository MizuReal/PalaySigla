/// <reference types="jest" />
import type { GeocodeResult } from '../../types/api'
import { reverseGeocode, searchPlace } from '../geocode'

const API_BASE_URL = 'https://api.palaysigla.test'

const RESULT: GeocodeResult = {
  place_id: 101,
  label: 'Baliuag, Bulacan, Philippines',
  lat: 14.9548,
  lng: 120.8969,
  place_type: 'town',
}

type GeocodeModule = typeof import('../geocode')

// the service only reads ok and json(); a minimal response double is enough
function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as unknown as Response
}

afterEach(() => {
  jest.restoreAllMocks()
  process.env.EXPO_PUBLIC_API_URL = API_BASE_URL
})

describe('searchPlace', () => {
  it('queries the backend proxy and returns the results', async () => {
    const fetchMock = jest.fn(async () => jsonResponse({ data: [RESULT], error: null }))
    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock)

    await expect(searchPlace('Baliuag')).resolves.toEqual([RESULT])

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/geocode/search?q=Baliuag&limit=5`
    )
  })

  it('forwards a custom result limit', async () => {
    const fetchMock = jest.fn(async () => jsonResponse({ data: [], error: null }))
    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock)

    await expect(searchPlace('Baliuag', 3)).resolves.toEqual([])

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/geocode/search?q=Baliuag&limit=3`
    )
  })
})

describe('reverseGeocode', () => {
  it('queries the backend proxy with the coordinates', async () => {
    const fetchMock = jest.fn(async () => jsonResponse({ data: RESULT, error: null }))
    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock)

    await expect(reverseGeocode(14.9548, 120.8969)).resolves.toEqual(RESULT)

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/geocode/reverse?lat=14.9548&lng=120.8969`
    )
  })

  it('reports network failures with a friendly message', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))

    await expect(reverseGeocode(14.9548, 120.8969)).rejects.toThrow(
      'Could not reach the location service. Check your connection.'
    )
  })

  it('uses the backend error envelope message when present', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        jsonResponse(
          { data: null, error: { message: 'No location found for those coordinates.' } },
          false
        )
      )

    await expect(reverseGeocode(0, 0)).rejects.toThrow(
      'No location found for those coordinates.'
    )
  })

  it('falls back to a generic message when the envelope carries no message', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, false))

    await expect(reverseGeocode(14.9548, 120.8969)).rejects.toThrow(
      'Location service returned an error.'
    )
  })

  it('treats an error envelope as a failure even when the response is ok', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        jsonResponse({ data: RESULT, error: { message: 'Rate limited' } })
      )

    await expect(reverseGeocode(14.9548, 120.8969)).rejects.toThrow('Rate limited')
  })

  it('rejects when the API base URL is not configured', async () => {
    process.env.EXPO_PUBLIC_API_URL = ''
    jest.resetModules()
    let freshReverse: GeocodeModule['reverseGeocode'] | undefined
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- isolateModules needs sync CJS
      freshReverse = require('../geocode').reverseGeocode
    })

    // isolateModules' callback ran synchronously, so the assignment above always landed
    await expect((freshReverse as GeocodeModule['reverseGeocode'])(1, 2)).rejects.toThrow(
      'EXPO_PUBLIC_API_URL is not configured. Copy mobile/.env.example to mobile/.env and fill in the value.'
    )
  })
})
