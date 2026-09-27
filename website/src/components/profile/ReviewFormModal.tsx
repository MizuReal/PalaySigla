import { useState } from 'react'
import type { FormEvent } from 'react'
import Modal from '../Modal'
import StarRatingInput from './StarRatingInput'
import { MAX_COMMENT_CHARS } from '../../services/reviews'
import useReviewForm from '../../hooks/useReviewForm'
import type { TransactionRow } from '../../types/domain'

const TITLE_ID = 'review-form-title'

interface ReviewFormModalProps {
  transaction: TransactionRow
  viewerId: string
  viewerName: string
  onClose: () => void
}

function ReviewFormModal({
  transaction,
  viewerId,
  viewerName,
  onClose,
}: ReviewFormModalProps) {
  const { counterpartyName, canReview, isSubmitting, error, submit } = useReviewForm({
    transaction,
    viewerId,
    viewerName,
  })
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const canSubmit = rating >= 1 && !isSubmitting

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) {
      return
    }
    const succeeded = await submit(rating, comment)
    if (succeeded) {
      onClose()
    }
  }

  return (
    <Modal onClose={onClose} labelledBy={TITLE_ID} panelClassName="max-w-lg">
      <form onSubmit={handleSubmit}>
        <h2 id={TITLE_ID} className="heading-sm text-ink">
          Review {counterpartyName || 'this transaction'}
        </h2>
        <p className="body-sm mt-2 text-mute">{transaction.listing_title}</p>
        {!canReview ? (
          <p
            role="alert"
            className="mt-4 border border-error bg-surface-soft px-4 py-3 body-sm text-ink"
          >
            This transaction can no longer be reviewed.
          </p>
        ) : (
          <>
            <div className="mt-4">
              <p className="caption-md text-ink">Rating</p>
              <StarRatingInput value={rating} onChange={setRating} disabled={isSubmitting} />
            </div>
            <label htmlFor="review-comment" className="caption-md mt-4 block text-ink">
              Comment (optional)
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={MAX_COMMENT_CHARS}
              rows={4}
              placeholder="Share your experience…"
              className="mt-2 w-full rounded-sm border border-hairline bg-canvas px-4 py-3 body-md text-ink outline-none transition-colors focus:border-2 focus:border-primary"
            />
            {error && (
              <p
                role="alert"
                className="mt-3 border border-error bg-surface-soft px-4 py-3 body-sm text-ink"
              >
                {error}
              </p>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={!canSubmit}
                className="h-11 border border-primary px-5 button-sm text-ink transition-colors hover:bg-primary hover:text-on-primary disabled:text-ash"
              >
                {isSubmitting ? 'Submitting…' : 'Submit review'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-11 border border-hairline bg-canvas px-5 button-sm text-ink transition-colors hover:border-primary hover:text-primary disabled:text-ash"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  )
}

export default ReviewFormModal
