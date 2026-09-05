import Button from '../Button.jsx'
import Icon from '../Icon.jsx'

const INPUT_CLASSES =
  'h-11 w-full border border-hairline bg-canvas px-4 body-md text-ink placeholder:text-stone focus:border-2 focus:border-primary focus:px-[15px]'

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
}) {
  return (
    <div>
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

function SaveError({ message }) {
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
}) {
  return (
    <section className="border border-hairline bg-canvas p-6 md:p-8">
      <h2 className="heading-sm text-ink">Account details</h2>
      <p className="body-sm mt-2 text-mute">
        Your name and contact number are what buyers see when they reach you
        about a listing.
      </p>
      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
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
          hint="A Philippine mobile number — 0917 123 4567 or +63 917 123 4567 both work. It is stored in +63 format."
          value={phone}
          onChange={onPhoneChange}
          onBlur={onPhoneBlur}
          placeholder="0917 123 4567"
          autoComplete="tel-national"
          inputMode="tel"
          error={errors.phone}
        />
        {saveError && <SaveError message={saveError} />}
        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="submit"
            disabled={!canSave || isSaving}
            className="justify-center"
          >
            {isSaving ? 'Saving\u2026' : 'Save changes'}
          </Button>
          <p className="caption-sm text-mute" aria-live="polite">
            {isDirty
              ? 'You have unsaved changes'
              : 'No unsaved changes'}
          </p>
        </div>
      </form>
    </section>
  )
}

export default ProfileDetailsForm
