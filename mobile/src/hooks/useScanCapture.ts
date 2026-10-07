// Scan capture state machine: pick an image, upload it for OCR, expose an
// editable review model. Editing dimensions re-derives the length/width ratio
// and re-flags the ratio cell when it drifts past tolerance.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useImagePicker from './useImagePicker'
import { sendScanImage } from '../services/scan'
import { MAX_SCAN_DIMENSION, SCAN_JPEG_QUALITY } from '../utils/image'
import type { PreparedImage } from '../utils/image'
import type { ScanFieldResult } from '../types/api'

const GRAIN_LENGTH_KEY = 'grain_length'
const GRAIN_WIDTH_KEY = 'grain_width'
const RATIO_KEY = 'length_width_ratio'
const RATIO_MISMATCH_TOLERANCE = 0.05
const RATIO_DECIMALS = 4
const SCAN_FAILED_MESSAGE = 'The scan could not be processed. Please try again.'

export type ScanStatus = 'idle' | 'uploading' | 'review' | 'error'

export interface UseScanCaptureResult {
  image: PreparedImage | null
  status: ScanStatus
  fields: ScanFieldResult[]
  computedRatio: number | null
  overallNeedsReview: boolean
  error: string
  isProcessing: boolean
  canOpenSettings: boolean
  takePhoto: () => Promise<void>
  pickFromLibrary: () => Promise<void>
  retry: () => Promise<void>
  reset: () => void
  updateFieldValue: (key: string, value: number | null) => void
  openSettings: () => Promise<void>
}

function applyFieldEdit(
  fields: ScanFieldResult[],
  key: string,
  value: number | null
): ScanFieldResult[] {
  const edited = fields.map((field) =>
    field.key === key ? { ...field, value, needs_review: false } : field
  )
  const length = edited.find((field) => field.key === GRAIN_LENGTH_KEY)?.value ?? null
  const width = edited.find((field) => field.key === GRAIN_WIDTH_KEY)?.value ?? null
  const computed = length !== null && width !== null && width > 0 ? length / width : null
  return edited.map((field) => {
    if (field.key !== RATIO_KEY) {
      return field
    }
    const mismatched =
      computed !== null &&
      field.value !== null &&
      Math.abs(field.value - computed) > RATIO_MISMATCH_TOLERANCE
    return mismatched ? { ...field, needs_review: true } : field
  })
}

function useScanCapture(): UseScanCaptureResult {
  const {
    image,
    isProcessing,
    error: pickerError,
    canOpenSettings,
    takePhoto,
    pickFromLibrary,
    removeImage,
    openSettings,
  } = useImagePicker(MAX_SCAN_DIMENSION, SCAN_JPEG_QUALITY)
  const [status, setStatus] = useState<ScanStatus>('idle')
  const [fields, setFields] = useState<ScanFieldResult[]>([])
  const [uploadError, setUploadError] = useState('')
  const uploadedUri = useRef<string | null>(null)

  const upload = useCallback(async (prepared: PreparedImage) => {
    setStatus('uploading')
    setUploadError('')
    try {
      const data = await sendScanImage(prepared)
      setFields(data.fields)
      setStatus('review')
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : SCAN_FAILED_MESSAGE)
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (!image || image.uri === uploadedUri.current) {
      return
    }
    uploadedUri.current = image.uri
    void upload(image)
  }, [image, upload])

  const retry = useCallback(async () => {
    if (!image) {
      return
    }
    uploadedUri.current = image.uri
    await upload(image)
  }, [image, upload])

  const reset = useCallback(() => {
    removeImage()
    uploadedUri.current = null
    setFields([])
    setUploadError('')
    setStatus('idle')
  }, [removeImage])

  const updateFieldValue = useCallback((key: string, value: number | null) => {
    setFields((previous) => applyFieldEdit(previous, key, value))
  }, [])

  const computedRatio = useMemo(() => {
    const length = fields.find((field) => field.key === GRAIN_LENGTH_KEY)?.value ?? null
    const width = fields.find((field) => field.key === GRAIN_WIDTH_KEY)?.value ?? null
    if (length === null || width === null || width <= 0) {
      return null
    }
    return Number((length / width).toFixed(RATIO_DECIMALS))
  }, [fields])

  const overallNeedsReview = useMemo(
    () => fields.some((field) => field.needs_review),
    [fields]
  )

  return {
    image,
    status,
    fields,
    computedRatio,
    overallNeedsReview,
    error: uploadError || pickerError,
    isProcessing,
    canOpenSettings,
    takePhoto,
    pickFromLibrary,
    retry,
    reset,
    updateFieldValue,
    openSettings,
  }
}

export default useScanCapture
