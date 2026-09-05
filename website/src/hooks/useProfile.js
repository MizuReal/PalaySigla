import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/authContext.js'
import {
  fetchProfile,
  getAvatarUrl,
  removeAvatar,
  syncProfileName,
  uploadAvatar,
  upsertProfile,
} from '../services/profile.js'
import {
  MAX_AVATAR_DIMENSION,
  compressImage,
  validateImageFile,
} from '../utils/image.js'
import {
  toE164Phone,
  toLocalPhoneDisplay,
  validateName,
  validatePhone,
  validateProfileFields,
} from '../utils/profileValidation.js'
import { getInitials } from '../utils/userProfile.js'

const NO_PROFILE = Object.freeze({})

function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(NO_PROFILE)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [loadNonce, setLoadNonce] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarUrlError, setAvatarUrlError] = useState('')

  const [fullName, setFullName] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [errors, setErrors] = useState({})
  const [pendingFile, setPendingFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [isRemovalStaged, setIsRemovalStaged] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // saved* mirrors what is persisted; drafts are compared against it
  const [savedFullName, setSavedFullName] = useState('')
  const [savedPhone, setSavedPhone] = useState('')
  const [savedAvatarPath, setSavedAvatarPath] = useState('')
  const [savedMetadataName, setSavedMetadataName] = useState('')

  const previewUrlRef = useRef('')
  // the last fully-loaded data point: only a different account or a manual
  // retry may show the loading state again — session refreshes of the same
  // account (new user object, same metadata) reload silently
  const lastLoadKeyRef = useRef('')

  const userId = user?.id ?? null
  const metadataName = user?.user_metadata?.full_name ?? ''
  const loadKey = userId ? `${userId}:${loadNonce}` : ''

  // revoke the staged object URL when it is replaced or the hook unmounts
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      return
    }

    // switching accounts or a manual retry needs the full loading state;
    // session refreshes of the same account reload silently instead
    const showFullLoading = lastLoadKeyRef.current !== loadKey
    lastLoadKeyRef.current = loadKey
    let isCancelled = false

    const load = async () => {
      if (showFullLoading) {
        setIsInitialLoading(true)
      }
      setLoadError('')
      try {
        const row = await fetchProfile(userId)
        if (isCancelled) {
          return
        }
        const name = row?.full_name ?? metadataName
        setProfile(row ?? NO_PROFILE)
        setFullName(name)
        setSavedFullName(name)
        setSavedMetadataName(metadataName)
        setPhoneInput(toLocalPhoneDisplay(row?.phone ?? ''))
        setSavedPhone(row?.phone ?? '')
        const avatarPath = row?.avatar_path ?? ''
        setSavedAvatarPath(avatarPath)
        if (avatarPath) {
          try {
            const url = await getAvatarUrl(avatarPath)
            if (!isCancelled) {
              setAvatarUrl(url)
              setAvatarUrlError('')
            }
          } catch {
            if (!isCancelled) {
              setAvatarUrl('')
              setAvatarUrlError('Could not load your profile photo.')
            }
          }
        } else if (!isCancelled) {
          setAvatarUrl('')
          setAvatarUrlError('')
        }
      } catch (err) {
        if (!isCancelled) {
          setLoadError(err.message)
        }
      } finally {
        if (!isCancelled) {
          setIsInitialLoading(false)
        }
      }
    }

    load()
    return () => {
      isCancelled = true
    }
  }, [userId, loadKey, metadataName, loadNonce])

  const clearFieldError = useCallback((field) => {
    setErrors((current) => {
      if (!(field in current)) {
        return current
      }
      const next = { ...current }
      delete next[field]
      return next
    })
  }, [])

  // empty fields stay silent until submit, matching the auth-form pattern
  const blurValidate = useCallback((field, value) => {
    if (!value) {
      return
    }
    const message =
      field === 'fullName' ? validateName(value) : validatePhone(value)
    setErrors((current) =>
      message ? { ...current, [field]: message } : current
    )
  }, [])

  const handleNameChange = useCallback(
    (value) => {
      setFullName(value)
      clearFieldError('fullName')
    },
    [clearFieldError]
  )

  const handlePhoneChange = useCallback(
    (value) => {
      setPhoneInput(value)
      clearFieldError('phone')
    },
    [clearFieldError]
  )

  const discardStagedPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = ''
    }
  }, [])

  const stageFile = useCallback(
    (blob) => {
      discardStagedPreview()
      const url = URL.createObjectURL(blob)
      previewUrlRef.current = url
      setPendingFile(blob)
      setPreviewUrl(url)
      setIsRemovalStaged(false)
      setAvatarError('')
    },
    [discardStagedPreview]
  )

  const pickAvatarFile = useCallback(
    async (file) => {
      if (!file) {
        return
      }
      const validationError = validateImageFile(file)
      if (validationError) {
        setAvatarError(validationError)
        return
      }
      setAvatarBusy(true)
      setAvatarError('')
      try {
        const compressed = await compressImage(file, MAX_AVATAR_DIMENSION)
        stageFile(compressed)
      } catch (err) {
        setAvatarError(err.message)
      } finally {
        setAvatarBusy(false)
      }
    },
    [stageFile]
  )

  const requestRemoveAvatar = useCallback(() => {
    if (!savedAvatarPath) {
      return
    }
    discardStagedPreview()
    setPendingFile(null)
    setPreviewUrl('')
    setIsRemovalStaged(true)
    setAvatarError('')
  }, [savedAvatarPath, discardStagedPreview])

  const cancelAvatarChange = useCallback(() => {
    discardStagedPreview()
    setPendingFile(null)
    setPreviewUrl('')
    setIsRemovalStaged(false)
    setAvatarError('')
  }, [discardStagedPreview])

  const avatarDirty = useMemo(
    () => Boolean(pendingFile) || (isRemovalStaged && Boolean(savedAvatarPath)),
    [pendingFile, isRemovalStaged, savedAvatarPath]
  )

  const fieldsDirty = useMemo(() => {
    const normalizedPhone = phoneInput.trim() ? toE164Phone(phoneInput) : ''
    return (
      fullName.trim() !== savedFullName.trim() ||
      (normalizedPhone ?? '') !== savedPhone
    )
  }, [fullName, phoneInput, savedFullName, savedPhone])

  const isDirty = fieldsDirty || avatarDirty
  const hasFieldErrors = Boolean(errors.fullName || errors.phone)

  const hasAvatar = Boolean(savedAvatarPath) && !isRemovalStaged
  const fallbackInitials = getInitials(fullName || metadataName)
  const displayAvatarUrl = pendingFile
    ? previewUrl
    : isRemovalStaged
      ? ''
      : avatarUrl
  const previewNote = pendingFile
    ? 'New photo ready \u2014 save to apply.'
    : isRemovalStaged
      ? 'Photo will be removed when you save.'
      : ''

  const saveProfile = useCallback(async () => {
    if (!userId) {
      return false
    }
    const fieldErrors = validateProfileFields({ fullName, phone: phoneInput })
    setErrors(fieldErrors)
    if (fieldErrors.fullName || fieldErrors.phone) {
      return false
    }
    setSaveError('')
    setIsSaving(true)
    const trimmedName = fullName.trim()
    const phoneValue = phoneInput.trim() ? toE164Phone(phoneInput) : ''
    let newAvatarPath = savedAvatarPath
    try {
      if (pendingFile) {
        newAvatarPath = await uploadAvatar(userId, pendingFile)
        await upsertProfile(userId, {
          fullName: trimmedName,
          phone: phoneValue,
          avatarPath: newAvatarPath,
        })
        try {
          const url = await getAvatarUrl(newAvatarPath)
          setAvatarUrl(url)
          setAvatarUrlError('')
        } catch {
          setAvatarUrlError('Could not load your profile photo.')
        }
      } else if (isRemovalStaged && savedAvatarPath) {
        // clear the row first so a failed object delete never leaves the row
        // pointing at a removed photo; a leftover object is removed on retry
        await upsertProfile(userId, {
          fullName: trimmedName,
          phone: phoneValue,
          avatarPath: null,
        })
        await removeAvatar(savedAvatarPath)
        newAvatarPath = ''
        setAvatarUrl('')
        setAvatarUrlError('')
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
      setSavedPhone(phoneValue ?? '')
      setSavedAvatarPath(newAvatarPath)
      setProfile((current) => ({
        id: userId,
        ...current,
        full_name: trimmedName,
        phone: phoneValue || null,
        avatar_path: newAvatarPath || null,
      }))
      cancelAvatarChange()
      return true
    } catch (err) {
      setSaveError(err.message)
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
    cancelAvatarChange,
  ])

  return {
    profile,
    isInitialLoading,
    loadError,
    retryLoad: () => setLoadNonce((current) => current + 1),
    fullName,
    phoneInput,
    errors,
    avatarUrl: displayAvatarUrl,
    hasAvatar,
    hasPendingFile: Boolean(pendingFile),
    isRemovalStaged,
    fallbackInitials,
    avatarError,
    avatarUrlError,
    avatarBusy,
    isSaving,
    saveError,
    previewNote,
    canSave: isDirty && !hasFieldErrors && !avatarBusy,
    ratingAvg: Number(profile.rating_avg ?? 0),
    ratingCount: Number(profile.rating_count ?? 0),
    onNameChange: handleNameChange,
    onPhoneChange: handlePhoneChange,
    onNameBlur: () => blurValidate('fullName', fullName),
    onPhoneBlur: () => blurValidate('phone', phoneInput),
    onPickAvatarFile: pickAvatarFile,
    onRequestRemoveAvatar: requestRemoveAvatar,
    onCancelAvatarChange: cancelAvatarChange,
    saveProfile,
  }
}

export default useProfile
