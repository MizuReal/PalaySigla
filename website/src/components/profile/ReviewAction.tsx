import Icon from '../Icon'
import type { TransactionRow } from '../../types/domain'

export function ReviewedChip() {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border border-success-deep/40 bg-accent-leaf-pale px-2.5 py-1 caption-sm text-success-deep">
      <Icon name="check" className="h-3.5 w-3.5 shrink-0" />
      Reviewed
    </span>
  )
}

interface ReviewActionProps {
  transaction: TransactionRow | null
  hasReviewed: boolean
  onReview: (transaction: TransactionRow) => void
}

// The sold-transaction review control: a clear outline CTA that flips to a
// non-interactive "Reviewed" state once the review exists.
function ReviewAction({ transaction, hasReviewed, onReview }: ReviewActionProps) {
  const canReview =
    transaction !== null &&
    transaction.status === 'sold' &&
    transaction.buyer_id !== null

  if (!canReview) {
    return null
  }
  if (hasReviewed) {
    return <ReviewedChip />
  }
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onReview(transaction)
      }}
      className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-sm border border-primary bg-canvas px-3 button-sm text-ink transition-colors hover:bg-primary hover:text-on-primary"
    >
      <Icon name="star" className="h-3.5 w-3.5 shrink-0" />
      Leave a review
    </button>
  )
}

export default ReviewAction
