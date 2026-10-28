// Scan OCR data access. The backend is the sole gateway to the digit model;
// this client forwards the compressed sheet photo with the user's session
// token and translates the {data, error} envelope into friendly errors.
import { File } from 'expo-file-system'
import { supabase } from './supabaseClient'
import type { ApiEnvelope, ScanData } from '../types/api'
import type { PreparedImage } from '../utils/image'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL
const SCAN_PATH = '/api/scan/ocr'
const SCAN_TIMEOUT_MS = 20000
const GENERIC_ERROR = 'The scan could not be processed. Please try again.'
const SESSION_ERROR = 'Could not check your session. Please try again.'
const TIMEOUT_ERROR = 'The scan took too long. Check your connection and try again.'

function unreachableError(baseUrl: string): Error {
  return new Error(`Could not reach the server at ${baseUrl}. Check your connection.`)
}

export async function sendScanImage(image: PreparedImage): Promise<ScanData> {
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
    throw new Error('Please sign in to scan a sheet.')
  }

  const formData = new FormData()
  // Expo's global fetch serializes FormData itself and only supports strings,
  // Blobs, or objects implementing `bytes()`. The legacy React Native
  // `{uri, name, type}` part throws "Unsupported FormDataPart implementation",
  // so the compressed file is wrapped in expo-file-system's File.
  formData.append('file', new File(image.uri))

  const url = `${API_BASE_URL}${SCAN_PATH}`
  if (__DEV__) {
    // Printed in the Expo/Metro terminal so a stale bundled URL is obvious.
    console.log(`[scan] POST ${url}`)
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS)
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
      console.warn('[scan] request failed', error)
    }
    throw unreachableError(API_BASE_URL)
  } finally {
    clearTimeout(timeout)
  }
  const body = (await response.json()) as ApiEnvelope<ScanData>
  if (!response.ok || body.error) {
    throw new Error(body.error?.message ?? GENERIC_ERROR)
  }
  return body.data
}
