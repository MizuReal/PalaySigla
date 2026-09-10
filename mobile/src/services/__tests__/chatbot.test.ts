/// <reference types="jest" />
import { resetSupabaseMock } from '../../test/supabaseMock'

jest.mock('../supabaseClient', () => {
  const { createSupabaseMock } = jest.requireActual<typeof import('../../test/supabaseMock')>(
    '../../test/supabaseMock'
  )
  return { supabase: createSupabaseMock() }
})

import type { ChatTurn } from '../../types/api'
import type { SupabaseMock } from '../../test/supabaseMock'
import { supabase as supabaseClient } from '../supabaseClient'
import { sendChatMessage } from '../chatbot'

// jest.mock swaps in a mock instance; the real SupabaseClient type exposes no mock helpers
const supabase = supabaseClient as unknown as SupabaseMock

const API_BASE_URL = 'https://api.palaysigla.test'
const MESSAGES: ChatTurn[] = [{ role: 'user', content: 'Hello' }]

type SendChatMessage = typeof import('../chatbot')['sendChatMessage']

// the service only reads ok and json(); a minimal response double is enough
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

describe('sendChatMessage', () => {
  it('posts the conversation with the session bearer token and returns data', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    })
    const fetchMock = jest.fn(async () => jsonResponse({ data: { reply: 'Hello!' }, error: null }))
    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock)

    await expect(sendChatMessage(MESSAGES)).resolves.toEqual({ reply: 'Hello!' })

    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-123',
      },
      body: JSON.stringify({ messages: MESSAGES }),
    })
  })

  it('requires a signed-in session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(jest.fn())

    await expect(sendChatMessage(MESSAGES)).rejects.toThrow(
      'Please sign in to use the assistant.'
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports a session lookup failure', async () => {
    supabase.auth.getSession.mockRejectedValue(new Error('offline'))

    await expect(sendChatMessage(MESSAGES)).rejects.toThrow(
      'Could not check your session. Please try again.'
    )
  })

  it('reports network failures', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    })
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))

    await expect(sendChatMessage(MESSAGES)).rejects.toThrow(
      'Could not reach the assistant. Check your connection.'
    )
  })

  it('uses the backend error envelope message when present', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    })
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: null, error: { message: 'Rate limited' } }, false))

    await expect(sendChatMessage(MESSAGES)).rejects.toThrow('Rate limited')
  })

  it('falls back to a generic message when the envelope carries no message', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    })
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, false))

    await expect(sendChatMessage(MESSAGES)).rejects.toThrow(
      'The assistant returned an error. Please try again.'
    )
  })

  it('treats an error envelope as a failure even when the response is ok', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    })
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: { reply: 'x' }, error: { message: 'Bad request' } }))

    await expect(sendChatMessage(MESSAGES)).rejects.toThrow('Bad request')
  })

  it('rejects when the API base URL is not configured', async () => {
    process.env.EXPO_PUBLIC_API_URL = ''
    jest.resetModules()
    let freshSend: SendChatMessage | undefined
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- isolateModules needs sync CJS
      freshSend = require('../chatbot').sendChatMessage
    })

    // isolateModules' callback ran synchronously, so the assignment above always landed
    await expect((freshSend as SendChatMessage)(MESSAGES)).rejects.toThrow(
      'EXPO_PUBLIC_API_URL is not configured. Copy mobile/.env.example to mobile/.env and fill in the value.'
    )
  })
})
