export interface ApiError {
  code: string
  message: string
}

export type ApiEnvelope<T> =
  | { data: T; error: null }
  | { data: null; error: ApiError }

export type ChatRole = 'user' | 'assistant'

export interface ChatTurn {
  role: ChatRole
  content: string
}

export interface ChatReply {
  reply: string
}

export type ChatResponse = ApiEnvelope<ChatReply>

export interface GeocodeResult {
  place_id: number
  label: string
  lat: number
  lng: number
  place_type: string | null
}

export type GeocodeSearchResponse = ApiEnvelope<GeocodeResult[]>

export type GeocodeReverseResponse = ApiEnvelope<GeocodeResult>

export interface ScanDigit {
  index: number
  digit: number | null
  confidence: number
  is_blank: boolean
  rect: number[]
}

export interface ScanFieldResult {
  key: string
  label: string
  unit: string
  value: number | null
  needs_review: boolean
  confidence: number
  digits: ScanDigit[]
}

export interface ScanData {
  computed_ratio: number | null
  overall_needs_review: boolean
  fields: ScanFieldResult[]
}

export type ScanResponse = ApiEnvelope<ScanData>
