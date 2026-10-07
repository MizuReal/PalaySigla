// Scan OCR data access. The backend is the sole gateway to the digit model;
// this client forwards the compressed sheet photo with the user's session
// token and translates the {data, error} envelope into friendly errors.
import { supabase } from './supabaseClient'
import type { ApiEnvelope, ScanData } from '../types/api'
import type { PreparedImage } from '../utils/image'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL
const SCAN_FILENAME = 'scan.jpg'
const SCAN_MIME_TYPE = 'image/jpeg'
const GENERIC_ERROR = 'The scan could not be processed. Please try again.'

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
    throw new Error('Could not check your session. Please try again.')
  }
  if (!token) {
    throw new Error('Please sign in to scan a sheet.')
  }

  const formData = new FormData()
  // React Native's FormData accepts {uri, name, type} file objects at runtime,
  // but the DOM typings only describe Blob/string values.
  const filePart = {
    uri: image.uri,
    name: SCAN_FILENAME,
    type: SCAN_MIME_TYPE,
  } as unknown as Blob
  formData.append('file', filePart)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/scan/ocr`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
  } catch {
    throw new Error('Could not reach the server. Check your connection.')
  }
  const body = (await response.json()) as ApiEnvelope<ScanData>
  if (!response.ok || body.error) {
    throw new Error(body.error?.message ?? GENERIC_ERROR)
  }
  return body.data
}
