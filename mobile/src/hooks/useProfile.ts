// Account profile state — a focused port of website/src/hooks/useProfile.ts:
// load, blur/submit validation, a staged avatar (pick → 512px compress →
// preview → save/remove/undo), dirty tracking, and a save that uploads the
// photo, upserts the row, and syncs the auth display name.
import { useCallback, useEffect, useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { useAuth } from '../context/authContext'
import {
  fetchProfile,
  getAvatarUrl,
  removeAvatar,
  syncProfileName,
  uploadAvatar,
  upsertProfile,
} from '../services/profile'
import { MAX_AVATAR_DIMENSION, compressImage, validateImageAsset } from '../utils/image'
import type { PreparedImage } from '../utils/image'
import {
  toE164Phone,
  toLocalPhoneDisplay,
  validateName,
  validatePhone,
  validateProfileFields,
} from '../utils/profileValidation'
import type { ProfileFieldErrors } from '../utils/profileValidation'
import { getDisplayName, getInitials } from '../utils/userProfile'

const PICKER_FAILED_MESSAGE = 'Could not open the photo picker. Please try again.'
const PROCESS_FAILED_MESSAGE = 'Could not process the photo.'

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
  allowsEditing: true,
  aspect: [1, 1],
  preferredAssetRepresentationMode:
    ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
}

export interface UseProfileResult {
  isInitialLoading: boolean
  loadError: string
  retryLoad: () => void
  fullName: string
  phoneInput: string
  errors: ProfileFieldErrors
  displayAvatarUrl: string
  hasAvatar: boolean
  hasPendingFile: boolean
  isRemovalStaged: boolean
  fallbackInitials: string
  avatarError: string
  avatarUrlError: string
  avatarBusy: boolean
  isSaving: boolean
  saveError: string
  previewNote: string
  isDirty: boolean
  canSave: boolean
  ratingAvg: number
  ratingCount: number
  onNameChange: (value: string) => void
  onPhoneChange: (value: string) => void
  onNameBlur: () => void
  onPhoneBlur: () => void
  pickAvatar: () => Promise<void>
  onRequestRemoveAvatar: () => void
  onCancelAvatarChange: () => void
  saveProfile: () => Promise<boolean>
}

interface PendingAvatar {
  image: PreparedImage
  previewUri: string
}

function useProfile(): UseProfileResult {
  const { user } = useAuth()
  const userId = user?.id
  const metadataName = getDisplayName(user ?? null)

  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [loadNonce, setLoadNonce] = useState(0)

  const [fullName, setFullName] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [errors, setErrors] = useState<ProfileFieldErrors>({})

  const [savedFullName, setSavedFullName] = useState('')
  const [savedPhoneE164, setSavedPhoneE164] = useState<string | null>(null)
  const [savedAvatarPath, setSavedAvatarPath] = useState<string | null>(null)
  const [savedMetadataName, setSavedMetadataName] = useState(metadataName)
  const [avatarUrl, setAvatarUrl] = useState('')

  const [pendingFile, setPendingFile] = useState<PendingAvatar | null>(null)
  const [isRemovalStaged, setIsRemovalStaged] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [avatarUrlError, setAvatarUrlError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [ratingAvg, setRatingAvg] = useState(0)
  const [ratingCount, setRatingCount] = useState(0)

  useEffect(() => {
    if (!userId) {
      return undefined
    }
    let isCurrent = true
    const load = async () => {
      try {
        const profile = await fetchProfile(userId)
        if (!isCurrent) {
          return
        }
        const name = profile?.full_name?.trim() || metadataName
        setFullName(name)
        setSavedFullName(name)
        setPhoneInput(profile?.phone ? toLocalPhoneDisplay(profile.phone) : '')
        setSavedPhoneE164(profile?.phone ?? null)
        setSavedAvatarPath(profile?.avatar_path ?? null)
        setSavedMetadataName(metadataName)
        setRatingAvg(Number(profile?.rating_avg ?? 0))
        setRatingCount(Number(profile?.rating_count ?? 0))
        setLoadError('')
        if (profile?.avatar_path) {
          try {
            const url = await getAvatarUrl(profile.avatar_path)
            if (isCurrent) {
              setAvatarUrl(url)
              setAvatarUrlError('')
            }
          } catch {
            if (isCurrent) {
              setAvatarUrl('')
              setAvatarUrlError('Could not load your profile photo.')
            }
          }
        } else {
          setAvatarUrl('')
          setAvatarUrlError('')
        }
      } catch (err) {
        if (isCurrent) {
          setLoadError(
            err instanceof Error
              ? err.message
              : 'Could not load your profile. Please try again.'
          )
        }
      } finally {
        if (isCurrent) {
          setIsInitialLoading(false)
        }
      }
    }
    load()
    return () => {
      isCurrent = false
    }
  }, [userId, metadataName, loadNonce])

  const clearFieldError = (field: keyof ProfileFieldErrors) => {
    setErrors((current) => {
      if (!(field in current)) {
        return current
      }
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const onNameChange = (value: string) => {
    setFullName(value)
    clearFieldError('fullName')
  }

  const onPhoneChange = (value: string) => {
    setPhoneInput(value)
    clearFieldError('phone')
  }

  const onNameBlur = () => {
    if (!fullName.trim()) {
      return
    }
    const error = validateName(fullName)
    setErrors((current) => ({ ...current, fullName: error || undefined }))
  }

  const onPhoneBlur = () => {
    if (!phoneInput.trim()) {
      return
    }
    const error = validatePhone(phoneInput)
    setErrors((current) => ({ ...current, phone: error || undefined }))
  }

  const pickAvatar = useCallback(async () => {
    setAvatarError('')
    let result: ImagePicker.ImagePickerResult
    try {
      result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS)
    } catch {
      setAvatarError(PICKER_FAILED_MESSAGE)
      return
    }
    if (result.canceled) {
      return
    }
    const asset = result.assets?.[0]
    if (!asset) {
      setAvatarError(PICKER_FAILED_MESSAGE)
      return
    }
    const validationError = validateImageAsset(asset)
    if (validationError) {
      setAvatarError(validationError)
      return
    }
    setAvatarBusy(true)
    try {
      const prepared = await compressImage(asset, MAX_AVATAR_DIMENSION)
      setPendingFile({ image: prepared, previewUri: prepared.uri })
      setIsRemovalStaged(false)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : PROCESS_FAILED_MESSAGE)
    } finally {
      setAvatarBusy(false)
    }
  }, [])

  const onRequestRemoveAvatar = () => {
    if (!savedAvatarPath) {
      return
    }
    setPendingFile(null)
    setIsRemovalStaged(true)
    setAvatarError('')
  }

  const onCancelAvatarChange = () => {
    setPendingFile(null)
    setIsRemovalStaged(false)
    setAvatarError('')
  }

  const saveProfile = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      return false
    }
    const fieldErrors = validateProfileFields({ fullName, phone: phoneInput })
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return false
    }
    setIsSaving(true)
    setSaveError('')
    const trimmedName = fullName.trim()
    const e164 = toE164Phone(phoneInput)
    const phoneValue = e164 === null || e164 === '' ? null : e164
    try {
      if (pendingFile) {
        const path = await uploadAvatar(userId, pendingFile.image)
        await upsertProfile(userId, {
          fullName: trimmedName,
          phone: phoneValue,
          avatarPath: path,
        })
        setSavedAvatarPath(path)
        setAvatarUrl(await getAvatarUrl(path))
      } else if (isRemovalStaged) {
        // clear the row first so a failed object delete never leaves a
        // dangling avatar_path
        await upsertProfile(userId, {
          fullName: trimmedName,
          phone: phoneValue,
          avatarPath: null,
        })
        if (savedAvatarPath) {
          await removeAvatar(savedAvatarPath)
        }
        setSavedAvatarPath(null)
        setAvatarUrl('')
      } else {
        await upsertProfile(userId, {
          fullName: trimmedName,
          phone: phoneValue,
        })
      }
      if (trimmedName !== savedMetadataName) {
        await syncProfileName(trimmedName)
        setSavedMetadataName(trimmedName)
      }
      setSavedFullName(trimmedName)
      setSavedPhoneE164(phoneValue)
      setPendingFile(null)
      setIsRemovalStaged(false)
      return true
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Could not save your profile. Please try again.'
      )
      return false
    } finally {
      setIsSaving(false)
    }
  }, [
    userId,
    fullName,
    phoneInput,
    pendingFile,
    isRemovalStaged,
    savedAvatarPath,
    savedMetadataName,
  ])

  const retryLoad = useCallback(() => {
    setIsInitialLoading(true)
    setLoadError('')
    setLoadNonce((current) => current + 1)
  }, [])

  const hasAvatar = Boolean(savedAvatarPath) && !isRemovalStaged
  const fallbackInitials = getInitials(fullName || metadataName)
  const displayAvatarUrl = pendingFile
    ? pendingFile.previewUri
    : isRemovalStaged
      ? ''
      : avatarUrl
  const previewNote = pendingFile
    ? 'New photo ready \u2014 save to apply.'
    : isRemovalStaged
      ? 'Photo will be removed when you save.'
      : ''
  const normalizedPhone = toE164Phone(phoneInput)
  const fieldsDirty =
    fullName.trim() !== savedFullName.trim() ||
    (normalizedPhone === '' ? null : normalizedPhone) !== savedPhoneE164
  const avatarDirty =
    pendingFile !== null || (isRemovalStaged && Boolean(savedAvatarPath))
  const isDirty = fieldsDirty || avatarDirty
  const hasFieldErrors = Object.values(errors).some(Boolean)
  const canSave = isDirty && !hasFieldErrors && !avatarBusy && !isSaving

  return {
    isInitialLoading,
    loadError,
    retryLoad,
    fullName,
    phoneInput,
    errors,
    displayAvatarUrl,
    hasAvatar,
    hasPendingFile: pendingFile !== null,
    isRemovalStaged,
    fallbackInitials,
    avatarError,
    avatarUrlError,
    avatarBusy,
    isSaving,
    saveError,
    previewNote,
    isDirty,
    canSave,
    ratingAvg,
    ratingCount,
    onNameChange,
    onPhoneChange,
    onNameBlur,
    onPhoneBlur,
    pickAvatar,
    onRequestRemoveAvatar,
    onCancelAvatarChange,
    saveProfile,
  }
}

export default useProfile
