import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetSupabaseMock } from '../../test/supabaseMock.js'
import type { SupabaseMock } from '../../test/supabaseMock.js'
import type { ChatTurn } from '../../types/api.js'

vi.mock('../supabaseClient.js', async () => {
  const { createSupabaseMock } = await import('../../test/supabaseMock.js')
  return { supabase: createSupabaseMock() }
})

import { supabase as supabaseClient } from '../supabaseClient.js'
import { sendChatMessage } from '../chatbot.js'

// vi.mock swaps in a mock instance; the real SupabaseClient type exposes no mock helpers
const supabase = supabaseClient as unknown as SupabaseMock

const API_BASE_URL = 'https://api.palaysigla.test'
const MESSAGES: ChatTurn[] = [{ role: 'user', content: 'Hello' }]

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body }
}

beforeEach(() => {
  resetSupabaseMock(supabase)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('sendChatMessage', () => {
  it('posts the conversation with the session bearer token and returns data', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    })
    const fetchMock = vi.fn(async () => jsonResponse({ data: { reply: 'Hello!' }, error: null }))
    vi.stubGlobal('fetch', fetchMock)

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
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

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
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      })
    )

    await expect(sendChatMessage(MESSAGES)).rejects.toThrow(
      'Could not reach the assistant. Check your connection.'
    )
  })

  it('uses the backend error envelope message when present', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ data: null, error: { message: 'Rate limited' } }, false))
    )

    await expect(sendChatMessage(MESSAGES)).rejects.toThrow('Rate limited')
  })

  it('falls back to a generic message when the envelope carries no message', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    })
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, false)))

    await expect(sendChatMessage(MESSAGES)).rejects.toThrow(
      'The assistant returned an error. Please try again.'
    )
  })

  it('treats an error envelope as a failure even when the response is ok', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ data: { reply: 'x' }, error: { message: 'Bad request' } }))
    )

    await expect(sendChatMessage(MESSAGES)).rejects.toThrow('Bad request')
  })

  it('rejects when the API base URL is not configured', async () => {
    vi.stubEnv('VITE_API_URL', '')
    vi.resetModules()
    const { sendChatMessage: freshSend } = await import('../chatbot.js')

    await expect(freshSend(MESSAGES)).rejects.toThrow('VITE_API_URL is not configured.')
  })
})
