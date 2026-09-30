import type { FormEvent } from 'react'
import Button from '../Button'
import Icon from '../Icon'
import VarietyMultiSelect from './VarietyMultiSelect'
import useFarmerDetails from '../../hooks/useFarmerDetails'
import { TOAST_VARIANTS, useToast } from '../../context/toastContext'
import { RICE_VARIETIES } from '../../utils/riceVarieties'
import {
  MAX_FARM_SIZE_HECTARES,
  MAX_YEARS_FARMING_EXPERIENCE,
} from '../../utils/verificationValidation'
import { FORM_FIELD_CLASSES, withFieldError } from '../../utils/formField'

interface TextFieldProps {
  id: string
  label: string
  value: string
  placeholder?: string
  inputMode?: 'decimal' | 'numeric' | 'text'
  disabled: boolean
  error?: string
  hint?: string
  onChange: (value: string) => void
  onBlur: () => void
}

function TextField({
  id,
  label,
  value,
  placeholder,
  inputMode = 'text',
  disabled,
  error,
  hint,
  onChange,
  onBlur,
}: TextFieldProps) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="caption-md text-ink">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? true : undefined}
        className={`mt-2 ${withFieldError(FORM_FIELD_CLASSES, Boolean(error))} disabled:bg-surface-soft disabled:text-ash`}
      />
      {error ? (
        <p className="caption-sm mt-2 text-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="caption-sm mt-2 text-mute">{hint}</p>
      ) : null}
    </div>
  )
}

function FarmerDetailsForm() {
  const { showToast } = useToast()
  const {
    isInitialLoading,
    loadError,
    retryLoad,
    barangay,
    municipality,
    province,
    farmSizeInput,
    yearsFarmingInput,
    selectedVarieties,
    customVarietyInput,
    errors,
    isDirty,
    canSave,
    isSaving,
    saveError,
    onLocationChange,
    onLocationBlur,
    onFarmSizeChange,
    onFarmSizeBlur,
    onYearsFarmingChange,
    onYearsFarmingBlur,
    onToggleVariety,
    onCustomVarietyChange,
    onAddCustomVariety,
    saveFarmerDetails,
  } = useFarmerDetails()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const saved = await saveFarmerDetails()
    if (saved) {
      showToast('Farm details saved.', TOAST_VARIANTS.SUCCESS)
    }
  }

  if (isInitialLoading) {
    return (
      <section className="border border-hairline bg-canvas p-5 md:p-6">
        <div className="h-4 w-1/3 animate-pulse bg-surface-soft" />
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="h-11 animate-pulse bg-surface-soft" />
          <div className="h-11 animate-pulse bg-surface-soft" />
          <div className="h-11 animate-pulse bg-surface-soft" />
          <div className="h-11 animate-pulse bg-surface-soft" />
        </div>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="border border-error bg-surface-soft p-8 text-center" role="alert">
        <p className="body-strong text-ink">{loadError}</p>
        <button
          type="button"
          onClick={retryLoad}
          className="mt-4 h-11 border border-hairline bg-canvas px-4 button-sm text-ink transition-colors hover:border-primary hover:text-primary"
        >
          Try again
        </button>
      </section>
    )
  }

  return (
    <section className="border border-hairline bg-canvas p-5 md:p-6">
      <h2 className="heading-sm text-ink">Farm information</h2>
      <p className="body-sm mt-1 text-mute">
        Shown on your profile wall to help buyers and fellow farmers know your farm.
      </p>
      <form onSubmit={handleSubmit} noValidate className="mt-5">
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField
            id="farmer-barangay"
            label="Barangay"
            value={barangay}
            placeholder="San Isidro"
            disabled={isSaving}
            error={errors.barangay}
            onChange={(value) => onLocationChange('barangay', value)}
            onBlur={() => onLocationBlur('barangay')}
          />
          <TextField
            id="farmer-municipality"
            label="Municipality"
            value={municipality}
            placeholder="Munoz"
            disabled={isSaving}
            error={errors.municipality}
            onChange={(value) => onLocationChange('municipality', value)}
            onBlur={() => onLocationBlur('municipality')}
          />
          <TextField
            id="farmer-province"
            label="Province"
            value={province}
            placeholder="Nueva Ecija"
            disabled={isSaving}
            error={errors.province}
            onChange={(value) => onLocationChange('province', value)}
            onBlur={() => onLocationBlur('province')}
          />
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <TextField
            id="farmer-farm-size"
            label="Farm size (hectares)"
            value={farmSizeInput}
            placeholder="1.5"
            inputMode="decimal"
            disabled={isSaving}
            error={errors.farmSize}
            hint={`In hectares, e.g. 1.5 (up to ${MAX_FARM_SIZE_HECTARES}).`}
            onChange={onFarmSizeChange}
            onBlur={onFarmSizeBlur}
          />
          <TextField
            id="farmer-years"
            label="Years of farming experience"
            value={yearsFarmingInput}
            placeholder="12"
            inputMode="numeric"
            disabled={isSaving}
            error={errors.yearsFarming}
            hint={`Whole years, 0\u2013${MAX_YEARS_FARMING_EXPERIENCE}.`}
            onChange={onYearsFarmingChange}
            onBlur={onYearsFarmingBlur}
          />
        </div>
        <div className="mt-5">
          <VarietyMultiSelect
            varieties={RICE_VARIETIES}
            selected={selectedVarieties}
            customValue={customVarietyInput}
            disabled={isSaving}
            error={errors.varieties}
            onToggle={onToggleVariety}
            onCustomChange={onCustomVarietyChange}
            onAddCustom={onAddCustomVariety}
          />
        </div>

        {saveError && (
          <div
            className="mt-5 flex items-start gap-3 border border-error bg-surface-soft p-4"
            role="alert"
          >
            <Icon name="close" className="mt-0.5 h-4 w-4 shrink-0 text-error" />
            <p className="body-sm text-ink">{saveError}</p>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button type="submit" disabled={!canSave || isSaving} className="justify-center">
            {isSaving ? 'Saving\u2026' : 'Save farm details'}
          </Button>
          <p
            className={`caption-sm flex items-center gap-1.5 ${
              isDirty ? 'text-warning' : 'text-mute'
            }`}
            aria-live="polite"
          >
            {isDirty && (
              <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
            )}
            {isDirty ? 'Unsaved changes' : 'All changes saved'}
          </p>
        </div>
      </form>
    </section>
  )
}

export default FarmerDetailsForm
