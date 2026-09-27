import { getInitials } from '../utils/userProfile'

interface AvatarProps {
  name: string
  className?: string
}

// Monogram circle per the {rounded.full} avatar exception in DESIGN.md. Names
// are snapshotted onto conversations (profiles stay private under RLS), so the
// initials are the only stable identity cue available here.
function Avatar({ name, className = 'h-10 w-10' }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full border border-hairline bg-surface-soft ${className}`}
    >
      <span className="caption-xs text-ink">{getInitials(name)}</span>
    </span>
  )
}

export default Avatar
