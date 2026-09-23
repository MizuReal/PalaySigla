// Multi-photo picker for the forum editor: selects up to the remaining slots
// from the library, validates + compresses each asset through the shared image
// pipeline, and tracks staged new images and the existing photos the author
// chose to remove. Library picks need no runtime permission on SDK 57 pickers.
import { useCallback, useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { FORUM_MAX_IMAGES } from '../services/forum'
import { compressImage, validateImageAsset } from '../utils/image'
import type { PreparedImage } from '../utils/image'
import type { ForumImageRef } from '../types/domain'

const PICKER_FAILED_MESSAGE = 'Could not open the photo picker. Please try again.'
const PROCESS_FAILED_MESSAGE = 'Could not process the photo.'
const LIMIT_MESSAGE = `You can add up to ${FORUM_MAX_IMAGES} photos.`

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
  allowsEditing: false,
  allowsMultipleSelection: true,
  preferredAssetRepresentationMode:
    ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
}

export interface UseForumImagePickerResult {
  newImages: PreparedImage[]
  removedImageIds: string[]
  isProcessing: boolean
  error: string
  remainingSlots: number
  addFromLibrary: () => Promise<void>
  removeNewImage: (index: number) => void
  toggleExisting: (imageId: string) => void
  reset: () => void
}

function useForumImagePicker(
  existingImages: ForumImageRef[] = []
): UseForumImagePickerResult {
  const [newImages, setNewImages] = useState<PreparedImage[]>([])
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')

  const keptCount = existingImages.filter(
    (image) => !removedImageIds.includes(image.id)
  ).length
  const remainingSlots = Math.max(0, FORUM_MAX_IMAGES - keptCount - newImages.length)

  const addFromLibrary = useCallback(async () => {
    if (remainingSlots <= 0) {
      setError(LIMIT_MESSAGE)
      return
    }
    setError('')
    let result: ImagePicker.ImagePickerResult
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        ...PICKER_OPTIONS,
        selectionLimit: remainingSlots,
      })
    } catch {
      setError(PICKER_FAILED_MESSAGE)
      return
    }
    if (result.canceled) {
      return
    }
    const assets = (result.assets ?? []).slice(0, remainingSlots)
    if (assets.length === 0) {
      setError(PICKER_FAILED_MESSAGE)
      return
    }
    setIsProcessing(true)
    try {
      const prepared: PreparedImage[] = []
      for (const asset of assets) {
        const validationError = validateImageAsset(asset)
        if (validationError) {
          setError(validationError)
          continue
        }
        try {
          prepared.push(await compressImage(asset))
        } catch (err) {
          setError(err instanceof Error ? err.message : PROCESS_FAILED_MESSAGE)
        }
      }
      if (prepared.length > 0) {
        setNewImages((current) => [...current, ...prepared])
      }
    } finally {
      setIsProcessing(false)
    }
  }, [remainingSlots])

  const removeNewImage = useCallback((index: number) => {
    setNewImages((current) => current.filter((_, position) => position !== index))
  }, [])

  const toggleExisting = useCallback((imageId: string) => {
    setRemovedImageIds((current) =>
      current.includes(imageId)
        ? current.filter((id) => id !== imageId)
        : [...current, imageId]
    )
  }, [])

  const reset = useCallback(() => {
    setNewImages([])
    setRemovedImageIds([])
    setError('')
  }, [])

  return {
    newImages,
    removedImageIds,
    isProcessing,
    error,
    remainingSlots,
    addFromLibrary,
    removeNewImage,
    toggleExisting,
    reset,
  }
}

export default useForumImagePicker
