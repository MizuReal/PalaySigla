import { useRef } from 'react'
import Button from '../Button'
import Icon from '../Icon'
import RatingStars from './RatingStars'

const ACCEPTED_AVATAR_TYPES = 'image/jpeg,image/png'

interface ProfileIdentityCardProps {
  avatarUrl: string
  displayName: string
  email: string
  memberSinceLabel: string
  fallbackInitials: string
  hasAvatar: boolean
  hasPendingFile: boolean
  isRemovalStaged: boolean
  busy: boolean
  disabled: boolean
  error: string
  urlError: string
  previewNote: string
  ratingAvg: number
  ratingCount: number
  onPickFile: (file: File) => void
  onRemove: () => void
  onCancel: () => void
}

function ProfileIdentityCard({
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
  ratingAvg,
  ratingCount,
  onPickFile,
  onRemove,
  onCancel,
}: ProfileIdentityCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const showRemoveAction = !hasPendingFile && !isRemovalStaged && hasAvatar
  const showCancelAction = hasPendingFile || isRemovalStaged
  const hasFeedback = Boolean(previewNote || urlError || error)

  return (
    <section className="border border-hairline bg-canvas p-5 md:p-6" aria-label="Profile">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Your profile photo"
              className="h-20 w-20 shrink-0 rounded-full border border-hairline object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface-soft"
            >
              <span className="heading-md text-ink">{fallbackInitials}</span>
            </span>
          )}
          <div className="min-w-0">
            <p className="heading-sm truncate text-ink">{displayName}</p>
            <p className="caption-sm mt-1 truncate text-mute">{email}</p>
            <p className="caption-sm mt-0.5 text-mute">
              Member since {memberSinceLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 lg:border-l lg:border-hairline lg:pl-6">
          <div>
            <p className="heading-xl text-primary">{ratingAvg.toFixed(1)}</p>
            <p className="caption-sm mt-0.5 text-mute">
              {ratingCount} rating{ratingCount === 1 ? '' : 's'}
            </p>
          </div>
          <RatingStars rating={Math.round(ratingAvg)} />
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:w-52 lg:flex-col lg:items-stretch lg:border-l lg:border-hairline lg:pl-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={busy || disabled}
            className="justify-center"
          >
            {busy ? 'Processing\u2026' : 'Change photo'}
          </Button>
          {showCancelAction && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={busy || disabled}
              className="justify-center"
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
        </div>
      </div>

      {hasFeedback && (
        <div className="mt-4 space-y-1 border-t border-hairline pt-3">
          {previewNote && (
            <p className="caption-sm text-mute" aria-live="polite">
              {previewNote}
            </p>
          )}
          {urlError && (
            <p className="caption-sm text-error" role="alert">
              {urlError}
            </p>
          )}
          {error && (
            <p className="caption-sm text-error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}

      <p className="caption-sm mt-4 flex items-center gap-1.5 border-t border-hairline pt-3 text-mute">
        <Icon name="info" className="h-3.5 w-3.5 shrink-0" />
        JPEG or PNG, up to 10 MB
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_AVATAR_TYPES}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            onPickFile(file)
          }
        }}
      />
    </section>
  )
}

export default ProfileIdentityCard
