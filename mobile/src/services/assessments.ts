// Assessment data access. The backend is the sole gateway to the defect
// detector; this client forwards the compressed paddy photo with the user's
// session token and translates the {data, error} envelope into friendly errors.
import { File } from 'expo-file-system'
import { supabase } from './supabaseClient'
import type { ApiEnvelope, AssessmentData } from '../types/api'
import type { PreparedImage } from '../utils/image'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL
const ASSESSMENT_PATH = '/api/assessments/image'
// Inference is CPU-bound on the server (roughly 0.5 s locally, more on a small
// instance), so this deadline is deliberately looser than the OCR endpoint's.
const ASSESSMENT_TIMEOUT_MS = 30000
const GENERIC_ERROR = 'The photo could not be assessed. Please try again.'
const SESSION_ERROR = 'Could not check your session. Please try again.'
const TIMEOUT_ERROR = 'The assessment took too long. Check your connection and try again.'

function unreachableError(baseUrl: string): Error {
  return new Error(`Could not reach the server at ${baseUrl}. Check your connection.`)
}

export async function sendAssessmentImage(image: PreparedImage): Promise<AssessmentData> {
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
    throw new Error('Please sign in to assess a photo.')
  }

  const formData = new FormData()
  // Expo's global fetch serializes FormData itself and only supports strings,
  // Blobs, or objects implementing `bytes()`. The legacy React Native
  // `{uri, name, type}` part throws "Unsupported FormDataPart implementation",
  // so the compressed file is wrapped in expo-file-system's File.
  formData.append('file', new File(image.uri))

  const url = `${API_BASE_URL}${ASSESSMENT_PATH}`
  if (__DEV__) {
    console.log(`[assessments] POST ${url}`)
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ASSESSMENT_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(TIMEOUT_ERROR)
    }
    if (__DEV__) {
      console.warn('[assessments] request failed', error)
    }
    throw unreachableError(API_BASE_URL)
  } finally {
    clearTimeout(timeout)
  }
  const body = (await response.json()) as ApiEnvelope<AssessmentData>
  if (!response.ok || body.error) {
    throw new Error(body.error?.message ?? GENERIC_ERROR)
  }
  return body.data
}
