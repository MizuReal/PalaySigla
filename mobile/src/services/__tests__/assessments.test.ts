/// <reference types="jest" />
import { resetSupabaseMock } from '../../test/supabaseMock'

jest.mock('../supabaseClient', () => {
  const { createSupabaseMock } = jest.requireActual<typeof import('../../test/supabaseMock')>(
    '../../test/supabaseMock'
  )
  return { supabase: createSupabaseMock() }
})

jest.mock('expo-file-system', () => ({
  File: class MockFile {
    uri: string
    name = 'paddy.jpg'
    type = 'image/jpeg'

    constructor(uri: string) {
      this.uri = uri
    }
  },
}))

import type { AssessmentData } from '../../types/api'
import type { SupabaseMock } from '../../test/supabaseMock'
import { supabase as supabaseClient } from '../supabaseClient'
import { sendAssessmentImage } from '../assessments'
import type { PreparedImage } from '../../utils/image'

const supabase = supabaseClient as unknown as SupabaseMock

const API_BASE_URL = 'https://api.palaysigla.test'
const IMAGE: PreparedImage = {
  uri: 'file:///cache/paddy.jpg',
  width: 2048,
  height: 1536,
  base64: 'ZmFrZQ==',
}
const ASSESSMENT_DATA: AssessmentData = {
  available_outputs: ['mold', 'quality_status'],
  unavailable_outputs: ['market_grade', 'variety'],
  detections: [],
  counts: { mold_discoloration: 0 },
  defect_rate: 0,
  severity: 'none',
  severity_bands: { none_max: 0.0025, low_max: 0.01, moderate_max: 0.03 },
  quality_status: 'premium',
  needs_review: false,
  review_confidence_threshold: 0.55,
  inference_ms: 640,
  imgsz: 1280,
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

describe('sendAssessmentImage', () => {
  it('posts multipart form data to the assessment endpoint with the bearer token', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-1' } },
    })
    const fetchMock = jest.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        jsonResponse({ data: ASSESSMENT_DATA, error: null })
    )
    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock)
    const appendSpy = jest.spyOn(FormData.prototype, 'append')

    await expect(sendAssessmentImage(IMAGE)).resolves.toEqual(ASSESSMENT_DATA)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${API_BASE_URL}/api/assessments/image`)
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({ Authorization: 'Bearer token-1' })
    expect(init?.body).toBeInstanceOf(FormData)
    expect(appendSpy).toHaveBeenCalledTimes(1)
    const [partName, part] = appendSpy.mock.calls[0]
    expect(partName).toBe('file')
    expect(part).toMatchObject({ uri: IMAGE.uri, name: 'paddy.jpg', type: 'image/jpeg' })
  })

  it('requires a signed-in session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(jest.fn())

    await expect(sendAssessmentImage(IMAGE)).rejects.toThrow('Please sign in to assess a photo.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports a session lookup failure', async () => {
    supabase.auth.getSession.mockRejectedValue(new Error('offline'))

    await expect(sendAssessmentImage(IMAGE)).rejects.toThrow(
      'Could not check your session. Please try again.'
    )
  })

  it('reports network failures with the target host', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-1' } },
    })
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))

    await expect(sendAssessmentImage(IMAGE)).rejects.toThrow(
      `Could not reach the server at ${API_BASE_URL}. Check your connection.`
    )
  })

  it('reports an aborted request as a timeout', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-1' } },
    })
    const abortError = new Error('Aborted')
    abortError.name = 'AbortError'
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(abortError)

    await expect(sendAssessmentImage(IMAGE)).rejects.toThrow(
      'The assessment took too long. Check your connection and try again.'
    )
  })

  it('uses the backend envelope message on failure', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-1' } },
    })
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        jsonResponse({ data: null, error: { code: 'BAD_REQUEST', message: 'No photo' } }, false)
      )

    await expect(sendAssessmentImage(IMAGE)).rejects.toThrow('No photo')
  })

  it('falls back to a generic message when the envelope carries none', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-1' } },
    })
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, false))

    await expect(sendAssessmentImage(IMAGE)).rejects.toThrow(
      'The photo could not be assessed. Please try again.'
    )
  })
})
