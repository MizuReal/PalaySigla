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

export type AssessmentSeverity = 'none' | 'low' | 'moderate' | 'high'
export type AssessmentQuality = 'premium' | 'good' | 'fair' | 'poor'

/** Coverage cutoffs behind severity, served by the backend so clients never guess. */
export interface SeverityBands {
  none_max: number
  low_max: number
  moderate_max: number
}

export interface DefectDetection {
  class_key: string
  label: string
  confidence: number
  /** Normalized [x, y, w, h] in the original photo. */
  box: [number, number, number, number]
  area_ratio: number
  needs_review: boolean
}

export interface AssessmentData {
  available_outputs: string[]
  unavailable_outputs: string[]
  detections: DefectDetection[]
  counts: Record<string, number>
  defect_rate: number
  severity: AssessmentSeverity
  severity_bands: SeverityBands
  quality_status: AssessmentQuality
  needs_review: boolean
  review_confidence_threshold: number
  inference_ms: number
  imgsz: number
}

export type AssessmentResponse = ApiEnvelope<AssessmentData>
