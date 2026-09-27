import type { ComponentProps, FormEvent } from 'react'
import Button from '../Button'
import Icon from '../Icon'
import type { ProfileFieldErrors } from '../../utils/profileValidation'

const INPUT_CLASSES =
  'h-11 w-full border border-hairline bg-canvas px-4 body-md text-ink placeholder:text-stone focus:border-2 focus:border-primary focus:px-[15px]'

interface TextFieldProps {
  id: string
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  placeholder?: string
  autoComplete?: string
  inputMode?: ComponentProps<'input'>['inputMode']
  error?: string
}

function TextField({
  id,
  label,
  hint,
  value,
  onChange,
  onBlur,
  placeholder,
  autoComplete,
  inputMode,
  error,
}: TextFieldProps) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="caption-md text-ink">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        className={`mt-2 ${INPUT_CLASSES} ${error ? 'border-error' : ''}`}
      />
      {error ? (
        <p className="caption-sm mt-2 text-error" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="caption-sm mt-2 text-mute">{hint}</p>
      )}
    </div>
  )
}

function SaveError({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-3 border border-error bg-surface-soft p-4"
      role="alert"
    >
      <Icon name="close" className="mt-0.5 h-4 w-4 shrink-0 text-error" />
      <p className="body-sm text-ink">{message}</p>
    </div>
  )
}

interface ProfileDetailsFormProps {
  fullName: string
  phone: string
  errors: ProfileFieldErrors
  isDirty: boolean
  canSave: boolean
  isSaving: boolean
  saveError: string
  onNameChange: (value: string) => void
  onNameBlur: () => void
  onPhoneChange: (value: string) => void
  onPhoneBlur: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function ProfileDetailsForm({
  fullName,
  phone,
  errors,
  isDirty,
  canSave,
  isSaving,
  saveError,
  onNameChange,
  onNameBlur,
  onPhoneChange,
  onPhoneBlur,
  onSubmit,
}: ProfileDetailsFormProps) {
  return (
    <section className="border border-hairline bg-canvas p-5 md:p-6">
      <h2 className="heading-sm text-ink">Account details</h2>
      <form onSubmit={onSubmit} noValidate className="mt-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="profile-full-name"
            label="Full name"
            value={fullName}
            onChange={onNameChange}
            onBlur={onNameBlur}
            placeholder="Juan dela Cruz"
            autoComplete="name"
            error={errors.fullName}
          />
          <TextField
            id="profile-phone"
            label="Contact number (Philippines)"
            hint="0917 123 4567 or +63 917 123 4567 — stored in +63 format."
            value={phone}
            onChange={onPhoneChange}
            onBlur={onPhoneBlur}
            placeholder="0917 123 4567"
            autoComplete="tel-national"
            inputMode="tel"
            error={errors.phone}
          />
        </div>
        {saveError && (
          <div className="mt-5">
            <SaveError message={saveError} />
          </div>
        )}
        <div className="mt-5 flex flex-col gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button type="submit" disabled={!canSave || isSaving} className="justify-center">
            {isSaving ? 'Saving\u2026' : 'Save changes'}
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

export default ProfileDetailsForm
