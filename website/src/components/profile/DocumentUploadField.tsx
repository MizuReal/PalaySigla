import { useRef, useState } from 'react'
import Icon from '../Icon'
import {
  MAX_DOCUMENT_DIMENSION,
  compressImage,
  validateImageFile,
} from '../../utils/image'

const ACCEPTED_DOCUMENT_TYPES = 'image/jpeg,image/png'

interface DocumentUploadFieldProps {
  id: string
  label: string
  hint?: string
  fileName?: string
  disabled?: boolean
  error?: string
  onPick: (blob: Blob, fileName: string) => void
  onClear?: () => void
}

// Every verification document is a photo of the physical paper; the field
// validates and re-encodes it exactly like the avatar uploader so EXIF/GPS is
// stripped before the file reaches storage.
function DocumentUploadField({
  id,
  label,
  hint,
  fileName = '',
  disabled = false,
  error = '',
  onPick,
  onClear,
}: DocumentUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [localError, setLocalError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFile = async (file: File) => {
    const validationError = validateImageFile(file)
    if (validationError) {
      setLocalError(validationError)
      return
    }
    setIsProcessing(true)
    setLocalError('')
    try {
      const compressed = await compressImage(file, MAX_DOCUMENT_DIMENSION)
      onPick(compressed, file.name)
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Could not process the document.'
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const feedback = error || localError

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="caption-md text-ink">
        {label}
      </label>
      <div className="mt-2 border border-dashed border-hairline bg-surface-soft p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || isProcessing}
            className="inline-flex h-11 items-center gap-2 border border-hairline bg-canvas px-4 button-sm text-ink transition-colors hover:border-primary hover:text-primary disabled:text-ash"
          >
            <Icon name="camera" className="h-4 w-4" />
            {isProcessing ? 'Processing\u2026' : fileName ? 'Replace file' : 'Choose file'}
          </button>
          {fileName ? (
            <span className="body-sm min-w-0 flex-1 truncate text-ink">{fileName}</span>
          ) : (
            <span className="caption-sm text-mute">JPEG or PNG, up to 10 MB</span>
          )}
          {fileName && onClear && !disabled ? (
            <button
              type="button"
              onClick={onClear}
              className="caption-sm text-error transition-opacity hover:opacity-80"
            >
              Remove file
            </button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={ACCEPTED_DOCUMENT_TYPES}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) {
              void handleFile(file)
            }
          }}
        />
      </div>
      {feedback ? (
        <p className="caption-sm mt-2 text-error" role="alert">
          {feedback}
        </p>
      ) : hint ? (
        <p className="caption-sm mt-2 text-mute">{hint}</p>
      ) : null}
    </div>
  )
}

export default DocumentUploadField
