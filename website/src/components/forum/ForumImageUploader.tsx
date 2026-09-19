import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon'
import ForumPostImage from './ForumPostImage'
import { FORUM_MAX_IMAGES } from '../../services/forum'
import { compressImage, validateImageFile } from '../../utils/image'
import type { ForumImageRef } from '../../types/domain'

const PHOTO_INPUT_ID = 'forum-post-photo'
const IMAGE_ASPECT_CLASS = 'aspect-[4/3]'
const TILE_BUTTON_CLASSES =
  'absolute right-1 top-1 flex h-11 w-11 items-center justify-center border border-hairline bg-canvas/90 text-ink transition-colors hover:border-primary hover:text-primary'

interface NewImage {
  file: Blob
  url: string
}

interface ForumImageUploaderProps {
  existingImages: ForumImageRef[]
  removedImageIds: readonly string[]
  onToggleExisting: (imageId: string) => void
  onNewFilesChange: (files: Blob[]) => void
  error: string
}

function ForumImageUploader({
  existingImages,
  removedImageIds,
  onToggleExisting,
  onNewFilesChange,
  error,
}: ForumImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [newImages, setNewImages] = useState<NewImage[]>([])
  const newImagesRef = useRef<NewImage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [localError, setLocalError] = useState('')

  // the ref lets the unmount cleanup revoke the latest URLs without
  // re-running the cleanup effect on every selection
  useEffect(() => {
    newImagesRef.current = newImages
  }, [newImages])

  useEffect(() => {
    return () => {
      newImagesRef.current.forEach((image) => URL.revokeObjectURL(image.url))
    }
  }, [])

  const keptExisting = existingImages.filter(
    (image) => !removedImageIds.includes(image.id)
  )
  const removedExisting = existingImages.filter((image) =>
    removedImageIds.includes(image.id)
  )
  const usedSlots = keptExisting.length + newImages.length
  const canAddMore = usedSlots < FORUM_MAX_IMAGES

  const syncNewImages = (images: NewImage[]) => {
    setNewImages(images)
    onNewFilesChange(images.map((image) => image.file))
  }

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return
    }
    const selected = Array.from(fileList)
    const availableSlots = FORUM_MAX_IMAGES - usedSlots
    const accepted = selected.slice(0, Math.max(0, availableSlots))
    const overflowed = selected.length > accepted.length
    if (accepted.length === 0) {
      setLocalError(`You can add up to ${FORUM_MAX_IMAGES} photos.`)
      return
    }
    setIsProcessing(true)
    const added: NewImage[] = []
    let firstError = ''
    for (const file of accepted) {
      const validationError = validateImageFile(file)
      if (validationError) {
        firstError = firstError || validationError
        continue
      }
      try {
        const compressed = await compressImage(file)
        added.push({ file: compressed, url: URL.createObjectURL(compressed) })
      } catch (err) {
        firstError =
          firstError ||
          (err instanceof Error ? err.message : 'Could not process the photo.')
      }
    }
    setIsProcessing(false)
    syncNewImages([...newImages, ...added])
    setLocalError(overflowed ? `You can add up to ${FORUM_MAX_IMAGES} photos.` : firstError)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const removeNewImage = (index: number) => {
    const removed = newImages[index]
    if (removed) {
      URL.revokeObjectURL(removed.url)
    }
    syncNewImages(newImages.filter((_, imageIndex) => imageIndex !== index))
    setLocalError('')
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={PHOTO_INPUT_ID}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {keptExisting.map((image) => (
          <div key={image.id} className="relative">
            <ForumPostImage
              image={image}
              alt="Attached photo"
              aspectClass={IMAGE_ASPECT_CLASS}
            />
            <button
              type="button"
              onClick={() => onToggleExisting(image.id)}
              className={TILE_BUTTON_CLASSES}
            >
              <span className="sr-only">Remove this photo</span>
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        ))}
        {removedExisting.map((image) => (
          <div key={image.id} className="relative">
            <ForumPostImage
              image={image}
              alt="Photo marked for removal"
              aspectClass={IMAGE_ASPECT_CLASS}
              className="opacity-40"
            />
            <button
              type="button"
              onClick={() => onToggleExisting(image.id)}
              className="absolute inset-x-0 bottom-0 flex h-11 items-center justify-center border-t border-hairline bg-canvas/95 button-sm text-primary transition-colors hover:text-primary-dark"
            >
              Undo remove
            </button>
          </div>
        ))}
        {newImages.map((image, index) => (
          <div key={`${image.file.size}-${index}`} className="relative">
            <img
              src={image.url}
              alt={`New photo ${index + 1}`}
              className={`w-full border border-hairline object-cover ${IMAGE_ASPECT_CLASS}`}
            />
            <button
              type="button"
              onClick={() => removeNewImage(index)}
              className={TILE_BUTTON_CLASSES}
            >
              <span className="sr-only">Remove new photo {index + 1}</span>
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        ))}
        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isProcessing}
            className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 border border-dashed border-hairline bg-surface-soft px-3 text-center transition-colors hover:border-primary disabled:text-ash"
          >
            {isProcessing ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-hairline border-t-primary" />
                <span className="caption-sm text-body">Processing…</span>
              </>
            ) : (
              <>
                <Icon name="camera" className="h-5 w-5 text-body" />
                <span className="caption-sm text-body">Add photo</span>
                <span className="caption-sm text-mute">
                  {usedSlots}/{FORUM_MAX_IMAGES}
                </span>
              </>
            )}
          </button>
        )}
      </div>
      <p className="caption-sm mt-2 text-mute">
        Photos are optional — JPEG or PNG, up to 10 MB each, {FORUM_MAX_IMAGES} max.
      </p>
      {(error || localError) && (
        <p className="caption-sm mt-2 text-error" role="alert">
          {error || localError}
        </p>
      )}
    </div>
  )
}

export default ForumImageUploader
