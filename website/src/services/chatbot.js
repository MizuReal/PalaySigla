import { supabase } from './supabaseClient.js'

const API_BASE_URL = import.meta.env.VITE_API_URL

export async function sendChatMessage(messages) {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_URL is not configured.')
  }
  let token
  try {
    const { data } = await supabase.auth.getSession()
    token = data.session?.access_token ?? null
  } catch {
    throw new Error('Could not check your session. Please try again.')
  }
  if (!token) {
    throw new Error('Please sign in to use the assistant.')
  }

  let response
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
  const body = await response.json()
  if (!response.ok || body.error) {
    const message = body?.error?.message ?? 'The assistant returned an error. Please try again.'
    throw new Error(message)
  }
  return body.data
}
