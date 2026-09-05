import { useRef } from 'react'
import Button from '../Button.jsx'
import Icon from '../Icon.jsx'

const ACCEPTED_AVATAR_TYPES = 'image/jpeg,image/png'

function AvatarEditor({
  avatarUrl,
  displayName,
  email,
  memberSinceLabel,
  fallbackInitials,
  hasAvatar,
  hasPendingFile,
  isRemovalStaged,
  busy,
  disabled,
  error,
  urlError,
  previewNote,
  onPickFile,
  onRemove,
  onCancel,
}) {
  const inputRef = useRef(null)

  const showRemoveAction = !hasPendingFile && !isRemovalStaged && hasAvatar
  const showCancelAction = hasPendingFile || isRemovalStaged

  return (
    <section className="border border-hairline bg-canvas p-6">
      <h2 className="heading-sm text-ink">Profile photo</h2>
      <div className="mt-6 flex flex-col items-center">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Your profile photo"
            className="h-24 w-24 rounded-full border border-hairline object-cover md:h-28 md:w-28"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-24 w-24 items-center justify-center rounded-full border border-hairline bg-surface-soft md:h-28 md:w-28"
          >
            <span className="heading-md text-ink">{fallbackInitials}</span>
          </span>
        )}
        <p className="body-strong mt-4 text-ink">{displayName}</p>
        <p className="caption-sm mt-1 text-mute">{email}</p>
        <p className="caption-sm mt-1 text-mute">
          Member since {memberSinceLabel}
        </p>
        {urlError && (
          <p className="caption-sm mt-3 text-error" role="alert">
            {urlError}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_AVATAR_TYPES}
        className="sr-only"
        onChange={(event) => onPickFile(event.target.files?.[0])}
      />

      <div className="mt-6 flex flex-col items-center gap-3 border-t border-hairline pt-6">
        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || disabled}
          className="w-full justify-center"
        >
          {busy ? 'Processing\u2026' : 'Change photo'}
        </Button>
        {showCancelAction && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={busy || disabled}
            className="w-full justify-center"
          >
            {hasPendingFile ? 'Undo new photo' : 'Keep photo'}
          </Button>
        )}
        {showRemoveAction && (
          <button
            type="button"
            onClick={onRemove}
            disabled={busy || disabled}
            className="body-sm py-2 text-error transition-colors hover:opacity-80 disabled:text-ash"
          >
            Remove photo
          </button>
        )}
        {previewNote && (
          <p className="caption-sm text-mute" aria-live="polite">
            {previewNote}
          </p>
        )}
        {error && (
          <p className="caption-sm text-error" role="alert">
            {error}
          </p>
        )}
        <p className="caption-sm flex items-center gap-1.5 text-mute">
          <Icon name="info" className="h-3.5 w-3.5 shrink-0" />
          JPEG or PNG, up to 10 MB
        </p>
      </div>
    </section>
  )
}

export default AvatarEditor
