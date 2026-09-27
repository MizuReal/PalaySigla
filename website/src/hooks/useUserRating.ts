import { useEffect, useState } from 'react'
import { fetchUserRating } from '../services/reviews'
import { subscribeToReviewsChanged } from '../utils/reviewEvents'
import type { RatingSummary } from '../services/reviews'

const EMPTY_RATING: RatingSummary = Object.freeze({ ratingAvg: 0, ratingCount: 0 })

// Public aggregate for a user (safe fields only, via the user_rating RPC).
function useUserRating(userId: string | null): RatingSummary {
  const [rating, setRating] = useState<RatingSummary>(EMPTY_RATING)

  useEffect(() => {
    let isCurrent = true
    const load = async () => {
      if (!userId) {
        if (isCurrent) {
          setRating(EMPTY_RATING)
        }
        return
      }
      try {
        const summary = await fetchUserRating(userId)
        if (isCurrent) {
          setRating(summary)
        }
      } catch (err) {
        console.error('Could not load the rating:', err)
        if (isCurrent) {
          setRating(EMPTY_RATING)
        }
      }
    }
    load()
    const unsubscribe = subscribeToReviewsChanged(load)
    return () => {
      isCurrent = false
      unsubscribe()
    }
  }, [userId])

  return rating
}

export default useUserRating
