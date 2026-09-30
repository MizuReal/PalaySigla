import Icon from '../Icon'
import {
  VERIFICATION_STATUSES,
  VERIFICATION_STATUS_LABELS,
} from '../../utils/verification'
import type { VerificationStatus } from '../../utils/verification'

const STATUS_CLASSES: Record<VerificationStatus, string> = Object.freeze({
  [VERIFICATION_STATUSES.UNVERIFIED]: 'border-hairline bg-surface-soft text-mute',
  [VERIFICATION_STATUSES.PENDING]:
    'border-warning-bright bg-accent-yellow-pale text-ink',
  [VERIFICATION_STATUSES.VERIFIED]:
    'border-success-deep/40 bg-accent-leaf-pale text-success-deep',
})

interface VerificationStatusBadgeProps {
  status: VerificationStatus
  className?: string
}

// The verified treatment is the wall's "Verified Rice Farmer" badge; the two
// other states reuse the profile history chip vocabulary.
function VerificationStatusBadge({
  status,
  className = '',
}: VerificationStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border px-2.5 py-1 caption-sm ${STATUS_CLASSES[status]} ${className}`}
    >
      {status === VERIFICATION_STATUSES.VERIFIED && (
        <Icon name="shield" className="h-3.5 w-3.5 shrink-0" />
      )}
      {VERIFICATION_STATUS_LABELS[status]}
    </span>
  )
}

export default VerificationStatusBadge
