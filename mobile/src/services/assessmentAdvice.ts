// Assessment advice data access. The backend is the sole gateway to the model;
// this client forwards the scan measurements and conversation with the user's
// session token, then translates the {data, error} envelope into friendly errors.
import { supabase } from './supabaseClient'
import type { ApiEnvelope, AssessmentAdviceReply, AssessmentAdviceRequest } from '../types/api'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL
const ADVICE_PATH = '/api/assessments/advice'
// The advice call waits on a metered LLM, so the deadline matches the chat's
// server-side timeout plus room for a slow mobile connection.
const ADVICE_TIMEOUT_MS = 30000
const GENERIC_ERROR = 'The analysis could not be completed. Please try again.'
const SESSION_ERROR = 'Could not check your session. Please try again.'
const TIMEOUT_ERROR = 'The analysis took too long. Check your connection and try again.'
const CANCELLED_ERROR = 'The analysis request was cancelled.'

function unreachableError(baseUrl: string): Error {
  return new Error(`Could not reach the server at ${baseUrl}. Check your connection.`)
}

export async function sendAssessmentAdvice(
  payload: AssessmentAdviceRequest,
  signal?: AbortSignal
): Promise<AssessmentAdviceReply> {
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
    throw new Error(SESSION_ERROR)
  }
  if (!token) {
    throw new Error('Please sign in to use the analysis.')
  }
  if (signal?.aborted) {
    throw new Error(CANCELLED_ERROR)
  }

  const controller = new AbortController()
  let timedOut = false
  const abortFromCaller = () => controller.abort()
  signal?.addEventListener('abort', abortFromCaller)
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, ADVICE_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${ADVICE_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch {
    if (signal?.aborted) {
      throw new Error(CANCELLED_ERROR)
    }
    if (timedOut) {
      throw new Error(TIMEOUT_ERROR)
    }
    throw unreachableError(API_BASE_URL)
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abortFromCaller)
  }

  const body = (await response.json()) as ApiEnvelope<AssessmentAdviceReply>
  if (!response.ok || body.error) {
    throw new Error(body.error?.message ?? GENERIC_ERROR)
  }
  return body.data
}
