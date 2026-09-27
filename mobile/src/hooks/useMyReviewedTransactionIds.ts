import { useEffect, useState } from 'react'
import { fetchMyReviewedTransactionIds } from '../services/reviews'
import { subscribeToReviewsChanged } from '../utils/reviewEvents'

// Transaction ids the viewer has already reviewed, kept fresh via the review
// event so "Leave a review" flips to "Reviewed" across surfaces.
function useMyReviewedTransactionIds(userId: string | null): Set<string> {
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let isCurrent = true
    const load = async () => {
      if (!userId) {
        if (isCurrent) {
          setReviewedIds(new Set())
        }
        return
      }
      try {
        const ids = await fetchMyReviewedTransactionIds(userId)
        if (isCurrent) {
          setReviewedIds(ids)
        }
      } catch (err) {
        // a failed review-state read must not break the owning list
        console.error('Could not load review state:', err)
      }
    }
    load()
    const unsubscribe = subscribeToReviewsChanged(load)
    return () => {
      isCurrent = false
      unsubscribe()
    }
  }, [userId])

  return reviewedIds
}

export default useMyReviewedTransactionIds
