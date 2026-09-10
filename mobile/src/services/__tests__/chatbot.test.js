import { resetSupabaseMock } from '../../test/supabaseMock.js'

jest.mock('../supabaseClient.js', () => {
  const { createSupabaseMock } = jest.requireActual('../../test/supabaseMock.js')
  return { supabase: createSupabaseMock() }
})

import { supabase } from '../supabaseClient.js'
import { sendChatMessage } from '../chatbot.js'

const API_BASE_URL = 'https://api.palaysigla.test'
const MESSAGES = [{ role: 'user', content: 'Hello' }]

function jsonResponse(body, ok = true) {
  return { ok, json: async () => body }
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
    jest.spyOn(global, 'fetch').mockImplementation(fetchMock)

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
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(jest.fn())

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
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'))

    await expect(sendChatMessage(MESSAGES)).rejects.toThrow(
      'Could not reach the assistant. Check your connection.'
    )
  })

  it('uses the backend error envelope message when present', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    })
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse({ data: null, error: { message: 'Rate limited' } }, false))

    await expect(sendChatMessage(MESSAGES)).rejects.toThrow('Rate limited')
  })

  it('falls back to a generic message when the envelope carries no message', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    })
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({}, false))

    await expect(sendChatMessage(MESSAGES)).rejects.toThrow(
      'The assistant returned an error. Please try again.'
    )
  })

  it('treats an error envelope as a failure even when the response is ok', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    })
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse({ data: { reply: 'x' }, error: { message: 'Bad request' } }))

    await expect(sendChatMessage(MESSAGES)).rejects.toThrow('Bad request')
  })

  it('rejects when the API base URL is not configured', async () => {
    process.env.EXPO_PUBLIC_API_URL = ''
    jest.resetModules()
    let freshSend
    jest.isolateModules(() => {
      freshSend = require('../chatbot.js').sendChatMessage
    })

    await expect(freshSend(MESSAGES)).rejects.toThrow(
      'EXPO_PUBLIC_API_URL is not configured. Copy mobile/.env.example to mobile/.env and fill in the value.'
    )
  })
})
