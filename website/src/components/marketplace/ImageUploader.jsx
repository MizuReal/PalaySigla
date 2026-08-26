import { useRef, useState } from 'react'
import Icon from '../Icon.jsx'
import { compressImage, validateImageFile } from '../../utils/image.js'

function ImageUploader({ onFileChange, error }) {
  const inputRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFile = async (file) => {
    if (!file) {
      return
    }
    const validationError = validateImageFile(file)
    if (validationError) {
      onFileChange({ error: validationError })
      return
    }
    setIsProcessing(true)
    try {
      const compressed = await compressImage(file)
      onFileChange({ file: compressed, error: '' })
      setPreviewUrl(URL.createObjectURL(compressed))
    } catch (err) {
      onFileChange({ error: err.message })
    } finally {
      setIsProcessing(false)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const handleRemove = () => {
    onFileChange({ file: null, error: '' })
    setPreviewUrl('')
  }

  return (
    <div>
      <input
        ref={inputRef}
        id="listing-photo"
        type="file"
        accept="image/jpeg,image/png"
        className="sr-only"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      {previewUrl ? (
        <div className="border border-hairline bg-canvas p-4">
          <img
            src={previewUrl}
            alt="Listing preview"
            className="aspect-[4/3] w-full border border-hairline object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="body-sm mt-3 text-error transition-colors hover:opacity-80"
          >
            Remove photo
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isProcessing}
          className="flex h-44 w-full flex-col items-center justify-center gap-2 border border-dashed border-hairline bg-surface-soft px-6 text-center transition-colors hover:border-primary disabled:text-ash"
        >
          {isProcessing ? (
            <>
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-hairline border-t-primary" />
              <span className="body-sm text-body">Processing photo…</span>
            </>
          ) : (
            <>
              <Icon name="camera" className="h-6 w-6 text-body" />
              <span className="body-sm text-body">
                Add a photo — JPEG or PNG, up to 10 MB
              </span>
              <span className="caption-sm text-mute">
                Tap to browse; a clear close-up works best
              </span>
            </>
          )}
        </button>
      )}
      {error && (
        <p className="caption-sm mt-2 text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export default ImageUploader
