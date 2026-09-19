// Tiny module-level pub/sub for listing mutations (posted, marked sold,
// removed). The marketplace feed and the selling-history list subscribe once
// and bump their keyed lists, so a change made anywhere refreshes every
// surface without refetching on unrelated tab switches or threading callbacks
// through navigation state.
type ListingsChangedListener = () => void

const listeners = new Set<ListingsChangedListener>()

export function notifyListingsChanged(): void {
  // iterate a copy: a listener may unsubscribe while reacting to the event
  for (const listener of [...listeners]) {
    listener()
  }
}

export function subscribeToListingsChanged(listener: ListingsChangedListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
