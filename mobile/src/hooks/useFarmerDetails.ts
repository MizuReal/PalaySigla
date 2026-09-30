import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/authContext'
import { fetchProfile, updateFarmerDetails } from '../services/profile'
import {
  MAX_LOCATION_FIELD_LENGTH,
  parseFarmSize,
  parseYearsFarming,
  validateFarmSize,
  validateYearsFarming,
} from '../utils/verificationValidation'
import {
  MAX_RICE_VARIETIES,
  MAX_VARIETY_NAME_LENGTH,
  normalizeVarietyName,
} from '../utils/riceVarieties'

type LocationField = 'barangay' | 'municipality' | 'province'

export interface FarmerDetailsErrors {
  barangay?: string
  municipality?: string
  province?: string
  farmSize?: string
  yearsFarming?: string
  varieties?: string
}

interface SavedFarmerDetails {
  barangay: string
  municipality: string
  province: string
  farmSizeInput: string
  yearsFarmingInput: string
  varieties: string[]
}

const EMPTY_SAVED: SavedFarmerDetails = Object.freeze({
  barangay: '',
  municipality: '',
  province: '',
  farmSizeInput: '',
  yearsFarmingInput: '',
  varieties: [],
})

function locationLengthError(value: string): string {
  return value.length > MAX_LOCATION_FIELD_LENGTH
    ? `Keep this to ${MAX_LOCATION_FIELD_LENGTH} characters or fewer.`
    : ''
}

function varietiesSignature(varieties: string[]): string {
  return [...varieties]
    .map((variety) => variety.toLowerCase())
    .sort()
    .join('\u0000')
}

export interface UseFarmerDetailsResult {
  isInitialLoading: boolean
  loadError: string
  retryLoad: () => void
  barangay: string
  municipality: string
  province: string
  farmSizeInput: string
  yearsFarmingInput: string
  selectedVarieties: string[]
  customVarietyInput: string
  errors: FarmerDetailsErrors
  isDirty: boolean
  canSave: boolean
  isSaving: boolean
  saveError: string
  onLocationChange: (field: LocationField, value: string) => void
  onLocationBlur: (field: LocationField) => void
  onFarmSizeChange: (value: string) => void
  onFarmSizeBlur: () => void
  onYearsFarmingChange: (value: string) => void
  onYearsFarmingBlur: () => void
  onToggleVariety: (variety: string) => void
  onCustomVarietyChange: (value: string) => void
  onAddCustomVariety: () => void
  saveFarmerDetails: () => Promise<boolean>
}

function useFarmerDetails(): UseFarmerDetailsResult {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [loadNonce, setLoadNonce] = useState(0)

  const [barangay, setBarangay] = useState('')
  const [municipality, setMunicipality] = useState('')
  const [province, setProvince] = useState('')
  const [farmSizeInput, setFarmSizeInput] = useState('')
  const [yearsFarmingInput, setYearsFarmingInput] = useState('')
  const [selectedVarieties, setSelectedVarieties] = useState<string[]>([])
  const [customVarietyInput, setCustomVarietyInput] = useState('')
  const [saved, setSaved] = useState<SavedFarmerDetails>(EMPTY_SAVED)
  const [errors, setErrors] = useState<FarmerDetailsErrors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    let isCancelled = false

    const load = async () => {
      setIsInitialLoading(true)
      setLoadError('')
      if (!userId) {
        setIsInitialLoading(false)
        return
      }
      try {
        const row = await fetchProfile(userId)
        if (isCancelled) {
          return
        }
        const nextSaved: SavedFarmerDetails = {
          barangay: row?.barangay ?? '',
          municipality: row?.municipality ?? '',
          province: row?.province ?? '',
          farmSizeInput:
            row?.farm_size_hectares === null || row?.farm_size_hectares === undefined
              ? ''
              : String(row.farm_size_hectares),
          yearsFarmingInput:
            row?.years_farming_experience === null ||
            row?.years_farming_experience === undefined
              ? ''
              : String(row.years_farming_experience),
          varieties: row?.rice_varieties ?? [],
        }
        setSaved(nextSaved)
        setBarangay(nextSaved.barangay)
        setMunicipality(nextSaved.municipality)
        setProvince(nextSaved.province)
        setFarmSizeInput(nextSaved.farmSizeInput)
        setYearsFarmingInput(nextSaved.yearsFarmingInput)
        setSelectedVarieties(nextSaved.varieties)
        setCustomVarietyInput('')
        setErrors({})
      } catch (err) {
        if (!isCancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'Could not load your farm details.'
          )
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
  }, [userId, loadNonce])

  const clearError = useCallback((field: keyof FarmerDetailsErrors) => {
    setErrors((current) => {
      if (!(field in current)) {
        return current
      }
      const next = { ...current }
      delete next[field]
      return next
    })
  }, [])

  const handleLocationChange = useCallback(
    (field: LocationField, value: string) => {
      const setter =
        field === 'barangay' ? setBarangay : field === 'municipality' ? setMunicipality : setProvince
      setter(value)
      clearError(field)
    },
    [clearError]
  )

  const handleLocationBlur = useCallback(
    (field: LocationField) => {
      const value = field === 'barangay' ? barangay : field === 'municipality' ? municipality : province
      const message = locationLengthError(value)
      setErrors((current) => (message ? { ...current, [field]: message } : current))
    },
    [barangay, municipality, province]
  )

  const handleFarmSizeChange = useCallback(
    (value: string) => {
      setFarmSizeInput(value)
      clearError('farmSize')
    },
    [clearError]
  )

  const handleYearsFarmingChange = useCallback(
    (value: string) => {
      setYearsFarmingInput(value)
      clearError('yearsFarming')
    },
    [clearError]
  )

  const toggleVariety = useCallback(
    (variety: string) => {
      setSelectedVarieties((current) => {
        if (current.includes(variety)) {
          return current.filter((item) => item !== variety)
        }
        if (current.length >= MAX_RICE_VARIETIES) {
          setErrors((existing) => ({
            ...existing,
            varieties: `You can list up to ${MAX_RICE_VARIETIES} varieties.`,
          }))
          return current
        }
        setErrors((existing) => {
          if (!existing.varieties) {
            return existing
          }
          const next = { ...existing }
          delete next.varieties
          return next
        })
        return [...current, variety]
      })
    },
    []
  )

  const addCustomVariety = useCallback(() => {
    const variety = normalizeVarietyName(customVarietyInput)
    if (!variety) {
      return
    }
    if (variety.length > MAX_VARIETY_NAME_LENGTH) {
      setErrors((current) => ({
        ...current,
        varieties: `Variety names are limited to ${MAX_VARIETY_NAME_LENGTH} characters.`,
      }))
      return
    }
    if (
      selectedVarieties.some(
        (item) => item.toLowerCase() === variety.toLowerCase()
      )
    ) {
      setErrors((current) => ({
        ...current,
        varieties: 'That variety is already in your list.',
      }))
      return
    }
    if (selectedVarieties.length >= MAX_RICE_VARIETIES) {
      setErrors((current) => ({
        ...current,
        varieties: `You can list up to ${MAX_RICE_VARIETIES} varieties.`,
      }))
      return
    }
    setSelectedVarieties((current) => [...current, variety])
    setCustomVarietyInput('')
    clearError('varieties')
  }, [customVarietyInput, selectedVarieties, clearError])

  const isDirty = useMemo(() => {
    return (
      barangay.trim() !== saved.barangay.trim() ||
      municipality.trim() !== saved.municipality.trim() ||
      province.trim() !== saved.province.trim() ||
      farmSizeInput.trim() !== saved.farmSizeInput ||
      yearsFarmingInput.trim() !== saved.yearsFarmingInput ||
      varietiesSignature(selectedVarieties) !== varietiesSignature(saved.varieties)
    )
  }, [
    barangay,
    municipality,
    province,
    farmSizeInput,
    yearsFarmingInput,
    selectedVarieties,
    saved,
  ])

  const saveFarmerDetails = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      return false
    }
    const nextErrors: FarmerDetailsErrors = {}
    const barangayError = locationLengthError(barangay)
    const municipalityError = locationLengthError(municipality)
    const provinceError = locationLengthError(province)
    if (barangayError) {
      nextErrors.barangay = barangayError
    }
    if (municipalityError) {
      nextErrors.municipality = municipalityError
    }
    if (provinceError) {
      nextErrors.province = provinceError
    }
    const farmSizeError = validateFarmSize(farmSizeInput)
    if (farmSizeError) {
      nextErrors.farmSize = farmSizeError
    }
    const yearsError = validateYearsFarming(yearsFarmingInput)
    if (yearsError) {
      nextErrors.yearsFarming = yearsError
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return false
    }

    setIsSaving(true)
    setSaveError('')
    try {
      await updateFarmerDetails(userId, {
        barangay: barangay.trim() || null,
        municipality: municipality.trim() || null,
        province: province.trim() || null,
        farmSizeHectares: parseFarmSize(farmSizeInput),
        yearsFarmingExperience: parseYearsFarming(yearsFarmingInput),
        riceVarieties: selectedVarieties,
      })
      setSaved({
        barangay: barangay.trim(),
        municipality: municipality.trim(),
        province: province.trim(),
        farmSizeInput: farmSizeInput.trim(),
        yearsFarmingInput: yearsFarmingInput.trim(),
        varieties: selectedVarieties,
      })
      return true
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Could not save your farm details.'
      )
      return false
    } finally {
      setIsSaving(false)
    }
  }, [userId, barangay, municipality, province, farmSizeInput, yearsFarmingInput, selectedVarieties])

  const hasErrors = Boolean(
    errors.barangay ||
      errors.municipality ||
      errors.province ||
      errors.farmSize ||
      errors.yearsFarming ||
      errors.varieties
  )

  return {
    isInitialLoading,
    loadError,
    retryLoad: () => setLoadNonce((current) => current + 1),
    barangay,
    municipality,
    province,
    farmSizeInput,
    yearsFarmingInput,
    selectedVarieties,
    customVarietyInput,
    errors,
    isDirty,
    canSave: isDirty && !hasErrors && !isSaving,
    isSaving,
    saveError,
    onLocationChange: handleLocationChange,
    onLocationBlur: handleLocationBlur,
    onFarmSizeChange: handleFarmSizeChange,
    onFarmSizeBlur: () => setErrors((current) => {
      const message = validateFarmSize(farmSizeInput)
      return message ? { ...current, farmSize: message } : current
    }),
    onYearsFarmingChange: handleYearsFarmingChange,
    onYearsFarmingBlur: () => setErrors((current) => {
      const message = validateYearsFarming(yearsFarmingInput)
      return message ? { ...current, yearsFarming: message } : current
    }),
    onToggleVariety: toggleVariety,
    onCustomVarietyChange: (value: string) =>
      setCustomVarietyInput(value.slice(0, MAX_VARIETY_NAME_LENGTH)),
    onAddCustomVariety: addCustomVariety,
    saveFarmerDetails,
  }
}

export default useFarmerDetails
