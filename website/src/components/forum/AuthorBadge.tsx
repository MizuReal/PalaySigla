import { formatRelativeTime } from '../../utils/format'
import { getInitials } from '../../utils/userProfile'

interface AuthorBadgeProps {
  name: string
  timestamp: string
  isEdited?: boolean
}

function AuthorBadge({ name, timestamp, isEdited = false }: AuthorBadgeProps) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface-soft"
      >
        <span className="caption-xs text-ink">{getInitials(name)}</span>
      </span>
      <p className="caption-sm text-mute">
        <span className="body-strong text-ink">{name}</span>
        {' · '}
        {formatRelativeTime(timestamp)}
        {isEdited && ' · edited'}
      </p>
    </div>
  )
}

export default AuthorBadge
