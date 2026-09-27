// Tiny module-level pub/sub for review submissions. Purchases, Selling
// history, the conversation thread, and the profile reviews card subscribe so
// a newly written review refreshes every open surface.
type ReviewsChangedListener = () => void

const listeners = new Set<ReviewsChangedListener>()

export function notifyReviewsChanged(): void {
  // iterate a copy: a listener may unsubscribe while reacting to the event
  for (const listener of [...listeners]) {
    listener()
  }
}

export function subscribeToReviewsChanged(listener: ReviewsChangedListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
