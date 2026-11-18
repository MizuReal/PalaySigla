/// <reference types="jest" />
import { resetSupabaseMock } from '../../test/supabaseMock'

jest.mock('../supabaseClient', () => {
  const { createSupabaseMock } = jest.requireActual<typeof import('../../test/supabaseMock')>(
    '../../test/supabaseMock'
  )
  return { supabase: createSupabaseMock() }
})

import type { AssessmentAdviceRequest } from '../../types/api'
import type { SupabaseMock } from '../../test/supabaseMock'
import { supabase as supabaseClient } from '../supabaseClient'
import { sendAssessmentAdvice } from '../assessmentAdvice'

const supabase = supabaseClient as unknown as SupabaseMock

const API_BASE_URL = 'https://api.palaysigla.test'
const PAYLOAD: AssessmentAdviceRequest = {
  assessment: {
    defect_rate: 0.005,
    counts: { mold_discoloration: 2 },
    highest_confidence: 0.82,
    lowest_confidence: 0.64,
  },
  messages: [{ role: 'user', content: 'Bakit?' }],
  language: 'english',
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

describe('sendAssessmentAdvice', () => {
  it('posts the scan context, conversation and language with the session token', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    })
    const fetchMock = jest.fn(async () =>
      jsonResponse({ data: { reply: 'Tuyuin ang palay.' }, error: null })
    )
    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock)

    await expect(sendAssessmentAdvice(PAYLOAD)).resolves.toEqual({
      reply: 'Tuyuin ang palay.',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/assessments/advice`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
        },
        body: JSON.stringify(PAYLOAD),
        signal: expect.any(AbortSignal),
      })
    )
  })

  it('requires a signed-in session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(jest.fn())

    await expect(sendAssessmentAdvice(PAYLOAD)).rejects.toThrow(
      'Please sign in to use the analysis.'
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports a session lookup failure', async () => {
    supabase.auth.getSession.mockRejectedValue(new Error('offline'))

    await expect(sendAssessmentAdvice(PAYLOAD)).rejects.toThrow(
      'Could not check your session. Please try again.'
    )
  })

  it('reports network failures', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    })
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))

    await expect(sendAssessmentAdvice(PAYLOAD)).rejects.toThrow(
      'Could not reach the server at https://api.palaysigla.test. Check your connection.'
    )
  })

  it('uses the backend error envelope message when present', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    })
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        jsonResponse({ data: null, error: { code: 'RATE_LIMITED', message: 'Slow down' } }, false)
      )

    await expect(sendAssessmentAdvice(PAYLOAD)).rejects.toThrow('Slow down')
  })

  it('falls back to a generic message when the envelope carries no message', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    })
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, false))

    await expect(sendAssessmentAdvice(PAYLOAD)).rejects.toThrow(
      'The analysis could not be completed. Please try again.'
    )
  })

  it('rejects when the API base URL is not configured', async () => {
    process.env.EXPO_PUBLIC_API_URL = ''
    jest.resetModules()
    let freshSend: typeof import('../assessmentAdvice')['sendAssessmentAdvice'] | undefined
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- isolateModules needs sync CJS
      freshSend = require('../assessmentAdvice').sendAssessmentAdvice
    })

    await expect(
      (freshSend as typeof import('../assessmentAdvice')['sendAssessmentAdvice'])(PAYLOAD)
    ).rejects.toThrow(
      'EXPO_PUBLIC_API_URL is not configured. Copy mobile/.env.example to mobile/.env and fill in the value.'
    )
  })
})
