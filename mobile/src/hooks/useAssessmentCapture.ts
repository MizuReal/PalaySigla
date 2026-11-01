// Grain assessment state machine: acquire a photo, send it to the backend
// detector, and expose the result for review. Mirrors the sheet-scan hook so
// both flows share one acquisition and retry contract.
import { useCallback, useEffect, useRef, useState } from 'react'
import useImagePicker from './useImagePicker'
import { sendAssessmentImage } from '../services/assessments'
import { ASSESSMENT_JPEG_QUALITY, MAX_ASSESSMENT_DIMENSION } from '../utils/image'
import type { PreparedImage } from '../utils/image'
import type { AssessmentData } from '../types/api'

const ASSESSMENT_FAILED_MESSAGE = 'The photo could not be assessed. Please try again.'

export type AssessmentStatus = 'idle' | 'uploading' | 'result' | 'error'

export interface UseAssessmentCaptureResult {
  image: PreparedImage | null
  status: AssessmentStatus
  result: AssessmentData | null
  error: string
  isProcessing: boolean
  canOpenSettings: boolean
  takePhoto: () => Promise<void>
  pickFromLibrary: () => Promise<void>
  retry: () => Promise<void>
  reset: () => void
  openSettings: () => Promise<void>
}

function useAssessmentCapture(): UseAssessmentCaptureResult {
  const {
    image,
    isProcessing,
    error: pickerError,
    canOpenSettings,
    takePhoto,
    pickFromLibrary,
    removeImage,
    openSettings,
  } = useImagePicker(MAX_ASSESSMENT_DIMENSION, ASSESSMENT_JPEG_QUALITY)
  const [status, setStatus] = useState<AssessmentStatus>('idle')
  const [result, setResult] = useState<AssessmentData | null>(null)
  const [uploadError, setUploadError] = useState('')
  const uploadedUri = useRef<string | null>(null)

  const upload = useCallback(async (prepared: PreparedImage) => {
    setStatus('uploading')
    setUploadError('')
    try {
      const data = await sendAssessmentImage(prepared)
      setResult(data)
      setStatus('result')
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : ASSESSMENT_FAILED_MESSAGE)
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
    setResult(null)
    setUploadError('')
    setStatus('idle')
  }, [removeImage])

  return {
    image,
    status,
    result,
    error: uploadError || pickerError,
    isProcessing,
    canOpenSettings,
    takePhoto,
    pickFromLibrary,
    retry,
    reset,
    openSettings,
  }
}

export default useAssessmentCapture
