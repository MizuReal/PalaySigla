import { useCallback, useState } from 'react'
import { REVIEW_ROLES, submitReview } from '../services/reviews'
import { notifyReviewsChanged } from '../utils/reviewEvents'
import type { ReviewRole } from '../services/reviews'
import type { TransactionRow } from '../types/domain'

export interface UseReviewFormParams {
  transaction: TransactionRow
  viewerId: string
  viewerName: string
}

export interface UseReviewFormResult {
  counterpartyName: string
  canReview: boolean
  isSubmitting: boolean
  error: string
  submit: (rating: number, comment: string) => Promise<boolean>
  clearError: () => void
}

// Owns one review submission: derives the counterparty from the transaction,
// submits, and broadcasts so every open surface refreshes.
function useReviewForm({
  transaction,
  viewerId,
  viewerName,
}: UseReviewFormParams): UseReviewFormResult {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isBuyer = transaction.buyer_id === viewerId
  const role: ReviewRole = isBuyer ? REVIEW_ROLES.BUYER : REVIEW_ROLES.SELLER
  const revieweeId = isBuyer ? transaction.seller_id : transaction.buyer_id
  const revieweeName = isBuyer
    ? transaction.seller_name
    : transaction.buyer_name ?? ''
  const canReview = transaction.status === 'sold' && revieweeId !== null

  const submit = useCallback(
    async (rating: number, comment: string): Promise<boolean> => {
      if (!canReview || revieweeId === null) {
        setError('This transaction cannot be reviewed.')
        return false
      }
      setIsSubmitting(true)
      setError('')
      try {
        await submitReview({
          transactionId: transaction.id,
          listingTitle: transaction.listing_title,
          reviewerId: viewerId,
          reviewerName: viewerName,
          revieweeId,
          revieweeName,
          reviewerRole: role,
          rating,
          comment,
        })
        notifyReviewsChanged()
        return true
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not submit your review. Please try again.'
        )
        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    [canReview, revieweeId, revieweeName, role, transaction, viewerId, viewerName]
  )

  const clearError = useCallback(() => setError(''), [])

  return {
    counterpartyName: revieweeName,
    canReview,
    isSubmitting,
    error,
    submit,
    clearError,
  }
}

export default useReviewForm
