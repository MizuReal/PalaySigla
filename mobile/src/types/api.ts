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
