/// <reference types="jest" />
import { resetSupabaseMock } from '../../test/supabaseMock'

jest.mock('../supabaseClient', () => {
  const { createSupabaseMock } = jest.requireActual<typeof import('../../test/supabaseMock')>(
    '../../test/supabaseMock'
  )
  return { supabase: createSupabaseMock() }
})

import type { ScanData } from '../../types/api'
import type { SupabaseMock } from '../../test/supabaseMock'
import { supabase as supabaseClient } from '../supabaseClient'
import { sendScanImage } from '../scan'
import type { PreparedImage } from '../../utils/image'

const supabase = supabaseClient as unknown as SupabaseMock

const API_BASE_URL = 'https://api.palaysigla.test'
const IMAGE: PreparedImage = {
  uri: 'file:///cache/scan.jpg',
  width: 2400,
  height: 1800,
  base64: 'ZmFrZQ==',
}
const SCAN_DATA: ScanData = {
  computed_ratio: 3.05,
  overall_needs_review: false,
  fields: [],
}

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as unknown as Response
}

beforeEach(() => {
  resetSupabaseMock(supabase)
})

afterEach(() => {
  jest.restoreAllMocks()
  process.env.EXPO_PUBLIC_API_URL = API_BASE_URL
})

describe('sendScanImage', () => {
  it('posts multipart form data with the session bearer token', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-1' } },
    })
    const fetchMock = jest.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        jsonResponse({ data: SCAN_DATA, error: null })
    )
    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock)
    const appendSpy = jest.spyOn(FormData.prototype, 'append')

    await expect(sendScanImage(IMAGE)).resolves.toEqual(SCAN_DATA)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${API_BASE_URL}/api/scan/ocr`)
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({ Authorization: 'Bearer token-1' })
    expect(init?.body).toBeInstanceOf(FormData)
    expect(appendSpy).toHaveBeenCalledWith(
      'file',
      expect.objectContaining({ uri: IMAGE.uri, name: 'scan.jpg', type: 'image/jpeg' })
    )
  })

  it('requires a signed-in session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(jest.fn())

    await expect(sendScanImage(IMAGE)).rejects.toThrow('Please sign in to scan a sheet.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports a session lookup failure', async () => {
    supabase.auth.getSession.mockRejectedValue(new Error('offline'))

    await expect(sendScanImage(IMAGE)).rejects.toThrow(
      'Could not check your session. Please try again.'
    )
  })

  it('reports network failures', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-1' } },
    })
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))

    await expect(sendScanImage(IMAGE)).rejects.toThrow(
      'Could not reach the server. Check your connection.'
    )
  })

  it('uses the backend envelope message on failure', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-1' } },
    })
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        jsonResponse({ data: null, error: { code: 'VALIDATION_ERROR', message: 'No sheet' } }, false)
      )

    await expect(sendScanImage(IMAGE)).rejects.toThrow('No sheet')
  })

  it('falls back to a generic message when the envelope carries none', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-1' } },
    })
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, false))

    await expect(sendScanImage(IMAGE)).rejects.toThrow(
      'The scan could not be processed. Please try again.'
    )
  })
})
