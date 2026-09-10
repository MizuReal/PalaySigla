// Assistant chat data access — direct port of website/src/services/chatbot.ts.
// The backend is the sole gateway to the model; this client only forwards the
// conversation with the user's session token and translates the backend's
// {data, error} envelope into friendly thrown errors.
import { supabase } from './supabaseClient'
import type { ApiEnvelope, ChatReply, ChatTurn } from '../types/api'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL

export async function sendChatMessage(messages: ChatTurn[]): Promise<ChatReply> {
  if (!API_BASE_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is not configured. Copy mobile/.env.example to mobile/.env and fill in the value.'
    )
  }
  let token: string | null
  try {
    const { data } = await supabase.auth.getSession()
    token = data.session?.access_token ?? null
  } catch {
    throw new Error('Could not check your session. Please try again.')
  }
  if (!token) {
    throw new Error('Please sign in to use the assistant.')
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages }),
    })
  } catch {
    throw new Error('Could not reach the assistant. Check your connection.')
  }
  const body = (await response.json()) as ApiEnvelope<ChatReply>
  if (!response.ok || body.error) {
    const message = body.error?.message ?? 'The assistant returned an error. Please try again.'
    throw new Error(message)
  }
  return body.data
}
