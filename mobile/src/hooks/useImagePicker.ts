// Photo acquisition for the posting wizard (and future uploaders): camera or
// library in, validated + compressed PreparedImage out. Camera access is
// requested explicitly before launching (AGENTS.md) and every denial state is
// surfaced with user-facing copy — never a silent failure. Library picks need
// no runtime permission on Expo SDK 57's system pickers, and iOS is asked for
// the compatible asset representation so HEIC photos arrive as JPEG.
import { useCallback, useEffect, useState } from 'react'
import { Linking } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { compressImage, validateImageAsset } from '../utils/image'
import type { PreparedImage } from '../utils/image'

const CAMERA_DENIED_MESSAGE =
  'Camera access was denied. You can still choose a photo from your library.'
const CAMERA_BLOCKED_MESSAGE =
  'Camera access is off. Enable it in Settings to take a photo, or choose one from your library.'
const PICKER_FAILED_MESSAGE = 'Could not open the photo picker. Please try again.'
const PROCESS_FAILED_MESSAGE = 'Could not process the photo.'

// quality 1 keeps the capture at the sensor's resolution; compression happens
// client-side afterwards (AGENTS.md image rules)
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
  allowsEditing: false,
  preferredAssetRepresentationMode:
    ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
}

export interface UseImagePickerResult {
  image: PreparedImage | null
  isProcessing: boolean
  error: string
  canOpenSettings: boolean
  takePhoto: () => Promise<void>
  pickFromLibrary: () => Promise<void>
  removeImage: () => void
  openSettings: () => Promise<void>
}

function useImagePicker(): UseImagePickerResult {
  const [image, setImage] = useState<PreparedImage | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [canOpenSettings, setCanOpenSettings] = useState(false)

  const processAsset = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    const validationError = validateImageAsset(asset)
    if (validationError) {
      setError(validationError)
      return
    }
    setIsProcessing(true)
    setError('')
    try {
      const prepared = await compressImage(asset)
      setImage(prepared)
      setCanOpenSettings(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : PROCESS_FAILED_MESSAGE)
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleResult = useCallback(
    async (result: ImagePicker.ImagePickerResult) => {
      if (result.canceled) {
        return
      }
      const asset = result.assets?.[0]
      if (!asset) {
        setError(PICKER_FAILED_MESSAGE)
        return
      }
      await processAsset(asset)
    },
    [processAsset]
  )

  const takePhoto = useCallback(async () => {
    setError('')
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        setCanOpenSettings(!permission.canAskAgain)
        setError(
          permission.canAskAgain ? CAMERA_DENIED_MESSAGE : CAMERA_BLOCKED_MESSAGE
        )
        return
      }
      const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
      await handleResult(result)
    } catch {
      setError(PICKER_FAILED_MESSAGE)
    }
  }, [handleResult])

  const pickFromLibrary = useCallback(async () => {
    setError('')
    try {
      const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS)
      await handleResult(result)
    } catch {
      setError(PICKER_FAILED_MESSAGE)
    }
  }, [handleResult])

  const removeImage = useCallback(() => {
    setImage(null)
    setError('')
    setCanOpenSettings(false)
  }, [])

  const openSettings = useCallback(async () => {
    try {
      await Linking.openSettings()
    } catch {
      // the Settings message stays visible if the OS refuses to open it
    }
  }, [])

  useEffect(() => {
    // Android may destroy the app while the camera is open; the picker stashes
    // the result, so a capture is recovered on the next launch instead of being
    // silently lost.
    let isCurrent = true
    const recoverPending = async () => {
      try {
        const pending = await ImagePicker.getPendingResultAsync()
        if (!isCurrent || pending === null || !('assets' in pending) || pending.canceled) {
          return
        }
        const asset = pending.assets?.[0]
        if (asset) {
          await processAsset(asset)
        }
      } catch {
        // recovery is best effort; a normal pick flow still works
      }
    }
    recoverPending()
    return () => {
      isCurrent = false
    }
  }, [processAsset])

  return {
    image,
    isProcessing,
    error,
    canOpenSettings,
    takePhoto,
    pickFromLibrary,
    removeImage,
    openSettings,
  }
}

export default useImagePicker
